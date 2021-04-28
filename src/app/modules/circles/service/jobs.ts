import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesJobsEntity } from '../entity/jobs';
import { ICoolCache } from 'midwayjs-cool-core';
import { TaskInfoService } from '../../task/service/info';
import { TaskInfoEntity } from '../../task/entity/info';
import { CirclesSysService } from './sys';
import { CirclesSeedsService } from './seeds';
import { CirclesUsersService } from './users';

/**
 * 用户
 */
@Provide()
export class CirclesJobsService extends BaseService {
  @InjectEntityModel(CirclesJobsEntity)
  jobsEntity: Repository<CirclesJobsEntity>;

  @InjectEntityModel(TaskInfoEntity)
  taskInfoEntity: Repository<TaskInfoEntity>;

  @Inject()
  taskInfoService: TaskInfoService;

  @Inject()
  users: CirclesUsersService;

  @Inject()
  sys: CirclesSysService;

  @Inject()
  seeds: CirclesSeedsService;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  /**
   * 调用测试
   */
  async test() {
    let jobId = 'circles_' + Date.now() + Math.ceil(Math.random()*1000);
    return await this.taskInfoEntity.save({
      jobId,
      every: 10000,
      service: 'CirclesJobsService.watch()',
      taskType: 1,
    });
  }

  /**
   * 初始化调度，开始任务
   */
  async start(grade) {
    let jobId = 'circles_' + Date.now() + Math.ceil(Math.random()*1000);

    let task = await this.taskInfoEntity.save({
      jobId,
      every: 10000,
      service: 'CirclesJobsService.watch()',
      taskType: 1,
    })

    await this.jobsEntity.insert({
      task_id: task.id,
      total_steps: 8,
      grade
    })

    return await this.taskInfoService.start(task.id);
  }

  /**
   * 任务监测和调度
   */
  async watch() {
    let sysInfo = await this.sys.info();
    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);
    if (jobs.status == 0 ||
      (jobs.total_steps <= jobs.curr_step && jobs.total_sub_step <= jobs.curr_sub_step)) {
      return await this.stopWatch(jobs);
    }
    if (jobs.total_sub_step == jobs.curr_sub_step) {
      return await this.nextStep(jobs.curr_step);
    }
    return;
  }

  /**
   * 调度任务停止
   */
  async stopWatch(jobs) {
    await this.taskInfoService.stop(jobs.id);
  }

  /**
   * 更新步骤信息
   */
  async updateStep(jobs,total_sub_step = 1) {
    jobs.curr_step += 1;
    jobs.curr_sub_step = 0;
    jobs.total_sub_step = total_sub_step;
    await this.jobsEntity.update(jobs.id,jobs);
  }

  /**
   * 任务监测和调度
   */
  async nextStep(jobs) {
    // 开始下一轮任务
    switch (jobs.curr_step) {
      // 中心度计算
      case 0:
        let algos = [''];
        algos.forEach(async a => {
          await this.saveAndStart(
            'CirclesAlgorithmsService',
            'algoConpared',
            a
          )
        });
        await this.updateStep(jobs,algos.length)
        break;
      // 从neo4j获取种子
      case 1:
        await this.saveAndStart(
          'CirclesAlgorithmsService',
          'setSeeds'
          )
        await this.updateStep(jobs)
        break;
      // 初始化种子rw
      case 2:
        await this.saveAndStart(
          'CirclesAlgorithmsService',
          'setSeedsScore'
          )
        await this.updateStep(jobs)
        break;
      // 导出种子路径到文件
      case 3:
        const seedIds = await this.seeds.info();
        seedIds.forEach(async sid => {
          await this.saveAndStart(
            'CirclesAlgorithmsService',
            'getSeedPath',
            String(sid.id)
            )
        });
        await this.updateStep(jobs,seedIds.length)
        break;
      // 种子路径文件导入数据库
      case 4:
        seedIds.forEach(async sid => {
          await this.saveAndStart(
            'CirclesAlgorithmsService',
            'importSeedPath',
            String(sid.id)
            )
        });
        await this.updateStep(jobs,seedIds.length)
        break;
      // 计算rw值
      case 5:
        let userCount = await this.users.algoCount();
        for (let i = 0; i * 1000 < userCount; i++) {
          await this.saveAndStart(
            'CirclesAlgorithmsService',
            'algoRw',
            `${i * 1000},${(i + 1) * 1000 - 1}`
            )
        }
        await this.updateStep(jobs,Math.ceil(userCount / 1000))
        break;
      // 将rw导入neo4j
      case 6:
        await this.saveAndStart(
          'Neo4jService',
          'setReputation'
          )
        await this.updateStep(jobs)
        break;
      // 更新neo4j路径weight
      case 7:
        await this.saveAndStart(
          'Neo4jService',
          'updateRelWeight'
          )
        await this.updateStep(jobs)
        break;
      // 完成
      case 8:
        await this.saveAndStart(
          'CirclesAlgorithmsService',
          'finish'
          )
        await this.updateStep(jobs)
        break;
      default:
        break;
    }
  }

  async saveAndStart(serv,func,params = '') {
    let service = this.makeService(serv, func, params);
    let task = await this.taskInfoEntity.save({
      name: `algo_` + func,
      service,
      taskType: 1,
    });
    await this.taskInfoService.once(task.id);
  }

  makeService(serv, func, params) {
    return `${serv}.${func}(${params})`
  }
}