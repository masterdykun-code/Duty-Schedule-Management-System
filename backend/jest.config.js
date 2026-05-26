export default {
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/db.js",
    "!src/**/*.routes.js",
    "!src/**/*.queries.js",
  ],
  coverageDirectory: "coverage",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  verbose: true,
};
