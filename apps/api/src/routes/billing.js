import { Router } from 'express';
import { getStripe, PLANS } from '../services/stripe.js';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();
router.use(requireAuth);

// GET /api/billing/plans
router.get('/plans', async (req, res) => {
  res.json(PLANS);
});

// POST /api/billing/checkout
router.post('/checkout', async (req, res, next) => {
  try {
    const { workspaceId, plan, interval = 'monthly' } = req.body;
    const stripe = getStripe();
    const pb = await getAdminPB();

    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: { message: 'Invalid plan' } });

    const priceId = interval === 'yearly'
      ? planConfig.stripe_price_id_yearly
      : planConfig.stripe_price_id_monthly;

    // Get or create Stripe customer
    const user = await pb.collection('users').getOne(req.user.id);
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.display_name,
        metadata: { pocketbase_user_id: req.user.id },
      });
      customerId = customer.id;
      await pb.collection('users').update(req.user.id, { stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/plans`,
      metadata: { workspaceId, plan, userId: req.user.id },
      subscription_data: {
        trial_period_days: 14,
        metadata: { workspaceId, plan },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) { next(err); }
});

// POST /api/billing/portal
router.post('/portal', async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    const stripe = getStripe();
    const pb = await getAdminPB();
    const user = await pb.collection('users').getOne(req.user.id);

    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: { message: 'No Stripe customer found' } });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/billing/plans`,
    });
    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// GET /api/billing/subscription
router.get('/subscription', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: { message: 'workspaceId required' } });

    const pb = await getAdminPB();
    const workspace = await pb.collection('workspaces').getOne(workspaceId);

    if (!workspace.stripe_subscription_id) {
      return res.json({ plan: workspace.plan, status: workspace.plan_status, subscription: null });
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id);
    res.json({ plan: workspace.plan, status: workspace.plan_status, subscription });
  } catch (err) { next(err); }
});

// POST /api/billing/cancel
router.post('/cancel', async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    const pb = await getAdminPB();
    const workspace = await pb.collection('workspaces').getOne(workspaceId);
    if (!workspace.stripe_subscription_id) {
      return res.status(400).json({ error: { message: 'No active subscription' } });
    }
    const stripe = getStripe();
    await stripe.subscriptions.update(workspace.stripe_subscription_id, { cancel_at_period_end: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
