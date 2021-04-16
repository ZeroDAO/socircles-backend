import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 用户数据
 */
@EntityModel('circles_trust_changes')
export class CirclesTrustChangesEntity extends BaseEntity {

  @Index()
  @Column({ type: 'bigint'})
  trusted: number;

  @Index()
  @Column({ type: 'bigint'})
  trustee: number;

  // Circles TrustChange id
  @Index()
  @Column({ length: 16 })
  c_t_id: string;

  @Column({ comment: 'Circles event', type: 'bigint'})
  limit_percentage: number;
}
