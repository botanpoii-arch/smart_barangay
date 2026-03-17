// IDS.js
import chalk from 'chalk';

const userPatterns = new Map();

export const IDS = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  const data = userPatterns.get(ip) || { lastSeen: now, gaps: [], score: 0 };
  
  // Calculate the gap between this request and the last one
  const currentGap = now - data.lastSeen;
  data.gaps.push(currentGap);
  if (data.gaps.length > 5) data.gaps.shift(); // Keep only last 5 gaps

  // Calculate Variance (is it too perfect?)
  const averageGap = data.gaps.reduce((a, b) => a + b, 0) / data.gaps.length;
  const isTooConsistent = data.gaps.every(g => Math.abs(g - averageGap) < 10); // Variance < 10ms is bot-like

  data.lastSeen = now;
  
  if (data.gaps.length === 5 && isTooConsistent) {
    console.log(chalk.bgMagenta.white.bold(' [IDS BOT] ') + chalk.magenta(` Low entropy pattern detected from ${ip}`));
    return { level: 'CHALLENGE', type: 'BOT_PATTERN' };
  }

  // Standard RBAC Check
  const userRole = req.headers['x-user-role'];
  if (!userRole) return { level: 'HIGH', type: 'MISSING_ROLE' };

  return { level: 'LOW', type: 'NORMAL' };
};