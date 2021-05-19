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
import { Config } from '@midwayjs/decorator';

import * as _ from 'lodash';

const COLLECTION_SERVICE = 'circlesTrustService.collection()';
const TOTAL_SETPS = 16;

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

  @Config('supportAlgo')
  supportAlgo;

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
      jobId: jobId,
      every: every,
      service: 'circlesJobsService.watch()',
      taskType: 1,
      name: 'JobsWatcher',
    })

    await this.jobsEntity.insert({
      id: sysInfo.nonce,
      job_id: jobId,
      total_sub_step: 0,
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
    if (jobs.status == 0) {
      return await this._stopWatchTask(jobs);
    }

    let curr_sub_step = await this._getSubJobsDone(jobs);

    if (jobs.total_sub_step <= curr_sub_step || jobs.total_sub_step <= jobs.curr_sub_step) {
      return await this._nextStep(jobs);
    }

    await this._updateSubStep(jobs, curr_sub_step);

    return `WATING... ${jobs.curr_step} / ${jobs.total_steps} - ${curr_sub_step} / ${jobs.total_sub_step}`;
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
   * 发出停止信号
   * 任务并不立即停止，而是在下一个job停止
   * 以便于统计仍在进行中的任务信息
   */
  async stopWatch() {
    let sysInfo = await this.sys.infoAndCheckAlgo();
    await this.jobsEntity.update(sysInfo.nonce, {
      status: 0
    })
  }

  /**
   * 继续任务，并重新开始失败任务
   */
  async recover() {
    let sysInfo = await this.sys.infoAndCheckFail();
    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);

    if (jobs.status == 1) {
      throw new CoolCommException('Jobs is already in progress');
    }

    const jobId = this._makeSubJobId(jobs.job_id, jobs.curr_step);

    let tasks = await this.taskInfoEntity.find({
      remark: null,
      jobId: jobId
    });

    await this.jobsEntity.update(sysInfo.nonce, {
      status: 1,
    });

    await this.sys.start(sysInfo.id);
    await this.taskInfoService.start(jobs.task_id);

    if (_.isEmpty(tasks)) return;

    tasks.forEach(async (task) => {
      await this.taskInfoService.once(task.id);
    })
  }

  /**
   * 回退一步任务并重新开始
   * Warring: 并不回滚任务获得的数据
   */
  async regainWatch() {
    let sysInfo = await this.sys.infoAndCheckFail();

    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);

    await this.jobsEntity.update(sysInfo.nonce, {
      status: 1,
      curr_sub_step: 0,
      curr_step: Math.max(jobs.curr_step - 1, 0),
      total_sub_step: 0
    });

    await this.taskInfoEntity.delete({
      jobId: this._makeSubJobId(jobs.job_id, jobs.curr_step)
    })

    await this.sys.start(sysInfo.id);
    await this.taskInfoService.start(jobs.task_id);
  }

  /**
   * 修改轮询时间
   */
  async setAlgoEvery(every) {
    let sysInfo = await this.sys.info();
    let jobs = await this.jobsEntity.findOne(sysInfo.nonce);
    await this.taskInfoService.stop(jobs.task_id);
    this.taskInfoEntity.update(jobs.task_id, {
      every: every
    })
    await this.taskInfoService.start(jobs.task_id);
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
   * 更新步骤信息
   */
  async _updateStep(jobs, total_sub_step = 1) {
    jobs.curr_step += 1;
    jobs.curr_sub_step = 0;
    jobs.total_sub_step = total_sub_step;
    await this.jobsEntity.update(jobs.id, jobs);
  }

  /**
   * 任务监测和调度
   */
  async _nextStep(jobs) {
    // 开始下一轮任务
    let seedIds = null;
    let taskDatas = [];
    let subJobsCount = 1;
    const fameIds = await this.seeds.fameIds();

    switch (jobs.curr_step) {
      // 初始化rw值
      case 0:

        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'initNoSetRepu'
        })
        break;
      // 初始化路径权重
      case 1:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'updateRelWeight'
        })
        break;
      // 创建Graph
      case 2:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'createGraphIfNotExit'
        })
        break;
      // 中心度计算
      case 3:
        let algos = this.supportAlgo;
        algos.forEach(async algo => {
          taskDatas.push({
            serv: 'circlesAlgorithmsService',
            func: 'algoConpared',
            params: algo
          })
        });
        subJobsCount = algos.length
        break;
      // 获取名人堂用户并写入数据库
      case 4:
        taskDatas.push({
          serv: 'circlesSeedsService',
          func: 'setFames'
        })
        break;
      // 计算名人堂用户到其他各点距离导出到cvs
      case 5:
        fameIds.forEach(async uid => {
          taskDatas.push({
            serv: 'circlesAlgorithmsService',
            func: 'getFamePath',
            params: uid
          })
        });
        subJobsCount = fameIds.length
        break;
      // 将名人堂cvs导入路径数据库
      case 6:
        await this.nativeQuery(`truncate table circles_path`);
        fameIds.forEach(async uid => {
          taskDatas.push({
            serv: 'circlesAlgorithmsService',
            func: 'importFamePath',
            params: uid
          })
        });
        subJobsCount = fameIds.length;
        break;
      // 计算各点距名人堂路径总和
      case 7:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'fameCost'
        })
        break;
      // 将mysl路径数据导入到neo4j，并计算相应加权值
      case 8:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'setFame'
        })
        break;
      // 从neo4j获取种子
      case 9:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'setSeeds'
        })
        break;
      // 导出种子路径到文件
      case 10:
        // 删除fame临时属性
        await this.neo4j.remove('fame');
        seedIds = await this.seeds.info();
        seedIds.forEach(async sid => {
          taskDatas.push({
            serv: 'circlesAlgorithmsService',
            func: 'getSeedPath',
            params: sid.id
          })
        });
        subJobsCount = seedIds.length
        break;
      // 种子路径文件导入数据库
      case 11:
        // 清空路径数据
        await this.neo4j.dropGraph();
        await this.nativeQuery(`truncate table circles_path`);
        seedIds = await this.seeds.info();
        seedIds.forEach(async sid => {
          taskDatas.push({
            serv: 'circlesAlgorithmsService',
            func: 'importCsvPath',
            params: sid.id
          })
        });
        subJobsCount = seedIds.length
        break;
      // 计算rw值
      case 12:
        let userCount = await this.users.setAlgoUserList();
        for (let i = 0; i * 1000 < userCount; i++) {
          taskDatas.push({
            serv: 'circlesAlgorithmsService',
            func: 'algoRw',
            params: {
              start: i * 1000,
              end: (i + 1) * 1000 - 1
            }
          })
        }
        subJobsCount = Math.ceil(userCount / 1000)
        break;
      // 初始化种子rw
      case 13:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'setSeedsScore'
        })
        break;
      // 将rw导入neo4j
      case 14:
        taskDatas.push({
          serv: 'circlesAlgorithmsService',
          func: 'setReputation'
        })
        break;
      // 更新种子用户资料
      case 15:
        taskDatas.push({
          serv: 'circlesSeedsService',
          func: 'getSeedsInfo'
        })
        break;
      default:
        await this._stopWatchTask(jobs);
        return `DONE AT STEP: ${jobs.curr_step}`;
    }

    await this._updateStep(jobs, subJobsCount);

    taskDatas.forEach(async (taskData) => {
      taskData.job = jobs;
      await this._saveAndStart(taskData)
    })

    return `NEXT SETP: ${jobs.curr_step}`;
  }

  async _saveAndStart(taskData) {
    let { job, serv, func, params } = taskData;

    let service = this._makeService(serv, func, typeof params == 'undefined' ? '' : JSON.stringify(params));
    let task = await this.taskInfoEntity.save({
      name: `CIRCLES_ALGO`,
      jobId: this._makeSubJobId(job.job_id, job.curr_step),
      service,
      taskType: 1,
    });
    await this.taskInfoService.once(task.id);
  }

  _makeService(serv, func, params) {
    return `${serv}.${func}(${params})`
  }

  _makeSubJobId(job_id, step) {
    return `${job_id}_${step}`
  }

  /**
 * 调度任务停止
 */
  async _stopWatchTask(jobs) {
    await this.taskInfoService.stop(jobs.task_id);
    await this._updateSubStep(jobs);
    return `STOP TASK: ${jobs.task_id}`
  }

  /**
   * 获取成功子任务
   */
  async _getSubJobsDone(jobs) {
    return await this.taskInfoEntity.count({
      jobId: this._makeSubJobId(jobs.job_id, jobs.curr_step),
      remark: '1'
    });
  }

  /**
   * 更新子任务进度
   */
  async _updateSubStep(jobs, currSubStep = null) {
    if (!currSubStep) {
      currSubStep = await this._getSubJobsDone(jobs);
    }
    await this.jobsEntity.update(jobs.id, {
      curr_sub_step: currSubStep
    });
  }
}