import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import {
  Column
} from 'typeorm';

/**
 * 名人堂
 */
@EntityModel('circles_fame')
export class CirclesFameEntity extends BaseEntity {
  @Column({ comment: '状态 0:取消 1:正常', default: 1, type: 'tinyint' })
  status: number;

  @Column({ comment: '成员排名和权重', default: 1 })
  rank: number;
}