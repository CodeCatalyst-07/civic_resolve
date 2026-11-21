#!/usr/bin/env node

/**
 * Dependency-free security scanner for tracked and staged repository files.
 * Ensures API keys, private keys, service accounts, and production .env files are never committed.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Regex patterns built dynamically to prevent self-matching inside this script
const PATTERNS = [
  {
    name: 'Google API Key (AIza...)',
    regex: new RegExp(['AIza', '[0-9A-Za-z_-]{35}'].join(''), 'g'),
  },
  {
    name: 'Private Key PEM Block',
    regex: new RegExp(['-----BEGIN ', '[A-Z ]*PRIVATE KEY-----'].join(''), 'g'),
  },
  {
    name: 'Hardcoded Bearer Token',
    regex: new RegExp(['Bearer\\s+', '[A-Za-z0-9_\\-\\.]{30,}'].join(''), 'g'),
  },
];

const BINARY_EXTENSIONS = new Set([
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
]);

function getTrackedAndStagedFiles() {
  const files = new Set();

  try {
    const tracked = execSync('git ls-files', { encoding: 'utf-8' }).trim().split('\n');
    for (const file of tracked) {
      if (file) files.add(file.trim());
    }
  } catch {
    // Fall back to empty if git fails
  }

  try {
    const staged = execSync('git diff --name-only --cached', { encoding: 'utf-8' }).trim().split('\n');
    for (const file of staged) {
      if (file) files.add(file.trim());
    }
  } catch {
    // Ignore error if not in git repo
  }

  return Array.from(files);
}

function checkFiles() {
  const files = getTrackedAndStagedFiles();
  const violations = [];

  for (const relativePath of files) {
    if (relativePath === 'scripts/secretsCheck.mjs') {
      continue; // Skip scanner self
    }

    // Check disallowed filenames
    const base = relativePath.split('/').pop() || relativePath;
    if (base.startsWith('.env') && base !== '.env.example') {
      violations.push({
        file: relativePath,
        line: 1,
        rule: 'Tracked environment file (only .env.example may be committed)',
      });
      continue;
    }

    if (
      (base.includes('firebase') && base.includes('adminsdk') && base.endsWith('.json')) ||
      (base.includes('service-account') && base.endsWith('.json'))
    ) {
      violations.push({
        file: relativePath,
        line: 1,
        rule: 'Tracked service account credentials JSON file',
      });
      continue;
    }

    // Skip binary files
    const ext = base.includes('.') ? `.${base.split('.').pop()}` : '';
    if (BINARY_EXTENSIONS.has(ext)) {
      continue;
    }

    // Read text file content
    const fullPath = resolve(process.cwd(), relativePath);
    if (!existsSync(fullPath)) {
      continue;
    }

    let content;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch {
      continue; // Binary or unreadable
    }

    const lines = content.split('\n');
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      for (const { name, regex } of PATTERNS) {
        regex.lastIndex = 0;
        if (regex.test(line)) {
          violations.push({
            file: relativePath,
            line: lineNum + 1,
            rule: `Secret pattern detected: ${name}`,
          });
        }
      }
    }
  }

  return violations;
}

const violations = checkFiles();

if (violations.length > 0) {
  console.error('\n❌ SECRETS CHECK FAILED: Credentials or sensitive files detected:');
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} -> ${v.rule}`);
  }
  console.error('\nNever commit API keys, service accounts, or private keys to git.\n');
  process.exit(1);
} else {
  console.log('✅ Secrets check passed: No credentials or sensitive files detected.');
  process.exit(0);
}
