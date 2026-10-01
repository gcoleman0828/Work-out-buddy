# CLAUDE.md — Work-out-buddy

Repo: https://github.com/gcoleman0828/Work-out-buddy (owner: gcoleman0828)

## Project

Name: **Work-out-buddy**
Purpose / stack: _to be filled in at the start of the first build session._

## Environment notes (verified 2026-10-01)

- Repo was private; it was made public to allow Claude to attach it.
- Attaching the repo, shallow clone, and branch push all work from a Claude
  cloud session after GitHub was reconnected in Claude's connector settings.
  A test push to a new branch (`claude/push-test`) succeeded.
- Deleting a remote branch from the Claude cloud session failed with HTTP 403
  (`git push origin --delete`). Delete branches on GitHub directly.
- The session clone is shallow and tracks only `main`. After pushing a new
  branch, a stop hook may report "unpushed commits / no remote branch" even
  though the push succeeded. Verify with `git ls-remote --heads origin <branch>`
  before pushing again.
- Work on a branch and open a PR. Do not push directly to `main`.

## Standing rules (restated from user preferences; Claude Code cannot see Project Instructions)

1. **Config-driven values.** Thresholds, timeouts, URLs/endpoints, secrets,
   API keys, credentials, and any value that may change must live in a config
   file or config table, never hardcoded, so changing them needs no code
   deploy or container rebuild. Never commit secrets.
2. **No magic strings.** Any identifier or literal used in more than one place
   is defined once (enum or constants module) and referenced everywhere else.
   This is separate from rule 1: a shared identifier may be a constant in code,
   while a changeable value belongs in config. Some values need both.
3. **Never fail silently.** Every project has a log collector. Errors are
   logged for later debugging, and the user sees a friendly error message.
4. **No destructive or paid action on an inferred claim.** Data loss, reset,
   deletion, uninstall, or spend requires a verified source cited in the same
   response. If it can't be cited, say it is unverified and stop short.
5. **Don't assert UI navigation or menu paths from memory.** Ask what is on
   screen.
6. **Circuit breaker.** After two failed attempts at the same sub-goal, stop.
   State what was assumed, what the evidence suggests is wrong, and what a
   different approach would be. If no different premise can be named, say so
   and stop.
