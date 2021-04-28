import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSeedsEntity } from '../entity/seeds';
import { CirclesTrustCountEntity } from '../entity/trust_count';
import { ICoolCache } from 'midwayjs-cool-core';

/**
 * 种子用户信息
 */
@Provide()
export class CirclesSeedsService extends BaseService {
  @InjectEntityModel(CirclesSeedsEntity)
  seedsEntity: Repository<CirclesSeedsEntity>;

  @InjectEntityModel(CirclesTrustCountEntity)
  trustCountEntity: Repository<CirclesTrustCountEntity>;

  @Inject('cool:cache')
  coolCache: ICoolCache;
  
  /**
   * 返回种子用户信任数据
   */
  @Cache(5)
  async info() {
    // 获取seed集合
    let seedSet = await this.seedsEntity
      .createQueryBuilder()
      .orderBy("id", "DESC")
      .getOne();
    return await this.trustCountEntity
      .findByIds(
        seedSet.seeds.split(',')
      );
  }
}
