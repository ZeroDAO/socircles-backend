import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_sys_info')
export class CirclesSysInfoEntity extends BaseEntity {
  @Index()
  @Column()
  nonce: number;

  // 状态 -1：失败 0: 计算中 1：已完成
  @Column({ default: 1, type: 'tinyint' })
  status: number;

  @Column({ default: 1000 })
  seed_score: number;

  @Column({ nullable: true })
  seed_count: number;

  @Column({ nullable: true })
  user_count: number;

  @Column({ nullable: true })
  trust_count: number;

  @Column({ type:'float', nullable: true })
  damping_factor: number;

  @Column({ nullable: true })
  min_divisor: number;
}
