import { Inject, Provide } from '@midwayjs/decorator';
import * as ipdb from 'ipip-ipdb';
import * as _ from 'lodash';
import { Context } from 'egg';
import * as createKeccakHash from 'keccak';

/**
 * 帮助类
 */
@Provide()
export class Utils {
  @Inject()
  baseDir;

  /**
   * 获得请求IP
   */
  async getReqIP(ctx: Context) {
    const req = ctx.req;
    return (
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress.replace('::ffff:', '')
    );
  }

  /**
   * 根据IP获得请求地址
   * @param ip 为空时则为当前请求的IP地址
   */
  async getIpAddr(ctx: Context, ip?: string | string[]) {
    try {
      if (!ip) {
        ip = await this.getReqIP(ctx);
      }
      const bst = new ipdb.BaseStation(
        `${this.baseDir}/app/comm/ipipfree.ipdb`
      );
      const result = bst.findInfo(ip, 'CN');
      const addArr: any = [];
      if (result) {
        addArr.push(result.countryName);
        addArr.push(result.regionName);
        addArr.push(result.cityName);
        return _.uniq(addArr).join('');
      }
    } catch (err) {
      return '无法获取地址信息';
    }
  }

  /**
   * 去除对象的空值属性
   * @param obj
   */
  async removeEmptyP(obj) {
    Object.keys(obj).forEach(key => {
      if (obj[key] === null || obj[key] === '' || obj[key] === 'undefined') {
        delete obj[key];
      }
    });
  }

  /**
   * 线程阻塞毫秒数
   * @param ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 是否为数字
   * @param obj
   */
  isNmber(obj) {
    if(typeof obj === 'number') {
      return !isNaN(obj)
    } else if(typeof obj === 'string'){
      return /^[0-9]*$/.test(obj)
    }
    return false;
  }

  /**
   * 是否为ETH系地址
   * @param address
   */
  isEthAddress(address) {
    return /^(0x)?[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * 将地址转换为 EIP-55 格式
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-55.md
   * @param address
   */
  toChecksumAddress(address) {
    address = address.toLowerCase().replace("0x", "");
    var hash = createKeccakHash("keccak256").update(address).digest("hex");
    var ret = "0x";

    for (var i = 0; i < address.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        ret += address[i].toUpperCase();
      } else {
        ret += address[i];
      }
    }
    return ret;
  }
}
