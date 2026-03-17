import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import jwt from 'jsonwebtoken'; 

import { uploadImage } from './cloud.js';

// Modular Imports
import { documentRouter } from './Document.js';
import { AuditlogRouter, logActivity } from './Auditlog.js'; 
import { RbacRouter } from './Rbac_acc.js'; 
import { AccountManagementRouter } from './Account_Management.js';
import { ResidentsRecordRouter } from './Residents_record.js'; 
import { OfficialsRouter } from './Officials.js'; 
import { HouseholdRouter } from './Household.js';
import { OfficialsLoginRouter } from './Officials_login.js';
import { BlotterRouter } from './Blotter.js'; 
import { ProfileRouter } from './Profile.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here'; 

/**
 * ==========================================
 * SSL & SUPABASE CLIENT INITIALIZATION
 * ==========================================
 */
const certPath = path.resolve(process.cwd(), process.env.DB_SSL_CERT_PATH || './prod-ca-2021 (1).crt');
const sslCert = fs.readFileSync(certPath).toString();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  global: {
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        agent: new https.Agent({
          ca: sslCert,
          rejectUnauthorized: true
        })
      });
    }
  },
  db: {
    schema: 'public'
  }
});

// ==========================================
// 1. JWT AUTHENTICATION MIDDLEWARE
// ==========================================
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// ==========================================
// REMOVED: CORS & EXPRESS.JSON (Now handled globally in server.js)
// ==========================================

// ==========================================
// 2. SECURITY HELPERS
// ==========================================
const verifyPassword = (inputPassword, storedPassword) => {
  if (!inputPassword || !storedPassword) return false;
  if (storedPassword.startsWith('$2')) {
    return bcrypt.compareSync(inputPassword, storedPassword);
  }
  return inputPassword === storedPassword;
};

// ==========================================
// 3. AUTHENTICATION & LOGIN
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username ? username.trim().toLowerCase() : '';

    const { data: accountData, error: accountError } = await supabase
      .from('residents_account')
      .select('*, profile:resident_id(*)') 
      .ilike('username', cleanUsername) 
      .single();

    if (accountError || !accountData) {
      console.log(`[AUTH] Login failed: User ${cleanUsername} not found.`);
      return res.status(401).json({ error: 'Account not found.' });
    }

    if (!accountData.profile) {
      console.error(`[DB ERROR] Account ${cleanUsername} profile link broken!`);
      return res.status(404).json({ error: 'Resident profile link broken.' });
    }

    const isValid = verifyPassword(password, accountData.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password.' });

    const token = jwt.sign(
      { account_id: accountData.account_id, username: accountData.username, role: accountData.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const isUsingDefault = password.includes('123456');

    await logActivity(supabase, accountData.username, 'RESIDENT_LOGIN', 'Authentication successful');

    res.json({ 
      message: 'Login successful', 
      token, 
      account_id: accountData.account_id, 
      username: accountData.username,
      role: accountData.role,
      requires_reset: isUsingDefault, 
      profile: {
        record_id: accountData.profile.record_id,
        first_name: accountData.profile.first_name,
        last_name: accountData.profile.last_name,
        purok: accountData.profile.purok
      }
    });
  } catch (err) {
    console.error("[CRITICAL SYSTEM ERROR]", err.message);
    res.status(500).json({ error: 'Internal system error.' });
  }
});

// ==========================================
// 4. INITIALIZE PROTECTED MODULES
// ==========================================
HouseholdRouter(router, supabase, authenticateToken);
documentRouter(router, supabase); 
AuditlogRouter(router, supabase);
RbacRouter(router, supabase); 
AccountManagementRouter(router, supabase); 
ResidentsRecordRouter(router, supabase); 
OfficialsRouter(router, supabase, authenticateToken); 
OfficialsLoginRouter(router, supabase); 
BlotterRouter(router, supabase, authenticateToken); 
ProfileRouter(router, supabase, authenticateToken);

// ==========================================
// 5. ANNOUNCEMENTS
// ==========================================
router.get('/announcements', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Announcement Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to fetch announcements." });
    }
});

router.post('/announcements', authenticateToken, async (req, res) => {
    try {
        const { title, content, category, priority, expires_at, image_url } = req.body;

        let secureImageUrl = null;
        if (image_url && image_url.startsWith('data:image')) {
            secureImageUrl = await uploadImage(image_url, 'barangay_announcements');
        }

        const { data, error } = await supabase
            .from('announcements')
            .insert([{
                title, content, category, priority, expires_at,
                image_url: secureImageUrl,
                status: 'Active',
                views: 0
            }])
            .select().single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Create Announcement Error:", err);
        res.status(500).json({ error: "Failed to create announcement." });
    }
});

router.put('/announcements/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, priority, expires_at, image_url } = req.body;

        let secureImageUrl = await uploadImage(image_url, 'barangay_announcements');

        const { data, error } = await supabase
            .from('announcements')
            .update({
                title, content, category, priority, expires_at,
                image_url: secureImageUrl
            })
            .eq('id', id)
            .select().single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Update Announcement Error:", err);
        res.status(500).json({ error: "Failed to update announcement." });
    }
});

router.delete('/announcements/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: "Deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete announcement." });
    }
});

// ==========================================
// 6. OTHER ROUTES (Accounts, Stats)
// ==========================================
router.patch('/accounts/reset/:id', authenticateToken, async (req, res) => {
  try {
      const { id } = req.params;
      const { password, updatedBy } = req.body; 
      if (!password || password.length < 8) return res.status(400).json({ error: "Minimum 8 characters." });

      const { error } = await supabase
          .from('residents_account')
          .update({ password: bcrypt.hashSync(password, 10) })
          .eq('account_id', id);

      if (error) throw error;

      await logActivity(supabase, updatedBy || req.user.username || 'System Admin', 'PASSWORD_RESET', `Forced reset for Account: ${id}`);

      res.status(200).json({ message: "Updated." });
  } catch (err) {
      res.status(500).json({ error: "Reset failed." });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [pop, doc, blot, act] = await Promise.all([
      supabase.from('residents_records').select('*', { count: 'exact', head: true }),
      supabase.from('document_requests').select('*', { count: 'exact', head: true }),
      supabase.from('blotter_cases').select('*', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true })
    ]);
    res.status(200).json({
      stats: { 
        totalPopulation: pop.count || 0, 
        documentsIssued: doc.count || 0, 
        blotterCases: blot.count || 0, 
        systemActivities: act.count || 0 
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Stats failed.' });
  }
});

export default router;
