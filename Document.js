/**
 * DOCUMENT ROUTER MODULE
 * Handles document requests, status tracking, and archive fetching.
 */
export const documentRouter = (router, supabase, authenticateToken) => {

    // SAFETY CHECK: Ensure handshake exists
    const auth = typeof authenticateToken === 'function' 
        ? authenticateToken 
        : (req, res, next) => next();

    // ==========================================
    // 1. GET ALL DOCUMENTS (Used by Dashboard & Archive)
    // ==========================================
    router.get('/documents', auth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('document_requests')
                .select(`
                    id,
                    reference_no,
                    resident_id,
                    resident_name,
                    type,
                    purpose,
                    other_purpose,
                    date_requested,
                    status,
                    price,
                    resident:resident_id (
                        purok,
                        sex
                    )
                `)
                // Always return newest first for the pending widget
                .order('date_requested', { ascending: false });

            if (error) throw error;

            // Flatten the nested resident data for the frontend analytics
            const formattedData = data.map(doc => ({
                id: doc.id,
                reference_no: doc.reference_no,
                resident_name: doc.resident_name,
                type: doc.type,
                purpose: doc.purpose,
                other_purpose: doc.other_purpose,
                date_requested: doc.date_requested,
                status: doc.status,
                price: doc.price,
                // Extract joined demographic data with fallbacks
                purok: doc.resident?.purok || 'Unknown',
                sex: doc.resident?.sex || 'Unknown'
            }));

            res.status(200).json(formattedData);
        } catch (err) {
            console.error("Document Fetch Error:", err.message);
            res.status(500).json({ error: "Failed to sync document registry." });
        }
    });

    // ==========================================
    // 2. CREATE OR UPDATE REQUEST (Fix applied here)
    // ==========================================
    router.post('/documents/save', auth, async (req, res) => {
        try {
            const { id, resident_id, resident_name, type, purpose, price, reference_no, date_requested, status } = req.body;

            if (!resident_name || !type) {
                return res.status(400).json({ error: "Missing required document details." });
            }

            let dbQuery;

            if (id) {
                // UPDATE: If ID exists, update the existing request (e.g., marking as Completed)
                dbQuery = supabase
                    .from('document_requests')
                    .update({
                        resident_name,
                        type,
                        purpose: purpose || 'N/A', // Fallback for NOT NULL constraint
                        price,
                        status: status || 'Completed' // Automatically marks completed upon printing
                    })
                    .eq('id', id);
            } else {
                // INSERT: If no ID, it's a brand new manual walk-in request
                dbQuery = supabase
                    .from('document_requests')
                    .insert([{
                        resident_id: resident_id || 'MANUAL_ENTRY',
                        resident_name,
                        type,
                        purpose: purpose || 'N/A', // Fallback for NOT NULL constraint
                        price,
                        reference_no,
                        date_requested,
                        status: status || 'Pending'
                    }]);
            }

            // Execute the query
            const { data, error } = await dbQuery.select().single();

            if (error) throw error;
            res.status(id ? 200 : 201).json(data);

        } catch (err) {
            console.error("Document Save Error:", err.message);
            res.status(400).json({ error: "Database constraint error." });
        }
    });

    // ==========================================
    // 3. UPDATE DOCUMENT STATUS (For Admin Processing)
    // ==========================================
    router.patch('/documents/:id/status', auth, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const { data, error } = await supabase
                .from('document_requests')
                .update({ status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            res.status(400).json({ error: "Failed to update status." });
        }
    });
};

export default documentRouter;