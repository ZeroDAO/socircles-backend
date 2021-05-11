import { Inject, Provide, App } from '@midwayjs/decorator';
import { BaseService, Cache, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSeedsEntity } from '../entity/seeds';
import { CirclesSeedsInfoEntity } from '../entity/seeds_info';
import { CirclesTrustCountEntity } from '../entity/trust_count';
import { CirclesUsersEntity } from '../entity/users';
import { Utils } from '../../../comm/utils';
import { Config } from '@midwayjs/decorator';
import { Application } from 'egg';
import * as _ from 'lodash';

/**
 * 种子用户信息
 */
@Provide()
export class CirclesSeedsService extends BaseService {
  @InjectEntityModel(CirclesSeedsEntity)
  seedsEntity: Repository<CirclesSeedsEntity>;

  @InjectEntityModel(CirclesUsersEntity)
  usersEntity: Repository<CirclesUsersEntity>;

  @InjectEntityModel(CirclesTrustCountEntity)
  trustCountEntity: Repository<CirclesTrustCountEntity>;

  @InjectEntityModel(CirclesSeedsInfoEntity)
  seedsInfoEntity: Repository<CirclesSeedsInfoEntity>;

  @Inject()
  utils: Utils;

  @Config('circlesApi')
  circlesApi;

  @App()
  app: Application;

  /**
   * 返回种子用户信任数据
   */
  // @Cache(5)
  async info() {
    // 获取seed集合
    let seedSet = await this.seedsEntity
      .createQueryBuilder()
      .orderBy("id", "DESC")
      .getOne();
    return await this.trustCountEntity
      .findByIds(
        seedSet.seeds.split(',')
      );
  }

  /**
   * 当前种子用户 id
   *@returns [id]
   */
  // @Cache(5)
  async ids() {
    let seedSet = await this.seedsEntity
      .createQueryBuilder()
      .orderBy("id", "DESC")
      .getOne();
    return seedSet.seeds.split(',');
  }

  /**
   * 当前种子用户信息列表
   */
  // @Cache(5)
  async list(nonce) {
    if (!this.utils.isNmber(nonce)) {
      throw new CoolCommException('参数不正确');
    }
    const seedSet = await this.seedsEntity.findOne(nonce);
    if (_.isEmpty(seedSet)) {
      throw new CoolCommException('SEED NO EXIT!');
    }
    const ids = seedSet.seeds.split(',');
    return await this.nativeQuery(
      `SELECT
        s.avatar,
        s.id,
        s.username,
        u.address
      FROM
        circles_seeds_info s
      INNER JOIN
        circles_users u
        ON u.id = s.id
      WHERE
        s.id IN (?)`,
      [ids]
    );
  }

  /**
   * 爬取当前种子用户信息列表
   */
  async getSeedsInfo() {
    const seedsIds = await this.ids();
    let seedsInfo = await this.usersEntity.findByIds(seedsIds);
    // 直接拼接字符串
    let url = this.circlesApi.url + 'users?';
    let newSeedsObj = {};
    seedsInfo.forEach((seed) => {
      let seedAddress = this.utils.toChecksumAddress(seed.address)
      url = url + 'address[]=' + seedAddress + '&';
      newSeedsObj[seedAddress] = seed.id;
    })

    const data = await this.app.curl(url, {
      contentType: 'json',
      dataType: 'json'
    });

    data.data.data.forEach(async (item, index) => {
        let avatarUrl = item.avatarUrl;
        await this.seedsInfoEntity.save({
          id: newSeedsObj[item.safeAddress],
          avatar: avatarUrl.slice(avatarUrl.lastIndexOf('/') + 1, avatarUrl.lenght),
          cid: item.id,
          username: item.username,
        })
    });

    return 'SEED INFO DONE';
  }
}
