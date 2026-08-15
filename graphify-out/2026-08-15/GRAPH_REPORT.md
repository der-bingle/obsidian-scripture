# Graph Report - .  (2026-08-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 586 nodes · 1152 edges · 30 communities (20 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `49d5a684`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Scripture Reference Parsing|Scripture Reference Parsing]]
- [[_COMMUNITY_Bible Data Loading|Bible Data Loading]]
- [[_COMMUNITY_Bible Translation Navigation|Bible Translation Navigation]]
- [[_COMMUNITY_Project Dependencies Metadata|Project Dependencies Metadata]]
- [[_COMMUNITY_Scripture Insertion Management|Scripture Insertion Management]]
- [[_COMMUNITY_Verse Callout Formatting|Verse Callout Formatting]]
- [[_COMMUNITY_Scripture Modal UI|Scripture Modal UI]]
- [[_COMMUNITY_TypeScript Compiler Settings|TypeScript Compiler Settings]]
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
- [[_COMMUNITY_Technical Debt Planning|Technical Debt Planning]]
- [[_COMMUNITY_Sidebar Implementation Plan|Sidebar Implementation Plan]]
- [[_COMMUNITY_Contribution Workflow|Contribution Workflow]]
- [[_COMMUNITY_Claude Project Instructions|Claude Project Instructions]]
- [[_COMMUNITY_Copilot Project Instructions|Copilot Project Instructions]]
- [[_COMMUNITY_Bible Data Validation|Bible Data Validation]]
- [[_COMMUNITY_Reference Display Formatting|Reference Display Formatting]]
- [[_COMMUNITY_Bible Note Utilities|Bible Note Utilities]]
- [[_COMMUNITY_Reference Format Module|Reference Format Module]]
- [[_COMMUNITY_Scripture List Parsing|Scripture List Parsing]]
- [[_COMMUNITY_Scripture Sidebar State|Scripture Sidebar State]]

## God Nodes (most connected - your core abstractions)
1. `Scripture` - 59 edges
2. `ScriptureListRenderer` - 54 edges
3. `ScriptureSidebarView` - 45 edges
4. `BibleTranslation` - 43 edges
5. `ScriptureSettings` - 32 edges
6. `BibleVerse` - 29 edges
7. `CalloutFormatter` - 24 edges
8. `ScriptureModal` - 22 edges
9. `BibleNoteTitleManager` - 18 edges
10. `ProcessedReference` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Version consistency guardrails` --references--> `release-manual workflow`  [EXTRACTED]
  technical-debt-remediation-plan.html → .github/workflows/manual-release.yaml
- `Scripture list modularization` --conceptually_related_to--> `scriptureList blocks`  [INFERRED]
  technical-debt-remediation-plan.html → README.md
- `API alias compatibility through 1.0` --rationale_for--> `Scripture public API`  [EXTRACTED]
  technical-debt-remediation-plan.html → README.md
- `Canonical release design` --shares_data_with--> `Plugin release assets`  [INFERRED]
  technical-debt-remediation-plan.html → README.md
- `BibleNoteInfo` --references--> `BibleTranslation`  [EXTRACTED]
  src/bible-note-utils.ts → src/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared reference navigation flow** — readme_reference_parser, readme_scripture_sidebar, readme_scripture_lists, readme_parse_scripture_reference, readme_obsidian_uri [INFERRED 0.85]
- **Local privacy boundary** — readme_local_first_operation, readme_bible_translation_json, readme_bible_chapter_notes, readme_clipboard_access, readme_privacy_permissions [EXTRACTED 1.00]

## Communities (30 total, 10 thin omitted)

### Community 0 - "Scripture Reference Parsing"
Cohesion: 0.06
Nodes (15): ParsedScriptureListEntry, parseScriptureListInput(), CodeBlockCursorTarget, createScriptureListRenderContext(), escapeRegExp(), MarkdownViewWithSetMode, parseReferenceAndTranslationFromTranslations(), ScriptureListAction (+7 more)

### Community 1 - "Bible Data Loading"
Cohesion: 0.07
Nodes (42): Bible chapter notes, Bible translation JSON, Chapter frontmatter ID, User-invoked clipboard access, Configured notes path, Consolidated Bible notes, Development workflow, formatVerseReference (+34 more)

### Community 2 - "Bible Translation Navigation"
Cohesion: 0.07
Nodes (18): BibleLeafInfo, BibleNoteTitleManager, ManagedLeafTitle, BibleNoteChapterReference, BibleNoteInfo, getBibleNoteChapterKey(), getBibleNoteChapterReference(), getBibleNoteInfo() (+10 more)

### Community 3 - "Project Dependencies Metadata"
Cohesion: 0.07
Nodes (29): author, dependencies, scripture-references, description, devDependencies, esbuild, eslint, @eslint/js (+21 more)

### Community 4 - "Scripture Insertion Management"
Cohesion: 0.07
Nodes (4): Scripture, ScriptureAPI, ScriptureCalloutOptions, ScriptureCalloutResult

### Community 6 - "Verse Callout Formatting"
Cohesion: 0.08
Nodes (27): CalloutFormatter, InsertionTarget, buildEnglishAbbrevMap(), formatChapterDisplay(), formatReferenceDisplay(), getBookDisplayName(), getEnglishAbbreviation(), ReferenceDisplayOptions (+19 more)

### Community 8 - "TypeScript Compiler Settings"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, inlineSourceMap, inlineSources, isolatedModules, lib, module (+8 more)

### Community 12 - "Project Manifest Metadata"
Cohesion: 0.20
Nodes (9): author, authorUrl, description, fundingUrl, id, isDesktopOnly, minAppVersion, name (+1 more)

### Community 15 - "Version Management"
Cohesion: 0.09
Nodes (4): ScriptureSidebarView, BibleBook, BibleChapter, BibleVerseData

### Community 16 - "Claude Code Instructions"
Cohesion: 0.24
Nodes (3): FileSuggest, FolderSuggest, VaultPathSuggest

### Community 17 - "Contributing Guidelines"
Cohesion: 0.20
Nodes (5): NavigateToReference, ScriptureReferenceInputSuggest, getScriptureReferenceSuggestions(), ScriptureReferenceSuggestion, referencesFor()

### Community 19 - "Scripture Obsidian Integration"
Cohesion: 0.11
Nodes (21): GitHub Releases, Plugin release assets, Canonical release design, Compatibility shim isolation, Desktop and mobile validation, CSS fixture validation matrix, Technical debt definition of done, Minimum Obsidian version 1.9.0 (+13 more)

### Community 20 - "Technical Debt"
Cohesion: 0.25
Nodes (7): Architecture, Coding conventions, Commands, Compatibility contracts, Project, Release and repository hygiene, Testing

### Community 21 - "Technical Debt Planning"
Cohesion: 0.33
Nodes (5): Compatibility-sensitive work, CSS and release operations, Deferred architecture, Technical debt, Upstream baseline

### Community 22 - "Sidebar Implementation Plan"
Cohesion: 0.40
Nodes (4): Compatibility and verification, Decided behavior, Implementation checklist, Scripture Sidebar Implementation Plan

### Community 23 - "Contribution Workflow"
Cohesion: 0.50
Nodes (3): Contributing, Development, Reports and proposals

### Community 26 - "Bible Data Validation"
Cohesion: 0.13
Nodes (18): BibleDataLoader, BibleDataValidationResult, invalid(), isBibleData(), isNonEmptyString(), isNonNegativeInteger(), isPositiveInteger(), isRecord() (+10 more)

### Community 27 - "Reference Display Formatting"
Cohesion: 0.09
Nodes (11): BibleChapterNavigator, TranslationOption, TranslationSelectorModal, ScriptureNoteSuggestion, TranslationModal, orderTranslations(), BibleTranslation, InsertScriptureFormat (+3 more)

### Community 33 - "Scripture Sidebar State"
Cohesion: 0.13
Nodes (22): AppWithPlugins, cloneScriptureSidebarState(), createInstanceId(), createScriptureSidebarState(), getScriptureSidebarNavigationTarget(), getSidebarDefaultTranslation(), isRecord(), parseScriptureSidebarState() (+14 more)

## Knowledge Gaps
- **113 isolated node(s):** `validBible`, `verses`, `settings`, `settings`, `translation` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScriptureListRenderer` connect `Scripture Reference Parsing` to `Scripture Sidebar State`, `Bible Translation Navigation`, `Reference Display Formatting`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `Scripture` connect `Scripture Insertion Management` to `Scripture Sidebar State`, `Bible Translation Navigation`, `Verse Callout Formatting`, `Scripture Settings UI`, `Reference Display Formatting`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `ScriptureSettings` connect `Bible Translation Navigation` to `Scripture Reference Parsing`, `Scripture Sidebar State`, `Scripture Insertion Management`, `Verse Callout Formatting`, `Reference Display Formatting`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `validBible`, `verses`, `settings` to the rest of the system?**
  _117 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scripture Reference Parsing` be split into smaller, more focused modules?**
  _Cohesion score 0.05879692446856626 - nodes in this community are weakly interconnected._
- **Should `Bible Data Loading` be split into smaller, more focused modules?**
  _Cohesion score 0.06968641114982578 - nodes in this community are weakly interconnected._
- **Should `Bible Translation Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.06972789115646258 - nodes in this community are weakly interconnected._