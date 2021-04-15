import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_seeds')
export class CirclesScoretEntity extends BaseEntity {
  @Index()
  @Column({ comment: 'user id', type: 'bigint'})
  uid: number;

  // 状态 -1：删除 0: 禁用 1：正常
  @Column({ default: 1, type: 'tinyint' })
  status: number;
}
