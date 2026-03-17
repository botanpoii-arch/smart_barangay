import bcrypt from 'bcryptjs';
import { logActivity } from './Auditlog.js'; 

// --- SIMPLE RBAC HEADER CHECK ---
const checkHeaderRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'];
        
        if (!userRole || !allowedRoles.includes(userRole.toLowerCase())) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'Access Denied: Insufficient Role Permissions.' 
            });
        }
        next();
    };
};

export const OfficialsRouter = (router, supabase, authenticateToken) => {

    // ==========================================
    // 1. GET ALL OFFICIALS 
    // ==========================================
    router.get('/officials', authenticateToken, async (req, res) => {
        try { 
            const { data, error } = await supabase
                .from('officials')
                .select('*')
                .order('position', { ascending: true }); 
            
            if (error) throw error; 
            res.json(data); 
        } catch (err) { 
            res.status(500).json({ error: err.message }); 
        }
    });

    // ==========================================
    // 2. POST: ADD OFFICIAL & AUTO-GENERATE ACCOUNT
    // ==========================================
    router.post('/officials', authenticateToken, checkHeaderRole(['admin', 'superadmin']), async (req, res) => {
        try {
            const { full_name, position, term_start, term_end, status, contact_number } = req.body;

            const { data: profile, error: profileError } = await supabase
                .from('officials')
                .insert([{
                    full_name,
                    position,
                    term_start: term_start || null,
                    term_end: term_end || null,
                    status: status || 'Active',
                    contact_number
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            const nameParts = profile.full_name.trim().split(/\s+/);
            const firstName = nameParts[0].toLowerCase();
            const rawRole = position.toLowerCase().replace('barangay', '').trim().replace(/\s+/g, '');

            let fI = nameParts[0] ? nameParts[0][0].toLowerCase() : 'x';
            let mI = 'x'; 
            let lI = 'x';

            if (nameParts.length >= 3) {
                mI = nameParts[1][0].toLowerCase();
                lI = nameParts[nameParts.length - 1][0].toLowerCase();
            } else if (nameParts.length === 2) {
                lI = nameParts[1][0].toLowerCase();
            }
            const initials = `${fI}${mI}${lI}`;

            let isUnique = false;
            let finalUsername = "";
            const { count } = await supabase.from('officials_accounts').select('*', { count: 'exact', head: true });
            let sequence = (count || 0) + 1;

            while (!isUnique) {
                const numberSuffix = String(sequence).padStart(3, '0');
                const candidate = `${initials}${numberSuffix}@${rawRole}.officials.eng-hill.brg.ph`;

                const { data: existing } = await supabase
                    .from('officials_accounts')
                    .select('username')
                    .eq('username', candidate)
                    .maybeSingle();

                if (!existing) {
                    finalUsername = candidate;
                    isUnique = true;
                } else {
                    sequence++; 
                }
            }

            const plainPassword = `${firstName}123456`;
            const securePassword = bcrypt.hashSync(plainPassword, 10);
            const systemRole = position.toLowerCase().includes('captain') ? 'superadmin' : 'admin';

            const { error: accountError } = await supabase
                .from('officials_accounts')
                .insert([{
                    official_id: profile.id,
                    username: finalUsername,
                    password: securePassword,
                    role: systemRole,
                    status: 'Active'
                }]);

            if (accountError) throw accountError;

            await logActivity(supabase, req.user?.username || 'System', 'ADD_OFFICIAL', `Added ${full_name} as ${position}`);

            res.status(201).json({ 
                ...profile, 
                account: { username: finalUsername, password: plainPassword } 
            });

        } catch (err) {
            console.error("Save Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });

    // ==========================================
    // 3. PUT: UPDATE OFFICIAL
    // ==========================================
    router.put('/officials/:id', authenticateToken, checkHeaderRole(['admin', 'superadmin']), async (req, res) => {
        try { 
            const { id } = req.params; 
            const { full_name, position, term_start, term_end, status, contact_number } = req.body; 

            const updates = {
                full_name,
                position,
                term_start: term_start || null,
                term_end: term_end || null,
                status,
                contact_number
            };

            const { data, error } = await supabase
                .from('officials')
                .update(updates)
                .eq('id', id)
                .select(); 

            if (error) throw error; 
            await logActivity(supabase, req.user?.username || 'System', 'UPDATE_OFFICIAL', `Updated details for ${full_name}`);
            res.json(data[0]); 
        } catch (err) { 
            res.status(400).json({ error: err.message }); 
        }
    });

    // ==========================================
    // 4. DELETE: SOFT ARCHIVE
    // ==========================================
    router.delete('/officials/:id', authenticateToken, checkHeaderRole(['admin', 'superadmin']), async (req, res) => {
        try { 
            const { id } = req.params; 
            const { data: official } = await supabase.from('officials').select('full_name').eq('id', id).single();
            const { error } = await supabase
                .from('officials')
                .update({ status: 'End of Term', term_end: new Date().toISOString().split('T')[0] })
                .eq('id', id); 
                
            if (error) throw error; 
            await logActivity(supabase, req.user?.username || 'System', 'ARCHIVE_OFFICIAL', `Official term ended: ${official?.full_name}`);
            res.json({ message: 'Official term ended successfully' }); 
        } catch (err) { 
            res.status(400).json({ error: err.message }); 
        }
    });

    // ==========================================
    // 5. GET: FETCH PROFILE BY ACCOUNT ID
    // ==========================================
    router.get('/officials/profile/:accountId', authenticateToken, async (req, res) => {
        try {
            const { accountId } = req.params;

            const { data: account, error: accError } = await supabase
                .from('officials_accounts')
                .select('official_id, role, username')
                .eq('id', accountId) 
                .single();

            if (accError || !account) return res.status(404).json({ error: "Account not found." });

            const { data: profile, error: profError } = await supabase
                .from('officials')
                .select('*')
                .eq('id', account.official_id)
                .single();

            if (profError || !profile) return res.status(404).json({ error: "Profile missing." });

            res.json({ ...profile, email: profile.email || account.username });
        } catch (err) {
            res.status(500).json({ error: "Server Error" });
        }
    });

    // ==========================================
    // 6. PUT: UPDATE PROFILE BY ACCOUNT ID
    // ==========================================
    router.put('/officials/profile/:accountId', authenticateToken, async (req, res) => {
        try {
            const { accountId } = req.params;
            const { full_name, email, contact_number } = req.body;

            const { data: account } = await supabase
                .from('officials_accounts')
                .select('official_id')
                .eq('id', accountId)
                .single();

            if (!account) return res.status(404).json({ error: "Account not found." });

            const { data, error } = await supabase
                .from('officials')
                .update({ full_name, contact_number, email })
                .eq('id', account.official_id)
                .select().single();

            if (error) throw error;
            res.json({ message: "Updated", profile: data });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};