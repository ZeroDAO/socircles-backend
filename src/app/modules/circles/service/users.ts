import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';
import { CirclesPathEntity } from '../entity/path';
import { CirclesSeedsService } from './seeds';

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
      .map((x)=>{
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

  async getRedis() {
    await this.coolCache.init();
    return await this.coolCache.getMetaCache();
  }
}