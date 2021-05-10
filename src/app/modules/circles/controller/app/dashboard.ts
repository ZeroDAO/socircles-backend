import { App, Inject, Post, Provide } from '@midwayjs/decorator';
import { IMidwayWebApplication } from '@midwayjs/web';
import { Context } from 'egg';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesAlgoRecordsEntity } from '../../entity/algo_records'
import { CirclesAlgoRecordsService } from '../../service/algo_records'

/**
 * 汇总信息
 */
@Provide()
@CoolController({
  api: ['list'],
  entity: CirclesAlgoRecordsEntity,
  service: CirclesAlgoRecordsService
})
export class DashboardAppController extends BaseController {

  @Inject()
  ctx: Context;

  @App()
  app: IMidwayWebApplication;

  @Inject()
  CirclesAlgoRecordsService: CirclesAlgoRecordsService;
}
