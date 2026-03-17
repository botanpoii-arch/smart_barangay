import chalk from 'chalk';
import os from 'os';
import crypto from 'crypto';
import { IDS } from './IDS.js';
import { IPS } from './IPS.js';

const theme = {
  pulse: chalk.bold.blue,
  success: chalk.bgGreen.black.bold,
  warning: chalk.bgYellow.black.bold,
  error: chalk.bgRed.white.bold,
  system: chalk.bold.magenta,
  dim: chalk.dim,
  metric: chalk.cyan
};

const START_TIME = Date.now();

// --- DEV METRICS STATE ---
const stats = {
  activeConnections: 0,
  totalRequests: 0,
  previousRequests: 0
};

/**
 * THE SECURITY HANDSHAKE MIDDLEWARE
 */
export const securityRegulator = (req, res, next) => {
  // 1. Trace ID Injection (Track attackers across logs)
  req.traceId = crypto.randomUUID();
  res.setHeader('X-Trace-Id', req.traceId);

  // 2. Track Active I/O & Throughput
  stats.activeConnections++;
  stats.totalRequests++;

  // Clean up connection count when request finishes or aborts early
  res.on('finish', () => stats.activeConnections--);
  res.on('close', () => {
    if (!res.writableFinished) stats.activeConnections--;
  });

  // 3. Scan & Enforce
  const report = IDS(req);
  IPS(req, res, next, report);
};

/**
 * MEASURE EVENT LOOP LAG
 * Essential for Node.js: Detects if synchronous code is blocking the main thread.
 */
const measureEventLoopLag = () => {
  return new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => resolve(Date.now() - start));
  });
};

/**
 * ADVANCED DEV TELEMETRY HEARTBEAT
 */
export const startPulse = (intervalMs = 15000, gcThresholdMB = 500) => {
  console.log(theme.system('\n[DEV_TELEMETRY] Advanced Diagnostics: ') + chalk.green('ONLINE'));

  const interval = setInterval(async () => {
    // Memory Breakdown
    const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
    
    // System Metrics
    const lag = await measureEventLoopLag();
    const cpuLoad = os.loadavg()[0].toFixed(2); // 1-minute load avg
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    
    // Throughput (Requests Per Second)
    const rps = ((stats.totalRequests - stats.previousRequests) / (intervalMs / 1000)).toFixed(1);
    stats.previousRequests = stats.totalRequests;

    // Format bytes to MB
    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(1);

    // Dynamic Threat/Load Assessment
    let status = chalk.green('STABLE');
    if (lag > 50 || toMB(heapUsed) > gcThresholdMB * 0.8 || cpuLoad > 2.0) status = chalk.yellow('WARNING');
    if (lag > 100 || toMB(heapUsed) > gcThresholdMB) status = chalk.bgRed.white.bold(' CRITICAL ');

    // Render Dashboard
    console.log(
      theme.pulse('┣ [SYS_PULSE] ') + status +
      theme.dim(' | RPS: ') + theme.metric(rps) +
      theme.dim(' | Active I/O: ') + theme.metric(stats.activeConnections) +
      theme.dim(' | Lag: ') + theme.metric(`${lag}ms`) +
      theme.dim(' | CPU Load: ') + theme.metric(cpuLoad) +
      theme.dim(` | RAM(Sys): `) + theme.metric(`${freeMem}GB free`)
    );
    console.log(
      theme.pulse('┗ [MEM_HEAP]  ') +
      theme.dim('RSS (Total): ') + theme.metric(`${toMB(rss)}MB`) +
      theme.dim(' | V8 Heap: ') + theme.metric(`${toMB(heapUsed)}/${toMB(heapTotal)}MB`) +
      theme.dim(' | C++ Ext: ') + theme.metric(`${toMB(external)}MB`)
    );

    // Emergency V8 Garbage Collection Check
    if (global.gc && toMB(heapUsed) > gcThresholdMB) {
      console.log(theme.warning('⚠️ HEAP LIMIT REACHED ') + theme.system(` Forcing V8 Garbage Collection...`));
      global.gc();
    }
  }, intervalMs);

  return () => clearInterval(interval);
};

/**
 * GRACEFUL SHUTDOWN HANDLER
 */
export const handleShutdown = async (cleanupTasks) => {
  console.log(`\n${theme.error(' INIT SHUTDOWN SEQUENCE ')}`);
  
  // Hard-kill failsafe if DB connections hang
  const forceExit = setTimeout(() => {
    console.error(chalk.red('[FATAL] Cleanup timeout. Forcing process kill.'));
    process.exit(1);
  }, 10000);

  try {
    const tasks = Array.isArray(cleanupTasks) ? cleanupTasks : [cleanupTasks];
    for (const task of tasks) {
      if (typeof task === 'function') await task();
    }
    console.log(theme.success(' SYSTEM OFFLINE '));
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error(theme.error(' SHUTDOWN FAILED '), err);
    process.exit(1);
  }
};