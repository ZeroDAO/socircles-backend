import { Inject, Provide, App } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesTrustEntity } from '../entity/trust';
import { CirclesTrustChangesEntity } from '../entity/trust_changes';
import { CirclesTrustCountEntity } from '../entity/trust_count';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';
import { CirclesSysService } from './sys';
import { Context } from 'egg';
import { Config } from '@midwayjs/decorator';
import { CirclesNeo4jService } from './neo4j';
import { TaskLogEntity } from '../../task/entity/log';
import { Application } from 'egg';
import * as _ from 'lodash';
var async = require('async');

const CRAWLER_LOCK = "crawlerLock"

/**
 * 信任关系和用户数据
 */
@Provide()
export class CirclesTrustService extends BaseService {
  @InjectEntityModel(CirclesTrustEntity)
  circlesTrustEntity: Repository<CirclesTrustEntity>;

  @InjectEntityModel(TaskLogEntity)
  taskLogEntity: Repository<TaskLogEntity>;

  @InjectEntityModel(CirclesTrustChangesEntity)
  circlesTrustChangesEntity: Repository<CirclesTrustChangesEntity>;

  @InjectEntityModel(CirclesUsersEntity)
  circlesUsersEntity: Repository<CirclesUsersEntity>;

  @InjectEntityModel(CirclesTrustCountEntity)
  circlesTrustCountEntity: Repository<CirclesTrustCountEntity>;

  @Inject()
  neo4j: CirclesNeo4jService;

  @Inject()
  sys:CirclesSysService;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  @Inject()
  ctx: Context;

  @Config('thegraph')
  thegraph;

  @App()
  app: Application;

  /**
   * 采集数据并入库
   */
  async trustCount() {
    return await this.circlesTrustEntity.count();
  }

  /**
   * 采集数据并入库
   */
  async collection(init = false) {
    let lock = await this.getLock();
    if (lock && lock == 1) return "LOCKED!WAITING...";
    const url = this.thegraph.url;
    let trustChange = await this.circlesTrustChangesEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    let op = _.isEmpty(trustChange) ? '' : `, where: { id_gt: "${trustChange.c_t_id}" }`;
    await this.sys.infoAndCheckCrawler();

    // 初始化数据库，建立索引和约束
    if (init) {
      await this.neo4j.init();
    }
    let userCount = 0;
    let relCount = 0;
    let logDetail = 'circles_' + Date.now() + Math.ceil(Math.random() * 1000);
    const ctx = this.app.createAnonymousContext()
    let circlesData = await ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      data: { "query": `{trustChanges(first: 1000 ${op}) {id,canSendTo,user,limitPercentage}}`, "variables": {} },
      dataType: 'json'
    })
    let circlesDataCount = Object.keys(circlesData.data.data.trustChanges).length;
    await this.addLock();
    async.forEachSeries(circlesData.data.data.trustChanges, async (t, callback) => {
      let trusted = await this.findOrAddUsers(t.canSendTo);
      let trustee = await this.findOrAddUsers(t.user);
      if (trusted.isNew) {
        await this.neo4j.createNode({
          uid: trusted.id,
          address: t.canSendTo
        })
        userCount++
      }
      if (trustee.isNew) {
        await this.neo4j.createNode({
          uid: trustee.id,
          address: t.user
        })
        userCount++
      }
      if (t.canSendTo != t.user) {
        let trust = await this.circlesTrustEntity.findOne({ trusted: t.canSendTo, trustee: t.user });
        let trustCount = await this.circlesTrustCountEntity.findOne(trusted.id);
        if (t.limitPercentage == '0') {
          if (!_.isEmpty(trust)) {
            await this.neo4j.delRel({
              trusted: trusted.id,
              trustee: trustee.id,
            })
            await this.circlesTrustEntity.delete(trust.id);
            // 减少关注人数
            await this.circlesTrustCountEntity.save({ id: trusted.id, count: trustCount.count - 1 });
          }
        } else {
          if (_.isEmpty(trust)) {
            let crateData = {
              trusted: trusted.id,
              trustee: trustee.id
            }
            await this.neo4j.createRel({
              trusted: trusted.id,
              trustee: trustee.id,
            })
            await this.circlesTrustEntity.save(crateData);
            // 增加关注人数
            await this.circlesTrustCountEntity.save({
              id: trusted.id,
              count: _.isEmpty(trustCount) ? 1 : trustCount.count + 1
            });
            relCount++
          }
        }
      }
      await this.circlesTrustChangesEntity.save({
        trustee: trustee.id,
        trusted: trusted.id,
        limit_percentage: t.limitPercentage,
        c_t_id: t.id,
      })
      callback(null);
    }, async (err,) => {
      await this.removeLock();
      if (err) {
        throw new CoolCommException(err);
      }
      // 保存任务结果到log
      let task = await this.taskLogEntity.findOne({detail: `"${logDetail}"`});
      if (task) {
        await this.taskLogEntity.update(task.id,{detail: `${circlesDataCount},${userCount},${relCount}`});
      }
    });
    return logDetail;
  }

  /**
   * 锁定信任数据采集和入库任务
   */
  async addLock() {
    const redis = await this.getRedis();
    return redis.set(CRAWLER_LOCK, 1);
  }

  /**
   * 解除信任数据采集和入库任务锁定
   */
  async removeLock() {
    const redis = await this.getRedis();
    return redis.set(CRAWLER_LOCK, 0);
  }

  /**
   * 锁定信任数据采集和入库任务
   */
  async getLock() {
    const redis = await this.getRedis();
    return redis.get(CRAWLER_LOCK);
  }

  async findOrAddUsers(address) {
    let user = await this.circlesUsersEntity.findOne({ address: address });
    let isNew = _.isEmpty(user)
    if (isNew) {
      user = await this.circlesUsersEntity.save({
        address: address
      })
    }
    return {
      id: user.id,
      isNew: isNew
    };
  }

  async getRedis() {
    if (!this.coolCache.getMetaCache()) {
      await this.coolCache.init();
    }
    return await this.coolCache.getMetaCache();
  }


  async test() {
    const logDetail = 'circles_1620012540661298';
    let task = await this.taskLogEntity.findOne({detail: `"${logDetail}"`})
    return task;
  }

}
