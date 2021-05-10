import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';
import { CirclesPathEntity } from '../entity/path';
import { CirclesSeedsService } from './seeds';
import { CirclesNeo4jService } from './neo4j';
import { Utils } from '../../../comm/utils';
import * as _ from 'lodash';

const USER_LIST_KEY = "socirclesUserList"

/**
 * 用户
 */
@Provide()
export class CirclesUsersService extends BaseService {
  @InjectEntityModel(CirclesUsersEntity)
  circlesUsersEntity: Repository<CirclesUsersEntity>;

  @InjectEntityModel(CirclesPathEntity)
  pathEntity: Repository<CirclesPathEntity>;

  @Inject()
  seeds: CirclesSeedsService;

  @Inject()
  neo4j: CirclesNeo4jService;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  @Inject()
  utils: Utils;

  /**
   * 将所有需更新用户推入 redis
   */
  async setAlgoUserList() {
    const redis = await this.getRedis();
    // 压入数据前先清空
    await redis.del(USER_LIST_KEY);

    let userDistinct = await this.nativeQuery(
      `select DISTINCT tid as tid from circles_path`
    );

    let userList = userDistinct
      .map((x) => {
        return x.tid;
      });

    return await redis.lpush(USER_LIST_KEY, userList);
  }

  /**
   * 删除列表
   */
  async delAlgoUserList() {
    const redis = await this.getRedis();

    return await redis.del(USER_LIST_KEY);
  }

  /**
   * 从列表中批量获取用户
   */
  async getAlgoUserList(start, end) {
    const redis = await this.getRedis();
    try {
      if (await redis.llen(USER_LIST_KEY) == 0) {
        await this.setAlgoUserList();
      }
    } catch (error) {
      await this.setAlgoUserList();
    }

    return await redis.lrange(USER_LIST_KEY, Number(start), Number(end));
  }

  /**
   * 通过 address 获取 id
   */
  async addressToId(address) {
    this.checkAddress(address);
    const userInfo = await this.circlesUsersEntity.findOne({ address: address });
    return _.isEmpty(userInfo) ? '' : userInfo.id;
  }

  /**
   * 返回 nonce 下的声誉值
   */
  async score(id, nonce) {
    if (!this.utils.isNmber(nonce)) {
      throw new CoolCommException('参数不正确');
    }
    // 检查是否存在该数据表
    const hasTable = await this.nativeQuery(`show tables like 'circles_scores_${nonce}'`)
    if (_.isEmpty(hasTable)) {
      throw new CoolCommException('不存在该 nonce 数据');
    }
    const users = await this.nativeQuery(
      `select reputation from circles_scores_${nonce} where id = ?`,
      [id]
    );
    return users;
  }

  /**
   * 返回用户当前各种算法计算结果
   */
  async info(address) {
    let uid = await this.addressToId(address);
    if (!uid) return;
    let userInfo = await this.neo4j.userById(uid);
    if (!_.isEmpty(userInfo)) {
      userInfo = this.neo4j.formatting(userInfo.records[0]._fields[0].properties);
    }
    return userInfo;
  }

  checkAddress(address) {
    if (!this.utils.isEthAddress(address)) {
      throw new CoolCommException('address 不正确');
    }
  }

  async getRedis() {
    await this.coolCache.init();
    return await this.coolCache.getMetaCache();
  }
}