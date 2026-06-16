import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../../..', import.meta.url));
config({ path: resolve(rootDir, '.env') });

const { startInsightScheduler } = await import('../../api/src/lib/insight-scheduler.js');
const { startBenchmarkPoolScheduler } = await import('../../api/src/lib/benchmark-pool-scheduler.js');

console.info('[worker] Sellerpool background worker starting');
startInsightScheduler();
startBenchmarkPoolScheduler();
