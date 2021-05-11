import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 种子用户信息
 */
@EntityModel('circles_seeds_info')
export class CirclesSeedsInfoEntity extends BaseEntity {
  @Column({ comment: 'circles 头像', nullable: true})
  avatar: string;

  @Column({ comment: 'circles 用户名'})
  username: string;

  @Column({ comment: 'circles id'})
  cid: number;
}
