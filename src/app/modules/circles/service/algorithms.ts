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
    }
  }

  /**
   * 开始新的一轮计算
   */
   async start(seed_count = 20, seed_score = 1000, damping_factor = 0.85, min_divisor = 20) {
    let sys_info = await this.sys.info();
    if (sys_info.status < 1) {
      throw new CoolCommException('正在计算中，无法开始新的一轮！');
    }
    let newRound = await this.circlesSysInfoEntity.save({
      status: 0,
      nonce: sys_info.nonce + 1,
      seed_count,
      seed_score,
      damping_factor,
      min_divisor
    });

    return newRound.id;
   }

  /**
   * 更新种子用户
   */
  async setSeeds() {
    let sys_info = await this.sys.info();
    if (sys_info.status != 1) {
      throw new CoolCommException('未处于计算状态');
    }
    return await this.neo4j.getSeeds(sys_info.seed_count);
  }

}
