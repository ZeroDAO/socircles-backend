import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_seeds')
export class CirclesSeedsEntity extends BaseEntity {
  @Index()
  @Column()
  nonce: number;

  @Column({ default: 1, type: 'tinyint' })
  seeds: number;
}
