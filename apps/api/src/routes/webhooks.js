import { Router } from 'express';
import { getStripe, getPlanFromPriceId } from '../services/stripe.js';
import { getAdminPB } from '../services/pocketbase.js';
import { notifyUser, notifyWorkspace } from '../services/notifications.js';

const router = Router();

// POST /api/webhooks/stripe
router.post('/stripe', async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook/stripe] Invalid signature:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const pb = await getAdminPB();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspaceId;
        const plan = getPlanFromPriceId(sub.items.data[0]?.price?.id);
        const renderPriority = plan === 'studio' ? 3 : plan === 'pro' ? 2 : 1;

        if (workspaceId) {
          await pb.collection('workspaces').update(workspaceId, {
            plan,
            plan_status: sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0]?.price?.id,
            render_priority: renderPriority,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspaceId;
        if (workspaceId) {
          await pb.collection('workspaces').update(workspaceId, {
            plan_status: 'cancelled',
          });
          await notifyWorkspace(workspaceId, {
            type: 'plan_expiry',
            title: 'Subscription cancelled',
            message: 'Your subscription has been cancelled. Your account will revert to the free tier.',
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription).catch(() => null);
        const workspaceId = sub?.metadata?.workspaceId;
        if (workspaceId) {
          await pb.collection('workspaces').update(workspaceId, {
            plan_status: 'active',
            episodes_this_month: 0,
            month_reset_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription).catch(() => null);
        const workspaceId = sub?.metadata?.workspaceId;
        if (workspaceId) {
          await pb.collection('workspaces').update(workspaceId, { plan_status: 'past_due' });
          await notifyWorkspace(workspaceId, {
            type: 'plan_expiry',
            title: 'Payment failed',
            message: 'Your payment failed. Please update your payment method to keep your subscription active.',
            actionUrl: '/billing/portal',
          });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspaceId;
        if (workspaceId) {
          await notifyWorkspace(workspaceId, {
            type: 'plan_expiry',
            title: 'Trial ending soon',
            message: 'Your free trial ends in 3 days. Add a payment method to continue.',
            actionUrl: '/billing/plans',
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[webhook/stripe] Handler error:', err);
    res.json({ received: true }); // Always 200 to Stripe
  }
});

// POST /api/webhooks/render/progress
router.post('/render/progress', async (req, res) => {
  const key = req.headers['x-render-server-key'];
  if (key !== process.env.RENDER_SERVER_CALLBACK_KEY) {
    return res.status(403).json({ error: 'Invalid callback key' });
  }

  const { episode_id, job_id, progress_percent, current_step } = req.body;
  try {
    const pb = await getAdminPB();
    await pb.collection('episodes').update(episode_id, { status: 'RENDERING' });

    const jobs = await pb.collection('render_jobs').getFullList({
      filter: `episode = "${episode_id}"`,
    });
    if (jobs.length > 0) {
      await pb.collection('render_jobs').update(jobs[0].id, {
        status: 'running',
        progress_percent: progress_percent || 0,
        current_step: current_step || '',
      });
    }

    await pb.collection('pipeline_logs').create({
      episode: episode_id,
      workspace: jobs[0]?.workspace || '',
      event: 'render_progress',
      message: `${current_step || 'Rendering'} (${progress_percent}%)`,
      metadata: { progress_percent, current_step },
    });
  } catch (err) {
    console.error('[webhook/render/progress]', err.message);
  }
  res.json({ ok: true });
});

// POST /api/webhooks/render/complete
router.post('/render/complete', async (req, res) => {
  const key = req.headers['x-render-server-key'];
  if (key !== process.env.RENDER_SERVER_CALLBACK_KEY) {
    return res.status(403).json({ error: 'Invalid callback key' });
  }

  const { episode_id, output_url, duration_seconds } = req.body;
  try {
    const pb = await getAdminPB();
    const episode = await pb.collection('episodes').getOne(episode_id);

    await pb.collection('episodes').update(episode_id, {
      status: 'AWAITING_APPROVAL',
      youtube_url: output_url || '',
      duration_seconds: duration_seconds || 0,
      render_completed_at: new Date().toISOString(),
    });

    const jobs = await pb.collection('render_jobs').getFullList({ filter: `episode = "${episode_id}"` });
    if (jobs.length > 0) {
      await pb.collection('render_jobs').update(jobs[0].id, {
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        output_file_path: output_url || '',
      });
    }

    await pb.collection('pipeline_logs').create({
      episode: episode_id,
      workspace: episode.workspace,
      event: 'render_completed',
      message: 'Render complete — awaiting approval',
    });

    await notifyWorkspace(episode.workspace, {
      type: 'approval_needed',
      title: 'Episode ready for review',
      message: `Episode ${episode.episode_number}: "${episode.title}" is ready for approval.`,
      actionUrl: `/review/${episode_id}`,
    });
  } catch (err) {
    console.error('[webhook/render/complete]', err.message);
  }
  res.json({ ok: true });
});

// POST /api/webhooks/render/failed
router.post('/render/failed', async (req, res) => {
  const key = req.headers['x-render-server-key'];
  if (key !== process.env.RENDER_SERVER_CALLBACK_KEY) {
    return res.status(403).json({ error: 'Invalid callback key' });
  }

  const { episode_id, error_message } = req.body;
  try {
    const pb = await getAdminPB();
    const episode = await pb.collection('episodes').getOne(episode_id);

    await pb.collection('episodes').update(episode_id, { status: 'RENDER_FAILED' });

    const jobs = await pb.collection('render_jobs').getFullList({ filter: `episode = "${episode_id}"` });
    if (jobs.length > 0) {
      await pb.collection('render_jobs').update(jobs[0].id, {
        status: 'failed',
        error_message: error_message || 'Unknown error',
      });
    }

    await pb.collection('pipeline_logs').create({
      episode: episode_id,
      workspace: episode.workspace,
      event: 'render_failed',
      message: error_message || 'Render failed',
    });

    await notifyWorkspace(episode.workspace, {
      type: 'render_failed',
      title: 'Render failed',
      message: `Episode "${episode.title}" render failed: ${error_message || 'Unknown error'}`,
    });
  } catch (err) {
    console.error('[webhook/render/failed]', err.message);
  }
  res.json({ ok: true });
});

export default router;
