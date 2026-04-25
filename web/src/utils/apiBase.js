const normalize = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const maybeRewriteForBrowser = (rawUrl, fallbackPort) => {
  if (typeof window === 'undefined') return rawUrl;
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const containerHosts = new Set([
      'backend',
      'backend-dev',
      'backend-service',
      'ai-services',
      'ai-services-dev',
      'ai-service',
    ]);

    if (containerHosts.has(url.hostname)) {
      const browserHost = window.location.hostname || 'localhost';
      const port = url.port || fallbackPort || '';
      const portSegment = port ? `:${port}` : '';
      return `${url.protocol}//${browserHost}${portSegment}${url.pathname}${url.search}${url.hash}`;
    }
    return rawUrl;
  } catch (error) {
    return rawUrl;
  }
};

const resolveBackendBase = () => {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    'http://localhost:3001';

  const rewritten = maybeRewriteForBrowser(raw, '3001');
  return normalize(rewritten);
};

const resolveApiBase = () => {
  const backend = resolveBackendBase();
  if (!backend) {
    return 'http://localhost:3001/api/v1';
  }

  if (/\/api\/v\d+$/i.test(backend)) {
    return backend;
  }

  if (backend.endsWith('/api')) {
    return `${backend}/v1`;
  }

  return `${backend}/api/v1`;
};

const resolveAiBase = () => {
  const raw = process.env.REACT_APP_AI_URL || 'http://localhost:8000';
  const rewritten = maybeRewriteForBrowser(raw, '8000');
  const base = normalize(rewritten);

  if (!base) {
    return 'http://localhost:8000/api/v1';
  }

  if (/\/api\/v\d+$/i.test(base)) {
    return base;
  }

  if (base.endsWith('/api')) {
    return `${base}/v1`;
  }

  return `${base}/api/v1`;
};

export const BACKEND_BASE_URL = resolveBackendBase();
export const API_BASE = resolveApiBase();
export const AI_BASE_URL = resolveAiBase();
export const LEGACY_API_BASE = `${BACKEND_BASE_URL}/api`;

export default API_BASE;


