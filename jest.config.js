/**
 * Jest configuration for the CarLease backend.
 *
 * The project uses native ESM (`"type": "module"` in package.json). Jest is
 * run with `node --experimental-vm-modules` so that `import` / `export`
 * syntax works without any Babel transform. `transform: {}` below disables
 * the default Babel transform to keep the test runtime as close to
 * production as possible.
 */
export default {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/__tests__/**/*.test.js',
    '<rootDir>/src/**/*.test.js',
  ],
  transform: {},
  moduleFileExtensions: ['js', 'mjs', 'json'],

  // Coverage configuration --------------------------------------------------
  //
  // Per the thesis plan (3.2 Testavimo kriterijai), coverage is measured
  // against the business-logic modules that the unit tests target. Thin
  // routing/glue layers, controllers that mostly orchestrate Prisma calls
  // (exercised end-to-end by the integration tests), dead modules and
  // CLI helpers are excluded. This matches the recommendation in
  // Sommerville (2016) to measure coverage against the code that carries
  // the decision logic.
  collectCoverageFrom: [
    'src/errors.js',
    'src/lib/**/*.js',
    'src/services/email.service.js',
    'src/pricing/calculators/base-price.calculator.js',
    'src/pricing/calculators/duration.calculator.js',
    'src/pricing/calculators/customer.calculator.js',
    'src/pricing/calculators/seasonal.calculator.js',
    'src/pricing/calculators/utilization.calculator.js',
    'src/pricing/calculators/demand.calculator.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 75,
      statements: 75,
    },
  },

  // Rich HTML dashboard of test results (open test-report/index.html in any
  // browser). Keeps the default CLI reporter so `npm test` output in the
  // terminal stays unchanged.
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: 'test-report',
        filename: 'index.html',
        pageTitle: 'CarLease – Jest testų ataskaita',
        expand: true,
        openReport: false,
      },
    ],
  ],

  // Quality-of-life --------------------------------------------------------
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
