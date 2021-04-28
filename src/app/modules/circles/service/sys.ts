import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSysInfoEntity } from '../entity/sys_info';
import { ICoolCache } from 'midwayjs-cool-core';
import * as _ from 'lodash';

/**
 * 系统信息
 */
@Provide()
export class CirclesSysService extends BaseService {
  @InjectEntityModel(CirclesSysInfoEntity)
  circlesSysInfoEntity: Repository<CirclesSysInfoEntity>;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  /**
   * 当前系统状态
   */
  @Cache(5)
  async info(check = false) {
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    if (check) {
      if (_.isEmpty(info)) {
        throw new CoolCommException('尚未初始化');
      }
      if (info.status != 0) {
        throw new CoolCommException('不在计算期');
      }
    }
    return info;
  }

  /**
   * 当前系统状态
   */
  async finish() {
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    await this.circlesSysInfoEntity.update(info.id,{status: 1});
  }

}
