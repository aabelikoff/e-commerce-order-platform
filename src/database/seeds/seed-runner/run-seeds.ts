import { runSeeders } from 'typeorm-extension';
import { assertSeedAllowed } from './seed.guard';
import { AppDataSource } from '../../data-source';

(async function () {
  assertSeedAllowed();
  try {
    await AppDataSource.initialize();
    await runSeeders(AppDataSource);
  } catch (err) {
    console.error('Seeding error', err);
    throw err;
  } finally {
    await AppDataSource.destroy();
  }
})();
