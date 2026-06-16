import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../../..', import.meta.url));
config({ path: resolve(rootDir, '.env') });

const { startInsightScheduler } = await import('../../api/src/lib/insight-scheduler.js');

console.info('[worker] umetrica background worker starting');
startInsightScheduler();
