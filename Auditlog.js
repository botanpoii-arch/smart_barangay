// Auditlog.js
import crypto from 'crypto';

export const logActivity = async (supabase, actor, action, details) => {
  try {
    const { data: latestBlock, error: fetchError } = await supabase
      .from('audit_logs')
      .select('hash')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const prevHash = latestBlock ? latestBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    
    const payload = `${prevHash}-${actor}-${action}-${details}-${timestamp}`;
    const newHash = crypto.createHash('sha256').update(payload).digest('hex');

    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert([{
        actor,
        action,
        details,
        prev_hash: prevHash,
        hash: newHash,
        timestamp
      }]);

    if (insertError) console.error("FAILED to write to Audit Ledger:", insertError.message);
    else console.log(`[AUDIT] Block Mined: ${action} by ${actor}`);

  } catch (err) {
    console.error("Blockchain System Error:", err);
  }
};

export const AuditlogRouter = (router, supabase) => {
  router.get('/audit', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false }); 

      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/audit/test', async (req, res) => {
    try {
      const { actor, action, details } = req.body;
      await logActivity(supabase, actor, action, details);
      res.status(201).json({ message: "Action logged successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};