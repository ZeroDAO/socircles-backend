import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import {
  Column
} from 'typeorm';

/**
 * 名人堂
 */
@EntityModel('circles_fame_cost')
export class CirclesFameCostEntity extends BaseEntity {
  @Column({ comment: '目标用户id' })
  tid: number;

  @Column({ comment: '距离' })
  cost: number;
}