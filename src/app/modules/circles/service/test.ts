import { Provide } from '@midwayjs/decorator';
import { BaseService } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesUsersEntity } from '../entity/users';
import { CirclesTrustEntity } from '../entity/trust';
import { CirclesTrustChangesEntity } from '../entity/trust_changes';
import { CirclesTrustCountEntity } from '../entity/trust_count';
import * as _ from 'lodash';

/**
 * 商品
 */
@Provide()
export class CirclesTestService extends BaseService {
  @InjectEntityModel(CirclesTrustEntity)
  trustEntity: Repository<CirclesTrustEntity>;

  @InjectEntityModel(CirclesTrustChangesEntity)
  trustChangesEntity: Repository<CirclesTrustChangesEntity>;

  @InjectEntityModel(CirclesUsersEntity)
  usersEntity: Repository<CirclesUsersEntity>;

  @InjectEntityModel(CirclesTrustCountEntity)
  trustCountEntity: Repository<CirclesTrustCountEntity>;

  /**
   * 输出Trust数量错误
   */
  async trustCount(start, end) {
    let r = [];
    for (let i = 0; i < end; i++) {
      let user = await this.usersEntity.findOne(i);
      if (!_.isEmpty(user)) {
        let trustCount = await this.trustCountEntity.findOne(i);
        let realTrustCount = await this.trustEntity.count({trusted: i});
        if (realTrustCount != 0 && (!trustCount || trustCount.count != realTrustCount)) {
          r.push({
            id: i,
            trustCount,
            realTrustCount
          })
        }
      }
    }
    return r;
  }
}