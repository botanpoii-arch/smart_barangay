/**
 * HOUSEHOLD ROUTER
 * Handles family grouping and member synchronization.
 */

// CRITICAL: You must use 'export const' so server.js can see it!
export const HouseholdRouter = (router, supabase, authenticateToken) => {

    // 1. GET ALL HOUSEHOLDS
    // Public or protected? Usually protected.
    router.get('/households', authenticateToken, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('households')
                .select(`
                    id,
                    household_number,
                    zone,
                    address,
                    head:head_id (first_name, last_name),
                    members:residents_records!household_id (record_id, is_4ps)
                `) // Added '!household_id' to solve the "more than one relationship" error
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase Error:", error.message);
                throw error;
            }

            const formatted = data.map(hh => {
                const members = hh.members || [];
                return {
                    id: hh.id,
                    household_number: hh.household_number,
                    head: hh.head ? `${hh.head.last_name}, ${hh.head.first_name}` : 'Unassigned',
                    zone: hh.zone || 'N/A',
                    address: hh.address || '',
                    membersCount: members.length,
                    is4Ps: members.some(m => m.is_4ps === true),
                    isIndigent: members.some(m => {
                        const income = parseInt(String(m.monthly_income || '0').replace(/\D/g, ''));
                        return income > 0 && income < 5000;
                    })
                };
            });

            res.status(200).json(formatted);
        } catch (err) {
            console.error("Household Fetch Crash:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // 2. CREATE HOUSEHOLD (Protected)
    router.post('/households', authenticateToken, async (req, res) => {
        try {
            const { head_id, zone, address, initial_members } = req.body;
            const hh_num = `HH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const { data: newHH, error: hhError } = await supabase
                .from('households')
                .insert([{ household_number: hh_num, head_id, zone, address }])
                .select().single();

            if (hhError) throw hhError;

            const allMembers = Array.from(new Set([head_id, ...(initial_members || [])]));
            await supabase
                .from('residents_records')
                .update({ household_id: newHH.id })
                .in('record_id', allMembers);

            res.status(201).json(newHH);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    // 3. UPDATE HOUSEHOLD (Protected)
    router.put('/households/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { head_id, zone, address, current_members } = req.body;

            const { error: updateError } = await supabase
                .from('households')
                .update({ head_id, zone, address, updated_at: new Date() })
                .eq('id', id);

            if (updateError) throw updateError;

            await supabase.from('residents_records').update({ household_id: null }).eq('household_id', id);

            const allMembers = Array.from(new Set([head_id, ...(current_members || [])]));
            await supabase.from('residents_records').update({ household_id: id }).in('record_id', allMembers);

            res.status(200).json({ message: "Sync Complete" });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });
};