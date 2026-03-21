#!/usr/bin/env node

/**
 * KnowHub Project Packaging Script
 * Features:
 * 1. Build backend (NestJS)
 * 2. Build frontend (Vue 3 + Vite)
 * 3. Move frontend build files to dist/frontend directory
 */

const fs = require('fs');
const path = require('path');
const { detectPackageManager, getRunScriptInvocation, runScript } = require('./scripts/package-manager');

// Configuration
const CONFIG = {
  frontendDir: path.join(__dirname, 'client'),
  backendDir: __dirname,
  distDir: path.join(__dirname, 'dist'),
  frontendDistDir: path.join(__dirname, 'dist', 'frontend'),
  frontendBuildOutputDir: path.join(__dirname, 'client', 'dist'),
};

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Execute package.json script
function runPackageScript(scriptName, cwd, packageManager, errorMessage) {
  const { command, args } = getRunScriptInvocation(packageManager, scriptName);
  log(`Executing command: ${command} ${args.join(' ')}`, 'blue');
  const result = runScript({ packageManager, scriptName, cwd });
  if (result.status === 0) {
    return true;
  }
  error(errorMessage || `Command failed: ${command} ${args.join(' ')}`);
  return false;
}

// Clean dist directory
function cleanDist() {
  info('Cleaning dist directory...');
  if (fs.existsSync(CONFIG.distDir)) {
    fs.rmSync(CONFIG.distDir, { recursive: true, force: true });
    success('dist directory cleaned');
  } else {
    info('dist directory does not exist, no cleanup needed');
  }
}

// Build backend
function buildBackend(packageManager) {
  info('Starting backend build...');
  const result = runPackageScript(
    'build',
    CONFIG.backendDir,
    packageManager,
    'Backend build failed'
  );
  if (result) {
    success('Backend build completed');
  }
  return result;
}

// Build frontend
function buildFrontend(packageManager) {
  info('Starting frontend build...');
  const result = runPackageScript(
    'build',
    CONFIG.frontendDir,
    packageManager,
    'Frontend build failed'
  );
  if (result) {
    success('Frontend build completed');
  }
  return result;
}

// Move frontend build files
function moveFrontendBuild() {
  info('Moving frontend build files to dist/frontend...');
  
  // Check if frontend build output directory exists
  if (!fs.existsSync(CONFIG.frontendBuildOutputDir)) {
    error(`Frontend build output directory does not exist: ${CONFIG.frontendBuildOutputDir}`);
    return false;
  }

  // Create dist/frontend directory
  if (!fs.existsSync(CONFIG.distDir)) {
    fs.mkdirSync(CONFIG.distDir, { recursive: true });
  }
  
  if (fs.existsSync(CONFIG.frontendDistDir)) {
    fs.rmSync(CONFIG.frontendDistDir, { recursive: true, force: true });
  }

  // Move files
  fs.renameSync(CONFIG.frontendBuildOutputDir, CONFIG.frontendDistDir);
  success('Frontend build files moved to dist/frontend');
  
  return true;
}

// Main function
function main() {
  log('========================================', 'cyan');
  log('KnowHub Project Packaging Script', 'cyan');
  log('========================================', 'cyan');
  
  // Check working directory
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    error('Please run this script from the project root directory');
  }

  const packageManager = detectPackageManager();
  info(`Using package manager: ${packageManager}`);

  // 1. Clean dist directory
  cleanDist();
  
  // 2. Build backend
  if (!buildBackend(packageManager)) {
    error('Backend build failed, terminating packaging');
  }
  
  // 3. Build frontend
  if (!buildFrontend(packageManager)) {
    error('Frontend build failed, terminating packaging');
  }
  
  // 4. Move frontend build files
  if (!moveFrontendBuild()) {
    error('Failed to move frontend build files');
  }
  
  log('========================================', 'cyan');
  success('Packaging complete!');
  log('========================================', 'cyan');
  log('Output directories:', 'yellow');
  log(`  - Backend: ${path.join(CONFIG.distDir, 'main.js')}`, 'yellow');
  log(`  - Frontend: ${CONFIG.frontendDistDir}`, 'yellow');
  log('========================================', 'cyan');
}

// Run main function
main();
