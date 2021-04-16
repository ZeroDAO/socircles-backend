import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 用户各类权重值
 */
 @EntityModel('circles_reputationt_details')
 export class CirclesReputationtDetailsEntity extends BaseEntity {
   @Index()
   @Column({ comment: 'user id', type: 'bigint'})
   uid: number;

   @Index()
   @Column({ comment: 'user id', type: 'bigint'})
   sid: number;
   
   @Index()
   @Column({ comment: 'rw renew nonce'})
   nonce: number;
 
   @Column({ default: 0 })
   score: number;

   @Column({ nullable: true, length: 55 })
   nodes: string;
 }
