import { seedAddressReferences } from '../seeds/seedAddressReferences';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Address reference seed', async () => {
  await seedAddressReferences();
});
