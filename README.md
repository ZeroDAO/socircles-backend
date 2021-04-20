校验 socoin 的声誉系统算法，采用 circles 用户数据和关系数据，最为对照组计算 `Betweenness` , `ArticleRank` , `PageRank` , `Closeness` , `Harmonic Centrality` , `Eigenvector Centrality` , `Degree Centrality` , 统计迭代过程中各种算法的百分比分布等数据。

## 实现

- 采用 `cool-admin` 减少后台工作量；
- 使用图数据库 `neo4j` 存储用户和关系数据，并运行对照组算法；
- `mysql` 存储声誉系统算法计算过程中的各种信息；
- 使用任务系统从 `thegraph` 同步数据；
- 使用任务系统分步分批计算声誉值，并保存结果信息；

本系统的目的是验证、调整和展示算法，所以它并不是高效的，实际上你可以直接使用 `neo4j` 计算声誉值，如果需要更快的速度，可以对接 `spark` 等计算引擎。

## 技术栈

* 数据库：**`neo4j` `mysql`**
* 后端：**`node.js` `midway.js` `egg.js` `typescript` `neo4j` `cool-admin`**

## 运行

#### 安装 `neo4j` (`2.2.x版本`)

- 下载并安装 [`neo4j community server`](https://neo4j.com/download-center/#community) 社区版;
- 安装插件 `graph-data-science` `APOC` ，注意安装对应版本;
- 配置插件；

`neo4j/conf/neo4j.conf` 尾部添加：

```js
dbms.security.procedures.unrestricted=apoc.*, gds.*
dbms.security.procedures.whitelist=apoc.*, gds.*
```

`neo4j/conf/apoc.conf`

```js
apoc.export.file.enabled=true
```

#### 修改数据库配置

配置文件位于`src/config/config.local.ts`

`mysql` 
`>=5.7版本`，node版本(`>=12.x`)，首次启动会自动初始化并导入数据

```js
config.orm = {
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    username: 'root',
    password: '',
    database: 'cool-admin',
    synchronize: true,
    logging: true,
}
```

`neo4j`

```js
config.neo4j = {
    client: {
      url: 'bolt://127.0.0.1',
      username: 'neo4j',
      password: '',
    },
  }
```

#### 安装依赖并运行

```bash
$ npm i
$ npm run dev
$ open http://localhost:8001/
```

注： `npm i`如果安装失败可以尝试使用[cnpm](https://developer.aliyun.com/mirror/NPM?from=tnpm)，或者切换您的镜像源

### 部署

```bash
$ npm start
$ npm stop
```

### 内置指令

- 使用 `npm run lint` 来做代码风格检查。
- 使用 `npm test` 来执行单元测试。


[midway]: https://midwayjs.org
[cool-admin]: https://www.cool-js.com
