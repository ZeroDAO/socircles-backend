import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 各算法基础指标记录
 */
@EntityModel('circles_algo_records')
export class CirclesAlgoRecordsEntity extends BaseEntity {
  @Index()
  @Column()
  nonce: number;

  @Index()
  @Column({ length: '16' })
  algo: string;

  @Column({ type: 'float', default: 0 })
  p99: number;

  @Column({ type: 'float', default: 0 })
  p90: number;

  @Column({ type: 'float', default: 0 })
  p50: number;

  @Column({ type: 'float', default: 0 })
  p999: number;

  @Column({ type: 'float', default: 0 })
  p95: number;

  @Column({ type: 'float', default: 0 })
  p75: number;

  @Column({ type: 'float', default: 0 })
  min: number;

  @Column({ type: 'float', default: 0 })
  max: number;

  @Column({ type: 'float', default: 0 })
  mean: number;
}
