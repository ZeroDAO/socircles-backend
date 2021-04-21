import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSysService } from './sys';
import { CirclesSeedsEntity } from '../entity/seeds';
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

  @Inject()
  sys: CirclesSysService;

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
    }
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
   * 更新种子用户
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
   * 获取种子用户路径
   */
  async getSeedPath(sid = 1) {
    return await this.neo4j.getSeedsPath(sid);
  }

  /**
   * 将种子用户路径导入数据库
   */
  async importSeedPath(sid = 1) {
    // seed_path_${uid}
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
  async algoRw() {

  }
}
