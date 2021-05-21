import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_path')
export class CirclesPathEntity extends BaseEntity {
  // target uid
  @Index()
  @Column({ comment: 'user id', type: 'bigint'})
  tid: number;

  // seed uid
  @Index()
  @Column({ comment: 'user id', type: 'bigint'})
  sid: number;

  // node uids
  @Column()
  nids: string;

  @Column()
  costs: string;

  @Column()
  totalCost: number;
}
