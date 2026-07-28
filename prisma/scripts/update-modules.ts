import { seedModules } from '../seeds/seedModules';
import { seedModuleSystems } from '../seeds/seedModuleSystems';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Module catalog update', async () => {
  console.log('Updating modules and permissions.');
  await seedModules();

  console.log('Updating module systems and sidebar templates.');
  await seedModuleSystems();
});
