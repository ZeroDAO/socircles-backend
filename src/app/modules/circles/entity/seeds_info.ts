import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 种子用户信息
 */
@EntityModel('circles_seeds_info')
export class CirclesSeedsInfoEntity extends BaseEntity {
  @Column()
  avatar: string;

  @Column()
  username: string;
}
