import { Application } from 'egg';
import { ModuleConfig } from 'midwayjs-cool-core';

/**
 * 示例
 */
export default (app: Application) => {
  return {
    // 模块名称
    name: 'Circles 数据统计',
    // 模块描述
    description: 'Circles 数据统计',
    // 中间件
    middlewares: [],
  } as ModuleConfig;
};
