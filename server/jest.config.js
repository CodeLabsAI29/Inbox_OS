process.env.PORT = '0';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      transpileOnly: true,
      diagnostics: false,
    }],
  },
  // Transform ESM-only packages that cause "Unexpected token 'export'" errors
  // jose is an ESM dependency of firebase-admin/jwks-rsa
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|jwks-rsa|@firebase|firebase-admin)/)',
  ],
  // Mock firebase-admin in tests to avoid ESM transform issues
  moduleNameMapper: {
    '^firebase-admin/(.*)$': '<rootDir>/src/__mocks__/firebase-admin.ts',
  },
};
