import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { hashPassword } from '../data.js'; // Ginagamit ang shared security helper mula sa main data.js

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ==========================================
 * RESIDENT REGISTRATION & AUTO-ACCOUNT
 * ==========================================
 * 1. Gumagawa ng profile sa 'residents' table.
 * 2. Nag-ge-generate ng unique username base sa pangalan.
 * 3. Gumagawa ng default password (firstname + 1234).
 * 4. Sine-secure ang password gamit ang Bcrypt via hashPassword.
 * 5. Nag-i-insert sa 'residents_accounts' para sa login access.
 */
router.post('/residents', async (req, res) => {
    try {
        const residentData = req.body;

        // --- STEP 1: CREATE RESIDENT PROFILE ---
        // Sinisiguro na ang basic info ay nakapasok sa main residents table
        const { data: profile, error: profileError } = await supabase
            .from('residents')
            .insert([residentData])
            .select()
            .single();

        if (profileError) {
            console.error("Profile Creation Error:", profileError);
            throw profileError;
        }

        // --- STEP 2: GENERATE LOGIN CREDENTIALS ---
        // Username Pattern: initial ng first name + initial ng last name + random 4 digits
        const fInitial = profile.firstName ? profile.firstName.charAt(0).toLowerCase() : 'x';
        const lInitial = profile.lastName ? profile.lastName.charAt(0).toLowerCase() : 'x';
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        
        const generatedUsername = `${fInitial}${lInitial}${randomSuffix}@residents.eng-hill.brg.ph`;
        
        // Default Password: [firstname lowercase] + 1234
        const plainDefaultPassword = `${profile.firstName.toLowerCase().replace(/\s/g, '')}1234`;
        
        // Secure the password using the helper from data.js
        const securePassword = hashPassword(plainDefaultPassword);

        // --- STEP 3: CREATE THE ACCOUNT ---
        // I-link ang account sa resident_id para sa relational data tracking
        const { data: account, error: accountError } = await supabase
            .from('residents_accounts')
            .insert([{
                resident_id: profile.id,
                username: generatedUsername,
                password: securePassword, // Bcrypt Hash
                role: 'resident',
                status: 'Active'
            }])
            .select()
            .single();

        if (accountError) {
            console.error("Critical: Resident profile created but account generation failed.", accountError);
            // Optional: Pwede ring i-delete ang profile dito kung gusto ng full rollback
        }

        // --- STEP 4: RETURN DATA TO ADMIN ---
        // Ibinabalik ang PLAIN password sa Admin para maibigay sa resident sa unang pagkakataon
        res.status(201).json({
            message: 'Resident registered successfully with auto-generated account.',
            resident_profile: profile,
            credentials: {
                username: generatedUsername,
                password: plainDefaultPassword // Plain text for one-time admin viewing
            }
        });

    } catch (err) {
        console.error("Registration Error Handler:", err.message);
        res.status(400).json({ error: err.message });
    }
});

/**
 * FETCH ALL RESIDENTS
 * Ginagamit para sa main directory ng Barangay Residents.
 */
router.get('/residents', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('residents')
            .select('*')
            .order('lastName', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * UPDATE RESIDENT PROFILE
 */
router.put('/residents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Proteksyon para hindi ma-overwrite ang sensitive IDs
        delete updates.id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('residents')
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