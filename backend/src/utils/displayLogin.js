import { z } from 'zod';

export const normalizeLoginName = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const schema = z.object({
  display_name: z.string().trim().min(2).max(80).optional(),
  email: z.string().email().max(254).optional(), // Existing clients/recovery remain supported.
  password: z.string().min(6).max(256),
}).strict().refine((value) => !!value.display_name !== !!value.email);

export function createDisplayLogin({ db, createAuth, log }) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const denied = () => res.status(401).json({ error: 'Invalid sign-in details.' });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter your display name and password.' });
    try {
      const { display_name, email, password } = parsed.data;
      let profile, loginEmail = email;
      if (display_name) {
        const result = await db.from('users').select('id,role,display_name')
          .eq('login_name', normalizeLoginName(display_name)).maybeSingle();
        if (result.error) throw result.error;
        profile = result.data;
        if (!profile || profile.role !== 'admin') return denied();
        const account = await db.auth.admin.getUserById(profile.id);
        if (account.error || !account.data?.user?.email) return denied();
        loginEmail = account.data.user.email;
      }
      const auth = createAuth();
      const { data, error } = await auth.signInWithPassword({ email: loginEmail, password });
      if (error || !data?.session || !data?.user) return denied();
      // Verify the authenticated ID against the role source even for legacy email login.
      const result = await db.from('users').select('id,role,display_name').eq('id', data.user.id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data || result.data.role !== 'admin' || (profile && profile.id !== data.user.id)) {
        await auth.signOut();
        return denied();
      }
      res.json({ token: data.session.access_token, refresh_token: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email, role: result.data.role, display_name: result.data.display_name } });
    } catch (error) {
      log.error(`Display-name sign-in failed: ${error.message}`);
      res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again.' });
    }
  };
}
