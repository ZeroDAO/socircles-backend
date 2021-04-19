import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_path')
export class CirclesSeedsEntity extends BaseEntity {
  // target uid
  @Index()
  @Column({ comment: 'user id', type: 'bigint'})
  target: number;

  // seed uid
  @Index()
  @Column({ comment: 'user id', type: 'bigint'})
  sid: number;

  // node uids
  @Column()
  nodes: string;

  @Column()
  costs: string;
}
