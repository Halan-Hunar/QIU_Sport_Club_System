import { supabase, supabaseAdmin } from '../utils/supabase.js';

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches the user object to req.user if valid.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Fetch role from our users table (admin client bypasses RLS)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role,display_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: 'User profile not found' });
  }

  req.user = { ...user, role: profile.role, display_name: profile.display_name };
  next();
};

/**
 * Must be used AFTER requireAuth.
 * Rejects the request if the user is not an admin.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
