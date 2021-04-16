import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_seeds_history')
export class CirclesSeedsHistoryEntity extends BaseEntity {
  @Index()
  @Column({ comment: 'seed id', type: 'bigint'})
  sid: number;

  // 状态 0: 删除 1：增加
  @Column({ default: 1, type: 'tinyint' })
  mode: number;

  // 操作时间
  @Column()
  time: Date;
}
