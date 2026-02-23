import { Router } from 'express';
import { getPB, getAdminPB } from '../services/pocketbase.js';
import { getStripe } from '../services/stripe.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName, plan = 'starter' } = req.body;
    const pb = getPB();

    // Create user in PocketBase
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      display_name: displayName || email.split('@')[0],
      platform_role: 'user',
      onboarding_completed: false,
    });

    const adminPb = await getAdminPB();

    // Create Stripe customer (optional — skipped if no Stripe key configured)
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && !stripeKey.startsWith('sk_test_your')) {
      try {
        const stripe = getStripe();
        const customer = await stripe.customers.create({
          email,
          name: displayName || email.split('@')[0],
          metadata: { pocketbase_user_id: user.id },
        });
        await adminPb.collection('users').update(user.id, {
          stripe_customer_id: customer.id,
        });
      } catch (stripeErr) {
        console.warn('Stripe customer creation skipped:', stripeErr.message);
      }
    }

    // Create workspace
    const slug = (displayName || email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);

    const workspace = await adminPb.collection('workspaces').create({
      name: `${displayName || email.split('@')[0]}'s Studio`,
      slug: `${slug}-${Date.now().toString(36)}`,
      owner: user.id,
      plan,
      plan_status: 'active',
      render_priority: plan === 'studio' ? 3 : plan === 'pro' ? 2 : 1,
      episodes_this_month: 0,
    });

    // Add as owner member
    await adminPb.collection('workspace_members').create({
      workspace: workspace.id,
      user: user.id,
      role: 'owner',
    });

    // Authenticate
    const authData = await pb.collection('users').authWithPassword(email, password);

    res.status(201).json({
      token: authData.token,
      user: authData.record,
      workspace,
    });
  } catch (err) {
    if (err?.status === 400 && err?.response?.data?.email?.code === 'validation_not_unique') {
      return res.status(409).json({
        error: { message: 'Email is already registered. Please sign in or use a different email.' },
      });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const pb = getPB();
    const authData = await pb.collection('users').authWithPassword(email, password);

    // Get user's workspaces
    const adminPb = await getAdminPB();
    const workspaces = await adminPb.collection('workspace_members').getFullList({
      filter: `user = "${authData.record.id}"`,
      expand: 'workspace',
    });

    res.json({
      token: authData.token,
      user: authData.record,
      workspaces: workspaces.map(m => m.expand.workspace),
    });
  } catch (err) {
    if (err?.status === 400) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const adminPb = await getAdminPB();
    const workspaceMembers = await adminPb.collection('workspace_members').getFullList({
      filter: `user = "${req.user.id}"`,
      expand: 'workspace',
    });
    res.json({
      user: req.user,
      workspaces: workspaceMembers.map(m => m.expand?.workspace).filter(Boolean),
    });
  } catch (err) { next(err); }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const adminPb = await getAdminPB();
    const updates = {};
    if (req.body.display_name !== undefined) {
      updates.display_name = req.body.display_name;
    }
    if (req.body.onboarding_completed !== undefined) {
      updates.onboarding_completed = Boolean(req.body.onboarding_completed);
    }
    if (Object.keys(updates).length === 0) {
      return res.json(req.user);
    }
    const updated = await adminPb.collection('users').update(req.user.id, updates);
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminPb = await getAdminPB();
    await adminPb.collection('users').update(req.user.id, {
      oldPassword: currentPassword,
      password: newPassword,
      passwordConfirm: newPassword,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const pb = getPB();
    await pb.collection('users').requestPasswordReset(email);
    res.json({ success: true, message: 'Password reset email sent if account exists' });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const pb = getPB();
    await pb.collection('users').confirmPasswordReset(token, password, password);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', requireAuth, async (req, res, next) => {
  try {
    const pb = getPB();
    pb.authStore.save(req.token, null);
    const authData = await pb.collection('users').authRefresh();
    res.json({ token: authData.token, user: authData.record });
  } catch (err) { next(err); }
});

export default router;
