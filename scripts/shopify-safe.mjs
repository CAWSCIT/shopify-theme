#!/usr/bin/env node
// Runs the Shopify CLI with one rule: nothing from this repo may write to the
// live theme. Anything that would publish, overwrite or delete the published
// storefront is refused before the CLI is reached.
//
//   npm run theme -- push --unpublished --theme "CAWSO $(date +%F)"   # fine
//   npm run theme -- push --live                                      # refused
//   npm run theme -- push --theme <live-id>                           # refused
//
// Read-only commands (pull, list, dev, check, share, …) pass straight through.

import { spawnSync } from 'node:child_process';
import { STORE } from './shopify-store.mjs';

const args = process.argv.slice(2);

const refuse = (why) => {
  console.error(`Refused: ${why}`);
  console.error('');
  console.error('Releases go up as a new unpublished theme and are published from the');
  console.error('Shopify admin. See "Deploying" in README.md.');
  process.exit(1);
};

// --- flag parsing -----------------------------------------------------------
// Handles `--theme 123`, `--theme=123`, `-t 123`, `-t=123` and clusters (`-lu`).
const long = new Set();
const short = new Set();
const values = new Map();

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--') break;

  const next = args[i + 1];
  const valueAfter = next !== undefined && !next.startsWith('-') ? next : undefined;

  if (arg.startsWith('--')) {
    const [name, inline] = arg.slice(2).split('=');
    long.add(name);
    const value = inline ?? valueAfter;
    if (value !== undefined) values.set(name, value);
  } else if (arg.startsWith('-') && arg.length > 1) {
    const [cluster, inline] = arg.slice(1).split('=');
    for (const letter of cluster) short.add(letter);
    const value = inline ?? valueAfter;
    if (value !== undefined) values.set(cluster.at(-1), value);
  }
}

// A flag counts as set however it arrived — long, short, or the CLI's own env var.
const has = (name, letter, env) =>
  long.has(name) || short.has(letter) || Boolean(env && process.env[env]);

const valueOf = (name, letter, env) =>
  values.get(name) ?? values.get(letter) ?? (env ? process.env[env] : undefined);

// --- the rules --------------------------------------------------------------
const WRITING = new Set(['push', 'publish', 'delete', 'rename']);
const command = args[0];

if (WRITING.has(command)) {
  const target = valueOf('theme', 't', 'SHOPIFY_FLAG_THEME_ID');
  const unpublished = has('unpublished', 'u', 'SHOPIFY_FLAG_UNPUBLISHED');
  const development = has('development', 'd', 'SHOPIFY_FLAG_DEVELOPMENT');

  if (command === 'publish') {
    refuse('`theme publish` from localhost.');
  }

  if (has('live', 'l', 'SHOPIFY_FLAG_LIVE')) {
    refuse(`\`theme ${command}\` targeting the live theme.`);
  }

  // `-a` is --allow-live on push, but --show-all on delete.
  if (command === 'push' && has('allow-live', 'a', 'SHOPIFY_FLAG_ALLOW_LIVE')) {
    refuse('`theme push --allow-live`.');
  }

  if (command === 'push' && has('publish', 'p', 'SHOPIFY_FLAG_PUBLISH')) {
    refuse('`theme push --publish` — that would publish what it pushes.');
  }

  if (!target && !unpublished && !development) {
    refuse(`\`theme ${command}\` with no target — the CLI would pick one for you.`);
  }

  // An explicit --theme can still name the live theme, by id or by name.
  if (target) {
    const store = valueOf('store', 's', 'SHOPIFY_FLAG_STORE') || STORE;
    const list = spawnSync('shopify', ['theme', 'list', '--json', '--store', store], {
      encoding: 'utf8',
    });

    let live;
    try {
      live = JSON.parse(list.stdout).find((theme) => theme.role === 'live');
    } catch {
      live = undefined;
    }

    if (!live) {
      refuse(
        `couldn't check which theme is live on ${store}, so \`theme ${command} --theme ${target}\`\n` +
          "can't be cleared. Fix the connection (or `shopify auth login`) and try again."
      );
    }

    const names = [String(live.id), live.name.toLowerCase()];
    if (names.includes(String(target).toLowerCase())) {
      refuse(`\`theme ${command} --theme ${target}\` — that is the live theme ("${live.name}").`);
    }
  }
}

const run = spawnSync('shopify', ['theme', ...args], { stdio: 'inherit' });
process.exit(run.status ?? 1);
