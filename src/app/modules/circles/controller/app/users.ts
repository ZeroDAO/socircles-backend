import { Get, Inject, Post, Provide } from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { IQueue } from 'midwayjs-cool-queue';
import { CirclesUsersEntity } from '../../entity/users';
import { CirclesUsersService } from '../../service/users';
import { CirclesTrustService } from '../../service/trust';

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
export class CirclesAppUsersController extends BaseController {
  @Inject()
  circlesUsersService: CirclesUsersService;
  @Inject()
  circlesTrustService: CirclesTrustService;
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
   @Post('/cirdata')
   async cirdata() {
     return this.ok(await this.circlesTrustService.getTrust());
   }

}
