## At-a-glance

Short, practical orientation for code-generation agents working on this repo.

- Repo type: Obsidian plugin (TypeScript)
- Entry point: `main.ts` → bundled to `main.js` by `esbuild.config.mjs`
- Dev commands: `npm run dev` (watch) and `npm run build` (typecheck + bundle)

## Architecture & big picture

This plugin provides UI commands and callout insertion for scripture references, plus Bible-note display customizations. Major components:

- `main.ts` — Plugin lifecycle, command registration, settings load/save, public API exposure (`app.plugins.plugins['scripture'].api`).
- `src/` — Pure-ish helper modules and UI pieces:
  - `bible-data-loader.ts` — loads/validates JSON translations and caches results.
  - `callout-formatter.ts` — constructs and inserts scripture callouts into editor content.
  - `bible-verse-display-manager.ts` — applies verse-number display rules to opened notes.
  - `bible-chapter-navigator.ts` — open other translation chapter notes.
  - `modal.ts` — reference modal UI used by the Insert command.
  - `settings.ts` — settings UI (add/edit/remove translations). Uses `BibleDataLoader.validateTranslation()`.
  - `types.ts` — domain types and `DEFAULT_SETTINGS`.
 - `scripture-references` — external package (now `github:der-bingle/scripture-references`) that provides reference detection/parsing utilities (`detectReferences`, `PassageReference`). The plugin imports this package at runtime (see `main.ts` and `src/modal.ts`).

Data flow sketch
- User triggers command → `main.ts` opens `ScriptureModal` → modal asks `BibleDataLoader` for verses → `CalloutFormatter` inserts formatted callout into the editor. Settings changes call `this.saveData()` and components pick up new settings via `updateComponentSettings()`.

## Build / dev workflow (exact)

- Install deps: `npm install`
- Dev (watch + bundle):
```fish
npm run dev
```
- Production build (typecheck + bundle):
```fish
npm run build
```

Notes: `esbuild.config.mjs` uses top-level await and outputs a CommonJS `main.js`. `npm run dev` runs `node esbuild.config.mjs` in watch mode — Obsidian requires the built `main.js` to be present in the plugin folder to load the plugin.

## Project-specific conventions

- Settings persistence: use `this.loadData()` / `this.saveData()` from the Obsidian Plugin API. See `main.ts:loadSettings/saveSettings`.
- Translations: stored in `settings.translations` with schema in `src/types.ts` (`name`, `fullName`, `filePath`, `availableAsNotes`, `notesDirectory`). Use `BibleDataLoader.validateTranslation()` before adding a translation in the UI.
- UI patterns: `ScriptureSettingTab` renders the translation list and uses `this.plugin.saveSettings()` followed by `this.display()` to refresh.
- Timing: rely on small `setTimeout` delays (100–1000ms) before operating on active leaves/views after file-open/layout-change events — this is intentional to allow Obsidian views to finish loading.

## Functional programming & Ramda guidance (practical)

This repo prefers pure helpers for business logic and uses Ramda-style pipelines where it clarifies transformation intent. Class methods are reserved for Obsidian lifecycle/view APIs.

Important style rule: ALWAYS import named functions instead of using `import * as R` (this applies to Ramda and other libraries). Named imports keep code readable, reduce visual clutter (`R.*` everywhere), and improve tree-shaking.

Prefer:

- Named Ramda imports: `import { pipe, groupBy, map, filter, sortBy, prop, path } from 'ramda'`.
- Use `pipe`, `groupBy`, `map`, `filter`, `sortBy`, `prop`, `path` for transformations.
- Small pure helpers that accept plain JS objects and return new objects (no mutation).
- Isolate side effects (read/write filesystem, Obsidian API, DOM) at the boundary; keep internal logic pure.

Concrete examples adapted for this repo (named imports)

1) Group translations by translation id:

```typescript
import { groupBy, prop } from 'ramda';

const groupByTranslation = groupBy(prop('translation'));
// usage: const grouped = groupByTranslation(settings.translations);
```

2) Sort chapters by chapter number:

```typescript
import { sortBy, prop } from 'ramda';

const sortChapters = sortBy(prop('chapter'));
```

3) Selection-based reference detection (mirror `main.ts:extractReferenceFromSelection`):

```typescript
// side-effect: read selection from editor
if (!selectedText || selectedText.length > 100 || selectedText.includes('\n')) return { reference: '', translation: null };
const { detectReferences } = require('scripture-references');
const matches = Array.from(detectReferences(selectedText));
// pass matches to pure parsers (no further side effects)
```

4) Pure settings updater (example helper):

```typescript
const setDefaultTranslation = (settings, defaultName) => ({ ...settings, defaultTranslation: defaultName });
// then in plugin: this.settings = setDefaultTranslation(this.settings, 'ESV'); await this.saveData(this.settings);
```

## Examples of common edits agents will perform

- Add a new command: modify `main.ts` inside `onload()` using `this.addCommand({...})`. Use `checkCallback` for conditionally available commands (see how `open-chapter-in-translation` is implemented).
- Add a new setting: extend `ScriptureSettings` in `src/types.ts`, add default in `DEFAULT_SETTINGS`, then render control(s) in `src/settings.ts` and call `await this.plugin.saveSettings()`.
 - Update reference detection: prefer using the `scripture-references` package; if you need to change detection behaviour, modify the upstream package or update the dependency, or add local type shims in `src/scripture-references.d.ts`.

## Testing & small quality gates

- Keep pure functions in `src/` so you can unit-test them without Obsidian.
- Wrap Obsidian API calls behind tiny adapters (e.g., `metadataCacheAdapter.getBacklinks(file)`) so tests can mock them.
- Quick smoke: run `npm run build` to run the TypeScript check and build artifacts. If `main.js` is produced, Obsidian can load the plugin.

## Edge-cases & gotchas (must-read)

 - The project uses the external `scripture-references` package. If you previously relied on a local copy, archive or remove it and update imports to use the package instead.
- `esbuild.config.mjs` uses top-level await; your Node must support it.
- Reference detection intentionally ignores selections longer than 100 characters or containing newlines — keep that behavior unless you update both `main.ts` and tests.
- Many UI flows rely on `setTimeout` delays after `file-open` or `layout-change`. Removing those without proper replacement can cause race conditions in views.

## Quick links (files to open first)

- `main.ts` — lifecycle, commands, API exposure
- `src/settings.ts` — how translations are added/validated and UI refresh patterns
- `src/bible-data-loader.ts` — translation validation and caching
- `src/callout-formatter.ts` — how callouts are built and inserted
- `scripture-references` — detection/parsing utilities

## Final notes

Keep edits small and testable. Prefer adding pure helpers and unit tests over changing large imperative blocks. If you'd like, I can refactor one function (e.g., translation list transformation or selection parsing) into a Ramda pipeline and add a unit test example — tell me which function and I'll implement it.
