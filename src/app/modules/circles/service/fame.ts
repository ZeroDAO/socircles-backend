import { Inject, Provide, App } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesFameEntity } from '../entity/fame';
import { CirclesUsersEntity } from '../entity/users';
import { CirclesSeedsService } from './seeds';
import { Utils } from '../../../comm/utils';
import * as _ from 'lodash';

/**
 * 种子用户信息
 */
@Provide()
export class CirclesFameService extends BaseService {

  @InjectEntityModel(CirclesFameEntity)
  fameEntity: Repository<CirclesFameEntity>;

  @InjectEntityModel(CirclesUsersEntity)
  usersEntity: Repository<CirclesUsersEntity>;

  @Inject()
  utils: Utils;

  @Inject()
  seeds: CirclesSeedsService;

  /**
   * 返回种子用户信任数据
   * @param param
   */
  async add(param) {
    let { id, address } = param;
    if (!id) {
      throw new CoolCommException('用户id不可为空');
    }
    if (!address) {
      const userInfo = await this.usersEntity.findOne(id);
      address = userInfo.address;
    }
    let circlesInfo = await this.seeds.getCirclesUser('address[]=' + address);

    await this.seeds.saveCirclesUser({
      id: id,
      avatar: circlesInfo[0].avatarUrl,
      cid: circlesInfo[0].id,
      username: circlesInfo[0].username
    });
    return id;
  }
}