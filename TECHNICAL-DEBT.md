# Technical debt

This is the deliberately deferred work remaining after the June 2026 repository cleanup. It replaces the dated `OBSIDIAN-SKILLS-AUDIT.md` snapshot.

## Upstream baseline

The Obsidian sample plugin was reviewed through upstream commit `f8667ce` (`feat: modernize sample plugin`). This repository is a mature fork, so upstream is a reference rather than a merge target.

Adopted selectively:

- `src/main.ts` entrypoint and ES2021 build target.
- Strict TypeScript and the modern npm/ESLint/Obsidian lint stack.
- Node `builtinModules`, updated development dependencies, lint CI, and the corrected `versions.json` key check.
- Concise agent guidance adapted to this plugin.

Intentionally not copied:

- Sample source, manifest, settings, README, or package identity.
- The sample's draft-release workflow or automatic staging behavior.
- Its minimum Obsidian version.

## Deferred architecture

- Split `src/main.ts` into lifecycle/commands, scripture-note resolution, migrations, and public API modules.
- Split `src/scripture-list-renderer.ts` into parser/lookup, rendering, source editing, clipboard actions, and editor-navigation modules.
- Split settings definitions from modal/UI coordination.

## Compatibility-sensitive work

- Replace the internal `MarkdownView.setMode` cast used to open a rendered list in source mode.
- Replace the Bible-note title manager's `getDisplayText` and optional header-refresh overrides with supported APIs when Obsidian provides them.
- Decide whether and how to deprecate the legacy `app.plugins.plugins['scripture'].api` alias.
- Consider a newer declarative settings API only alongside an intentional increase from `minAppVersion: 1.9.0`.

## CSS and release operations

- Review each remaining `:has()` and `!important` rule against live preview, reading mode, themes, and mobile before changing it.
- Consolidate the tag and manual release workflows into one release authority.
- Add build-provenance attestation and enforce tag/package/manifest version agreement in that canonical workflow.
- Reconsider direct-to-default-branch release commits after the workflows are consolidated.
