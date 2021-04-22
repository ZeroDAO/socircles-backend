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

  getConfig() {
    return {
      thegraph_url: this.ctx.app.config.thegraph.url,
      neo4jDir: this.ctx.app.config.orm.neo4jDir,
    }
  }

  /**
   * 开始新的一轮计算
   */
  async start(seed_count = 20, seed_score = 1000, damping_factor = 0.85, min_divisor = 20) {
    let sys_info = await this.sys.info();
    let nonce = 1;
    if (sys_info) {
      if (sys_info.status < 1) {
        throw new CoolCommException('正在计算中，无法开始新的一轮！');
      }
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

    // 新建数据表
    let newRound = await this.circlesSysInfoEntity.insert({
      status: 0,
      nonce,
      seed_count,
      seed_score,
      damping_factor,
      min_divisor
    });

    return newRound;
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
  async getSeedPath(sid = 1) {
    return await this.neo4j.seedsPathFile(sid);
  }

  /**
   * 将种子用户路径cvs导入mysql
   * 文件路径在neo4j安装文件夹下 /import/seed_path_${sid}.csv
   *@param sid: 种子用户id
   */
  async importSeedPath(sid = 1) {
    return await this.nativeQuery(`
      LOAD DATA INFILE '${this.getConfig().neo4jDir}/import/seed_path_${sid}.csv'
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
    let sysInfo = await this.sys.info();
    let userIds = await this.users.getAlgoUserList(start, end);
    let scoreList = userIds.map(async (uid) => {
      // 从path中获取所有路径
      let paths = await this.pathEntity.find({ tid: uid });
      let userList = [];
      paths.forEach(p => {
        userList = [...new Set([...userList, ...p.nids.match(/./g)])];
      });
      let trustCountList = await this.trustCountEntity
        .findByIds(userList, {
          select: ["count"]
        });
      let score = paths.reduce((prev, curr) => {
        let nodes = curr.nids.match(/./g);
        let costs = curr.costs.match(/./g);
        let iScore = sysInfo.seed_score;
        for (let i = 0; i < nodes.length; i++) {
          (iScore / (Number(costs[i]) * Math.max(trustCountList[userList.indexOf(nodes[i])].count, sysInfo.min_divisor))) * sysInfo.damping_factor;
        }
        return prev + iScore;
      }, 0);
      return {
        id: uid,
        score: score
      }
    });
    await this.scoreEntity.insert(scoreList);
  }

  /**
   * 计算对照组
   */
  async algoConpared(target) {
    let r;
    switch (target) {
      case "betweenness":
        r = await this.neo4j.betweennessWrite();
        break;
      case "pagerank":
        r = await this.neo4j.pageRankWrite();
        break;
      case "articlerank":
        r = await this.neo4j.gdsAlphaWrite(target,{
          maxIterations:20,
          dampingFactor:0.85
        });
        break;
      case "degree":
        r = await this.neo4j.gdsAlphaWrite(target,'',`{
          TRUST: {
            type: 'TRUST',
            orientation: 'REVERSE'
          }
        }`);
        break;
      case "harmonic":
        r = await this.neo4j.gdsClosenessWrite(target,'');
        break;
      default:
        r = await this.neo4j.gdsAlphaWrite(target,'');
        break;
    }
    let sys_info = await this.sys.info();
    let saveData = r[0]._fields[0].push({
      algo: target
    });
    let algo_record = await this.algoRecordsEntity.findOne({nonce: sys_info.nonce, algo: target});
    if (_.isEmpty(algo_record)) {
      await this.algoRecordsEntity.insert(saveData);
    } else {
      await this.algoRecordsEntity.update(algo_record.id, saveData);
    }
  }
}