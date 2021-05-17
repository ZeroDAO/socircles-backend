import {
  Body,
  Inject,
  Post,
  Provide
} from '@midwayjs/decorator';
import { CoolController, CoolCommException, BaseController } from 'midwayjs-cool-core';
import { CirclesSysService } from '../../service/sys'
import { Utils } from '../../../../comm/utils';


/**
 * 系统信息
 */
@Provide()
@CoolController()

export class SysAppController extends BaseController {

  @Inject()
  sys: CirclesSysService;

  @Inject()
  utils: Utils;

  /**
   * 获取完成状态的系统信息
   */
  @Post('/info')
  async info(
    @Body() nonce?: number,
  ) {
    if (!this.utils.isNmber(nonce)) {
      throw new CoolCommException('参数错误或 nonce 状态不正确');
    }
    return this.ok(await this.sys.done_info(nonce));
  }

  /**
   * 获取完成状态的系统信息
   */
  @Post('/list')
  async list() {
    return this.ok(await this.sys.list());
  }
}
