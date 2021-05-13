import { Inject, Post, Provide, Body } from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesSeedsService } from '../../service/seeds';
import * as _ from 'lodash';

import { CirclesAlgorithmsService } from '../../service/algorithms';

/**
 * 用户信息
 */
@Provide()
@CoolController()
export class SeedAppController extends BaseController {

  @Inject()
  seeds: CirclesSeedsService;

  @Inject()
  algo: CirclesAlgorithmsService;

  /**
   * 种子信息列表
   */
  @Post('/list')
  async info(
    @Body() nonce: number,
  ) {
    return this.ok(await this.seeds.list(nonce))
  }
}
