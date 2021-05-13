import {
  Body,
  Inject,
  Post,
  Provide
} from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesSysService } from '../../service/sys'


/**
 * 系统信息
 */
@Provide()
@CoolController()

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

  /**
   * 获取完成状态的系统信息
   */
  @Post('/list')
  async list() {
    return this.ok(await this.sys.list());
  }
}
