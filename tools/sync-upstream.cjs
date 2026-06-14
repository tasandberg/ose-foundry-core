/**
 * @file Rebases the permanent `types-source` branch onto the latest upstream
 * `main`, so the @ose-foundry-core/types package can be rebuilt from current
 * system source. Run via `npm run sync:upstream`.
 *
 * This is the ONLY place a rebase happens. The publish step never rebases — it
 * only builds the tip of `types-source`. Conflicts are therefore always
 * resolved here, locally, by a human.
 *
 * The `upstream` remote is used fetch-only: this script never pushes to it.
 */
const { execSync } = require("child_process");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const UPSTREAM_URL = "https://github.com/NecroticGnome/ose-foundry-core.git";
const UPSTREAM_REMOTE = "upstream";
const SOURCE_BRANCH = "types-source";

const argv = yargs(hideBin(process.argv))
  .option("dry-run", {
    type: "boolean",
    default: false,
    describe: "Fetch upstream and report incoming commits without rebasing.",
  })
  .parseSync();

function run(cmd) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();
}

function ensureUpstreamRemote() {
  const remotes = run("git remote").split("\n").filter(Boolean);
  if (remotes.includes(UPSTREAM_REMOTE)) {
    const url = run(`git remote get-url ${UPSTREAM_REMOTE}`);
    if (url !== UPSTREAM_URL) {
      run(`git remote set-url ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
      console.log(`Updated ${UPSTREAM_REMOTE} -> ${UPSTREAM_URL}`);
    }
  } else {
    run(`git remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
    console.log(`Added remote ${UPSTREAM_REMOTE} -> ${UPSTREAM_URL}`);
  }
}

function main() {
  ensureUpstreamRemote();

  console.log(`Fetching ${UPSTREAM_REMOTE}...`);
  execSync(`git fetch ${UPSTREAM_REMOTE}`, { stdio: "inherit" });

  const incoming = run(
    `git log --oneline ${SOURCE_BRANCH}..${UPSTREAM_REMOTE}/main`
  );

  if (!incoming) {
    console.log(
      `\n${SOURCE_BRANCH} is already up to date with ${UPSTREAM_REMOTE}/main. Nothing to do.`
    );
    return;
  }

  console.log(`\nIncoming upstream commits not yet in ${SOURCE_BRANCH}:`);
  console.log(incoming);

  if (argv.dryRun) {
    console.log("\n--dry-run: stopping before rebase.");
    return;
  }

  console.log(
    `\nChecking out ${SOURCE_BRANCH} and rebasing onto ${UPSTREAM_REMOTE}/main...`
  );
  execSync(`git checkout ${SOURCE_BRANCH}`, { stdio: "inherit" });
  try {
    execSync(`git rebase ${UPSTREAM_REMOTE}/main`, { stdio: "inherit" });
  } catch {
    console.error(
      "\nRebase hit conflicts. Resolve them, then `git rebase --continue`.\n" +
        "When the rebase finishes, push with:\n" +
        `  git push --force-with-lease origin ${SOURCE_BRANCH}`
    );
    process.exit(1);
  }

  console.log(
    `\nRebase clean. Next:\n` +
      `  git push --force-with-lease origin ${SOURCE_BRANCH}\n` +
      `  npm run publish:types`
  );
}

main();
