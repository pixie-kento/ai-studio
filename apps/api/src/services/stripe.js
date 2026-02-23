import Stripe from 'stripe';

let stripeClient = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    });
  }
  return stripeClient;
}

export const PLANS = {
  starter: {
    name: 'Starter',
    price_monthly: 1900,
    price_yearly: 18240,
    stripe_price_id_monthly: process.env.STRIPE_STARTER_MONTHLY,
    stripe_price_id_yearly: process.env.STRIPE_STARTER_YEARLY,
    limits: { shows: 1, characters_per_show: 3, episodes_per_month: 4, team: 1, storage_gb: 5 },
  },
  pro: {
    name: 'Pro',
    price_monthly: 4900,
    price_yearly: 47040,
    stripe_price_id_monthly: process.env.STRIPE_PRO_MONTHLY,
    stripe_price_id_yearly: process.env.STRIPE_PRO_YEARLY,
    limits: { shows: 3, characters_per_show: 10, episodes_per_month: -1, team: 5, storage_gb: 25 },
  },
  studio: {
    name: 'Studio',
    price_monthly: 9900,
    price_yearly: 95040,
    stripe_price_id_monthly: process.env.STRIPE_STUDIO_MONTHLY,
    stripe_price_id_yearly: process.env.STRIPE_STUDIO_YEARLY,
    limits: { shows: -1, characters_per_show: -1, episodes_per_month: -1, team: -1, storage_gb: 100 },
  },
};

// Resolve plan name from a Stripe price ID
export function getPlanFromPriceId(priceId) {
  for (const [planKey, plan] of Object.entries(PLANS)) {
    if (plan.stripe_price_id_monthly === priceId || plan.stripe_price_id_yearly === priceId) {
      return planKey;
    }
  }
  return 'starter';
}

export default { getStripe, PLANS, getPlanFromPriceId };
