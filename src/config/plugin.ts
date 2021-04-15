import { EggPlugin } from 'egg';
export default {
  static: true, // default is true
  view: true,
  schedule: true,
  nunjucks: {
    enable: true,
    package: 'egg-view-nunjucks',
  },
} as EggPlugin;

exports.neo4j = {
  enable: true,
  package: 'egg-neo4j',
};
