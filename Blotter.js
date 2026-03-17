import { logActivity } from './Auditlog.js';

export const BlotterRouter = (router, supabase, authenticateToken) => {
    
    // ==========================================
    // 1. GET ALL BLOTTER CASES
    // ==========================================
    router.get('/blotter', authenticateToken, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('blotter_cases')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.json(data);
        } catch (err) {
            console.error("Fetch Blotter Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 2. POST: CREATE NEW BLOTTER CASE
    // ==========================================
    router.post('/blotter', authenticateToken, async (req, res) => {
        try {
            const r = req.body; 

            // STRICT MAPPING: This fixes the 'caseNumber' schema crash
            const dbPayload = {
                case_number: r.caseNumber || r.case_number,
                complainant_name: r.complainantName || r.complainant_name,
                complainant_id: r.complainantId || r.complainant_id || 'WALK-IN',
                respondent: r.respondent,
                incident_type: r.type || r.incident_type,
                narrative: r.narrative,
                date_filed: r.dateFiled || r.date_filed,
                time_filed: r.timeFiled || r.time_filed,
                status: r.status || 'Active'
            };

            if (!dbPayload.complainant_name || !dbPayload.respondent) {
                return res.status(400).json({ error: 'Missing complainant or respondent names.' });
            }

            const { data, error } = await supabase
                .from('blotter_cases')
                .insert([dbPayload])
                .select().single();

            if (error) throw error;

            // Log the activity securely
            const loggedBy = r.logged_by || req.user?.username || dbPayload.complainant_name;
            await logActivity(supabase, loggedBy, 'FILE_BLOTTER', `Case against ${dbPayload.respondent}`);

            res.status(201).json(data);
        } catch (err) {
            console.error("Create Blotter Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });

    // ==========================================
    // 3. PUT: UPDATE ENTIRE BLOTTER RECORD
    // ==========================================
    router.put('/blotter/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const r = req.body;

            // STRICT MAPPING
            const dbPayload = {
                case_number: r.caseNumber || r.case_number,
                complainant_name: r.complainantName || r.complainant_name,
                complainant_id: r.complainantId || r.complainant_id,
                respondent: r.respondent,
                incident_type: r.type || r.incident_type,
                narrative: r.narrative,
                date_filed: r.dateFiled || r.date_filed,
                time_filed: r.timeFiled || r.time_filed,
                status: r.status
            };

            // Strip undefined values to prevent overwriting with null
            Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

            const { data, error } = await supabase
                .from('blotter_cases')
                .update(dbPayload)
                .eq('id', id)
                .select().single();

            if (error) throw error;
            res.json(data);
        } catch (err) {
            console.error("Update Blotter Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 4. PATCH: QUICK STATUS UPDATE (Hearings, Archiving, Settling)
    // ==========================================
    router.patch('/blotter/:id/status', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, hearing_date, hearing_time, rejection_reason } = req.body;

            const updatePayload = { status };
            
            if (hearing_date !== undefined) updatePayload.hearing_date = hearing_date;
            if (hearing_time !== undefined) updatePayload.hearing_time = hearing_time;
            if (rejection_reason !== undefined) updatePayload.rejection_reason = rejection_reason;

            const { data, error } = await supabase
                .from('blotter_cases')
                .update(updatePayload)
                .eq('id', id)
                .select().single();

            if (error) throw error;
            res.json(data);
        } catch (err) {
            console.error("Patch Status Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });
};