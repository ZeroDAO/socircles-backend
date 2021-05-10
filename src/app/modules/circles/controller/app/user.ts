import { App, Inject, Post, Provide, Body } from '@midwayjs/decorator';
import { Context } from 'egg';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesUsersService } from '../../service/users'
import { CirclesNeo4jService } from '../../service/neo4j'
import * as _ from 'lodash';

/**
 * 用户信息
 */
@Provide()
@CoolController()
export class UserAppController extends BaseController {

  @Inject()
  user: CirclesUsersService;

  @Inject()
  neo4j: CirclesNeo4jService;

  /**
   * 获取用户详细信息
   */
  @Post('/info')
  async info(
    @Body() address: string,
  ) {
    return this.ok(await this.user.info(address))
  }

  /**
   * 用户声誉值
   */
  @Post('/reputationt')
  async reputationt(
    @Body() nonce: number,
    @Body() address: string,
  ) {
    const uid = await this.user.addressToId(address);
    return this.ok(uid ? await this.user.score(uid, nonce) : '');
  }

  /**
   * 最短路径
   */
  @Post('/path')
  async path(
    @Body() source: string,
    @Body() target: string,
  ) {
    const sourceUid = await this.user.addressToId(source);
    const targetUid = await this.user.addressToId(target);
    let res = await this.neo4j.shortestPath(sourceUid, targetUid);

    let path = [];

    if (!_.isEmpty(res)) {
      path = res.records[0]._fields[0].segments.map((s) => {
        return s.start.properties.address;
      })
    }

    return this.ok(path);
  }
}
