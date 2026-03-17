import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ==========================================
 * BLOTTER TABLE MANAGEMENT & STATS
 * ==========================================
 * Ang script na ito ay para sa:
 * 1. Pag-retrieve ng lahat ng kaso para sa Stats Cards.
 * 2. Pag-filter ng data base sa Status (Active, Hearing, etc.).
 * 3. Pag-update ng Hearing Date at Status.
 */

/**
 * GET: FETCH ALL CASES
 * Kinukuha ang lahat ng records mula sa 'blotter_cases'.
 * Ito ang basehan ng iyong activeCount, hearingCount, at settledCount.
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('blotter_cases')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Database Fetch Error:", error);
            throw error;
        }

        // Nagpapadala ng raw data; ang frontend na ang bahala sa useMemo filtering
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to sync with blotter database.' });
    }
});

/**
 * PATCH: UPDATE STATUS & HEARING DATE
 * Ginagamit kapag ang isang 'Active' case ay gagawing 'Hearing' o 'Settled'.
 * @param id - UUID ng kaso mula sa blotter_cases table.
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, hearingDate } = req.body;

        // Validation para sa status transitions base sa iyong schema
        const allowedStatuses = ['Active', 'Hearing', 'Settled', 'Archived'];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid blotter status transition.' });
        }

        const { data, error } = await supabase
            .from('blotter_cases')
            .update({ 
                status: status,
                hearingDate: hearingDate, // Saktong-sakto sa hearingDate column mo
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data.length === 0) {
            return res.status(404).json({ error: 'Blotter record not found.' });
        }

        console.log(`Case ${data[0].caseNumber} updated to status: ${status}`);
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * DELETE: ARCHIVE RECORD (Soft Delete)
 * Inililipat ang record sa 'Archived' status sa halip na permanenteng tanggalin.
 * Ito ay para sa audit trail at resident tracking.
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('blotter_cases')
            .update({ status: 'Archived' })
            .eq('id', id)
            .select();

        if (error) throw error;
        
        res.json({ 
            message: 'Case successfully moved to archives.',
            archived_case: data[0]?.caseNumber 
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;