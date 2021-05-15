import {
  Body,
  Inject,
  Post,
  Provide,
  Get
} from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesJobsService } from '../../service/jobs';
import { CirclesSysService } from '../../service/sys';
import { CirclesAlgorithmsService } from '../../service/algorithms';
import * as _ from 'lodash';

/**
 * 计算
 */
@Provide()
@CoolController()
export class CirclesAlgoController extends BaseController {
  @Inject()
  jobsService: CirclesJobsService;

  @Inject()
  sys: CirclesSysService;

  @Inject()
  algo: CirclesAlgorithmsService;

  /**
   * 获取当前计算状态
   */
  @Get('/jobInfo')
  async jobInfo() {
    let sysInfo = await this.sys.info();
    let algoInfo = {};
    if (sysInfo && sysInfo.status != 0) {
      algoInfo = await this.jobsService.jobInfo(sysInfo.nonce);
    }
    return this.ok({
      inAlgo: sysInfo && sysInfo.status != 0 && !_.isEmpty(algoInfo),
      sysInfo,
      algoInfo
    });
  }

  /**
   * 开始任务
   */
  @Post('/start')
  async start(
    @Body() seed_count: number,
    @Body() seed_score: number,
    @Body() damping_factor: number,
    @Body() min_divisor: number,
    @Body() seed_algo: string,
    @Body() every: number,
  ) {
    await this.algo.start(
      seed_count,
      seed_score,
      damping_factor,
      min_divisor,
      seed_algo)
    await this.jobsService.startWatch(every)
    return this.ok();
  }

  /**
   * 暂停任务
   */
  @Post('/pause')
  async pause() {
    return this.ok(await this.jobsService.stopWatch());
  }

  /**
   * 恢复任务
   */
  @Post('/regain')
  async regain() {
    return this.ok(await this.jobsService.regainWatch());
  }

  /**
   * 完成任务
   */
  @Post('/finish')
  async finish() {
    return this.ok(await this.algo.finish());
  }

  // TODO: Forced end

  /**
   * 完成任务
   */
  @Post('/set_algo_every')
  async setAlgoEvery(@Body() every: number) {
    return this.ok(await this.jobsService.setAlgoEvery(every));
  }
}
