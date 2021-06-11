<p align="center">
  <a href="https://www.0p0.org/">
    <img alt="ZeroDAO" src="https://pic.tom24h.com/0p0/img/ZERODAO.svg" height="60" />
  </a>
  <span style="line-height:60px">|</span>
  <a href="https://www.socircles.info/">
    <img alt="socircles" src="https://pic.tom24h.com/0p0/img/socircles-logo.svg" height="50" />
  </a>
</p>


<h4 align="center">
  <a>EN</a>
  <span> / </span>
  <a href="./README_ZH.md">中文</a>
</h4>





Calibration and tuning ZeroDAO's reputation system algorithm, using circles user data and relational data, as a control group to calculate `Betweenness` , `ArticleRank` , `PageRank` , `Closeness` , `Harmonic Centrality ` , `Eigenvector Centrality` , `Degree Centrality` , statistical data from various algorithms during the iteration.

This is the back-end repository for socircles and other related:

Website: https://socircles.info

Front-end: https://github.com/ZeroDAO/socircles-ui

Management: https://github.com/ZeroDAO/socircles-admin

## Features

- Using the graph database `neo4j` to store user and relational data and to run the control group algorithm.
- `mysql` storage of various information during the TIR calculation.
- Using the task system to synchronise data from `theGraph`.
- Using the task system to calculate reputation values in steps and batches and to save information on the results.
- Automatic completion of calculation tasks, fallback and recovery functions after failed task execution.
- Calculation of various centrality algorithms for the user;
- Find the various weight values of users in circles;
- Find the shortest path between circles users;

The purpose of this system is to validate, tune and present algorithms, so it is not efficient. You can actually use `neo4j` directly to compute reputation values, or if you need more speed, you can interface to a computational engine such as `spark`.

## Preparation

1. **Install `neo4j` (2.2.x)**

install [`neo4j community server`](https://neo4j.com/download-center/#community);

2. **Install `neo4j` Plugins**

install `graph-data-science`,  `APOC` ，Take care to choose the correct version;;

3. **Configuration `neo4j` Plugins**

- `neo4j/conf/neo4j.conf` Add at the end：

```js
dbms.security.procedures.unrestricted=apoc.*, gds.*
dbms.security.procedures.whitelist=apoc.*, gds.*
```

- `neo4j/conf/apoc.conf`

```js
apoc.export.file.enabled=true
```

## Configuration

The configuration file is located in`src/config/config.local.ts`

1. Configure `mysql` 

`>=5.7 Versions`，node (`>=12.x`)，Automatic initialisation and data import on first start-up

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

2.  Configure `neo4j`

```js
config.neo4j = {
    client: {
      url: 'bolt://127.0.0.1',
      username: 'neo4j',
      password: '',
    },
  }
```

## Get Started

### Local development

```bash
$ npm i
$ npm run dev
$ open http://localhost:8001/
```

### build

```bash
$ npm start
$ npm stop
```

### Commands

- Use `npm run lint` to do code style checks.
- Use `npm test` to do Execute unit tests.

## Thanks

[midway](https://midwayjs.org)
[cool-admin](https://www.cool-js.com)