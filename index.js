import { config } from './src/config.js';
import { createApp } from './src/app.js';
import { runBootstrap } from './src/bootstrap.js';

const app = createApp();

runBootstrap().finally(() => {
  app.listen(config.port, () => {
    console.log(`API http://localhost:${config.port}`);
  });
});
