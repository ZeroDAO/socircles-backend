import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService } from 'midwayjs-cool-core';
import { Context } from 'egg';
var neo4j = require('neo4j-driver')
const { inspect } = require('util');
const Graph = 'trustGraph';

/**
 * 商品
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
   * 操作neo4j数据库
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

  async run(content) {
    console.log(content);
    
    const driver = await this.create();
    var session = driver.session();
    const result = await session.run(content);
    await driver.close();
    return result;
  }

  async init() {
    /*
    await this.run(`
      CREATE CONSTRAINT ON (a:User) ASSERT a.id IS UNIQUE
      CREATE INDEX FOR (n:User) ON (n.address)
    `)
    */
  }

  async createNodes(nodes) {
    await this.run(`
      CALL apoc.create.nodes(['User'],${inspect(nodes)}) yield node
    `);
  }

  async createNode(node) {
    await this.run(`
      MERGE (n:User ${inspect(node)})
    `);
  }

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

  async createRel(rel) {
    await this.run(`
      MATCH (p:User {uid: ${rel.trusted}})
      MATCH (m:User {uid: ${rel.trustee}})
      MERGE (p)-[r:TRUST]->(m)
  `)
  }

  async delRels(rels) {
    await this.run(`
      UNWIND ${inspect(rels)} as row
      MATCH (n {uid: row.trusted})-[r:TRUST]->(m {uid: row.trustee})
      DELETE r
    `)
  }

  async delRel(rel) {
    await this.run(`
      MATCH (n {uid: ${rel.trusted}})-[r:TRUST]->(m {uid: ${rel.trustee}})
      DELETE r
  `)
  }

  async betweenness() {
    return this.run(`
      CALL gds.betweenness.stream(${Graph})
      YIELD nodeId, score
      WHERE score > 0
      RETURN gds.util.asNode(nodeId).uid AS uid, score
      ORDER BY score DESC
    `)
  }

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
}
