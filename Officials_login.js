import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logActivity } from './Auditlog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const verifyPassword = (inputPassword, storedPassword) => {
  if (!inputPassword || !storedPassword) return false;
  if (storedPassword.startsWith('$2')) {
    return bcrypt.compareSync(inputPassword, storedPassword);
  }
  return inputPassword === storedPassword;
};

export const OfficialsLoginRouter = (router, supabase) => {
  
  router.post('/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const cleanUsername = username ? username.trim().toLowerCase() : '';

      console.log(`[LOGIN ATTEMPT] Username: ${cleanUsername}`);

      // STEP 1: Hanapin muna ang account LANG (walang muna join para hindi mag-fail)
      const { data: accountData, error: accountError } = await supabase
        .from('officials_accounts')
        .select('*') // Kunin lahat ng columns sa accounts table
        .ilike('username', cleanUsername)
        .single();

      if (accountError || !accountData) {
        console.error("[DB ERROR]", accountError?.message);
        return res.status(401).json({ error: 'Administrative account not found.' });
      }

      // STEP 2: Password Check
      const isValid = verifyPassword(password, accountData.password);
      if (!isValid) return res.status(401).json({ error: 'Invalid password.' });

      // STEP 3: Subukan kunin ang profile details separately
      let realName = 'System Administrator';
      let position = 'Official';

      if (accountData.official_id) {
        const { data: profile } = await supabase
          .from('officials')
          .select('full_name, position')
          .eq('id', accountData.official_id) // Siguraduhin na 'id' ang column name sa officials table
          .single();
        
        if (profile) {
          realName = profile.full_name;
          position = profile.position;
        }
      }

      const userRole = accountData.role ? accountData.role.toLowerCase() : 'staff';

      // STEP 4: Token Generation
      const token = jwt.sign(
        { account_id: accountData.account_id, username: accountData.username, role: userRole },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await logActivity(supabase, accountData.username, 'LOGIN', `${realName} (${userRole}) logged in.`);

      // STEP 5: Response
      res.status(200).json({
        message: 'Authentication successful',
        token,
        user: {
          account_id: accountData.account_id,
          username: accountData.username,
          role: userRole,
          profileName: realName,
          position: position
        }
      });

    } catch (err) {
      console.error("[CRITICAL LOGIN ERROR]", err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
};