import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSysInfoEntity } from '../entity/sys_info';
import { ICoolCache } from 'midwayjs-cool-core';

/**
 * 系统信息
 */
@Provide()
export class CirclesSysService extends BaseService {
  @InjectEntityModel(CirclesSysInfoEntity)
  circlesSysInfoEntity: Repository<CirclesSysInfoEntity>;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  getConfig() {
    return {
      thegraph_url: this.ctx.app.config.thegraph.url,
    }
  }

  /**
   * 当前系统状态
   */
  @Cache(5)
  async info() {
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    return info;
  }
}
