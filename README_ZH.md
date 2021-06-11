<p align="center">
  <a href="https://www.0p0.org/">
    <img alt="ZeroDAO" src="https://pic.tom24h.com/0p0/img/ZERODAO.svg" height="60" />
  </a>
  <span style="line-height:60px">|</span>
  <a href="https://www.socircles.info/">
    <img alt="socircles" src="https://pic.tom24h.com/0p0/img/socircles-logo.svg" height="50" />
  </a>
</p>


<h5 align="center">
  <a href="./README.md">EN</a>
  <span> / </span>
  <a>中文</a>
</h5>





校验和调优 ZeroDAO 的声誉系统算法，采用 circles 用户数据和关系数据，作为对照组计算 `Betweenness` , `ArticleRank` , `PageRank` , `Closeness` , `Harmonic Centrality` , `Eigenvector Centrality` , `Degree Centrality` , 统计迭代过程中各种算法数据。

这是 socircles 的后端仓库，其他相关：

应用: https://socircles.info

前端: https://github.com/ZeroDAO/socircles-ui

后台: https://github.com/ZeroDAO/socircles-admin

## 实现

- 采用 `cool-admin` 快速开发后台；
- 使用图数据库 `neo4j` 存储用户和关系数据，并运行对照组算法；
- `mysql` 存储 TIR 计算过程中的各种信息；
- 使用任务系统从 `theGraph` 同步数据；
- 使用任务系统分步分批计算声誉值，并保存结果信息；
- 自动完成全部计算，失败任务可回退或恢复；
- Circles 的所有用户各种中心度计算；
- 可查询单个用户的所有计算值；
- 可查找两个用户之间的最短距离；

本系统的目的是验证、调整和展示算法，所以它并不是高效的，实际上你可以直接使用 `neo4j` 计算声誉值，如果需要更快的速度，可以对接 `spark` 等计算引擎。不可用在 ZeroDAO 声誉系统的计算汇总，因为存在精度差异。

## 技术栈

* 数据库：**`neo4j` `mysql`**
* 后端：**`node.js` `midway.js` `egg.js` `typescript` `cool-admin`**

## 安装

1. **安装 `neo4j` (2.2.x版本)**

安装 [`neo4j community server`](https://neo4j.com/download-center/#community) （社区版）;

2. **安装 `neo4j` 插件**

安装插件 `graph-data-science` `APOC` ，注意选择正确版本;

3. **配置 `neo4j` 插件**

- `neo4j/conf/neo4j.conf` 尾部添加：

```js
dbms.security.procedures.unrestricted=apoc.*, gds.*
dbms.security.procedures.whitelist=apoc.*, gds.*
```

- `neo4j/conf/apoc.conf`

```js
apoc.export.file.enabled=true
```

## 配置

配置文件位于`src/config/config.local.ts`

1. 配置`mysql` 

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

2.  配置`neo4j`

```js
config.neo4j = {
    client: {
      url: 'bolt://127.0.0.1',
      username: 'neo4j',
      password: '',
    },
  }
```

## 开始

### 本地开发

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

## 感谢

[midway](https://midwayjs.org)
[cool-admin](https://www.cool-js.com)