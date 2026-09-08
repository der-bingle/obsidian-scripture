# Graph Report - scripture  (2026-09-08)

## Corpus Check
- 55 files · ~31,241 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 614 nodes · 1209 edges · 26 communities (21 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b18dc31`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Scripture list rendering|Scripture list rendering]]
- [[_COMMUNITY_Chapter navigator|Chapter navigator]]
- [[_COMMUNITY_Plugin core Scripture|Plugin core Scripture]]
- [[_COMMUNITY_Bible note titles|Bible note titles]]
- [[_COMMUNITY_Callout formatting|Callout formatting]]
- [[_COMMUNITY_Sidebar view UI|Sidebar view UI]]
- [[_COMMUNITY_Docs and concepts|Docs and concepts]]
- [[_COMMUNITY_Main and sidebar state|Main and sidebar state]]
- [[_COMMUNITY_Package dependencies|Package dependencies]]
- [[_COMMUNITY_Bible data loading|Bible data loading]]
- [[_COMMUNITY_Scripture linking|Scripture linking]]
- [[_COMMUNITY_AGENTS architecture guide|AGENTS architecture guide]]
- [[_COMMUNITY_Release and tech debt|Release and tech debt]]
- [[_COMMUNITY_Reference input suggest|Reference input suggest]]
- [[_COMMUNITY_TypeScript config|TypeScript config]]
- [[_COMMUNITY_Passage insertion modal|Passage insertion modal]]
- [[_COMMUNITY_Settings tab UI|Settings tab UI]]
- [[_COMMUNITY_Plugin manifest|Plugin manifest]]
- [[_COMMUNITY_Note switcher modal|Note switcher modal]]
- [[_COMMUNITY_Technical debt doc|Technical debt doc]]
- [[_COMMUNITY_Sidebar plan doc|Sidebar plan doc]]
- [[_COMMUNITY_Contributing guide|Contributing guide]]
- [[_COMMUNITY_Passage reference types|Passage reference types]]
- [[_COMMUNITY_Claude instructions|Claude instructions]]
- [[_COMMUNITY_Copilot instructions|Copilot instructions]]

## God Nodes (most connected - your core abstractions)
1. `Scripture` - 59 edges
2. `ScriptureListRenderer` - 56 edges
3. `ScriptureSidebarView` - 45 edges
4. `BibleTranslation` - 43 edges
5. `ScriptureSettings` - 32 edges
6. `BibleVerse` - 29 edges
7. `CalloutFormatter` - 24 edges
8. `ScriptureModal` - 22 edges
9. `BibleNoteTitleManager` - 18 edges
10. `ProcessedReference` - 18 edges

## Surprising Connections (you probably didn't know these)
- `src/settings-migrations.ts` --semantically_similar_to--> `src/scripture-list-parser.ts`  [INFERRED] [semantically similar]
  AGENTS.md → src/scripture-list-parser.ts
- `Architecture` --references--> `src/reference-format.ts`  [EXTRACTED]
  AGENTS.md → src/reference-format.ts
- `src/callout-formatter.ts` --conceptually_related_to--> `src/reference-format.ts`  [INFERRED]
  AGENTS.md → src/reference-format.ts
- `Architecture` --references--> `src/bible-data-loader.ts`  [EXTRACTED]
  AGENTS.md → src/bible-data-loader.ts
- `Architecture` --references--> `src/bible-note-utils.ts`  [EXTRACTED]
  AGENTS.md → src/bible-note-utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture module map** — agents_architecture, agents_main_ts, agents_modal_ts, agents_scripture_list_renderer_ts, agents_callout_formatter_ts, agents_reference_format_ts, agents_bible_data_loader_ts, agents_bible_note_utils_ts, agents_settings_ts, agents_types_ts, agents_settings_migrations_ts, agents_scripture_list_parser_ts [EXTRACTED 1.00]
- **Public compatibility surface** — agents_compatibility_contracts, agents_scripture_api, agents_scripturelist_syntax, agents_public_api_alias, agents_chapter_note_frontmatter_ids [EXTRACTED 1.00]
- **Release and Graphify sequence** — agents_release_and_repository_hygiene, agents_graphify_release_workflow, agents_brat_main_vault_deploy, agents_technical_debt_md [INFERRED 0.85]

## Communities (26 total, 5 thin omitted)

### Community 0 - "Scripture list rendering"
Cohesion: 0.05
Nodes (24): ParsedScriptureListEntry, parseScriptureListInput(), CodeBlockCursorTarget, createScriptureListRenderContext(), escapeRegExp(), MarkdownViewWithSetMode, parseReferenceAndTranslationFromTranslations(), ScriptureListAction (+16 more)

### Community 1 - "Chapter navigator"
Cohesion: 0.07
Nodes (12): BibleChapterNavigator, TranslationOption, TranslationSelectorModal, ScriptureNoteSuggestion, ScriptureNoteSwitcherModal, TranslationModal, orderTranslations(), BibleTranslation (+4 more)

### Community 2 - "Plugin core Scripture"
Cohesion: 0.07
Nodes (4): Scripture, ScriptureAPI, ScriptureCalloutOptions, ScriptureCalloutResult

### Community 3 - "Bible note titles"
Cohesion: 0.07
Nodes (18): BibleLeafInfo, BibleNoteTitleManager, ManagedLeafTitle, BibleNoteChapterReference, BibleNoteInfo, getBibleNoteChapterKey(), getBibleNoteChapterReference(), getBibleNoteInfo() (+10 more)

### Community 4 - "Callout formatting"
Cohesion: 0.13
Nodes (13): CalloutFormatter, buildEnglishAbbrevMap(), formatChapterDisplay(), formatReferenceDisplay(), getBookDisplayName(), getEnglishAbbreviation(), ReferenceDisplayOptions, shouldIncludeTranslation() (+5 more)

### Community 5 - "Sidebar view UI"
Cohesion: 0.09
Nodes (4): ScriptureSidebarView, BibleBook, BibleChapter, BibleVerseData

### Community 6 - "Docs and concepts"
Cohesion: 0.07
Nodes (42): Bible chapter notes, Bible translation JSON, Chapter frontmatter ID, User-invoked clipboard access, Configured notes path, Consolidated Bible notes, Development workflow, formatVerseReference (+34 more)

### Community 7 - "Main and sidebar state"
Cohesion: 0.12
Nodes (23): InsertionTarget, AppWithPlugins, cloneScriptureSidebarState(), createInstanceId(), createScriptureSidebarState(), getScriptureSidebarNavigationTarget(), getSidebarDefaultTranslation(), isRecord() (+15 more)

### Community 8 - "Package dependencies"
Cohesion: 0.07
Nodes (29): author, dependencies, scripture-references, description, devDependencies, esbuild, eslint, @eslint/js (+21 more)

### Community 9 - "Bible data loading"
Cohesion: 0.13
Nodes (18): BibleDataLoader, BibleDataValidationResult, invalid(), isBibleData(), isNonEmptyString(), isNonNegativeInteger(), isPositiveInteger(), isRecord() (+10 more)

### Community 10 - "Scripture linking"
Cohesion: 0.22
Nodes (13): getDefaultNoteTranslation(), getEffectiveLinkingStrategy(), getNoteTranslations(), getRequestedNoteTranslation(), getScriptureNoteTitle(), joinVaultPath(), LinkpathResolver, resolveExistingScriptureTarget() (+5 more)

### Community 11 - "AGENTS architecture guide"
Cohesion: 0.10
Nodes (25): Architecture, src/bible-data-loader.ts, src/bible-note-utils.ts, BRAT main-vault deploy, src/callout-formatter.ts, Chapter-note frontmatter IDs, Coding conventions, Commands (+17 more)

### Community 12 - "Release and tech debt"
Cohesion: 0.11
Nodes (21): GitHub Releases, Plugin release assets, Canonical release design, Compatibility shim isolation, Desktop and mobile validation, CSS fixture validation matrix, Technical debt definition of done, Minimum Obsidian version 1.9.0 (+13 more)

### Community 13 - "Reference input suggest"
Cohesion: 0.20
Nodes (5): NavigateToReference, ScriptureReferenceInputSuggest, getScriptureReferenceSuggestions(), ScriptureReferenceSuggestion, referencesFor()

### Community 14 - "TypeScript config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, inlineSourceMap, inlineSources, isolatedModules, lib, module (+8 more)

### Community 17 - "Plugin manifest"
Cohesion: 0.20
Nodes (9): author, authorUrl, description, fundingUrl, id, isDesktopOnly, minAppVersion, name (+1 more)

### Community 18 - "Note switcher modal"
Cohesion: 0.24
Nodes (3): FileSuggest, FolderSuggest, VaultPathSuggest

### Community 19 - "Technical debt doc"
Cohesion: 0.33
Nodes (5): Compatibility-sensitive work, CSS and release operations, Deferred architecture, Technical debt, Upstream baseline

### Community 20 - "Sidebar plan doc"
Cohesion: 0.40
Nodes (4): Compatibility and verification, Decided behavior, Implementation checklist, Scripture Sidebar Implementation Plan

### Community 21 - "Contributing guide"
Cohesion: 0.50
Nodes (3): Contributing, Development, Reports and proposals

## Knowledge Gaps
- **116 isolated node(s):** `AppWithPlugins`, `ScriptureListButtonPosition`, `ScriptureListAction`, `ScriptureListRenderContext`, `ScriptureListRendererCallbacks` (+111 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScriptureListRenderer` connect `Scripture list rendering` to `Chapter navigator`, `Bible note titles`, `Main and sidebar state`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `Scripture` connect `Plugin core Scripture` to `Chapter navigator`, `Bible note titles`, `Callout formatting`, `Main and sidebar state`, `Settings tab UI`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `ScriptureSettings` connect `Bible note titles` to `Scripture list rendering`, `Chapter navigator`, `Plugin core Scripture`, `Callout formatting`, `Main and sidebar state`, `Scripture linking`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `AppWithPlugins`, `ScriptureListButtonPosition`, `ScriptureListAction` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scripture list rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.05030864197530864 - nodes in this community are weakly interconnected._
- **Should `Chapter navigator` be split into smaller, more focused modules?**
  _Cohesion score 0.07397959183673469 - nodes in this community are weakly interconnected._
- **Should `Plugin core Scripture` be split into smaller, more focused modules?**
  _Cohesion score 0.07239819004524888 - nodes in this community are weakly interconnected._