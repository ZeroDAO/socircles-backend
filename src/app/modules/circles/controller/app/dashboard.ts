import { Provide } from '@midwayjs/decorator';
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
export class DashboardAppController extends BaseController {}
