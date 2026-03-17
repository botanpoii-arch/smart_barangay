// IPS.js
import chalk from 'chalk';

export const IPS = (req, res, next, idsReport) => {
  const ip = req.ip || req.connection.remoteAddress;

  // 1. If IDS says 'CHALLENGE', we don't block, we "Soft Lock"
  if (idsReport.level === 'CHALLENGE') {
    console.log(chalk.bgYellow.black(' [IPS CHALLENGE] ') + ` Soft-locking ${ip}. Awaiting CAPTCHA.`);
    
    // We send a 428 Precondition Required or 403 with a specific custom header
    return res.status(428).json({ 
      error: 'HUMAN_VERIFICATION_REQUIRED',
      message: 'Our system detected automated behavior. Please solve the CAPTCHA to continue.'
    });
  }

  // 2. Hard block for critical violations
  if (idsReport.level === 'CRITICAL') {
    return res.status(403).json({ error: 'INTRUSION_PREVENTED' });
  }

  next();
};