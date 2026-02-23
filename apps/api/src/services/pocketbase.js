import PocketBase from 'pocketbase';

// Separate singletons — admin token must never be overwritten by user auth
let pb = null;
let adminPb = null;

export function getPB() {
  if (!pb) {
    pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');
    pb.autoCancellation(false);
  }
  return pb;
}

// Authenticate as admin for server-side operations
export async function getAdminPB() {
  if (!adminPb) {
    adminPb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');
    adminPb.autoCancellation(false);
  }
  if (!adminPb.authStore.isValid) {
    try {
      await adminPb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL,
        process.env.PB_ADMIN_PASSWORD
      );
      console.log('[api] PocketBase admin auth OK');
    } catch (err) {
      console.error('[api] PocketBase admin auth FAILED:', err.status, err.message);
      console.error('[api] Check PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in .env');
      throw err;
    }
  }
  return adminPb;
}

// Create a PB client authenticated as a specific user token
export function getUserPB(token) {
  const client = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');
  client.autoCancellation(false);
  client.authStore.save(token, null);
  return client;
}

export default { getPB, getAdminPB, getUserPB };
