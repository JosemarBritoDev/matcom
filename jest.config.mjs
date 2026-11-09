import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Aponta para a raiz do projeto Next.js (next.config.ts, .env, etc.).
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/layout.tsx",
    "!src/app/**/page.tsx",
  ],
  coverageDirectory: "coverage",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
};

export default createJestConfig(customJestConfig);