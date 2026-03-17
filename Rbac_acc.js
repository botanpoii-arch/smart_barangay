import { authenticateToken } from './data.js'; // NEW: Import the JWT middleware

/**
 * RBAC MIDDLEWARE
 * Enforces permissions by checking the verified role inside the JWT token.
 * This is much safer than relying on a custom header from the frontend.
 */
export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // req.user is populated by the authenticateToken middleware that runs before this
      if (!req.user || !req.user.role) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Access denied. Role information missing from security token.' 
        });
      }

      const userRole = req.user.role.toLowerCase();

      // Check if the verified role is in the allowed list
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: `Your role (${userRole}) does not have permission to perform this action.` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during role validation.' });
    }
  };
};

/**
 * RBAC ROUTER MODULE
 * Aligned with 'residents_account', 'officials_accounts', and 'residents_records'
 */
export const RbacRouter = (router, supabase) => {
  
  // ==========================================
  // 1. GET ALL ACCOUNTS (UNIFIED VIEW)
  // ==========================================
  // NEW: Added authenticateToken before checkRole
  router.get('/rbac/accounts', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
    try {
      // Execute parallel queries for high performance
      // Note: Using 'status' instead of 'is_active' to match your DB schema
      const [resAcc, offAcc] = await Promise.all([
        supabase
          .from('residents_account')
          .select(`
            account_id, 
            username, 
            role, 
            status, 
            created_at, 
            resident_id, 
            residents_records:resident_id (first_name, last_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('officials_accounts')
          .select(`
            account_id, 
            username, 
            role, 
            status, 
            created_at, 
            official_id, 
            officials:official_id (full_name, position)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (resAcc.error) throw resAcc.error;
      if (offAcc.error) throw offAcc.error;

      // Normalize data structures for consistent frontend rendering
      const combinedAccounts = [
        ...resAcc.data.map(acc => ({ 
          id: acc.account_id,
          username: acc.username,
          role: acc.role,
          status: acc.status || 'Active', 
          created_at: acc.created_at,
          source: 'resident', 
          profileName: acc.residents_records 
            ? `${acc.residents_records.last_name}, ${acc.residents_records.first_name}` 
            : 'Unknown Resident'
        })),
        ...offAcc.data.map(acc => ({ 
          id: acc.account_id,
          username: acc.username,
          role: acc.role,
          status: acc.status || 'Active',
          created_at: acc.created_at,
          source: 'official',
          profileName: acc.officials ? acc.officials.full_name : 'System Administrator'
        }))
      ];

      res.status(200).json(combinedAccounts);
    } catch (err) {
      console.error("RBAC Fetch Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 2. UPDATE ACCOUNT ROLE (DYNAMIC)
  // ==========================================
  // NEW: Added authenticateToken before checkRole
  router.patch('/rbac/accounts/:id/role', authenticateToken, checkRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params; 
      const { newRole, source } = req.body; 

      const validRoles = ['resident', 'staff', 'admin', 'superadmin'];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: 'Invalid role assignment.' });
      }

      if (!source || !['resident', 'official'].includes(source)) {
        return res.status(400).json({ error: 'Account source (resident/official) is required.' });
      }

      const targetTable = source === 'official' ? 'officials_accounts' : 'residents_account';

      const { data, error } = await supabase
        .from(targetTable)
        .update({ role: newRole })
        .eq('account_id', id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: `Account not found in ${source} records.` });
      }

      res.status(200).json({ 
        message: 'Role updated successfully.', 
        account: data[0]
      });

    } catch (err) {
      console.error("RBAC Update Error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. ACCOUNT SEARCH
  // ==========================================
  // NEW: Added authenticateToken before checkRole
  router.get('/rbac/accounts/search', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query required.' });

    try {
      const searchStr = `%${query}%`;

      // Parallel search across both account types
      const [{ data: residents, error: resErr }, { data: officials, error: offErr }] = await Promise.all([
        supabase
          .from('residents_account')
          .select('account_id, username, role, status, residents_records!inner(first_name, last_name)')
          .or(`first_name.ilike.${searchStr},last_name.ilike.${searchStr}`, { foreignTable: 'residents_records' }),
        supabase
          .from('officials_accounts')
          .select('account_id, username, role, status, officials!inner(full_name)')
          .ilike('officials.full_name', searchStr)
      ]);

      if (resErr || offErr) throw (resErr || offErr);

      res.status(200).json({
        residents: residents.map(r => ({ ...r, id: r.account_id, source: 'resident' })),
        officials: officials.map(o => ({ ...o, id: o.account_id, source: 'official' }))
      });
    } catch (err) {
      console.error("RBAC Search Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
};