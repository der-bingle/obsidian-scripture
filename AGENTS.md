# AGENTS.md

Instructions for agents working on the Scripture Obsidian plugin.

## Project

- TypeScript Obsidian community plugin targeting desktop and mobile.
- Source entrypoint: `src/main.ts`; esbuild writes the ignored root `main.js` bundle.
- Minimum Obsidian version: `1.9.0`. Do not adopt newer-only APIs without an explicit compatibility decision.
- Package manager: npm.
- Upstream sample-plugin changes are references to port selectively, not a branch to merge wholesale.

## Commands

```sh
npm install       # update dependencies and lockfile
npm run dev       # watch build
npm run lint      # ESLint plus Obsidian-specific rules
npm run test      # Vitest suite
npm run build     # strict type-check and production bundle
npm run check     # lint, tests, and build
```

Run `npm run check` after code changes. Do not commit, stage, push, tag, or release unless the user explicitly requests that Git operation.

## Architecture

- `src/main.ts`: lifecycle, command registration, settings persistence, migrations, URI handler, and public API compatibility alias.
- `src/modal.ts`: passage insertion modal and preview.
- `src/scripture-list-renderer.ts`: `scriptureList` lookup, rendering, source editing, clipboard actions, and fold state.
- `src/callout-formatter.ts` and `src/reference-format.ts`: deterministic Markdown and reference formatting.
- `src/bible-data-loader.ts`: normalized vault-path loading, validation, and translation cache.
- `src/bible-note-utils.ts`, display/title managers, chapter navigator, and note switcher: Bible-note integration.
- `src/settings.ts`: settings UI for translations, insertion, callouts, lists, and chapter notes.
- `src/types.ts`: persisted settings, Bible data, renderer, and public API types.
- `src/settings-migrations.ts` and `src/scripture-list-parser.ts`: pure, tested migration and parsing logic.

## Compatibility contracts

- Never rename released command IDs.
- Preserve settings keys and provide migrations for schema changes.
- Preserve callout Markdown, `scriptureList` syntax, URI parameters, and `ScriptureAPI` methods unless the user approves a breaking change.
- Preserve `app.plugins.plugins['scripture'].api` until a deliberate deprecation plan exists.
- Translation data and note directories are vault-relative paths; normalize them before access.
- Chapter-note translation switching relies on frontmatter IDs such as `JHN.003`.

## Coding conventions

- Use strict TypeScript. Prefer `unknown` plus validation to `any`.
- Keep data transformation and formatting pure; isolate Obsidian, DOM, clipboard, and vault effects at boundaries.
- Use injected `App` references, supported workspace helpers, `Vault` APIs, and `register*` cleanup helpers.
- Never use `innerHTML` with variable data. Use `setText`, `textContent`, or DOM helpers.
- Put static presentation in plugin-prefixed CSS classes rather than inline styles.
- Use sentence case for UI text and stable, action-oriented command names.
- Routine debug output does not belong in production. Keep concise error logging where it helps diagnose a failed operation.
- Preserve the short view-loading delays unless replacing them with a verified lifecycle-safe mechanism.
- Do not introduce Ramda or another utility dependency merely to imitate an old convention; use native TypeScript when it is clearer.

## Testing

- Add focused unit tests for pure parsing, formatting, and migration changes.
- For DOM or Obsidian integration changes, run the automated suite and smoke-test the affected flow in a development vault.
- Important smoke paths: both insertion modes, clipboard opening, chapter translation switching, verse-number modes, tab titles, translation validation, and `scriptureList` editing/pasting/folding/copying.

## Release and repository hygiene

- Required release assets are `main.js`, `manifest.json`, and `styles.css`.
- Production builds must not contain inline source maps.
- Keep `package.json`, `package-lock.json`, `manifest.json`, and `versions.json` version metadata consistent.
- When the user has authorized committing changes that materially affect code or architecture documentation, commit the source changes first, then run `graphify update .` against that committed state. Validate the generated artifacts and commit the durable Graphify output in an immediately following `Update generated Graphify map` commit. Push both commits before creating a release. The post-commit hook covers code-only AST refreshes; run the update manually when documentation changes require semantic extraction.
- After a stable GitHub release succeeds and its assets are verified, update the BRAT-managed Scripture deployment in the main vault:

  ```sh
  obsidian vault="Obsidian" dev:debug on
  obsidian vault="Obsidian" eval code='(async()=>{const brat=app.plugins.getPlugin("obsidian42-brat");if(!brat)throw new Error("BRAT is not enabled");return await brat.betaPlugins.updatePlugin("der-bingle/obsidian-scripture",false,true,false)})()'
  obsidian vault="Obsidian" eval code='app.plugins.getPlugin("obsidian-scripture")?.manifest.version'
  obsidian vault="Obsidian" dev:errors
  ```

  The release is complete only when the reported main-vault version matches the GitHub release and Obsidian reports no plugin errors.
- Commit durable Graphify artifacts such as `graph.json`, `GRAPH_REPORT.md`, `graph.html`, and tracked cache or snapshot files. Do not commit machine-local Graphify state such as `graphify-out/cost.json`, `graphify-out/**/manifest.json`, `graphify-out/.graphify_python`, `graphify-out/.graphify_root`, or `graphify-out/cache/stat-index.json`.
- Do not commit local `data.json`, translation corpora, generated bundles, archives, or dependency directories.
- Consult `TECHNICAL-DEBT.md` before broad refactors; it records intentionally deferred work rather than accidental omissions.
