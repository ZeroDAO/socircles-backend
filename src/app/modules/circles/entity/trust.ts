import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 信任关系
 */
@EntityModel('circles_scores')
export class CirclesScoresEntity extends BaseEntity {
  @Index()
  @Column({ comment: 'trusted id', type: 'bigint'})
  trusted: number;

  @Index()
  @Column({ comment: 'trustee id', type: 'bigint'})
  trustee: number;

  @Column({ comment: 'distance', default: 0 })
  distance: number;
}
