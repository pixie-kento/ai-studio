import { ForbiddenError } from './errorHandler.js';

const ROLE_HIERARCHY = { owner: 5, admin: 4, reviewer: 3, creator: 2, viewer: 1 };

export function requireRole(...roles) {
  return (req, res, next) => {
    // Superadmin bypasses all role checks
    if (req.user?.platform_role === 'superadmin') return next();

    const memberRole = req.workspaceMember?.role;
    if (!memberRole) return next(new ForbiddenError('No workspace access'));

    const hasRole = roles.some(role => {
      if (role === memberRole) return true;
      // Allow higher roles to perform lower-role actions
      return ROLE_HIERARCHY[memberRole] >= ROLE_HIERARCHY[role];
    });

    if (!hasRole) {
      return next(new ForbiddenError(`Requires one of: ${roles.join(', ')}`));
    }
    next();
  };
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.platform_role !== 'superadmin') {
    return next(new ForbiddenError('SuperAdmin access required'));
  }
  next();
}

export default { requireRole, requireSuperAdmin };
