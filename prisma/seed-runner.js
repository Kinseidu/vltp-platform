// prisma/seed-runner.js
// Cross-platform seed runner (works on Windows, Mac, Linux)
// Avoids shell quoting issues with ts-node --compiler-options on Windows

const { execSync } = require('child_process');

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'CommonJS' });

try {
  execSync('npx ts-node prisma/seed.ts', {
    stdio: 'inherit',
    env: { ...process.env, TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS' }) },
  });
} catch (e) {
  process.exit(1);
}
