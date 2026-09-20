#!/usr/bin/env node
// Pulls the live theme's merchant-owned JSON into the working tree, so local
// development renders what the storefront actually renders.
//
// This script is read-only against the store: the only Shopify CLI commands it
// runs are `theme pull` and `theme list`. It has no path that writes.

import { spawnSync } from 'node:child_process';
import { STORE, THEME_DATA } from './shopify-store.mjs';

const force = process.argv.slice(2).includes('--force');

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout.trimEnd();

// Only the files the pull will overwrite — editing a .liquid file shouldn't
// stand in the way of refreshing the JSON.
const dirty = () => git('status', '--porcelain', '--', ...THEME_DATA);

if (!force) {
  const pending = dirty();
  if (pending) {
    console.error('Uncommitted changes in the files this would overwrite:\n');
    console.error(pending.split('\n').map((line) => `  ${line}`).join('\n'));
    console.error('\nCommit or stash them first, or re-run with --force to discard them.');
    process.exit(1);
  }
}

console.log(`Pulling live theme JSON from ${STORE}…\n`);

const pull = spawnSync(
  'shopify',
  [
    'theme',
    'pull',
    '--live',
    '--store',
    STORE,
    '--nodelete',
    ...THEME_DATA.flatMap((pattern) => ['--only', pattern]),
  ],
  { stdio: 'inherit' }
);

if (pull.status !== 0) process.exit(pull.status ?? 1);

const changed = dirty();
console.log(
  changed
    ? `\nChanged files:\n${changed}\n\nReview with \`git diff\`, then commit what you want to keep.`
    : '\nAlready up to date with the live theme.'
);
