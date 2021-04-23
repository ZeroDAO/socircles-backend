import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 信任关系
 */
@EntityModel('circles_trust_count')
export class CirclesTrustCountEntity extends BaseEntity {
  @Column()
  count: number;
}
