import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column, Index } from 'typeorm';

/**
 * 用户各类权重值
 */
 @EntityModel('circles_seeds')
 export class CirclesScoretEntity extends BaseEntity {
   @Index()
   @Column({ comment: 'user id', type: 'bigint'})
   uid: number;
   
   @Index()
   @Column({ comment: 'rw renew nonce'})
   nonce: number;
 
   @Column({ type: 'float', default: 0 })
   betweenness: number;
 
   @Column({ type: 'float', default: 0 })
   page_rank: number;
 
   @Column({ type: 'float', default: 0 })
   degree: number;
 
   @Column({ default: 0 })
   reputation_score: number;
 }
