import { EntityModel } from '@midwayjs/orm';
import { BaseEntity } from 'midwayjs-cool-core';
import { Column } from 'typeorm';

/**
 * 用户各类权重值
 */
 @EntityModel('circles_scores')
 export class CirclesScoresEntity extends BaseEntity {
   @Column({ type: 'float', default: 0 })
   reputation: number;
 }