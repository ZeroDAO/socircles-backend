import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesJobsEntity } from '../entity/jobs';
import { TaskInfoService } from '../../task/service/info';
import { CirclesTrustService } from './trust';
import { TaskInfoEntity } from '../../task/entity/info';
import { CirclesSysService } from './sys';
import { CirclesSeedsService } from './seeds';
import { CirclesUsersService } from './users';
import { CirclesNeo4jService } from './neo4j';

import * as _ from 'lodash';

const COLLECTION_SERVICE = 'circlesTrustService.collection()';
const TOTAL_SETPS = 9;

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
  trustService: CirclesTrustService

  @Inject()
  users: CirclesUsersService;

  @Inject()
  sys: CirclesSysService;

  @Inject()
  seeds: CirclesSeedsService;

  @Inject()
  neo4j: CirclesNeo4jService;

  /**
   * 调用测试
   */
  async test() {
    let jobId = 'circles_' + Date.now() + Math.ceil(Math.random() * 1000);
    return await this.taskInfoEntity.save({
      jobId,
      every: 10000,
      service: 'CirclesJobsService.watch()',
      taskType: 1,
    });
  }

  /**
   * 设置爬虫任务
   */
  async collection(every) {

    let task = await this.taskInfoEntity.findOne({ service: COLLECTION_SERVICE });
    if (task) {

      await this.taskInfoEntity.update(task.id, {
        name: 'CRAWLER',
        every: every,
        taskType: 1,
      })
    } else {
      await this.taskInfoEntity.insert({
        name: 'CRAWLER',
        every: every,
        service: COLLECTION_SERVICE,
        taskType: 1
      })
    }
  }

  /**
   * 获取爬虫info
   */
  async crawlerInfo() {
    return await this.taskInfoEntity.findOne({
      service: COLLECTION_SERVICE
    });
  }

  /**
   * 开始采集任务
   */
  async startCollection(...id: any) {
    if (!id) {
      let task = await this.taskInfoEntity.findOne({ service: COLLECTION_SERVICE });
      if (!task) {
        throw new CoolCommException('LACK OF TASK ID');
      }
      id = task.id;
    }
    return await this.taskInfoService.start(id);
  }

  /**
   * 初始化调度，开始任务
   */
  async startWatch(every) {
    let jobId = 'circles_' + Date.now() + Math.ceil(Math.random() * 1000);

    let sysInfo = await this.sys.infoAndCheckAlgo();

    let task = await this.taskInfoEntity.save({
      jobId,
      every: every,
      service: 'circlesJobsService.watch()',
      taskType: 1,
      name: 'JobsWatcher',
    })

    await this.jobsEntity.insert({
      id: sysInfo.nonce,
      task_id: task.id,
      total_steps: TOTAL_SETPS,
    })

    return await this.taskInfoService.start(task.id);
  }

  /**
   * 任务监测和调度
   */
  async watch() {
    let sysInfo = await this.sys.info();
    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);
    if (jobs.status == 0 || jobs.total_steps <= jobs.curr_step) {
      return await this.stopWatchTask(jobs);
    }
    if (jobs.total_sub_step == jobs.curr_sub_step) {
      return await this.nextStep(jobs);
    }
    return `WATING... ${jobs.curr_step} / ${jobs.total_steps} - ${jobs.curr_sub_step} / ${jobs.total_sub_step}`;
  }

  /**
   * 采集任务停止
   */
  async stopCollection(id?) {
    if (!id) {
      let task = await this.taskInfoEntity.findOne({ service: COLLECTION_SERVICE });
      if (!task) {
        throw new CoolCommException('LACK OF TASK ID');
      }
      id = task.id;
      await this.trustService.removeLock();
    }
    await this.taskInfoService.stop(id);
  }

  /**
   * 调度任务停止
   */
  async stopWatchTask(jobs) {
    await this.taskInfoService.stop(jobs.task_id);
    return `STOP TASK: ${jobs.task_id}`
  }

  /**
   * 发出停止信号
   */
  async stopWatch() {
    let sysInfo = await this.sys.infoAndCheckAlgo();
    await this.jobsEntity.update(sysInfo.nonce, {
      status: 0
    })
  }

  /**
   * 恢复启动 watch
   * Warring: 并不回滚数据
   */
  async regainWatch() {
    let sysInfo = await this.sys.infoAndCheckAlgo();
    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);
    await this.jobsEntity.update(sysInfo.nonce, {
      status: 1,
      curr_sub_step: 0,
      curr_step: Math.max(jobs.curr_step - 1, 0),
      total_sub_step: 0
    });
    await this.sys.start(sysInfo.id);
    await this.taskInfoService.start(jobs.task_id);
  }

  /**
   * 修改轮询时间
   */
  async setAlgoEvery(every) {
    let sysInfo = await this.sys.infoAndCheckAlgo();
    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);
    await this.taskInfoService.stop(jobs.task_id);
    this.taskInfoEntity.update(jobs.task_id, {
      every: every
    })
    await this.taskInfoService.start(jobs.task_id);
  }

  /**
   * 更新步骤信息
   */
  async updateStep(jobs, total_sub_step = 1) {
    jobs.curr_step += 1;
    jobs.curr_sub_step = 0;
    jobs.total_sub_step = total_sub_step;
    await this.jobsEntity.update(jobs.id, jobs);
    return `NEXT SETP: ${jobs.curr_step}`
  }

  /**
   * 返回当前进度信息
   */
  async jobInfo(id) {
    let job = await this.jobsEntity.findOne(id);
    if (job) {
      let task = await this.taskInfoEntity.findOne(job.task_id);
      if (task) {
        Object.assign(job, {
          every: task.every,
          startDate: task.startDate,
          endData: task.endDate,
          nextRunTime: task.nextRunTime
        });
      }
    }
    return job;
  }

  /**
   * 任务监测和调度
   */
  async nextStep(jobs) {
    // 开始下一轮任务
    let seedIds = null;
    switch (jobs.curr_step) {
      // 更新neo4j路径weight
      case 0:
        await this.saveAndStart(
          'circlesAlgorithmsService',
          'updateRelWeight'
        )
        return await this.updateStep(jobs)
      // 中心度计算
      case 1:
        let algos = [
          'betweenness',
          'pageRank',
          'articleRank',
          'degree',
          'harmonic',
          'eigenvector',
          'closeness'
        ];
        algos.forEach(async algo => {
          await this.saveAndStart(
            'circlesAlgorithmsService',
            'algoConpared',
            algo
          )
        });
        return await this.updateStep(jobs, algos.length);
      // 从neo4j获取种子
      case 2:
        await this.saveAndStart(
          'circlesAlgorithmsService',
          'setSeeds'
        )
        return await this.updateStep(jobs);
      // 导出种子路径到文件
      case 3:
        seedIds = await this.seeds.info();
        seedIds.forEach(async sid => {
          await this.saveAndStart(
            'circlesAlgorithmsService',
            'getSeedPath',
            sid.id
          )
        });
        return await this.updateStep(jobs, seedIds.length);
      // 种子路径文件导入数据库
      case 4:
        // 清空路径数据
        await this.nativeQuery(`truncate table circles_path`);
        seedIds = await this.seeds.info();
        seedIds.forEach(async sid => {
          await this.saveAndStart(
            'circlesAlgorithmsService',
            'importSeedPath',
            sid.id
          )
        });
        return await this.updateStep(jobs, seedIds.length);
      // 计算rw值
      case 5:
        let userCount = await this.users.setAlgoUserList();
        for (let i = 0; i * 1000 < userCount; i++) {
          await this.saveAndStart(
            'circlesAlgorithmsService',
            'algoRw',
            {
              start: i * 1000,
              end: (i + 1) * 1000 - 1
            }
          )
        }
        return await this.updateStep(jobs, Math.ceil(userCount / 1000));
      // 初始化种子rw
      case 6:
        await this.saveAndStart(
          'circlesAlgorithmsService',
          'setSeedsScore'
        )
        return await this.updateStep(jobs);
      // 将rw导入neo4j
      case 7:
        await this.saveAndStart(
          'circlesAlgorithmsService',
          'setReputation'
        )
        return await this.updateStep(jobs)
      // 更新种子用户资料
      case 8:
        await this.saveAndStart(
          'circlesSeedsService',
          'getSeedsInfo'
        )
        return await this.updateStep(jobs)
      default:
        return 'Wrong Steps';
    }
  }

  async saveAndStart(serv, func, params = {}) {
    let service = this.makeService(serv, func, JSON.stringify(params));
    let task = await this.taskInfoEntity.save({
      name: `algo_` + func,
      jobId: 'CIRCLES_ALGO',
      service,
      taskType: 1,
    });
    await this.taskInfoService.once(task.id);
  }

  makeService(serv, func, params) {
    return `${serv}.${func}(${params})`
  }
}