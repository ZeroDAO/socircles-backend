import { Inject, Provide, App } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesSeedsEntity } from '../entity/seeds';
import { CirclesSeedsInfoEntity } from '../entity/seeds_info';
import { CirclesTrustCountEntity } from '../entity/trust_count';
import { CirclesFameEntity } from '../entity/fame';
import { CirclesUsersEntity } from '../entity/users';
import { CirclesScoresEntity } from '../entity/scores';
import { CirclesSysService } from './sys'
import { CirclesSysInfoEntity } from '../entity/sys_info';
import { CirclesNeo4jService } from './neo4j'
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

  @InjectEntityModel(CirclesScoresEntity)
  scoresEntity: Repository<CirclesScoresEntity>;

  @InjectEntityModel(CirclesUsersEntity)
  usersEntity: Repository<CirclesUsersEntity>;

  @InjectEntityModel(CirclesTrustCountEntity)
  trustCountEntity: Repository<CirclesTrustCountEntity>;

  @InjectEntityModel(CirclesSeedsInfoEntity)
  seedsInfoEntity: Repository<CirclesSeedsInfoEntity>;

  @InjectEntityModel(CirclesFameEntity)
  fameEntity: Repository<CirclesFameEntity>;

  @InjectEntityModel(CirclesSysInfoEntity)
  sysInfoEntity: Repository<CirclesSysInfoEntity>;;

  @Inject()
  utils: Utils;

  @Inject()
  neo4j: CirclesNeo4jService;

  @Inject()
  sys: CirclesSysService;

  @Config('circlesApi')
  circlesApi;

  @App()
  app: Application;

  @Config('supportAlgo')
  supportAlgo;

  /**
   * 返回种子用户信任数据
   */
  async info() {
    // 获取seed集合
    let seedSet = await this.ids();
    return await this.trustCountEntity
      .findByIds(
        seedSet
      );
  }

  /**
   * 种子用户得分
   */
  async scores() {
    let seedSet = await this.ids();
    return await this.scoresEntity
      .findByIds(
        seedSet
      );
  }

  /**
   * 当前种子用户 id
   *@returns [id]
   */
  async ids() {
    let seedSet = await this.seedsEntity
      .createQueryBuilder()
      .orderBy("id", "DESC")
      .getOne();
    return seedSet.seeds.split(',');
  }

  /**
   * 获取Top用户
   */
  async top(algo) {
    if (algo != 'reputation' && this.supportAlgo.indexOf(algo) == -1) {
      throw new CoolCommException('不受支持的算法');
    }
    let topUsers = await this.neo4j.top(algo);
    let userIds = topUsers.records.map(topUser => {
      return this.neo4j.resHead(topUser);
    });
    return await this._userInfo(userIds);
  }

  /**
   * nonce下种子用户和名人堂信息列表
   */
  async list(nonce, type = 'seeds') {
    if (!this.utils.isNmber(nonce)) {
      throw new CoolCommException('参数不正确');
    }
    const seedSet = await this.seedsEntity.findOne(nonce);
    if (_.isEmpty(seedSet)) {
      throw new CoolCommException('NO EXIT!');
    }
    if (!seedSet[type]) {
      return [];
    }
    const ids = seedSet[type].split(',');
    return await this._userInfo(ids);
  }

  /**
   * 爬取当前种子用户信息列表
   */
  async getSeedsInfo() {
    let userIds = await this.ids();
    let supportAlgo = this.supportAlgo;

    // Top 用户
    supportAlgo.forEach(async e => {
      let topUsers = await this.neo4j.top(e, 20);
      topUsers.records.forEach(topUser => {
        const u = this.neo4j.resHead(topUser);
        if (userIds.indexOf(u) === -1) {
          supportAlgo.push(u);
        }
      });
    });

    let seedsInfo = await this.usersEntity.findByIds(userIds);

    for (let i = 0; i < userIds.length / 30; i++) {
      // 直接拼接字符串
      let url = '';
      let newSeedsObj = {};
      seedsInfo.slice(i * 30, (i + 1) * 30 - 1).forEach((seed) => {
        let seedAddress = this.utils.toChecksumAddress(seed.address)
        url = url + 'address[]=' + seedAddress + '&';
        newSeedsObj[seedAddress] = seed.id;
      })

      const circlesInfo = await this.getCirclesUser(url);

      circlesInfo.forEach(async (item) => {
        let avatarUrl = item.avatarUrl;
        await this.seedsInfoEntity.save({
          id: newSeedsObj[item.safeAddress],
          avatar: avatarUrl ? avatarUrl.slice(avatarUrl.lastIndexOf('/') + 1, avatarUrl.lenght) : null,
          cid: item.id,
          username: item.username,
        })
      });
    }

    return 'SEED INFO DONE';
  }

  /**
   * 获取名人堂用户并加入种子表
   */
  async setFames() {
    const fame = await this.fameEntity.find({ status: 1 });
    const fameArr = fame.map(x => { return x.id });
    let sysInfo = await this.sys.infoAndCheckAlgo();
    await this.seedsEntity.save({
      id: sysInfo.nonce,
      fame: fameArr.toString()
    })
    await this.sysInfoEntity.update(sysInfo.id, {
      fame_count: fameArr.length
    });
  }

  /**
   * 返回名人堂 ids
   */
  async fameIds() {
    let seedSet = await this.seedsEntity
      .createQueryBuilder()
      .orderBy("id", "DESC")
      .getOne();
    return seedSet.fame.split(',');
  }

  /**
   * 请求circles用户资料
   */
  async getCirclesUser(p) {
    let url = this.circlesApi.url + 'users?'
    const data = await this.app.curl(url + p, {
      contentType: 'json',
      dataType: 'json'
    });

    return data.data.data;
  }

  /**
   * 保存circles用户资料
   */
  async saveCirclesUser(data) {
    const { id, avatar, cid, username } = data;
    await this.seedsInfoEntity.save({
      id: Number(id),
      avatar: avatar ? avatar.slice(avatar.lastIndexOf('/') + 1, avatar.lenght) : null,
      cid: cid || null,
      username: username
    })
  }

  /**
   * 用户资料
   *@param ids 用户id数组 [...id]
   */
  async _userInfo(ids) {
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
}