import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export type DefaultConfig = PowerPartial<EggAppConfig>;

export default (appInfo: EggAppInfo) => {
  const config = {} as DefaultConfig;

  config.neo4j = {
    client: {
      url: 'bolt://127.0.0.1',
      username: 'neo4j',
      password: '123456',
    },
  }

  config.orm = {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '123456',
    database: 'cir',
    // 自动建表 注意：线上部署的时候不要使用，有可能导致数据丢失
    synchronize: true,
    // 打印日志
    logging: true,
  };

  config.logger = {
    coreLogger: {
      consoleLevel: 'INFO',
    },
  };

  return config;
};
