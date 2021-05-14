import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesAlgoRecordsEntity } from '../entity/algo_records';
import { ICoolCache } from 'midwayjs-cool-core';
import { CirclesSysService } from './sys';
import { Utils } from '../../../comm/utils';
import * as _ from 'lodash';

/**
 * 计算汇总记录
 */
@Provide()
export class CirclesAlgoRecordsService extends BaseService {
    @InjectEntityModel(CirclesAlgoRecordsEntity)
    algoRecordsEntity: Repository<CirclesAlgoRecordsEntity>;

    @Inject()
    sys: CirclesSysService;

    @Inject()
    utils:Utils;

    @Inject('cool:cache')
    coolCache: ICoolCache;

    /**
     * 获取算法汇总信息
     */
    async list(query?) {
        
        try {
            let nonce = null;
            if (!_.isEmpty(query)) {               
                nonce = query.nonce;

                if (!nonce || !this.utils.isNmber(nonce) || !await this.sys.checkStatus(nonce)) {
                    throw new CoolCommException('参数错误或 nonce 状态不正确');
                }
            } else {
                const sysInfo = await this.sys.lastAlgo();
                nonce = sysInfo.nonce;
            }
            return await this.algoRecordsEntity.find({ nonce: nonce });
        } catch (error) {
            throw new CoolCommException(error);
        }

    }
}
