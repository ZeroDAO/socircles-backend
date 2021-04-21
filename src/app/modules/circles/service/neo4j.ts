import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, CoolCommException } from 'midwayjs-cool-core';
import { Context } from 'egg';
import neo4j from 'neo4j-driver';

const { inspect } = require('util');
const Graph = 'trustGraph';

/**
 * neo4j 接口
 */
@Provide()
export class Neo4jService extends BaseService {
  @Inject()
  ctx: Context;

  getConfig() {
    return {
      neo4j_client: this.ctx.app.config.neo4j.client,
    }
  }

  /**
   * 创建 driver
   */
  async create() {
    var driver = neo4j.driver( this.getConfig().neo4j_client.url, 
      neo4j.auth.basic(
        this.getConfig().neo4j_client.username,
        this.getConfig().neo4j_client.password
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
    this.run(`
    CALL gds.graph.create(${Graph}, 'User', 'TRUST');
    `)
  }

  /**
   * 运行 neo4j
   */
  async run(content) {
    console.log(content);
    
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

  async init() {
    /*
    await this.run(`
      CREATE CONSTRAINT ON (a:User) ASSERT a.uid IS UNIQUE
      CREATE INDEX FOR (n:User) ON (n.address)
      CALL gds.graph.create(${Graph}, 'User', 'TRUST');
    `)
    */
  }

  /**
   * 使用 apoc 批量建立节点
   * 需要安装 apoc
   */
  async createNodes(nodes) {
    await this.run(`
      CALL apoc.create.nodes(['User'],${inspect(nodes)}) yield node
    `);
  }

  /**
   * 创建一个节点
   * node: {id:1, address: '0x0000000000...'}
   */
  async createNode(node) {
    await this.run(`
      MERGE (n:User ${inspect(node)})
    `);
  }

  /**
   * 使用 apoc 批量建立关系
   * 需要安装 apoc
   * rels: [{trusted: 1, trustee, 2},{...}]
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
   * rel: {trusted: 1, trustee, 2}
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
   * rels: [{trusted: 1, trustee, 2},{...}]
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
   * rel: {trusted: 1, trustee, 2}
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
    return this.run(`
      CALL gds.betweenness.stream(${Graph})
      YIELD nodeId, score
      WHERE score > 0
      RETURN gds.util.asNode(nodeId).uid AS uid, score
      ORDER BY score DESC
    `)
  }

  /**
   * 计算 Graph 的 Betweenness 并写入
   */
   async betweennessWrite() {
    return this.run(`
    CALL gds.betweenness.write(${Graph}, { writeProperty: 'betweenness' })
    YIELD centralityDistribution
    RETURN centralityDistribution
    `)
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
    return this.run(`
    CALL gds.pageRank.stream(${Graph},{
      maxIterations: 20,
      dampingFactor: 0.05
    })
    YIELD nodeId, score
    WHERE score > 0
    RETURN gds.util.asNode(nodeId).name AS name, score
    ORDER BY score DESC
    `)
  }


  /**
   * 计算PR并写入neo4j的节点属性
   */
  async pageRankWrite() {
    return this.run(`
    CALL gds.pageRank.write(${Graph}, {
      maxIterations: 20,
      dampingFactor: 0.85,
      writeProperty: 'pagerank'
    })
    YIELD centralityDistribution
    RETURN centralityDistribution
    `)
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

  async gdsAlphaWrite(t, r = 'Trust') {
    if (['degree','eigenvector','closeness','articleRank'].indexOf(t) < 0) {
      throw new CoolCommException('不受支持的算法');
    }
    return this.run(`
    CALL gds.alpha.${this.getTails(t,r)}
    `)
  }

  async gdsClosenessWrite(t, r = 'Trust') {
    if (['harmonic'].indexOf(t) < 0) {
      throw new CoolCommException('不受支持的算法');
    }
    return this.run(`
    CALL gds.alpha.closeness.${this.getTails(t,r)}
    `)
  }

  getTails(t,r) {
    return `${t}.write({
      nodeProjection: 'User',
      relationshipProjection: ${r},
      writeProperty: '${t}'
    }) YIELD centralityDistribution`
  }

  async getSeedsPath(uid) {
    return this.run(`
    WITH "MATCH (source:User {uid: ${uid}})
      CALL gds.beta.allShortestPaths.dijkstra.stream('${Graph}', {
        sourceNode: id(source)
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
    return this.run(`
      MATCH (n:User)
      RETURN n.uid
      ORDER BY n.closeness DESC
      LIMIT ${count}
    `)
  }
}
