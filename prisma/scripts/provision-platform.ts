import { runPlatformProvision } from '../provisioning/provisioning.runner';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Platform provision', async () => {
  await runPlatformProvision();
});
