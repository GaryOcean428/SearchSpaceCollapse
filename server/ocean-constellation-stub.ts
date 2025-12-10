/**
 * Ocean Constellation Stub
 *
 * DEPRECATED: Multi-agent constellation moved to Python backend.
 * This stub maintains API compatibility while actual logic runs in Python.
 *
 * Use oceanQIGBackend for constellation operations.
 */

export const oceanConstellation = {
  refreshTokenWeightsFromGeometricMemory: async () => {
    // No-op: Token weights managed by Python backend
  },

  generateHypothesesForRole: async (_role: string, _context: any) => {
    // Delegate to Python backend
    return [];
  },

  getStatus: () => ({
    active: false,
    message: "Constellation logic moved to Python backend",
  }),
};
