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
  async info() {
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    return info;
  }

  /**
   * 返回系统状态并检查是否在计算期
   */
  async infoAndCheckAlgo() {
    let sysInfo = await this.check(1);
    if (!sysInfo) {
      throw new CoolCommException('尚未开始计算');
    }
    return sysInfo;
  }

  /**
   * 返回系统状态并检查是否可采集数据
   */
   async infoAndCheckCrawler() {
    let sysInfo = await this.check(0);
    if (!sysInfo) {
      throw new CoolCommException('正在计算中，不可更新');
    }
    return sysInfo;
  }

  /**
   * 结束计算
   */
  async finish() {
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    await this.circlesSysInfoEntity.update(info.id,{status: 0});
  }

  async check(status) {
    let info = await this.info()
    if (_.isEmpty(info)) {
      throw new CoolCommException('尚未初始化');
    }
    return info.status == status ? info : false;
  }

}
