import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { Context } from 'egg';
import neo4j from 'neo4j-driver';
import * as _ from 'lodash';
import { CirclesSysService } from './sys';
import { Config } from '@midwayjs/decorator';

const { inspect } = require('util');
const Graph = 'trustGraph';

/**
 * neo4j 接口
 */
@Provide()
export class Neo4jService extends BaseService {
  @Inject()
  ctx: Context;

  @Config('neo4j')
  neo4jConf;

  @Config('orm')
  ormConf;

  @Inject()
  sys: CirclesSysService;

  /**
   * 创建 driver
   */
  async create() {
    var driver = neo4j.driver(this.neo4jConf.client.url,
      neo4j.auth.basic(
        this.neo4jConf.client.username,
        this.neo4jConf.client.password
      )
    )
    // var session = driver.session()
    // const result = await session.run('RETURN timestamp()');
    // await driver.close()
    return driver;
  }

  /**
   * 创建 Graph
   */
  async createGraph() {
    await this.run(`
    CALL gds.graph.create('${Graph}', 'User', 'TRUST', {
      relationshipProperties: 'weight'
    });
    `)
  }

  /**
   * 初始化关系数据为1
   */
  async initRelWeight() {
    await this.run(`
    MATCH ()-[r:TRUST]->()
    SET r.weight = 1
    `)
  }

  /**
   * 初始化rw为0
   */
  async initRepuWeight() {
    await this.run(`
      MATCH (n:User)
      SET n.reputation = 0
    `)
  }

  /**
   * 初始化rw为0
   */
  async getRwCount() {
    return this.resHead(
      await this.run(`
      MATCH (n:User)
      WHERE exists(n.repuweight)
      RETURN count(n)
    `)
    )
  }

  /**
   * 删除 Graph
   */
  async dropGraph() {
    if (await this.isExit()) {
      return await this.run(`
      CALL gds.graph.drop('${Graph}')
    `);
    }
  }

  /**
   * 查询图是否存在，不存在则创建
   */
  async createGraphIfNotExit() {
    if (!await this.isExit()) {
      return await this.createGraph();
    }
  }

  /**
   * 查询图是否存在，不存在则创建
   */
  async isExit() {
    // `CALL gds.graph.exists('${Graph}') YIELD exists`;
    let isExit = await this.run(`
      CALL gds.graph.list('${Graph}')
      YIELD graphName
    `);
    return !_.isEmpty(isExit.records);
  }

  /**
   * 运行 neo4j
   */
  async run(content) {

    const driver = await this.create();
    var session = driver.session();
    const result = await session.run(content);
    await driver.close();
    return result;
  }

  /**
   * 初始化数据库
   * - 建立索引和约束
   * - 建立 graph
   */

  async initNeo4j() {
    await this.run(`
      CREATE CONSTRAINT ON (a:User) ASSERT a.uid IS UNIQUE
      CREATE INDEX FOR (n:User) ON (n.address)
    `)
  }

  /**
   * 获取索引列表
   */
  async getIndex() {
    await this.run(`
    :schema
    `)
  }

  /**
   * 返回用户
   */

  async users(limit = 20) {
    return await this.run(`
      MATCH (n:User) RETURN n LIMIT ${limit}
    `)
  }

  /**
   * 使用 apoc 批量建立节点
   *@param node: [{"id":1, "address": '0x0000000000...'},{id:1,address:''},{...}]
   */
  async createNodes(nodes) {
    await this.run(`
      CALL apoc.create.nodes(['User'],${inspect(nodes)}) yield node
    `);
  }

  /**
   * 创建一个节点
   *@param node: {id:1, address: '0x0000000000...'}
   */
  async createNode(node) {
    await this.run(`
      MERGE (n:User ${inspect(node)})
    `);
  }

  /**
   * 使用 apoc 批量建立关系
   * 需要安装 apoc
   *@param rels : [{trusted: 1, trustee, 2},{...}]
   */
  async createRels(rels) {
    await this.run(`
      UNWIND ${inspect(rels)} as rowd
      MATCH (p:User {uid: row.trusted})
      MATCH (m:User {uid: row.trustee})
      CALL apoc.create.relationship(p, "TRUST", {}, m)
      YIELD rel
      RETURN count(*)
    `)
  }

  /**
   * 建立关系
   * @param rel: {trusted: 1, trustee, 2}
   */
  async createRel(rel) {
    await this.run(`
      MATCH (p:User {uid: ${rel.trusted}})
      MATCH (m:User {uid: ${rel.trustee}})
      MERGE (p)-[r:TRUST]->(m)
    `)
  }

  /**
   * 使用 apoc 批量删除关系
   * 需要安装 apoc
   * @param rels: [{trusted: 1, trustee, 2},{...}]
   */
  async delRels(rels) {
    await this.run(`
      UNWIND ${inspect(rels)} as row
      MATCH (n {uid: row.trusted})-[r:TRUST]->(m {uid: row.trustee})
      DELETE r
    `)
  }

  /**
   * 删除关系
   *@param rel: {trusted: 1, trustee, 2}
   */
  async delRel(rel) {
    await this.run(`
      MATCH (n {uid: ${rel.trusted}})-[r:TRUST]->(m {uid: ${rel.trustee}})
      DELETE r
    `)
  }

  /**
   * 计算 Graph 的 Betweenness
   */
  async betweenness() {
    this.createGraphIfNotExit()
      .then(() => {
        return this.run(`
        CALL gds.betweenness.stream('${Graph}')
        YIELD nodeId, score
        WHERE score > 0
        RETURN gds.util.asNode(nodeId).uid AS uid, score
        ORDER BY score DESC
      `)
      })
  }

  /**
   * 计算 Graph 的 Betweenness 并写入
   */
  async betweennessWrite() {
    await this.createGraphIfNotExit();
    return this.run(`
      CALL gds.betweenness.write('${Graph}', { writeProperty: 'betweenness' })
      YIELD centralityDistribution
      RETURN centralityDistribution
    `);
  }

  /**
   * 计算 Graph 的 ArticleRank
   */
  async articleRank() {
    return this.run(`
    CALL gds.alpha.articleRank.stream({
      nodeProjection: 'User',
      relationshipProjection: 'TRUST',
      maxIterations: 20,
      dampingFactor: 0.85 
     }) 
     YIELD nodeId, score
     WHERE score > 0
     RETURN gds.util.asNode(nodeId).uid AS uid, score
     ORDER BY score DESC
    `)
  }

  /**
   * 计算 Graph 的 PageRank 并返回大于0的值
   */
  async pageRank() {
    this.createGraphIfNotExit()
      .then(() => {
        return this.run(`
        CALL gds.pageRank.stream('${Graph}',{
          maxIterations: 20,
          dampingFactor: 0.05
        })
        YIELD nodeId, score
        WHERE score > 0
        RETURN gds.util.asNode(nodeId).name AS name, score
        ORDER BY score DESC
      `)
      })
  }


  /**
   * 计算PR并写入neo4j的节点属性
   */
  async pageRankWrite() {
    this.createGraphIfNotExit()
      .then(() => {
        return this.run(`
        CALL gds.pageRank.write('${Graph}', {
          maxIterations: 20,
          dampingFactor: 0.85,
          writeProperty: 'pagerank'
        })
        YIELD centralityDistribution
        RETURN centralityDistribution
      `)
      })
  }

  /**
   * 计算 Graph 的 Closeness Centrality
   */
  async closeness() {
    return this.run(`
    CALL gds.alpha.closeness.stream({
      nodeProjection: 'User',
      relationshipProjection: 'TRUST'
    })
    YIELD nodeId, centrality
    WHERE centrality > 0
    RETURN gds.util.asNode(nodeId).uid AS uid, centrality
    ORDER BY centrality DESC
    `)
  }

  /**
   * 计算 Graph 的 Harmonic Centrality
   */
  async harmonic() {
    return this.run(`
    CALL gds.alpha.closeness.harmonic.stream({
      nodeProjection: 'User',
      relationshipProjection: 'TRUST'
    })
    YIELD nodeId, centrality
    WHERE centrality > 0
    RETURN gds.util.asNode(nodeId).uid AS uid, centrality
    ORDER BY centrality DESC
    `)
  }

  /**
   * 计算 Graph 的 Eigenvector Centrality
   */
  async eigenvector() {
    return this.run(`
    CALL gds.alpha.eigenvector.stream({
      nodeProjection: 'User',
      relationshipProjection: 'TRUST'
    })
    YIELD nodeId, score
    WHERE score > 0
    RETURN gds.util.asNode(nodeId).uid AS uid, score
    ORDER BY score DESC
    `)
  }

  /**
   * 计算 Graph 的 Degree Centrality
   */
  async degree() {
    return this.run(`
    CALL gds.alpha.degree.stream({
      nodeProjection: 'User',
      relationshipProjection: {
        TRUST: {
          type: 'TRUST',
          orientation: 'REVERSE'
        }
      }
    })
    YIELD nodeId, score
    WHERE score > 0
    RETURN gds.util.asNode(nodeId).uid AS uid, score
    ORDER BY score DESC
    `)
  }

  /**
   * Alpha 类的算法写入
   *@param t:String 关系类型
   *@param r:指定 relationshipProjection
   */
  async gdsAlphaWrite(t, r, ...relationship: any) {
    if (['degree', 'eigenvector', 'closeness', 'articleRank'].indexOf(t) < 0) {
      throw new CoolCommException('不受支持的算法');
    }
    return this.run(`
    CALL gds.alpha.${this.getTails(t, r, relationship)}
    `)
  }

  /**
   * Closeness 分支的算法写入
   *@param t:String 关系类型
   *@param r:指定 relationshipProjection
   */
  async gdsClosenessWrite(t, r, ...relationship: any) {
    if (['harmonic'].indexOf(t) < 0) {
      throw new CoolCommException('不受支持的算法');
    }
    return this.run(`
    CALL gds.alpha.closeness.${this.getTails(t, r, relationship)}
    `)
  }

  getTails(t, r, relationship) {
    relationship = _.isEmpty(relationship) ? "'TRUST'" : relationship;
    let g = r ? ',' : '';
    return `${t}.write({
      nodeProjection: 'User',
      relationshipProjection: ${relationship},
      writeProperty: '${t}'${g}
      ${inspect(r).slice(1, -1)}
    }) YIELD centralityDistribution`
  }

  /**
   * 计算某节点到其他所有节点最短路径小于 6 的路径
   * 将计算数据导出为 cvs ，便于后期导入其他数据库
   * 或使用其他引擎计算
   * 返回计算统计
   *@param uid: 需要计算的用户uid
   */
  async seedsPathFile(uid) {
    await this.createGraphIfNotExit();
    return await this.run(`
      WITH "MATCH (source:User {uid: ${uid}})
      CALL gds.beta.allShortestPaths.dijkstra.stream('${Graph}', {
        sourceNode: id(source),
        relationshipWeightProperty: 'weight'
      })
      YIELD sourceNode, targetNode, totalCost, nodeIds, costs
      WHERE size(nodeIds) < 6
    RETURN
      gds.util.asNode(sourceNode).uid AS sid,
      gds.util.asNode(targetNode).uid AS tid,
      [nodeId IN nodeIds | gds.util.asNode(nodeId).uid] AS nids,
      costs" AS query
    CALL apoc.export.csv.query(query, "seed_path_${uid}.csv", {})
    YIELD file, source,nodes, relationships, time, rows, batchSize, batches, done, data
    RETURN file, source,nodes, relationships, time, rows, batchSize, batches, done, data;
  `)
  }

  async getSeeds(count) {
    let sys_info = await this.sys.info();
    return this.run(`
      MATCH (n:User)
      RETURN n.uid
      ORDER BY n.${sys_info.seed_algo} DESC
      LIMIT ${count}
    `)
  }

  /**
   * 将Rw数据批量导入neo4j
   */
  async setReputation() {
    await this.initRepuWeight();
    return await this.run(`
    CALL apoc.load.jdbc(
      '${this.getJdbcConfig()}',
      'select id, reputation from circles_scores'
    ) YIELD row
    MATCH (n:User {uid: row.id})
    SET n.reputation = row.reputation
    `);
  }

  /**
   * 汇总算法数据
   */
  async aggregating(property) {
    return await this.run(`
    MATCH (n:User)
      WHERE exists(n.${property})
    RETURN
      min(n.${property}) AS min, 
      max(n.${property}) AS max, 
      avg(n.${property}) AS mean,
      percentileDisc(n.${property}, 0.5) AS p50,
      percentileDisc(n.${property}, 0.75) AS p75,
      percentileDisc(n.${property}, 0.90) AS p90,
      percentileDisc(n.${property}, 0.95) AS p95,
      percentileDisc(n.${property}, 0.99) AS p99,
      percentileDisc(n.${property}, 0.999) AS p999
    `);
  }

  /**
   * 返回NEO4J单条数据
   *@param uid: 需要计算的用户uid
   */
  resHead(data) {
    if (data) {
      if (data[0]._fields) {
        return data[0]._fields[0].low;
      }
    }
    throw new CoolCommException('NEO4J ERR');
  }

  /**
   * 返回Jdbc配置
   */
  getJdbcConfig() {
    if (this.ormConf.type != 'mysql') {
      throw new CoolCommException('Database Mysql Mismatch');
    }
    let mysql = this.ormConf;
    return `jdbc:mysql://${mysql.host}/${mysql.database}?&user=${mysql.username}&password=${mysql.password}&useUnicode=true&characterEncoding=utf8&serverTimezone=UTC`
  }

  /**
   * 更新路径权重
   */
  async updateRelWeight() {
    await this.run(`
    MATCH (a)-[r:TRUST]->(b)
    WITH a,b,r,
    (CASE
        WHEN (a.reputation - b.reputation) < e() THEN  1
        ELSE log(a.reputation - b.reputation)
    END) AS req
    SET r.weight = req
    `)
  }
}
