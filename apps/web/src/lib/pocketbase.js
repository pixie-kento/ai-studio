import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://localhost:8090');

// Restore auth from localStorage if available
const savedToken = localStorage.getItem('auth_token');
if (savedToken) {
  pb.authStore.save(savedToken, null);
}

export default pb;
