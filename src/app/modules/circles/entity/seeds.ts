import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_seeds')
export class CirclesSeedsEntity extends BaseEntity {
  @Column({length: 10000, nullable: true})
  seeds: string;

  @Column({length: 2000, nullable: true})
  fame: string;
}