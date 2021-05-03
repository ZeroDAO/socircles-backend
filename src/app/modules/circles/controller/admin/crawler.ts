import {
  Body,
  Inject,
  Post,
  Provide
} from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesJobsService } from '../../service/jobs';

/**
 * 爬虫
 */
@Provide()
@CoolController()
export class CirclesCrawlerController extends BaseController {
  @Inject()
  jobsService: CirclesJobsService;

  /**
   * 开始任务
   */
  @Post('/collection')
  async collection(@Body() every: number) {
    return this.ok(await this.jobsService.collection(every));
  }

  /**
   * 获取爬虫 task
   */
  @Post('/getInfo')
  async getInfo() {
    return this.ok(await this.jobsService.crawlerInfo());
  }

  /**
   * 启动任务
   */
   @Post('/start')
   async start(@Body() id: number) {
     return this.ok(await this.jobsService.startCollection(id));
   }

  /**
   * 启动任务
   */
   @Post('/stop')
   async stop(@Body() id: number) {
     return this.ok(await this.jobsService.stopCollection(id));
   }

}
