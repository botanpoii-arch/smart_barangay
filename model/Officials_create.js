import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { hashPassword } from '../data.js'; // Ginagamit ang shared security logic mula sa data.js

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ==========================================
 * 3. OFFICIALS & ADMIN ACCOUNT MANAGEMENT
 * ==========================================
 * Para sa mga Barangay Officials at Staff:
 * 1. Pag-fetch ng listahan ng lahat ng officials.
 * 2. Paggawa ng bagong account para sa mga bagong staff.
 * 3. Awtomatikong hashing ng password bago i-save.
 */

/**
 * GET ALL OFFICIALS
 * Kinukuha ang lahat ng records mula sa 'officials_accounts' table.
 * Naka-sort mula sa pinakabago para sa Admin view.
 */
router.get('/officials', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('officials_accounts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch Officials Error:", error);
            throw error;
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve officials list.' });
    }
});

/**
 * POST: CREATE OFFICIAL ACCOUNT
 * Dito ginagawa ang credentials para sa Admin/Staff access.
 * @param username - Unique login name.
 * @param password - Plain text (will be hashed).
 * @param position - E.g., 'Barangay Captain', 'Secretary'.
 * @param fullName - Full name ng official.
 */
router.post('/officials', async (req, res) => {
    try {
        const { username, password, position, fullName } = req.body;

        // --- STEP 1: VALIDATION ---
        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'Missing required account information.' });
        }

        // --- STEP 2: SECURITY ENCRYPTION ---
        // Ginagamit ang Bcrypt hashing mula sa data.js
        const securePassword = hashPassword(password);

        // --- STEP 3: DATABASE INSERTION ---
        const { data, error } = await supabase
            .from('officials_accounts')
            .insert([{ 
                username: username.trim(), 
                password: securePassword, 
                position: position, 
                full_name: fullName, 
                role: 'official', // Default role for this endpoint
                status: 'Active' 
            }])
            .select();

        if (error) {
            // Check kung existing na ang username
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Username already exists.' });
            }
            throw error;
        }

        console.log(`New official account created: ${username}`);
        res.status(201).json({
            message: 'Official account successfully provisioned.',
            account: data[0]
        });

    } catch (err) {
        console.error("Official Creation Logic Error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

/**
 * DELETE: REMOVE OFFICIAL
 * (Admin Only) - Pagtanggal ng access ng isang official/staff.
 */
router.delete('/officials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('officials_accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Official access revoked successfully.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;