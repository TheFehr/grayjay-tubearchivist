#!/usr/bin/env node

/**
 * Release commit for the plugin.
 *
 * Bumps the version and adds a changelog entry in BOTH plugin configs, then
 * commits them together as "Release vN":
 *   - proxy/config.json.template — served by the Docker image (the one
 *     GrayJay actually installs from); pushing this commit to main triggers
 *     the Docker publish workflow, which also signs the script
 *   - config.json — the GitHub-release/local-build config, which used to be
 *     forgotten and drifted behind the template
 *
 * Deliberately doesn't push: pushes go through the global pre-push hook's
 * time window, so that stays a separate, explicit step.
 *
 * Usage:
 *   npm run release -- <version> "<changelog line>" ["<changelog line>" ...]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { log, colors, readJsonFile, writeJsonFile } = require('./utils');

const ROOT = path.join(__dirname, '..');
const ROOT_CONFIG = path.join(ROOT, 'config.json');
const TEMPLATE = path.join(ROOT, 'proxy', 'config.json.template');

function fail(message) {
  log(`❌ ${message}`, colors.red);
  process.exit(1);
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' });
}

/**
 * The template is edited as text rather than re-serialized, so its
 * hand-formatted compact arrays (e.g. "packages": ["Http"]) survive.
 */
function updateTemplate(version, lines) {
  let text = fs.readFileSync(TEMPLATE, 'utf-8');

  const versionPattern = /^(  "version": )\d+,$/m;
  if (!versionPattern.test(text)) fail('Could not find "version" in proxy/config.json.template');
  text = text.replace(versionPattern, `$1${version},`);

  // End of the changelog object: the first two-space-indented "}" after it
  const changelogStart = text.indexOf('\n  "changelog": {');
  const changelogEnd = text.indexOf('\n  }', changelogStart);
  if (changelogStart === -1 || changelogEnd === -1) fail('Could not find "changelog" in proxy/config.json.template');

  const entry = `,\n    "${version}": [\n${lines.map((l) => `      ${JSON.stringify(l)}`).join(',\n')}\n    ]`;
  text = text.slice(0, changelogEnd) + entry + text.slice(changelogEnd);

  // Placeholders like ${TA_HOST} only ever appear inside strings, so the
  // template is valid JSON — use that to sanity-check the text edit.
  const parsed = JSON.parse(text);
  if (parsed.version !== version || JSON.stringify(parsed.changelog[version]) !== JSON.stringify(lines)) {
    fail('Template edit did not produce the expected version/changelog — aborting without writing');
  }

  fs.writeFileSync(TEMPLATE, text, 'utf-8');
}

function updateRootConfig(version, lines) {
  const config = readJsonFile(ROOT_CONFIG);
  config.version = version;
  config.changelog = { ...config.changelog, [version]: lines };
  writeJsonFile(ROOT_CONFIG, config);
}

function main() {
  const [versionArg, ...lines] = process.argv.slice(2);
  const version = Number(versionArg);

  if (!Number.isInteger(version) || version < 1 || lines.length === 0 || lines.some((l) => !l.trim())) {
    fail('Usage: npm run release -- <version> "<changelog line>" ["<changelog line>" ...]');
  }

  const template = JSON.parse(fs.readFileSync(TEMPLATE, 'utf-8'));
  const rootConfig = readJsonFile(ROOT_CONFIG);

  if (version <= template.version) {
    fail(`Version ${version} is not above the current template version (${template.version})`);
  }
  if (template.changelog[version] || rootConfig.changelog[version]) {
    fail(`A changelog entry for version ${version} already exists`);
  }
  if (git('status', '--porcelain').trim()) {
    fail('Working tree is not clean — commit or stash changes first so the release commit only contains the bump');
  }

  updateTemplate(version, lines);
  updateRootConfig(version, lines);

  git('add', 'config.json', 'proxy/config.json.template');
  git('commit', '-q', '-m', `Release v${version}`, '-m', lines.map((l) => `- ${l}`).join('\n'));

  log(`✅ Committed Release v${version} (${git('rev-parse', '--short', 'HEAD').trim()})`, colors.green);
  log('   Push to main when ready — that triggers the Docker publish workflow.', colors.cyan);
}

main();
