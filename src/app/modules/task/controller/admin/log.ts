import { Provide} from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { TaskLogEntity } from '../../entity/log';

/**
 * 任务
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'info', 'page'],
  entity: TaskLogEntity,
  pageQueryOp: {
    fieldEq: ['id', 'taskId', 'status', 'detail', 'createTime'],
  },
})
export class TaskLogController extends BaseController {}
