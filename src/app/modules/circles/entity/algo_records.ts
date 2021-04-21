import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_algo_records')
export class CirclesAlgoRecordsEntity extends BaseEntity {
  @Column()
  work_id: number;

  @Column()
  pace: string;
}
