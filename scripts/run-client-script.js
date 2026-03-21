#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { detectPackageManager, getRunScriptInvocation, runScript } = require('./package-manager');

const scriptName = process.argv[2];

if (!scriptName) {
  console.error('Missing client script name. Example: node scripts/run-client-script.js dev');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const clientNodeModules = path.join(clientDir, 'node_modules');
const rootNodeModules = path.join(rootDir, 'node_modules');
const packageManager = detectPackageManager();
const { command, args } = getRunScriptInvocation(packageManager, scriptName);

console.log(`Using package manager: ${packageManager}`);
console.log(`Running in client/: ${command} ${args.join(' ')}`);

if (!fs.existsSync(clientNodeModules) && !fs.existsSync(rootNodeModules)) {
  console.warn('⚠ client/node_modules not found.');
  console.warn('Install client dependencies first:');
  console.warn(`   ${packageManager} install`);
}

const result = runScript({
  packageManager,
  scriptName,
  cwd: clientDir,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
