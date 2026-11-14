#!/usr/bin/env node
// The one place that knows where the app version is written.
//
// The root package.json is the source of truth. Every other file that carries a version
// (the client and server packages, the lockfiles, the Ansible collection) is a copy that
// `set` rewrites and `check` compares, so they cannot drift apart unnoticed. Release tags,
// the tarball, the Docker images and the demo page all take the version from here.
//
//   scripts/version.mjs get          print the version
//   scripts/version.mjs set 2.2.0    write it everywhere
//   scripts/version.mjs check        exit 1 if a copy differs (CI runs this)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/** package.json and lockfiles: the version sits at the top and, in lockfiles, in packages[""] */
const jsonFile = (path) => ({
  path,
  read() {
    const data = JSON.parse(readFileSync(join(root, path), 'utf8'));
    return [data.version, data.packages?.[''] ? data.packages[''].version : data.version];
  },
  write(version) {
    const file = join(root, path);
    const text = readFileSync(file, 'utf8');
    const indent = /\n( +|\t)"/.exec(text)?.[1] ?? '  ';
    const data = JSON.parse(text);
    if ('version' in data) data.version = version;
    else {
      // a package that had none gets it right after its name
      const { name, ...rest } = data;
      Object.keys(data).forEach((key) => delete data[key]);
      Object.assign(data, { name, version }, rest);
    }
    if (data.packages?.['']) data.packages[''].version = version;
    writeFileSync(file, JSON.stringify(data, null, indent) + (text.endsWith('\n') ? '\n' : ''));
  },
});

/** The Ansible collection is released together with the app */
const galaxy = {
  path: 'ansible/galaxy.yml',
  read: () => [/^version:\s*(\S+)/m.exec(readFileSync(join(root, 'ansible/galaxy.yml'), 'utf8'))?.[1]],
  write(version) {
    const file = join(root, 'ansible/galaxy.yml');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^version:.*$/m, `version: ${version}`));
  },
};

const files = [
  jsonFile('package.json'),
  jsonFile('package-lock.json'),
  jsonFile('client/package.json'),
  jsonFile('client/package-lock.json'),
  jsonFile('server/package.json'),
  jsonFile('server/package-lock.json'),
  galaxy,
];

const version = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const [command, argument] = process.argv.slice(2);

if (command === 'get') {
  console.log(version());
} else if (command === 'set') {
  if (!SEMVER.test(argument ?? '')) {
    console.error(`Not a version: "${argument ?? ''}" (expected X.Y.Z or X.Y.Z-beta)`);
    process.exit(1);
  }
  for (const file of files) file.write(argument);
  console.log(`Version ${argument} written to ${files.length} files.`);
} else if (command === 'check') {
  const expected = version();
  const wrong = files.flatMap((file) =>
    file.read().filter((found) => found !== expected).map((found) => `  ${file.path}: ${found ?? 'no version'}`),
  );
  if (wrong.length) {
    console.error(`Version drift: package.json says ${expected}, but\n${wrong.join('\n')}\nFix: scripts/version.mjs set ${expected}`);
    process.exit(1);
  }
  console.log(`All ${files.length} version files say ${expected}.`);
} else {
  console.error('Usage: scripts/version.mjs get | set <version> | check');
  process.exit(1);
}
