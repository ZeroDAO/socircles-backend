import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSysInfoEntity } from '../entity/sys_info';
import { ICoolCache } from 'midwayjs-cool-core';
import * as _ from 'lodash';

enum SysStatus {
  FAIL = -1,
  DONE = 0,
  ALGO = 1
}

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
  // @Cache()
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
    let sysInfo = await this.check();
    if (sysInfo.status == SysStatus.DONE) {
      throw new CoolCommException('不在计算状态');
    }
    return sysInfo;
  }

  /**
   * 返回系统状态并检查是否可采集数据
   */
  async infoAndCheckCrawler() {
    let sysInfo = await this.check();
    if (sysInfo.status != SysStatus.DONE) {
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
    await this.circlesSysInfoEntity.update(info.id, { status: SysStatus.DONE });
  }

  /**
   * 失败
   */
  async fail(id) {
    await this.circlesSysInfoEntity.update(id, { status: SysStatus.FAIL });
  }

  /**
   * 进入计算期
   */
  async start(id) {
    await this.circlesSysInfoEntity.update(id, { status: SysStatus.ALGO });
  }

  async check() {
    let info = await this.info()
    if (_.isEmpty(info)) {
      throw new CoolCommException('尚未初始化');
    }
    return info;
  }

}
