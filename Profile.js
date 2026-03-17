import { logActivity } from './Auditlog.js';

export const ProfileRouter = (router, supabase, authenticateToken) => {

    // ==========================================
    // 1. GET: FETCH PERSONAL PROFILE
    // ==========================================
    router.get('/profile/:accountId', authenticateToken, async (req, res) => {
        try {
            const { accountId } = req.params;

            // SECURITY CHECK: Ensure user is only accessing their own profile
            // req.user.id should come from your authenticateToken middleware
            if (req.user && String(req.user.id) !== String(accountId)) {
                return res.status(403).json({ error: "Access denied: Unauthorized profile access." });
            }

            // Step A: Find the account to get the official_id link
            const { data: account, error: accError } = await supabase
                .from('officials_accounts')
                .select('official_id, role, username')
                .eq('id', accountId) 
                .single();

            if (accError || !account) {
                return res.status(404).json({ error: "Account record not found." });
            }

            // Step B: Fetch profile details
            const { data: profile, error: profError } = await supabase
                .from('officials')
                .select('*')
                .eq('id', account.official_id)
                .single();

            if (profError || !profile) {
                return res.status(404).json({ error: "Official profile details missing." });
            }

            res.json({
                ...profile,
                email: profile.email || account.username,
                role: account.role
            });

        } catch (err) {
            console.error("[PROFILE_GET_ERROR]:", err.message);
            res.status(500).json({ error: "Internal server error." });
        }
    });

    // ==========================================
    // 2. PUT: UPDATE PERSONAL PROFILE
    // ==========================================
    router.put('/profile/:accountId', authenticateToken, async (req, res) => {
        try {
            const { accountId } = req.params;
            const { full_name, email, contact_number } = req.body;

            // SECURITY CHECK: Prevent updating other users' profiles
            if (req.user && String(req.user.id) !== String(accountId)) {
                return res.status(403).json({ error: "Access denied: Unauthorized update attempt." });
            }

            // Step A: Resolve the official_id
            const { data: account, error: accError } = await supabase
                .from('officials_accounts')
                .select('official_id')
                .eq('id', accountId)
                .single();

            if (accError || !account) {
                return res.status(404).json({ error: "Account linkage failed." });
            }

            // Step B: Update profile
            const { data, error } = await supabase
                .from('officials')
                .update({ 
                    full_name, 
                    contact_number, 
                    email 
                })
                .eq('id', account.official_id)
                .select()
                .single();

            if (error) throw error;

            // Audit Logging
            await logActivity(
                supabase, 
                req.user?.username || full_name, 
                'PROFILE_UPDATE', 
                `User (ID: ${accountId}) updated their profile info.`
            );
            
            res.json({ message: "Success", profile: data });
        } catch (err) {
            console.error("[PROFILE_UPDATE_ERROR]:", err.message);
            res.status(500).json({ error: "Failed to update profile." });
        }
    });
};