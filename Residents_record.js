import bcrypt from 'bcryptjs';

// --- CONSISTENT RBAC HEADER CHECK ---
const checkHeaderRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'];
        
        if (!userRole || !allowedRoles.includes(userRole.toLowerCase())) {
            console.log(`[RBAC REJECTED] Role: ${userRole}, Path: ${req.path}`);
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'Access Denied: Insufficient Role Permissions.' 
            });
        }
        next();
    };
};

export const ResidentsRecordRouter = (router, supabase) => {
    
    // ==========================================
    // 1. GET ALL RESIDENTS
    // ==========================================
    router.get('/residents', checkHeaderRole(['admin', 'superadmin', 'staff']), async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('residents_records')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            console.error("Fetch Residents Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 2. GET SINGLE RESIDENT
    // ==========================================
    router.get('/residents/:id', checkHeaderRole(['admin', 'superadmin', 'staff', 'resident']), async (req, res) => {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('residents_records')
                .select('*')
                .eq('record_id', id)
                .single(); 

            if (error) {
                if (error.code === 'PGRST116') return res.status(404).json({ error: 'Record not found.' });
                throw error;
            }
            res.status(200).json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 3. POST: REGISTER RESIDENT
    // ==========================================
    router.post('/residents', checkHeaderRole(['admin', 'superadmin', 'staff']), async (req, res) => {
        try {
            const r = req.body;

            const { data: profile, error: profileError } = await supabase
                .from('residents_records')
                .insert([{
                    first_name: r.firstName || r.first_name,
                    middle_name: r.middleName || r.middle_name,
                    last_name: r.lastName || r.last_name,
                    sex: r.sex,
                    gender_identity: r.genderIdentity || r.gender_identity,
                    dob: r.dob,
                    "birthPlace": r.birthPlace || r.birth_place,
                    nationality: r.nationality,
                    religion: r.religion,
                    contact_number: r.contactNumber || r.contact_number, 
                    email: r.email,
                    current_address: r.currentAddress || r.current_address,
                    purok: r.purok,
                    "civilStatus": r.civilStatus || r.civil_status,
                    education: r.education,
                    employment_status: r.employment || r.employment_status, 
                    occupation: r.occupation,
                    is_voter: r.isVoter ?? r.is_voter,
                    is_pwd: r.isPWD ?? r.is_pwd,
                    is_4ps: r.is4Ps ?? r.is_4ps,
                    is_solo_parent: r.isSoloParent ?? r.is_solo_parent,
                    is_senior_citizen: r.isSeniorCitizen ?? r.is_senior_citizen,
                    is_ip: r.isIP ?? r.is_ip,
                    pwd_id_number: r.pwdIdNumber || r.pwd_id_number,
                    solo_parent_id_number: r.soloParentIdNumber || r.solo_parent_id_number,
                    senior_id_number: r.seniorIdNumber || r.senior_id_number,
                    four_ps_id_number: r.fourPsIdNumber || r.four_ps_id_number,
                    activity_status: 'Active'
                }])
                .select().single();

            if (profileError) throw profileError;

            // Automatic Account Creation
            const cleanFirstName = profile.first_name.toLowerCase().replace(/\s/g, '');
            const cleanLastName = profile.last_name.toLowerCase().replace(/\s/g, '');
            const username = `${cleanFirstName[0]}${cleanLastName}${Math.floor(100+Math.random()*900)}@residents.eng-hill.brg.ph`;
            const rawPassword = `${cleanFirstName}123456`;
            const hashedPassword = bcrypt.hashSync(rawPassword, 10);

            await supabase.from('residents_account').insert([{
                resident_id: profile.record_id,
                username: username,
                password: hashedPassword,
                role: 'resident',
                status: 'Active'
            }]);

            res.status(201).json({ profile, account: { username, password: rawPassword } });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 4. PUT: UPDATE
    // ==========================================
    router.put('/residents/:id', checkHeaderRole(['admin', 'superadmin', 'staff']), async (req, res) => {
        try {
            const { id } = req.params;
            const r = req.body;

            const updates = {
                first_name: r.firstName || r.first_name,
                middle_name: r.middleName || r.middle_name,
                last_name: r.lastName || r.last_name,
                sex: r.sex,
                gender_identity: r.genderIdentity || r.gender_identity,
                dob: r.dob,
                "birthPlace": r.birthPlace || r.birth_place,
                nationality: r.nationality,
                religion: r.religion,
                contact_number: r.contactNumber || r.contact_number,
                email: r.email,
                current_address: r.currentAddress || r.current_address,
                purok: r.purok,
                "civilStatus": r.civilStatus || r.civil_status,
                education: r.education,
                employment_status: r.employment || r.employment_status,
                occupation: r.occupation,
                is_voter: r.isVoter ?? r.is_voter,
                is_pwd: r.isPWD ?? r.is_pwd,
                is_4ps: r.is4Ps ?? r.is_4ps,
                is_solo_parent: r.isSoloParent ?? r.is_solo_parent,
                is_senior_citizen: r.isSeniorCitizen ?? r.is_senior_citizen,
                is_ip: r.isIP ?? r.is_ip,
                pwd_id_number: r.pwdIdNumber || r.pwd_id_number,
                solo_parent_id_number: r.soloParentIdNumber || r.solo_parent_id_number,
                senior_id_number: r.seniorIdNumber || r.senior_id_number,
                four_ps_id_number: r.fourPsIdNumber || r.four_ps_id_number,
                activity_status: r.activityStatus || r.activity_status
            };

            Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

            const { data, error } = await supabase
                .from('residents_records')
                .update(updates)
                .eq('record_id', id)
                .select();

            if (error) throw error;
            res.json(data[0]);
        } catch (err) {
            console.error("Update Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 5. DELETE: ARCHIVE
    // ==========================================
    router.delete('/residents/:id', checkHeaderRole(['admin', 'superadmin']), async (req, res) => {
        try {
            const { error } = await supabase
                .from('residents_records')
                .update({ activity_status: 'Archived' })
                .eq('record_id', req.params.id);

            if (error) throw error;
            res.json({ message: 'Archived Successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};