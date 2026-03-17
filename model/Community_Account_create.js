import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ==========================================
 * 4. ADMIN: COMMUNITY ACCOUNT MANAGEMENT
 * ==========================================
 * Ang script na ito ay para sa Admin-only actions:
 * 1. Pagtingin sa lahat ng accounts ng mga residente.
 * 2. Pag-check kung sino ang mga naka-Banned o Active.
 * 3. Pag-modify ng account status base sa barangay policy.
 */

/**
 * GET ALL RESIDENT ACCOUNTS
 * Kinukuha ang account details kasama ang firstName at lastName 
 * mula sa 'residents' table gamit ang relational join.
 */
router.get('/residents', async (req, res) => {
    try {
        // Relational Query: Account + Profile Info
        const { data, error } = await supabase
            .from('residents_accounts')
            .select(`
                *,
                residents:resident_id (
                    firstName,
                    lastName
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch Error:", error);
            throw error;
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error while fetching community accounts.' });
    }
});

/**
 * PATCH: UPDATE ACCOUNT STATUS
 * Ginagamit ng Admin para i-Ban o i-Activate ang account ng residente.
 * @param id - Ang unique ID ng account sa 'residents_accounts'.
 */
router.patch('/residents/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // Validation: Siguraduhin na valid ang status update
        const validStatuses = ['Active', 'Banned', 'Suspended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value provided.' });
        }

        const { data, error } = await supabase
            .from('residents_accounts')
            .update({ 
                status: status,
                updated_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data.length === 0) {
            return res.status(404).json({ error: 'Resident account not found.' });
        }

        console.log(`Account ${id} status updated to: ${status}`);
        res.json({
            message: `Account has been successfully ${status.toLowerCase()}.`,
            account: data[0]
        });

    } catch (err) {
        console.error("Status Update Error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

/**
 * DELETE: PERMANENT ACCOUNT REMOVAL
 * (Optional/Admin Only) - Tanggalin ang account access ng residente.
 */
router.delete('/residents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('residents_accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Resident account access removed permanently.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;