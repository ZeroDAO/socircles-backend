import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 关系数据更新增量
 */
@EntityModel('circles_trust_delta')
export class CirclesTrustDeltaEntity extends BaseEntity {
  @Column({ comment: 'trusted id', type: 'bigint'})
  trusted: number;

  @Column({ comment: 'trustee id', type: 'bigint'})
  trustee: number;

  @Column({ comment: 'distance', default: 0 })
  distance: number;
}
