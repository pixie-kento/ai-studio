import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAdminPB } from './pocketbase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PLAN_LIMITS = [
  {
    plan: 'starter',
    max_shows: 2,
    max_characters_per_show: 4,
    episodes_per_month: 8,
    priority_rendering: false,
    custom_style_prompts: false,
    youtube_auto_publish: false,
    team_members: 1,
    storage_gb: 5,
    price_monthly: 19,
    price_yearly: 182,
    stripe_price_id_monthly: '',
    stripe_price_id_yearly: '',
  },
  {
    plan: 'pro',
    max_shows: 5,
    max_characters_per_show: 10,
    episodes_per_month: 20,
    priority_rendering: true,
    custom_style_prompts: true,
    youtube_auto_publish: true,
    team_members: 5,
    storage_gb: 25,
    price_monthly: 49,
    price_yearly: 470,
    stripe_price_id_monthly: '',
    stripe_price_id_yearly: '',
  },
  {
    plan: 'studio',
    max_shows: -1,
    max_characters_per_show: -1,
    episodes_per_month: -1,
    priority_rendering: true,
    custom_style_prompts: true,
    youtube_auto_publish: true,
    team_members: -1,
    storage_gb: 100,
    price_monthly: 99,
    price_yearly: 950,
    stripe_price_id_monthly: '',
    stripe_price_id_yearly: '',
  },
];

let cachedSeedPlanLimits = null;

async function loadSeedPlanLimits() {
  if (cachedSeedPlanLimits) return cachedSeedPlanLimits;

  const seedPath = path.resolve(__dirname, '../../../pocketbase/seed_plan_limits.json');
  try {
    const raw = await fs.readFile(seedPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedSeedPlanLimits = parsed;
      return parsed;
    }
  } catch {
    // Fall through to defaults if file is missing or invalid.
  }

  cachedSeedPlanLimits = DEFAULT_PLAN_LIMITS;
  return DEFAULT_PLAN_LIMITS;
}

async function getSeedPlanFor(plan) {
  const all = await loadSeedPlanLimits();
  return all.find((p) => p.plan === plan) || null;
}

export async function getPlanLimitsForPlan(plan, { autoCreate = true } = {}) {
  const pb = await getAdminPB();

  try {
    return await pb.collection('plan_limits').getFirstListItem(`plan = "${plan}"`);
  } catch (err) {
    if (err?.status !== 404) throw err;
  }

  const seed = await getSeedPlanFor(plan);
  if (!seed) {
    const missingErr = new Error(`No plan limits configured for plan "${plan}"`);
    missingErr.statusCode = 500;
    missingErr.code = 'PLAN_LIMITS_MISSING';
    throw missingErr;
  }

  if (!autoCreate) return seed;

  try {
    return await pb.collection('plan_limits').create(seed);
  } catch (err) {
    // Handle race where another request created the row first.
    if (err?.status === 400 && err?.response?.data?.plan?.code === 'validation_not_unique') {
      return pb.collection('plan_limits').getFirstListItem(`plan = "${plan}"`);
    }
    throw err;
  }
}

export async function ensurePlanLimitsSeeded() {
  const pb = await getAdminPB();
  const seedPlans = await loadSeedPlanLimits();
  let created = 0;
  let updated = 0;

  for (const planData of seedPlans) {
    let existing = null;
    try {
      existing = await pb.collection('plan_limits').getFirstListItem(`plan = "${planData.plan}"`);
    } catch (err) {
      if (err?.status !== 404) throw err;
    }

    if (existing) {
      await pb.collection('plan_limits').update(existing.id, planData);
      updated += 1;
    } else {
      await pb.collection('plan_limits').create(planData);
      created += 1;
    }
  }

  return { created, updated, total: seedPlans.length };
}

export default { getPlanLimitsForPlan, ensurePlanLimitsSeeded };
