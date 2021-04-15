<p align="center">
  <a href="https://midwayjs.org/" target="blank"><img src="https://cool-show.oss-cn-shanghai.aliyuncs.com/admin/logo.png" width="200" alt="Midway Logo" /></a>
</p>

## 技术栈

* 后端：**`node.js` `midway.js` `egg.js` `mysql` `typescript` `neo4j` `cool-admin`**

## 运行

#### 修改数据库配置，配置文件位于`src/config/config.local.ts`

数据库为mysql(`>=5.7版本`)，node版本(`>=12.x`)，首次启动会自动初始化并导入数据

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
