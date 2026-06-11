import { prisma } from '../seeds/prismaClient';

export async function runSeedTask(
  taskName: string,
  task: () => Promise<void>,
): Promise<void> {
  try {
    await task();
    console.log(`${taskName} complete.`);
  } catch (error: unknown) {
    console.error(`${taskName} failed.`);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
