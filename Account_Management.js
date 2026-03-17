import bcrypt from 'bcryptjs';

// Security Helper for Password Reset
const hashPassword = (plainPassword) => {
  if (!plainPassword) return null;
  return bcrypt.hashSync(plainPassword, 10);
};

export const AccountManagementRouter = (router, supabase) => {
  
  // ==========================================
  // 1. GET ALL ACCOUNTS (Residents & Officials)
  // ==========================================
  router.get('/rbac/accounts', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('residents_account') // Singular to match your login schema
        .select(`
          account_id, 
          username, 
          role, 
          created_at, 
          resident_id,
          official_id,
          profile:resident_id (first_name, last_name), 
          officials:official_id (full_name, position)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 2. FORCE PASSWORD RESET
  // ==========================================
  // Endpoint updated to explicitly use the accountId matching the frontend payload
  router.patch('/accounts/reset/:accountId', async (req, res) => {
    try {
      const { password } = req.body;
      const { accountId } = req.params; 

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }

      const securePassword = hashPassword(password);

      // Directly update using the UUID primary key
      const { data, error } = await supabase
        .from('residents_account')
        .update({ password: securePassword })
        .eq('account_id', accountId) 
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Account not found.' });
      }

      res.json({ message: 'Password updated successfully', user: data[0] });
    } catch (err) {
      console.error("Reset Error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. CHANGE ACCOUNT ROLE
  // ==========================================
  router.patch('/rbac/accounts/:accountId/role', async (req, res) => {
    try {
      const { accountId } = req.params;
      const { newRole } = req.body;

      const validRoles = ['resident', 'admin', 'superadmin', 'staff'];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: 'Invalid role assignment.' });
      }

      const { data, error } = await supabase
        .from('residents_account')
        .update({ role: newRole })
        .eq('account_id', accountId) // Aligned to UUID key
        .select();

      if (error) throw error;
      res.status(200).json({ message: 'Role updated successfully', account: data[0] });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

};