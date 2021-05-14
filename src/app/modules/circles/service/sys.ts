import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSysInfoEntity } from '../entity/sys_info';
import { CirclesUsersEntity } from '../entity/users';
import { CirclesTrustEntity } from '../entity/trust';
import { ICoolCache } from 'midwayjs-cool-core';
import { Utils } from '../../../comm/utils';
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

  @InjectEntityModel(CirclesUsersEntity)
  usersEntity: Repository<CirclesUsersEntity>;

  @InjectEntityModel(CirclesTrustEntity)
  trustEntity: Repository<CirclesTrustEntity>;

  @Inject()
  utils: Utils;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  /**
   * 当前系统状态
   */
  async info(nonce?) {
    if (nonce) {
      // 检查
      if (!this.utils.isNmber(nonce)) {
        throw new CoolCommException('参数错误或 nonce 状态不正确');
      }
      return await this.circlesSysInfoEntity.findOne({
        nonce: nonce,
        status: SysStatus.DONE
      });
    }
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    return info;
  }

  /**
   * 获取最后一次成功计算的信息
   */
  async lastAlgo() {
    let info = await this.circlesSysInfoEntity.createQueryBuilder()
      .where({ status: SysStatus.DONE })
      .addOrderBy('id', 'DESC')
      .getOne();
    if (_.isEmpty(info)) {
      throw new CoolCommException('未找到成功计算数据');
    }
    return info;
  }

  /**
   * 返回系统状态并确保处于计算状态
   */
  async infoAndCheckAlgo() {
    let sysInfo = await this.check();
    if (sysInfo.status != SysStatus.ALGO) {
      throw new CoolCommException('不在计算状态');
    }
    return sysInfo;
  }

  /**
   * 检查系统状态
   */
  async checkStatus(nonce) {
    let sysInfo = await this.circlesSysInfoEntity.findOne({ nonce: nonce });
    return !_.isEmpty(sysInfo) && sysInfo.status == SysStatus.DONE;
  }

  /**
   * 返回系统状态并检查是否可采集数据
   */
  async infoAndCheckCrawler() {
    let sysInfo = await this.info();
    if (!_.isEmpty(sysInfo) && sysInfo.status == SysStatus.ALGO) {
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
    let userCount = await this.usersEntity.count();
    let trustCount = await this.trustEntity.count();
    await this.circlesSysInfoEntity.update(info.id, {
      status: SysStatus.DONE,
      user_count: userCount,
      trust_count: trustCount
    });
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

  /**
   * 计算完成的nonce列表
   */
  async list() {
    const list = await this.circlesSysInfoEntity
      .createQueryBuilder()
      .select('id, nonce')
      .where({ status: SysStatus.DONE })
      .orderBy("id", "DESC")
      .execute();
    
    return list;
  }

  async check() {
    let info = await this.info()
    if (_.isEmpty(info)) {
      throw new CoolCommException('尚未初始化');
    }
    return info;
  }

}
