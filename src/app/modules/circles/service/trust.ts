import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesTrustEntity } from '../entity/trust';
import { CirclesTrustChangesEntity } from '../entity/trust_changes';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';
import { Context } from 'egg';
import * as _ from 'lodash';

var async = require('async');

/**
 * 商品
 */
@Provide()
export class CirclesTrustService extends BaseService {
  @InjectEntityModel(CirclesTrustEntity)
  circlesTrustEntity: Repository<CirclesTrustEntity>;

  @InjectEntityModel(CirclesTrustChangesEntity)
  circlesTrustChangesEntity: Repository<CirclesTrustChangesEntity>;

  @InjectEntityModel(CirclesUsersEntity)
  circlesUsersEntity: Repository<CirclesUsersEntity>;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  @Inject()
  ctx: Context;

  getConfig() {
    return {
      thegraph_url: this.ctx.app.config.thegraph.url,
    }
  }

  /**
   * 返回用户数据
   */
   async getTrust() {
    const url = this.getConfig().thegraph_url;
    let trustChange = await this.circlesTrustChangesEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    let op = _.isEmpty(trustChange) ? '' : `, where: { id_gt: "${trustChange.c_t_id}" }`;
    
    let circlesData = await this.ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      data: {"query":`{trustChanges(first: 1000 ${op}) {id,canSendTo,user,limitPercentage}}`,"variables":{}},
      dataType: 'json'
    })

    // 同步执行，否则可能导致trust关系错误
    async.forEachSeries( circlesData.data.data.trustChanges, async (t, callback) => {
      let trusted = await this.findOrAddUsers(t.canSendTo);
      let trustee = await this.findOrAddUsers(t.user);
      if (t.canSendTo != t.user) {
        let trust = await this.circlesTrustEntity.findOne({trusted: t.canSendTo, trustee: t.user });
        if (t.limitPercentage == '0') {
          await this.circlesTrustEntity.delete(trust);
          // 更新用户到neo4j
        } else {
          if (_.isEmpty(trust)) {
            await this.circlesTrustEntity.save({
              trusted: trusted,
              trustee: trustee
            });
          }
          // 更新用户到neo4j
        }
      }
      await this.circlesTrustChangesEntity.save({
        trustee: trustee,
        trusted: trusted,
        limit_percentage: t.limitPercentage,
        c_t_id: t.id,
      })
      callback(null);
    }, function(err) {
      return err;
    });

    return trustChange.id;
   }

   async findOrAddUsers(address) {
     let user = await this.circlesUsersEntity.findOne({ address: address });
     if (_.isEmpty(user)) {
       user = await this.circlesUsersEntity.save({
         address: address
       })
       // 更新用户到neo4j
     }
     return user.id;
   }
  
}
