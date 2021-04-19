import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 用户各类权重值
 */
 @EntityModel('circles_scores')
 export class CirclesScoretEntity extends BaseEntity {
   @Index()
   @Column({ comment: 'user id', type: 'bigint'})
   uid: number;
   
   @Index()
   @Column({ comment: 'rw renew nonce'})
   nonce: number;
 
   @Column({ type: 'float', default: 0 })
   reputation: number;
 }
