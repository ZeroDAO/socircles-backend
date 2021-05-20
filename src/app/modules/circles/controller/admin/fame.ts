import {
  Provide,
  Inject
} from '@midwayjs/decorator';
import { CoolController, BaseController } from 'midwayjs-cool-core';
import { CirclesFameService } from '../../service/fame';
import { CirclesFameEntity } from '../../entity/fame';
import { CirclesSeedsInfoEntity } from '../../entity/seeds_info';
import * as _ from 'lodash';

/**
 * 名人堂
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'page'],
  entity: CirclesFameEntity,
  service: CirclesFameService,

  pageQueryOp: {
    select: ['a.*', 's.avatar', 's.username'],
    leftJoin: [{
      entity: CirclesSeedsInfoEntity,
      alias: 's',
      condition: 'a.id = s.id'
    }],
  },
})
export class CirclesFameController extends BaseController {
  @Inject()
  CirclesFameService: CirclesFameService;
}
