import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 用户数据
 */
@EntityModel('circles_users')
export class CirclesUsersEntity extends BaseEntity {
  @Index()
  @Column({ comment: 'circles user id' , nullable: true})
  cid: string;

  @Column({ comment: '用户名' , nullable: true})
  name: string;

  @Column({ comment: '用户地址' , length: 55})
  address: string;
}
