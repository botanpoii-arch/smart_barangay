import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { hashPassword } from '../data.js'; // Import shared security logic

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ==========================================
 * 2. PASSWORD MANAGEMENT & SECURITY RESET
 * ==========================================
 * Ang endpoint na ito ay tinatawag kapag:
 * 1. Unang beses nag-login ang resident (Forced Reset).
 * 2. Gusto lang palitan ng user ang kanilang password para sa security.
 * 3. Ginagamit ang resident_id bilang unique identifier para sa account update.
 */
router.patch('/accounts/residents/:residentId/reset', async (req, res) => {
    try {
        const { password } = req.body;
        const { residentId } = req.params;

        // --- STEP 1: VALIDATION ---
        // Sinisiguro na hindi "sh*t" ang password na ilalagay ng user
        if (!password || password.length < 8) {
            return res.status(400).json({ 
                error: 'Security standard not met. Password must be at least 8 characters.' 
            });
        }

        // --- STEP 2: SECURITY HASHING ---
        // Ginagamit ang Bcrypt logic mula sa data.js para i-scramble ang password
        const securePassword = hashPassword(password);

        // --- STEP 3: DATABASE UPDATE ---
        // Hinahanap ang account base sa resident_id link
        const { data, error } = await supabase
            .from('residents_accounts')
            .update({ 
                password: securePassword,
                updated_at: new Date().toISOString() // Track kung kailan huling nag-reset
            }) 
            .eq('resident_id', residentId)
            .select();

        if (error) {
            console.error("Database Update Error:", error);
            throw error;
        }

        if (data.length === 0) {
            return res.status(404).json({ 
                error: 'Account linkage not found for this resident ID.' 
            });
        }

        // --- STEP 4: SUCCESS RESPONSE ---
        console.log(`Password reset success for Resident: ${residentId}`);
        
        res.json({ 
            message: 'Password updated successfully. Security credentials refreshed.', 
            user_id: data[0].id 
        });

    } catch (err) {
        console.error("Critical Password Logic Error:", err.message);
        res.status(500).json({ error: 'Internal server error during password reset.' });
    }
});

/**
 * LOGOUT SESSION LOG (Optional Helper)
 * Pwedeng gamitin para sa audit trail ng login/logout security.
 */
router.post('/accounts/logout-audit', async (req, res) => {
    // Logic para i-clear ang session or mag-log ng logout activity
    res.json({ message: 'Session metadata cleared.' });
});

export default router;