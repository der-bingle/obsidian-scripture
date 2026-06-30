# Graph Report - /Users/luke/Code/obsidian/scripture  (2026-06-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 350 nodes · 699 edges · 21 communities (9 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fa74259`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Scripture Reference Parsing|Scripture Reference Parsing]]
- [[_COMMUNITY_Bible Data Loading|Bible Data Loading]]
- [[_COMMUNITY_Bible Translation Navigation|Bible Translation Navigation]]
- [[_COMMUNITY_Project Dependencies Metadata|Project Dependencies Metadata]]
- [[_COMMUNITY_Scripture Insertion Management|Scripture Insertion Management]]
- [[_COMMUNITY_Reference Formatting Utilities|Reference Formatting Utilities]]
- [[_COMMUNITY_Verse Callout Formatting|Verse Callout Formatting]]
- [[_COMMUNITY_Scripture Modal UI|Scripture Modal UI]]
- [[_COMMUNITY_TypeScript Compiler Settings|TypeScript Compiler Settings]]
- [[_COMMUNITY_Bible Note Title Management|Bible Note Title Management]]
- [[_COMMUNITY_Source Code Files|Source Code Files]]
- [[_COMMUNITY_Scripture Settings UI|Scripture Settings UI]]
- [[_COMMUNITY_Project Manifest Metadata|Project Manifest Metadata]]
- [[_COMMUNITY_Scripture Note Switching UI|Scripture Note Switching UI]]
- [[_COMMUNITY_Scripture Reference Types|Scripture Reference Types]]
- [[_COMMUNITY_Version Management|Version Management]]
- [[_COMMUNITY_Claude Code Instructions|Claude Code Instructions]]
- [[_COMMUNITY_Contributing Guidelines|Contributing Guidelines]]
- [[_COMMUNITY_Scripture Obsidian Integration|Scripture Obsidian Integration]]
- [[_COMMUNITY_Technical Debt|Technical Debt]]

## God Nodes (most connected - your core abstractions)
1. `ScriptureListRenderer` - 56 edges
2. `Scripture` - 39 edges
3. `BibleTranslation` - 33 edges
4. `CalloutFormatter` - 28 edges
5. `ScriptureSettings` - 27 edges
6. `BibleVerse` - 26 edges
7. `ScriptureModal` - 24 edges
8. `BibleNoteTitleManager` - 19 edges
9. `BibleDataLoader` - 18 edges
10. `ProcessedReference` - 18 edges

## Surprising Connections (you probably didn't know these)
- `TranslationOption` --references--> `BibleTranslation`  [EXTRACTED]
  src/bible-chapter-navigator.ts → src/types.ts
- `BibleChapterNavigator` --references--> `ScriptureSettings`  [EXTRACTED]
  src/bible-chapter-navigator.ts → src/types.ts
- `Scripture` --references--> `BibleChapterNavigator`  [EXTRACTED]
  src/main.ts → src/bible-chapter-navigator.ts
- `Scripture` --references--> `BibleDataLoader`  [EXTRACTED]
  src/main.ts → src/bible-data-loader.ts
- `ScriptureModal` --references--> `BibleDataLoader`  [EXTRACTED]
  src/modal.ts → src/bible-data-loader.ts

## Import Cycles
- None detected.

## Communities (21 total, 12 thin omitted)

### Community 0 - "Scripture Reference Parsing"
Cohesion: 0.08
Nodes (5): escapeRegExp(), parseReferenceAndTranslationFromTranslations(), ScriptureListRenderer, SourceLineReference, ProcessedReference

### Community 1 - "Bible Data Loading"
Cohesion: 0.09
Nodes (19): BibleDataLoader, BibleVerseDisplayManager, AppWithPlugins, ScriptureNoteSuggestion, isRecord(), LegacyScriptureSettings, migrateStoredSettings(), SettingsMigrationResult (+11 more)

### Community 2 - "Bible Translation Navigation"
Cohesion: 0.09
Nodes (18): BibleChapterNavigator, TranslationOption, TranslationSelectorModal, BibleLeafInfo, ManagedLeafTitle, BibleNoteInfo, getBibleNoteChapterKey(), getBibleNoteInfo() (+10 more)

### Community 3 - "Project Dependencies Metadata"
Cohesion: 0.06
Nodes (30): author, dependencies, scripture-references, description, devDependencies, esbuild, eslint, @eslint/js (+22 more)

### Community 5 - "Reference Formatting Utilities"
Cohesion: 0.12
Nodes (18): buildEnglishAbbrevMap(), formatChapterDisplay(), formatReferenceDisplay(), getBookDisplayName(), getEnglishAbbreviation(), ReferenceDisplayOptions, shouldIncludeTranslation(), STANDARD_BOOK_ABBREVIATIONS (+10 more)

### Community 8 - "TypeScript Compiler Settings"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, inlineSourceMap, inlineSources, isolatedModules, lib, module (+8 more)

### Community 10 - "Source Code Files"
Cohesion: 0.18
Nodes (11): src/bible-data-loader.ts, src/bible-note-utils.ts, src/callout-formatter.ts, src/main.ts, src/modal.ts, src/reference-format.ts, src/scripture-list-parser.ts, src/scripture-list-renderer.ts (+3 more)

### Community 12 - "Project Manifest Metadata"
Cohesion: 0.20
Nodes (9): author, authorUrl, description, fundingUrl, id, isDesktopOnly, minAppVersion, name (+1 more)

## Knowledge Gaps
- **86 isolated node(s):** `id`, `name`, `version`, `minAppVersion`, `description` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScriptureListRenderer` connect `Scripture Reference Parsing` to `Bible Data Loading`, `Bible Translation Navigation`, `Reference Formatting Utilities`, `Verse Callout Formatting`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `Scripture` connect `Scripture Insertion Management` to `Bible Data Loading`, `Bible Translation Navigation`, `Verse Callout Formatting`, `Bible Note Title Management`, `Scripture Settings UI`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `ScriptureSettings` connect `Bible Data Loading` to `Scripture Reference Parsing`, `Bible Translation Navigation`, `Scripture Insertion Management`, `Reference Formatting Utilities`, `Verse Callout Formatting`, `Bible Note Title Management`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `id`, `name`, `version` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scripture Reference Parsing` be split into smaller, more focused modules?**
  _Cohesion score 0.07982583454281568 - nodes in this community are weakly interconnected._
- **Should `Bible Data Loading` be split into smaller, more focused modules?**
  _Cohesion score 0.09158186864014801 - nodes in this community are weakly interconnected._
- **Should `Bible Translation Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.08536585365853659 - nodes in this community are weakly interconnected._