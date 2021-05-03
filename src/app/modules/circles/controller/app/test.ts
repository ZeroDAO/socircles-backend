import { Get, Inject, Post, Provide, Query } from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { IQueue } from 'midwayjs-cool-queue';
import { CirclesUsersEntity } from '../../entity/users';
import { CirclesUsersService } from '../../service/users';
import { CirclesTrustService } from '../../service/trust';
import { CirclesAlgorithmsService } from '../../service/algorithms';
import { CirclesSeedsService } from '../../service/seeds';
import { CirclesTestService } from '../../service/test';
import { Neo4jService } from '../../service/neo4j';
import { CirclesJobsService } from '../../service/jobs';


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
  jobsService: CirclesJobsService;

  @Inject()
  neo4j: Neo4jService;

  @Inject()
  circlesTrustService: CirclesTrustService;

  @Inject()
  algo: CirclesAlgorithmsService;

  @Inject()
  testService: CirclesTestService;

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
    return this.ok(await this.circlesUsersService.setAlgoUserList());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/trustCount')
  async trustCount() {
    return this.ok(await this.testService.trustCount(1, 200));
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
  @Post('/cirdata')
  async cirdata() {
    return this.ok(await this.circlesTrustService.getTrust());
  }

  /**
   * 运行对照组算法
   * @returns
   */
  @Get('/algoConpared')
  async algoConpared() {
    return this.ok(await this.algo.algoConpared('closeness'));
  }

  /**
   * 开始新的一轮
   * @returns
   */
  @Get('/start')
  async start() {
    return this.ok(await this.algo.start());
  }

  /**
   * 设置种子
   * @returns
   */
  @Get('/setSeeds')
  async setSeeds() {
    return this.ok(await this.algo.setSeeds());
  }

  /**
   * 设置种子
   * @returns
   */
  @Get('/importSeedPath')
  async importSeedPath(@Query() sid: number) {
    return this.ok(await this.algo.importSeedPath(sid));
  }

  /**
   * 获取用户数量
   * @returns
   */
  @Get('/algoCount')
  async algoCount() {
    return this.ok(await this.jobsService.test());
  }

  /**
   * 设置种子
   * @returns
   */
  @Get('/algoRw')
  async algoRw(@Query() start: number, @Query() end: number) {
    return this.ok(await this.algo.algoRw(start, end));
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/seedsInfo')
  async seedsInfo() {
    return this.ok(await this.seeds.info());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/getTask')
  async getTask() {
    return this.ok(await this.circlesTrustService.test());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/setAlgoUserList')
  async setAlgoUserList() {
    return this.ok(await this.circlesTrustService.test());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/setReputation')
  async setReputation() {
    return this.ok(await this.neo4j.setReputation());
  }

  /**
   * 请求用户数据
   * @returns
   */
  @Get('/updateRelWeight')
  async updateRelWeight() {
    return this.ok(await this.neo4j.updateRelWeight());
  }

}
