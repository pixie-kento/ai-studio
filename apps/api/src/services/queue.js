import Bull from 'bull';

let renderQueue = null;

export function getRenderQueue() {
  if (!renderQueue) {
    renderQueue = new Bull('render', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return renderQueue;
}

export default { getRenderQueue };
