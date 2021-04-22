import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';

const USER_LIST_KEY = "scuserlist"

/**
 * 商品
 */
@Provide()
export class CirclesUsersService extends BaseService {
  @InjectEntityModel(CirclesUsersEntity)
  circlesUsersEntity: Repository<CirclesUsersEntity>;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  getConfig() {
    return {
      thegraph_url: this.ctx.app.config.thegraph.url,
    }
  }

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
    const redis = this.coolCache.getMetaCache();
    // 压入数据前先清空
    await redis.del(USER_LIST_KEY);
    let userList = await this.nativeQuery(`select DISTINCT tid from circles_path`);
    return await redis.lpush(USER_LIST_KEY, userList);
  }

  /**
   * 删除列表
   */
   async delAlgoUserList() {
    const redis = this.coolCache.getMetaCache();
    return await redis.del(USER_LIST_KEY);
  }

  /**
   * 从列表中批量获取用户
   */
  async getAlgoUserList(start, end) {
    const redis = this.coolCache.getMetaCache();
    if (redis.llen(USER_LIST_KEY) == 0) {
      await this.setAlgoUserList();
    }
    return await redis.lrange(USER_LIST_KEY, start, end);
  }
}