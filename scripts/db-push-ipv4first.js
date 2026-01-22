#!/usr/bin/env node
/**
 * Run: npm run db:push:ipv4first
 * For Windows-friendly env setup. Forces IPv4 DNS resolution for Node/Prisma.
 */
const { spawnSync } = require('child_process');

process.env.NODE_OPTIONS = [
  process.env.NODE_OPTIONS,
  '--dns-result-order=ipv4first'
].filter(Boolean).join(' ');

const result = spawnSync('npx', ['prisma', 'db', 'push'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

process.exit(result.status || 0);