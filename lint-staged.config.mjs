export default {
  "*.{ts,js,mjs,cjs,json,md}": ["prettier --write"],

  // ESLint scoped to staged files; tsc --noEmit can't be (needs the whole
  // program), so it always runs in full. Coverage is advisory, not a gate --
  // see git-workflow.md's "Why coverage is advisory, not a gate".
  //
  // A single tsconfig.json now covers app/src/test (test files were split
  // into a separate tsconfig.test.json originally, which ESLint's
  // type-aware project service couldn't resolve test files against -- see
  // tooling.md/CLAUDE.md's tsconfig-restructuring note), so there's only
  // one tsc invocation here, not two.
  "*.ts": (stagedFiles) => [
    `eslint --max-warnings=0 ${stagedFiles.map((f) => `"${f}"`).join(" ")}`,
    `node --experimental-vm-modules node_modules/jest/bin/jest.js --bail --findRelatedTests --passWithNoTests ${stagedFiles.map((f) => `"${f}"`).join(" ")}`,
    "tsc -p tsconfig.json",
    "npm run test:coverage:warn",
  ],
};
