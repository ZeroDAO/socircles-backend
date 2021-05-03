import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSysService } from './sys';
import { CirclesUsersService } from './users';
import { CirclesSeedsService } from './seeds';
import { CirclesSeedsEntity } from '../entity/seeds';
import { CirclesPathEntity } from '../entity/path';
import { CirclesScoresEntity } from '../entity/scores';
import { CirclesTrustCountEntity } from '../entity/trust_count';
import { CirclesAlgoRecordsEntity } from '../entity/algo_records';
import { CirclesSysInfoEntity } from '../entity/sys_info';
import { ICoolCache } from 'midwayjs-cool-core';
import { Context } from 'egg';
import { Neo4jService } from './neo4j';
import { Config } from '@midwayjs/decorator';
import * as _ from 'lodash';

/**
 * 计算相关指数
 */
@Provide()
export class CirclesAlgorithmsService extends BaseService {
  @InjectEntityModel(CirclesSeedsEntity)
  circlesSeedsEntity: Repository<CirclesSeedsEntity>;

  @InjectEntityModel(CirclesSysInfoEntity)
  circlesSysInfoEntity: Repository<CirclesSysInfoEntity>;

  @InjectEntityModel(CirclesTrustCountEntity)
  trustCountEntity: Repository<CirclesTrustCountEntity>;

  @InjectEntityModel(CirclesPathEntity)
  pathEntity: Repository<CirclesPathEntity>;

  @InjectEntityModel(CirclesScoresEntity)
  scoreEntity: Repository<CirclesScoresEntity>;

  @InjectEntityModel(CirclesAlgoRecordsEntity)
  algoRecordsEntity: Repository<CirclesAlgoRecordsEntity>;

  @Inject()
  sys: CirclesSysService;

  @Inject()
  users: CirclesUsersService;

  @Inject()
  seeds: CirclesSeedsService;

  @Inject()
  neo4j: Neo4jService;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  @Inject()
  ctx: Context;

  @Config('orm')
  ormConf;

  /**
   * 开始新的一轮计算
   */
  async start(seed_count = 20, seed_score = 1000, damping_factor = 0.85, min_divisor = 20, seed_algo = 'closeness') {
    let sys_info = await this.sys.info();
    let nonce = 1;
    if (sys_info) {
      if (sys_info.status < 1) {
        throw new CoolCommException('正在计算中，无法开始新的一轮！');
      }
      await this.neo4j.dropGraph();
      nonce = sys_info.nonce + 1;
      // 重新命名数据表
      await this.nativeQuery(`
        RENAME TABLE circles_scores TO circles_scores_${sys_info.nonce}
      `)

      await this.nativeQuery(`
        CREATE TABLE IF NOT EXISTS \`circles_scores\`(
          \`id\` INT UNSIGNED,
          \`reputation\` VARCHAR(100) NOT NULL,
        )ENGINE=InnoDB;
      `)
    }

    await this.users.delAlgoUserList();

    let countData = await this.neo4j.getRwCount();

    if (countData == 0) {
      await this.neo4j.initRepuWeight();
      await this.neo4j.initRelWeight();
    }

    await this.neo4j.createGraph();

    let newRound = await this.circlesSysInfoEntity.insert({
      status: 0,
      nonce,
      seed_algo,
      seed_count,
      seed_score,
      damping_factor,
      min_divisor
    });

    return newRound;
  }

  /**
   * 完成计算任务
   */
  async finish() {
    await this.users.delAlgoUserList();
    await this.sys.finish();
    await this.aggregatingRw();
    return;
  }

  /**
   * 从neo4j获取种子用户，并更新到数据库
   * 注意： 前置条件为依赖指标计算并更新完成
   */
  async setSeeds() {
    let sys_info = await this.sys.info();
    if (!sys_info || sys_info.status != 0) {
      throw new CoolCommException('未处于计算状态');
    }
    let seeds_neo = await this.neo4j.getSeeds(sys_info.seed_count);
    let seedsSet = [];
    seeds_neo.records.forEach(e => {
      seedsSet.push(e._fields[0].low)
    });

    let seeds = await this.circlesSeedsEntity.save({
      id: sys_info.nonce,
      seeds: seedsSet.toString()
    })
    return seeds.id;
  }

  /**
   * 计算种子路径至其他所有节点最短路径并生成cvs
   */
  async getSeedPath(sid) {
    return await this.neo4j.seedsPathFile(sid);
  }

  /**
   * 重置声誉得分，用于重新计算或恢复意外情况
   */
  async truncateRw() {
    return await this.nativeQuery(`truncate table circles_scores`);
  }

  /**
   * 设置种子用户声誉值
   */
  async setSeedsScore() {
    const seedIds = await this.seeds.info();
    const sysInfo = await this.sys.info();
    let seedsScores = [];
    seedIds.forEach(seed => {
      seedsScores.push({
        id: seed.id,
        reputation: sysInfo.seed_score,
      })
    });
    return await this.scoreEntity.save(seedsScores);
  }

  /**
   * 更新rw汇总数据
   */
  async aggregatingRw() {
    const rwData = await this.neo4j.aggregating('reputation');
    const sysInfo = await this.sys.info();
    let rwAgg = {};
    rwData[0].keys.forEach((key, i) => {
      rwAgg[key] = rwData[0]._fields[i + 1];
    });
    rwAgg['nonce'] = sysInfo.nonce;
    return await this.scoreEntity.save(rwAgg);
  }

  /**
   * 将种子用户路径cvs导入mysql
   * 文件路径在neo4j安装文件夹下 /import/seed_path_${sid}.csv
   *@param sid: 种子用户id
   */
  async importSeedPath(sid) {
    return await this.nativeQuery(`
      LOAD DATA INFILE '${this.ormConf.neo4jDir}/import/seed_path_${sid}.csv'
      INTO TABLE circles_path
      FIELDS TERMINATED BY ','
      ENCLOSED BY '"'
      LINES TERMINATED BY '\n'
      IGNORE 2 ROWS
      (\`SID\`, \`TID\`, \`NIDS\`, \`COSTS\`)
    `);
  }
  

  /**
   * 批量计算 RW
   */
  async algoRw(start, end) {
    let sysInfo = await this.sys.info(true);
    let userIds = await this.users.getAlgoUserList(start, end);

    const scoreList = userIds.map(async uid => {
      // 从path中获取所有路径
      let paths = await this.pathEntity.find({ tid: uid });

      let userList = [];
      paths.forEach(p => {
        // 删除nid最后一个元素，合并为 Set
        userList = [...new Set([...userList, ...p.nids.match(/\d+/g).slice(0, -1)])];
      });
      let trustCountList = await this.trustCountEntity
        .findByIds(userList, {
          select: ["count"]
        });

      let score = paths.reduce((prev, curr) => {
        let nodes = curr.nids.match(/\d+/g);
        // ['0.0']
        let costs = curr.costs.match(/\d*\.\d*/g);
        let iScore = sysInfo.seed_score;
        for (let i = 0; i < nodes.length - 1; i++) {
          iScore = (iScore / (Number(costs[i + 1]) * Math.max(trustCountList[userList.indexOf(nodes[i])].count, sysInfo.min_divisor))) * sysInfo.damping_factor;
        }
        return prev + iScore;
      }, 0);
      return this.scoreEntity.create({
        id: uid,
        reputation: score
      });
    });

    const res = await Promise.all(scoreList)
      .catch(err => {
        throw new CoolCommException(err);
      })

    await this.scoreEntity.save(res);
  }

  /**
   * 计算对照组
   */
  async algoConpared(target) {
    let sys_info = await this.sys.info(true);
    let r;
    switch (target) {
      case "betweenness":
        r = await this.neo4j.betweennessWrite();
        break;
      case "pagerank":
        r = await this.neo4j.pageRankWrite();
        break;
      case "articlerank":
        r = await this.neo4j.gdsAlphaWrite(target, {
          maxIterations: 20,
          dampingFactor: 0.85
        });
        break;
      case "degree":
        r = await this.neo4j.gdsAlphaWrite(target, '', `{
          TRUST: {
            type: 'TRUST',
            orientation: 'REVERSE'
          }
        }`);
        break;
      case "harmonic":
        r = await this.neo4j.gdsClosenessWrite(target, '');
        break;
      default:
        r = await this.neo4j.gdsAlphaWrite(target, '');
        break;
    }
    let saveData = r.records[0]._fields[0];
    saveData.algo = target;
    let algo_record = await this.algoRecordsEntity.findOne({ nonce: sys_info.nonce, algo: target });
    if (_.isEmpty(algo_record)) {
      await this.algoRecordsEntity.insert(saveData);
    } else {
      await this.algoRecordsEntity.update(algo_record.id, saveData);
    }
  }
}
