import { Get, Inject, Post, Provide } from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { IQueue } from 'midwayjs-cool-queue';
import { CirclesUsersEntity } from '../../entity/users';
import { CirclesUsersService } from '../../service/users';
import { CirclesTrustService } from '../../service/trust';
import { CirclesAlgorithmsService } from '../../service/algorithms';
import { CirclesSeedsService } from '../../service/seeds';


/**
 * 商品
 */
@Provide()
@CoolController({
  api: ['info', 'list', 'page'],
  entity: CirclesUsersEntity,
  listQueryOp: {
    keyWordLikeFields: ['title'],
  },
})
export class CirclesAppTestController extends BaseController {
  @Inject()
  circlesUsersService: CirclesUsersService;
  @Inject()
  circlesTrustService: CirclesTrustService;
  @Inject()
  algo: CirclesAlgorithmsService;

  @Inject()
  seeds: CirclesSeedsService;

  // 队列
  @Inject()
  demoQueue: IQueue;

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/getuser')
  async getuser() {
    return this.ok(await this.circlesUsersService.user());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/test')
  async test() {
    return this.ok(await this.algo.start());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/importSeedPath')
  async importSeedPath() {
    return this.ok(await this.algo.importSeedPath());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Post('/cirdata')
  async cirdata() {
    return this.ok(await this.circlesTrustService.getTrust());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/seedsInfo')
  async seedsInfo() {
    return this.ok(await this.seeds.seedsInfo());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/getAlgoUserList')
  async getAlgoUserList() {
    return this.ok(await this.circlesTrustService.getAlgoUserList(0,1));
  }

  /**
   * 请求用户数据
   * @returns
   */
   @Get('/setAlgoUserList')
   async setAlgoUserList() {
     return this.ok(await this.circlesTrustService.setAlgoUserList());
   }

}
