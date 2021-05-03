import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';
import { CirclesPathEntity } from '../entity/path';

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

  @Inject('cool:cache')
  coolCache: ICoolCache;

  /**
   * 返回所有数据
   */
  @Cache(5)
  async all() {
    return this.circlesUsersEntity.find();
  }

  /**
   * 需计算的用户数量
   */
   async algoCount() {
     let userCount = await this.pathEntity.query('select count(DISTINCT tid) as count from circles_path');
     return userCount[0].count;
   }

  /**
   * 将所有需更新用户推入 redis
   */
  async setAlgoUserList() {
    const redis = await this.getRedis();
    // 压入数据前先清空
    await redis.del(USER_LIST_KEY);

    let userList = await this.nativeQuery(`select GROUP_CONCAT(DISTINCT tid) as tids from circles_path`);

    return await redis.lpush(USER_LIST_KEY, userList[0].tids.match(/\d+/g));
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
    if (await redis.llen(USER_LIST_KEY) == 0) {
      await this.setAlgoUserList();
    }
    return await redis.lrange(USER_LIST_KEY, Number(start), Number(end));
  }

  async getRedis() {
    if (!this.coolCache) {
      await this.coolCache.init();
    }
    return await this.coolCache.getMetaCache();
  }
}