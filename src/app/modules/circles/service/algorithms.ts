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
import { CirclesFameCostEntity } from '../entity/fame_cost';
import { ICoolCache } from 'midwayjs-cool-core';
import { Context } from 'egg';
import { CirclesNeo4jService } from './neo4j';
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

  @InjectEntityModel(CirclesFameCostEntity)
  fameCostEntity: Repository<CirclesFameCostEntity>;

  @InjectEntityModel(CirclesAlgoRecordsEntity)
  algoRecordsEntity: Repository<CirclesAlgoRecordsEntity>;

  @Inject()
  sys: CirclesSysService;

  @Inject()
  users: CirclesUsersService;

  @Inject()
  seeds: CirclesSeedsService;

  @Inject()
  neo4j: CirclesNeo4jService;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  @Inject()
  ctx: Context;

  @Config('orm')
  ormConf;

  /**
   * 开始新的一轮计算
   */
  async start(seed_count, seed_score, damping_factor, min_divisor, seed_algo = 'closeness') {
    let sys_info = await this.sys.infoAndCheckCrawler();
    let nonce = 1;

    if (sys_info) {
      await this.neo4j.dropGraph();
      nonce = sys_info.nonce + 1;
      // 重新命名数据表
      await this.nativeQuery(`
        RENAME TABLE circles_scores TO circles_scores_${sys_info.nonce}`)
      // 建立空表 scores
      await this.nativeQuery(`
      CREATE TABLE IF NOT EXISTS \`circles_scores\` (
        \`id\` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
        \`createTime\` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6),
        \`updateTime\` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`reputation\` float NOT NULL DEFAULT '0',
        PRIMARY KEY (\`id\`)) ENGINE=InnoDB
      `)
    }

    await this.users.delAlgoUserList();
    await this.neo4j.dropGraph();

    let countData = await this.neo4j.getRwCount();

    if (this.neo4j.resHead(countData.records[0]) == 0) {
      await this.neo4j.initRepuWeight();
      await this.neo4j.initRelWeight();
    }

    await this.circlesSysInfoEntity.insert({
      nonce,
      seed_algo,
      seed_count,
      seed_score,
      damping_factor,
      min_divisor
    });
  }

  /**
   * 设置声誉值
   */
  async updateRelWeight() {
    return await this.neo4j.updateRelWeight();
  }

  /**
   * 初始化路径权重
   */
  async setReputation() {
    return await this.neo4j.setReputation();
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
    let sys_info = await this.sys.infoAndCheckAlgo();

    let seeds_neo = await this.neo4j.getSeeds(sys_info.seed_count);
    let seedsSet = [];
    seeds_neo.records.forEach(e => {
      seedsSet.push(this.neo4j.resHead(e))
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
    return await this.neo4j.pathFile(sid);
  }

  /**
   * 计算种子路径至其他所有节点最短路径并生成cvs
   */
  async getFamePath(uid) {
    return await this.neo4j.pathFile(uid, 'fame', false);
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
    const seedsScores = await this.seeds.scores();
    const sysInfo = await this.sys.info();

    let newSeedsInfo = seedsScores.map(seed => {
      return {
        id: seed.id,
        // 由于种子用户只计算了 seed-count - 1
        // 因此加上少算的得分，以保证公平性
        score: seed.reputation ? (seed.reputation * sysInfo.seed_count) / (sysInfo.seed_count - 1) : 0
      }
    });
    await this.scoreEntity.save(newSeedsInfo);
    return `Seeds Count: ${seedsScores.length}`;
  }

  /**
   * 初始化未设置rw节点
   */
  async initNoSetRepu() {
    return await this.neo4j.initNoSetRepu();
  }

  /**
   * 创建Graph
   */
  async createGraphIfNotExit() {
    return await this.neo4j.createGraphIfNotExit();
  }

  /**
   * 更新rw汇总数据
   */
  async aggregatingRw() {
    const rwData = await this.neo4j.aggregating('reputation');
    const sysInfo = await this.sys.info();
    let rwAgg = {};
    // return rwData.records[0];
    rwData.records[0].keys.forEach((key, i) => {
      rwAgg[key] = this.neo4j.resHead(rwData.records[0], null, i);
    });
    rwAgg['nonce'] = sysInfo.nonce;
    rwAgg['algo'] = 'reputation';
    return await this.saveOrUpdateAlgoRecord(rwAgg);
  }

  /**
   * 将种子用户路径cvs导入mysql
   * 文件路径默认在neo4j安装文件夹下 /import/seed_path_${sid}.csv
   * IGNORE 2 ROWS : 忽略前两行无用数据
   *@param sid: 源节点用户uid
   */
  async importCsvPath(sid, type = 'seed') {
    return await this.nativeQuery(`
      LOAD DATA INFILE '${this.ormConf.neo4jDir}/import/${type}_path_${sid}.csv'
      INTO TABLE circles_path
      FIELDS TERMINATED BY ','
      ENCLOSED BY '"'
      LINES TERMINATED BY '\n'
      IGNORE 2 ROWS
      (\`SID\`, \`TID\`, \`NIDS\`, \`TOTALCOST\`, \`COSTS\`)
    `);
  }

  /**
   * 导入名人堂路径数据到mysql
   * 文件路径默认在neo4j安装文件夹下 /import/fame_path_${sid}.csv
   *@param sid: 源节点用户uid
   */
  async importFamePath(sid) {
    return await this.importCsvPath(sid, 'fame');
  }

  /**
   * 批量计算 RW
   */
  async algoRw(range) {
    let { start, end } = range;
    let sysInfo = await this.sys.infoAndCheckAlgo();
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
   * 计算其他节点到名人堂距离
   */
  async fameCost() {
    await this.nativeQuery(`truncate table circles_fame_cost`);
    const costData = await this.nativeQuery(`
      SELECT SUM(totalCost) AS cost, tid, count(*) AS  count FROM circles_path GROUP BY tid
    `);
    await this.fameCostEntity.save(costData);
  }

  /**
   * 计算其他节点到名人堂距离
   *@param algo 种子算法名称
   */
  async setFame() {
    let sysInfo = await this.sys.infoAndCheckAlgo();
    await this.neo4j.setFame(sysInfo.seed_algo);
  }

  /**
   * 计算对照组
   */
  async algoConpared(target) {
    let sys_info = await this.sys.infoAndCheckAlgo();
    let r;
    switch (target) {
      case "betweenness":
        r = await this.neo4j.betweennessWrite();
        break;
      case "pagerank":
        r = await this.neo4j.pageRankWrite();
        break;
      case "articleRank":
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
    saveData.nonce = sys_info.nonce;
    await this.saveOrUpdateAlgoRecord(saveData);
  }

  /**
   * 保存计算记录
   */
  async saveOrUpdateAlgoRecord(saveData) {
    let algo_record = await this.algoRecordsEntity.findOne({
      nonce: saveData.nonce,
      algo: saveData.algo
    });
    if (_.isEmpty(algo_record)) {
      await this.algoRecordsEntity.insert(saveData);
    } else {
      await this.algoRecordsEntity.update(algo_record.id, saveData);
    }
  }
}

