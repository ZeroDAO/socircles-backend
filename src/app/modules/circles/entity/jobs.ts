import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 种子用户
 */
@EntityModel('circles_jobs')
export class CirclesJobsEntity extends BaseEntity {
  @Index()
  @Column()
  task_id: number;

  @Column()
  job_id: string;

  @Column()
  grade: number;

  @Column({ comment: '状态 0:中段 1：正常', default: 1, type: 'tinyint' })
  status: number;

  @Column()
  total_steps: number;

  @Column({ comment: '当前进度', default: 0})
  curr_step: number;

  @Column({ comment: '子任务总数', default: 1})
  total_sub_step: number;

  @Column({ comment: '当前子任务进度', default: 0})
  curr_sub_step: number;
}
