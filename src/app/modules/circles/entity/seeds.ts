import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_seeds')
export class CirclesSeedsEntity extends BaseEntity {
  @Column({length: 21000})
  seeds: string;
}
