/**
 * Mock for firebase-admin/* modules in test environment.
 * This prevents ESM-incompatible modules (jose, jwks-rsa) from
 * causing "Unexpected token 'export'" errors during Jest runs.
 */

const mockApp = {
  name: '[DEFAULT]',
  options: {},
};

// Mock initializeApp
export const initializeApp = jest.fn(() => mockApp);

// Mock getApps
export const getApps = jest.fn(() => []);

// Mock cert
export const cert = jest.fn((config: any) => ({ ...config }));

// Mock getAuth
export const getAuth = jest.fn(() => ({
  verifyIdToken: jest.fn().mockResolvedValue({
    uid: 'test-firebase-uid',
    email: 'test@example.com',
    email_verified: true,
  }),
  getUser: jest.fn().mockResolvedValue({
    uid: 'test-firebase-uid',
    email: 'test@example.com',
  }),
}));

export default { initializeApp, getApps, cert, getAuth };
