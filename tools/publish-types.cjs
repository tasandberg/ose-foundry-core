/**
 * @file Builds the @ose-foundry-core/types declarations from the current
 * `types-source` tip and force-pushes a clean 3-file orphan commit to the
 * `types` branch on `origin`. Run via `npm run publish:types`.
 *
 * Consumers install the result with:
 *   npm  add -D github:tasandberg/ose-foundry-core#types
 *   pnpm add -D github:tasandberg/ose-foundry-core#types
 *
 * Pass a semver version for an immutable release pin:
 *   npm run publish:types -- 0.1.0
 * That stamps the package version `0.1.0` and pushes a lightweight git tag
 * `types-v0.1.0` pointing at the published commit, so consumers can pin
 *   github:tasandberg/ose-foundry-core#types-v0.1.0   (immutable)
 * Omit the arg for an untagged build stamped `0.0.0-dev.<sha>`; the floating
 * `types` branch always moves to the newest build either way.
 *
 * This script never rebases (that is `npm run sync:upstream`) and never touches
 * the working tree or the current branch: the orphan commit is assembled in a
 * throwaway git index and pushed directly, so HEAD and your files are untouched.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const SOURCE_BRANCH = "types-source";
const DIST_BRANCH = "types";
const REMOTE = "origin";
const PKG_DIR = path.resolve(__dirname, "..", "packages", "types");
const FILES = ["index.d.ts", "README.md", "package.json"];

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

function fail(msg) {
  console.error(`\n${msg}`);
  process.exit(1);
}

function preflight() {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  if (branch !== SOURCE_BRANCH) {
    fail(
      `Must be on '${SOURCE_BRANCH}' to publish (currently on '${branch}').\n` +
        `  git checkout ${SOURCE_BRANCH}`
    );
  }
  if (run("git status --porcelain")) {
    fail("Working tree is dirty. Commit or stash changes before publishing.");
  }
}

// Optional semver arg → immutable release. Returns { version, tag } or null tag.
function resolveVersion(sha) {
  const arg = process.argv[2];
  if (!arg) {
    return { version: `0.0.0-dev.${sha}`, tag: null };
  }
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(arg)) {
    fail(`Version must be semver (e.g. 0.1.0), got '${arg}'.`);
  }
  const tag = `types-v${arg}`;
  if (run(`git tag -l ${tag}`)) {
    fail(`Tag ${tag} already exists locally. Bump the version or delete the tag.`);
  }
  if (run(`git ls-remote --tags ${REMOTE} ${tag}`)) {
    fail(`Tag ${tag} already exists on ${REMOTE}. Bump the version.`);
  }
  return { version: arg, tag };
}

function main() {
  preflight();

  const sha = run("git rev-parse --short HEAD");
  const { version, tag } = resolveVersion(sha);

  console.log("Building type declarations (npm run build:types)...");
  execSync("npm run build:types", { stdio: "inherit" });

  // Stage the three shipped files in a temp dir, with the version stamped.
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "ose-types-"));
  for (const f of FILES) {
    fs.copyFileSync(path.join(PKG_DIR, f), path.join(dist, f));
  }
  execSync(`npm pkg set version="${version}"`, { cwd: dist, stdio: "pipe" });

  // Assemble an orphan commit in a throwaway index so HEAD/worktree are untouched.
  const indexFile = path.join(dist, ".git-index");
  const env = { ...process.env, GIT_INDEX_FILE: indexFile };
  for (const f of FILES) {
    const blob = run(`git hash-object -w "${path.join(dist, f)}"`, { env });
    run(`git update-index --add --cacheinfo 100644,${blob},${f}`, { env });
  }
  const tree = run("git write-tree", { env });
  const commit = run(
    `git commit-tree ${tree} -m "Build @ose-foundry-core/types from ${sha}"`,
    { env }
  );

  console.log(`\nPublishing ${DIST_BRANCH} -> ${REMOTE} (version ${version})...`);
  execSync(`git push --force ${REMOTE} ${commit}:refs/heads/${DIST_BRANCH}`, {
    stdio: "inherit",
  });

  if (tag) {
    // Lightweight tag on the same commit → immutable pin for consumers.
    run(`git tag ${tag} ${commit}`);
    execSync(`git push ${REMOTE} refs/tags/${tag}`, { stdio: "inherit" });
  }

  fs.rmSync(dist, { recursive: true, force: true });

  const ref = tag || DIST_BRANCH;
  console.log(
    `\nDone. Consumers install with:\n` +
      `  npm  add -D github:tasandberg/ose-foundry-core#${ref}\n` +
      `  pnpm add -D github:tasandberg/ose-foundry-core#${ref}` +
      (tag ? `\n\nFloating latest also updated: #${DIST_BRANCH}` : "")
  );
}

main();
