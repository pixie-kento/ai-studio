export class PlanLimitError extends Error {
  constructor(resource, limit, plan) {
    super(`${plan} plan limit reached: max ${limit} ${resource}(s). Please upgrade to continue.`);
    this.name = 'PlanLimitError';
    this.statusCode = 402;
    this.code = `PLAN_LIMIT_${resource.toUpperCase()}`;
    this.resource = resource;
    this.limit = limit;
    this.plan = plan;
  }
}

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[error] ${status} ${req.method} ${req.path}:`, message);
    if (status === 500) console.error(err.stack);
  }

  res.status(status).json({
    error: {
      message,
      code: err.code || err.name || 'ERROR',
      ...(err.resource && { resource: err.resource, limit: err.limit, plan: err.plan }),
    },
  });
}

export default { PlanLimitError, AuthError, ForbiddenError, NotFoundError, errorHandler };
