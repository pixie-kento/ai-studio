import cron from 'node-cron';
import { getAdminPB } from './pocketbase.js';
import { generateEpisodePipeline } from './pipeline.js';

const activeCrons = new Map();

function dayToWeekday(day) {
  const map = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
  return map[day] ?? 0;
}

function buildCronExpression(scheduleDay, scheduleTime) {
  const [hour, minute] = (scheduleTime || '09:00').split(':');
  const weekday = dayToWeekday(scheduleDay);
  return `${minute} ${hour} * * ${weekday}`;
}

export async function syncSchedulers() {
  const pb = await getAdminPB();

  // Load all shows with scheduling enabled
  const shows = await pb.collection('shows').getFullList({
    filter: 'schedule_enabled = true && status = "active"',
  });

  // Stop removed/disabled shows
  for (const [showId, task] of activeCrons.entries()) {
    if (!shows.find(s => s.id === showId)) {
      task.stop();
      activeCrons.delete(showId);
    }
  }

  // Start/update schedulers for active shows
  for (const show of shows) {
    if (!show.schedule_day || !show.schedule_time) continue;
    const cronExpr = buildCronExpression(show.schedule_day, show.schedule_time);

    // If already scheduled with same config, skip
    if (activeCrons.has(show.id)) {
      activeCrons.get(show.id).stop();
    }

    const task = cron.schedule(cronExpr, async () => {
      console.log(`[scheduler] Triggering episode for show ${show.id} (${show.name})`);
      try {
        await generateEpisodePipeline(show.id, show.workspace, null);
      } catch (err) {
        console.error(`[scheduler] Failed for show ${show.id}:`, err.message);
      }
    }, {
      timezone: show.schedule_timezone || 'UTC',
    });

    activeCrons.set(show.id, task);
    console.log(`[scheduler] Scheduled show "${show.name}" with cron: ${cronExpr}`);
  }
}

// Run sync every 5 minutes to pick up new/changed schedules
export function startSchedulerSync() {
  syncSchedulers().catch(console.error);
  cron.schedule('*/5 * * * *', () => {
    syncSchedulers().catch(console.error);
  });
}

// Monthly episode counter reset (1st of each month at midnight UTC)
export function startMonthlyReset() {
  cron.schedule('0 0 1 * *', async () => {
    console.log('[scheduler] Resetting monthly episode counters');
    const pb = await getAdminPB();
    const workspaces = await pb.collection('workspaces').getFullList({ fields: 'id' });
    for (const ws of workspaces) {
      await pb.collection('workspaces').update(ws.id, {
        episodes_this_month: 0,
        month_reset_at: new Date().toISOString(),
      });
    }
  }, { timezone: 'UTC' });
}

export default { syncSchedulers, startSchedulerSync, startMonthlyReset };
