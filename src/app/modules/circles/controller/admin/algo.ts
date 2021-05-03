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
    // 是否成功更新计算期
    let inAlgo = sysInfo && sysInfo.status == 0;
    if (inAlgo) {
      // 是否开始监测任务
      algoInfo = await this.jobsService.jobInfo(sysInfo.nonce);
    }
    return this.ok({
      inAlgo,
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

}
