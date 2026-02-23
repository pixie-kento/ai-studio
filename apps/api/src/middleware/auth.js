import { getUserPB } from '../services/pocketbase.js';
import { AuthError } from './errorHandler.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('No token provided');
    }
    const token = authHeader.slice(7);

    // Use a per-request PB client to avoid cross-request authStore races.
    const pb = getUserPB(token);

    // Fetch the user record to validate
    const userData = await pb.collection('users').authRefresh();
    req.user = userData.record;
    req.token = token;
    next();
  } catch (err) {
    if (err instanceof AuthError) return next(err);
    next(new AuthError('Invalid or expired token'));
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  requireAuth(req, res, next);
}

export default { requireAuth, optionalAuth };
