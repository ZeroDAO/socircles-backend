import { Inject, Provide } from '@midwayjs/decorator';
import { BaseService, Cache } from 'midwayjs-cool-core';
import { InjectEntityModel } from '@midwayjs/orm';
import { Repository } from 'typeorm';
import { CirclesUsersEntity } from '../entity/users';
import { ICoolCache } from 'midwayjs-cool-core';

/**
 * 商品
 */
@Provide()
export class CirclesUsersService extends BaseService {
  @InjectEntityModel(CirclesUsersEntity)
  circlesUsersEntity: Repository<CirclesUsersEntity>;

  @Inject('cool:cache')
  coolCache: ICoolCache;

  /**
   * 返回所有数据
   */
  @Cache(5)
  async all() {
    return this.circlesUsersEntity.find();
  }

  /**
   * 返回用户数据
   */
   async user() {
    // 每次最多查询100条，然后不管了0
    // const { account_name,offset,pos } = q;
    // const url = this.getConfig().rpcUrl + '/v1/history/get_actions';
    const url = 'https://api.thegraph.com/subgraphs/name/circlesubi/circles';
    let blockData = await this.ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      data: {"query":`{trusts(first: 2) {id,user{id}}}`,"variables":{}},
      dataType: 'json'
    })
    // 从信任改变记录获取最新数值
    // 是否为信任或取消信任
    // 查看更新blocknum ，小于则报错，并全部停止！输出log ! 删除全部已更新
    // 双方用户是否存在，不存在则查找用户，存储用户，更新neo4j
    // 更新信任关系 更新neo4j
    // 存储信任改变记录
    
    // 建立neo
    return {
      blockData: blockData.data
    };
   }
  
}
