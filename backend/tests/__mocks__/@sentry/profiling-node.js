// Mock for @sentry/profiling-node — prevents C++ binary load failure in Jest/Windows
module.exports = {
  ProfilingIntegration: class ProfilingIntegration {
    name = 'ProfilingIntegration';
    setupOnce() {}
  },
};
