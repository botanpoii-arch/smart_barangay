import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ==========================================
 * BLOTTER CREATION & CASE NUMBER LOGIC
 * ==========================================
 * Ang script na ito ay humahawak sa:
 * 1. Pag-calculate ng susunod na Case Number.
 * 2. Pag-save ng Narrative at Case Details sa Database.
 * 3. Pag-link ng case sa Resident Profile.
 */

/**
 * GET: LATEST CASE COUNT
 * Ginagamit ng frontend (File.tsx) para makabuo ng format na:
 * BRG-0-000-000-000 base sa bilang ng records.
 */
router.get('/latest-id', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('blotter_cases')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error("Counter Error:", error);
            throw error;
        }

        res.json({ total_cases: count || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve case counter.' });
    }
});

/**
 * POST: CREATE NEW BLOTTER RECORD
 * Sine-save ang data mula sa Incident Record Form preview.
 */
router.post('/', async (req, res) => {
    try {
        const { 
            caseNumber, 
            complainantId,    // ID mula sa Residents table
            complainantName,  // Full name para sa table display
            respondent, 
            type, 
            narrative, 
            dateFiled,
            timeFiled 
        } = req.body;

        // --- STEP 1: VALIDATION ---
        if (!caseNumber || !complainantId || !respondent) {
            return res.status(400).json({ error: 'Missing critical blotter information.' });
        }

        // --- STEP 2: DATABASE INSERTION ---
        // Sumusunod sa schema ng blotter_cases table
        const { data, error } = await supabase
            .from('blotter_cases')
            .insert([{
                caseNumber: caseNumber,
                complainant: complainantName,
                complainant_id: complainantId, // Foreign Key para sa Resident Archive
                respondent: respondent,
                type: type,
                status: 'Active', // Default status for new cases
                dateFiled: dateFiled || new Date().toISOString().split('T')[0],
                narrative: narrative // HTML formatted text mula sa TOOLS.ts
            }])
            .select();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Duplicate Case Number detected.' });
            }
            throw error;
        }

        console.log(`Blotter Case Filed: ${caseNumber} | Complainant: ${complainantName}`);
        
        res.status(201).json({
            message: 'Incident recorded successfully.',
            case_data: data[0]
        });

    } catch (err) {
        console.error("Blotter Creation Error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

/**
 * PUT: UPDATE NARRATIVE OR DETAILS
 * Ginagamit kapag nag-e-edit ng existing case sa File.tsx.
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('blotter_cases')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;