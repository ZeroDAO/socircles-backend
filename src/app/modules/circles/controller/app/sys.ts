import {
  Body,
  Inject,
  Post,
  Provide
} from '@midwayjs/decorator';
import { Context } from 'egg';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesSysInfoEntity } from '../../entity/sys_info'
import { CirclesSysService } from '../../service/sys'


/**
 * 系统信息
 */
@Provide()
@CoolController({
  api: ['list'],
  entity: CirclesSysInfoEntity,
  service: CirclesSysService,
  listQueryOp: {
    where: async (ctx: Context) => {
      return [
        ['status = 0'],
      ]
    },
    select: ['id', 'nonce'],
    addOrderBy: {
      id: 'desc'
    }
  }
})
export class SysAppController extends BaseController {

  @Inject()
  sys: CirclesSysService;

  /**
   * 获取完成状态的系统信息
   */
  @Post('/info')
  async info(
    @Body() nonce?: number,
  ) {
    return this.ok(await this.sys.info(nonce));
  }
}
