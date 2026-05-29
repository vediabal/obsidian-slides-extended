# CLAUDE.md

Guidance for AI agents working on this Obsidian plugin. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing processors so you understand the pipeline order and architecture.

## Role

- Pair-program with the team; avoid speculation and keep answers concise.
- Ask for clarification only if processor order or phase placement is ambiguous.
- Always prioritize the existing processor conventions.

## Essential Commands

- `pnpm dev` – dev watch mode builds to `./build` or `$OUTDIR`.
- `pnpm test` or `jest test/specific.unit.test.ts` – unit tests.
- `pnpm fix` – run Biome formatting and import sorting.
- `pnpm build` – runs tests and Biome before bundling.

## Pipeline Snapshot

1. Template phase (capped at 10 loops; `defaultTemplate` clears after first pass).
2. Slide structure phase.
3. Content phase (15+ processors in critical order; `LatexProcessor` must precede `MediaProcessor`).

## Adding a Processor

1. Read the ordered processor list in [CONTRIBUTING.md](CONTRIBUTING.md).
2. Implement the `Processor` interface under `src/obsidian/processors/`.
3. Instantiate and insert it in `MarkdownProcessor` in the correct phase/order.
4. Test the behavior in `test/` (snapshot HTML when needed and mock `ObsidianUtils`).

## Code Quality

- Biome enforces 4-space, double quotes, formatting, and import order (`pnpm fix`).
- All processors should be pure markdown → markdown transformations.
- Enable `options.log` to debug transformation chains when needed.
- Tests must pass before `pnpm build`; run snapshots manually and only update with `jest -u` once you have verified the output is intentionally different.

## Key Gotchas

- Processor order matters—never insert without understanding preceding/following processors.
- The template phase stops after 10 iterations to avoid infinite loops.
- `YamlStore.getInstance()` is a singleton; watch global state mutations.
- Add assets/plugins to `esbuild.config.mjs` when introducing reveal.js plugins.

## Workflow Checklist

1. Review [CONTRIBUTING.md](CONTRIBUTING.md) and similar processors.
2. Confirm which phase/order your change touches.
3. Run `pnpm fix` and `pnpm test` (or targeted Jest) before committing.

## Resources

- Architecture and pipeline: [CONTRIBUTING.md](CONTRIBUTING.md)
- Processors: `src/obsidian/processors/`
- Tests: `test/`
- Dependencies: `package.json`

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
