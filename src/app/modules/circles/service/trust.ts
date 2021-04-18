import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesTrustEntity } from '../entity/trust';
import { CirclesTrustChangesEntity } from '../entity/trust_changes';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';
import { Context } from 'egg';
import { Neo4jService } from './neo4j';
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

  @Inject()
  neo4j: Neo4jService;

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
   async getTrust(init = false) {
    const url = this.getConfig().thegraph_url;
    let trustChange = await this.circlesTrustChangesEntity.createQueryBuilder()
      .addOrderBy('id', 'DESC')
      .getOne();
    let op = _.isEmpty(trustChange) ? '' : `, where: { id_gt: "${trustChange.c_t_id}" }`;

    // 初始化数据库，建立索引和约束
    if (init) {
      await this.neo4j.init();
    }
    
    let circlesData = await this.ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      data: {"query":`{trustChanges(first: 1000 ${op}) {id,canSendTo,user,limitPercentage}}`,"variables":{}},
      dataType: 'json'
    })
    async.forEachSeries( circlesData.data.data.trustChanges, async (t, callback) => {
      let trusted = await this.findOrAddUsers(t.canSendTo);
      let trustee = await this.findOrAddUsers(t.user);
      if (trusted.isNew) {
        this.neo4j.createNode({
          uid: trusted.id,
          address: t.canSendTo
        })
      }
      if (trustee.isNew) {
        this.neo4j.createNode({
          uid: trustee.id,
          address: t.user
        })
      }
      if (t.canSendTo != t.user) {
        let trust = await this.circlesTrustEntity.findOne({ trusted: t.canSendTo, trustee: t.user });
        if (t.limitPercentage == '0') {
          if (!_.isEmpty(trust)) {
            await this.neo4j.delRel({
              trusted: trusted.id,
              trustee: trustee.id,
            })
            await this.circlesTrustEntity.delete(trust.id);
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
    }, function(err) {          
      return err;
    });
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

   async test() {
    return this.neo4j.run('RETURN timestamp()');
   }
  
}
