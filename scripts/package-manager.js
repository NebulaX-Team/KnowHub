#!/usr/bin/env node

const { spawnSync } = require('child_process');

const SUPPORTED_PACKAGE_MANAGERS = ['bun', 'pnpm', 'npm', 'yarn'];

function normalizePackageManager(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return SUPPORTED_PACKAGE_MANAGERS.includes(normalized) ? normalized : null;
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function detectPackageManager() {
  const forced = normalizePackageManager(process.env.KNOWHUB_PM);
  if (forced) {
    return forced;
  }

  const userAgent = String(process.env.npm_config_user_agent || '').toLowerCase();
  if (userAgent.includes('bun')) return 'bun';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('npm')) return 'npm';

  if (commandExists('bun')) return 'bun';
  if (commandExists('pnpm')) return 'pnpm';
  if (commandExists('npm')) return 'npm';
  if (commandExists('yarn')) return 'yarn';

  return 'npm';
}

function getRunScriptInvocation(packageManager, scriptName) {
  switch (packageManager) {
    case 'bun':
      return { command: 'bun', args: ['run', scriptName] };
    case 'pnpm':
      return { command: 'pnpm', args: ['run', scriptName] };
    case 'yarn':
      return { command: 'yarn', args: [scriptName] };
    case 'npm':
    default:
      return { command: 'npm', args: ['run', scriptName] };
  }
}

function runScript({ packageManager, scriptName, cwd }) {
  const { command, args } = getRunScriptInvocation(packageManager, scriptName);
  return spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  });
}

module.exports = {
  SUPPORTED_PACKAGE_MANAGERS,
  detectPackageManager,
  getRunScriptInvocation,
  runScript,
};
