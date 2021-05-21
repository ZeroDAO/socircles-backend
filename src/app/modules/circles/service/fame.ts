import { Inject, Provide } from '@midwayjs/decorator';
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
   * 增加名人堂并获取资料
   * @param param
   */
  async add(param) {
    let { id, address } = param;
    if (!id && !address) {
      throw new CoolCommException('信息为空');
    }
    if (!address) {
      const userInfo = await this.usersEntity.findOne(id);
      address = userInfo.address;
    }

    if (!id) {
      const userInfo = await this.usersEntity.findOne({address: address});
      id = userInfo.id;
    }
    
    let circlesInfo = await this.seeds.getCirclesUser('address[]=' + this.utils.toChecksumAddress(address));
    
    await this.seeds.saveCirclesUser({
      id: id,
      avatar: circlesInfo[0].avatarUrl || null,
      cid: circlesInfo[0].id,
      username: circlesInfo[0].username
    });
    
    return await this.fameEntity.save({
      id: id
    });
  }
}