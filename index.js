import { config } from './src/config.js';
import { createApp } from './src/app.js';
import { runBootstrap } from './src/bootstrap.js';

if (config.reservationNotifyEnabled && !config.resendApiKey) {
  console.warn(
    '[email] Reservation notifications are enabled but RESEND_API_KEY is not set — alerts will only log in dev until configured.',
  );
}

const app = createApp();

runBootstrap().finally(() => {
  app.listen(config.port, () => {
    console.log(`API http://localhost:${config.port}`);
  });
});
