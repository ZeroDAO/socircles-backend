import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
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
  @InjectEntityModel(CirclesSysInfoEntity)
  circlesSysInfoEntity: Repository<CirclesSysInfoEntity>;

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
    let sys_info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    if (sys_info.status < 1) {
      throw new CoolCommException('计算中无法开始新的一轮！');
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
}
