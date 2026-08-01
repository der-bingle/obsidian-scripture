# Graph Report - .  (2026-08-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 535 nodes · 1077 edges · 33 communities (21 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc595e2f`
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
- [[_COMMUNITY_Scripture List Rendering|Scripture List Rendering]]
- [[_COMMUNITY_Settings Migrations|Settings Migrations]]

## God Nodes (most connected - your core abstractions)
1. `ScriptureListRenderer` - 56 edges
2. `Scripture` - 52 edges
3. `ScriptureSidebarView` - 45 edges
4. `BibleTranslation` - 40 edges
5. `ScriptureSettings` - 32 edges
6. `BibleVerse` - 29 edges
7. `CalloutFormatter` - 27 edges
8. `ScriptureModal` - 22 edges
9. `BibleNoteTitleManager` - 18 edges
10. `ProcessedReference` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Version consistency guardrails` --references--> `release-manual workflow`  [EXTRACTED]
  technical-debt-remediation-plan.html → .github/workflows/manual-release.yaml
- `Required release assets` --shares_data_with--> `Release artifact verification`  [INFERRED]
  README.md → .github/workflows/manual-release.yaml
- `Scripture list modularization` --conceptually_related_to--> `scriptureList blocks`  [INFERRED]
  technical-debt-remediation-plan.html → README.md
- `Canonical release design` --shares_data_with--> `Required release assets`  [INFERRED]
  technical-debt-remediation-plan.html → README.md
- `ScriptureLinkResolution` --references--> `BibleTranslation`  [EXTRACTED]
  src/scripture-link.ts → src/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Manual release pipeline** — workflows_manual_release_version_determination, workflows_manual_release_version_metadata_sync, workflows_manual_release_release_tag_creation, workflows_manual_release_production_build, workflows_manual_release_release_artifact_verification, workflows_manual_release_github_release_publication [EXTRACTED 1.00]
- **Scripture user-facing surfaces** — readme_scripture_sidebar, readme_scripture_links, readme_scripture_lists, readme_obsidian_uri [EXTRACTED 1.00]
- **Staged debt remediation phases** — technical_debt_remediation_plan_version_consistency_guardrails, technical_debt_remediation_plan_scripture_list_modularization, technical_debt_remediation_plan_plugin_shell, technical_debt_remediation_plan_settings_modularization, technical_debt_remediation_plan_compatibility_shim_isolation, technical_debt_remediation_plan_css_fixture_matrix, technical_debt_remediation_plan_cross_platform_validation [EXTRACTED 1.00]

## Communities (33 total, 12 thin omitted)

### Community 0 - "Scripture Reference Parsing"
Cohesion: 0.08
Nodes (3): escapeRegExp(), ScriptureListRenderer, ProcessedReference

### Community 1 - "Bible Data Loading"
Cohesion: 0.13
Nodes (25): AppWithPlugins, cloneScriptureSidebarState(), createInstanceId(), createScriptureSidebarState(), getScriptureSidebarNavigationTarget(), getSidebarDefaultTranslation(), isRecord(), parseScriptureSidebarState() (+17 more)

### Community 2 - "Bible Translation Navigation"
Cohesion: 0.08
Nodes (21): BibleChapterNavigator, TranslationOption, TranslationSelectorModal, BibleLeafInfo, ManagedLeafTitle, BibleNoteChapterReference, BibleNoteInfo, getBibleNoteChapterKey() (+13 more)

### Community 3 - "Project Dependencies Metadata"
Cohesion: 0.07
Nodes (29): author, dependencies, scripture-references, description, devDependencies, esbuild, eslint, @eslint/js (+21 more)

### Community 4 - "Scripture Insertion Management"
Cohesion: 0.08
Nodes (4): Scripture, ScriptureAPI, ScriptureCalloutOptions, ScriptureCalloutResult

### Community 5 - "Reference Formatting Utilities"
Cohesion: 0.10
Nodes (24): getDefaultNoteTranslation(), getEffectiveLinkingStrategy(), getNoteTranslations(), getRequestedNoteTranslation(), getScriptureNoteTitle(), joinVaultPath(), LinkpathResolver, resolveExistingScriptureTarget() (+16 more)

### Community 6 - "Verse Callout Formatting"
Cohesion: 0.18
Nodes (5): CalloutFormatter, InsertionTarget, BibleVerse, ReferenceFormat, verses

### Community 7 - "Scripture Modal UI"
Cohesion: 0.18
Nodes (3): ScriptureModal, InsertScriptureFormat, OnSubmitCallback

### Community 8 - "TypeScript Compiler Settings"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, inlineSourceMap, inlineSources, isolatedModules, lib, module (+8 more)

### Community 12 - "Project Manifest Metadata"
Cohesion: 0.20
Nodes (9): author, authorUrl, description, fundingUrl, id, isDesktopOnly, minAppVersion, name (+1 more)

### Community 15 - "Version Management"
Cohesion: 0.10
Nodes (4): ScriptureSidebarView, BibleBook, BibleChapter, BibleVerseData

### Community 16 - "Claude Code Instructions"
Cohesion: 0.15
Nodes (4): FileSuggest, FolderSuggest, VaultPathSuggest, TranslationModal

### Community 17 - "Contributing Guidelines"
Cohesion: 0.20
Nodes (5): NavigateToReference, ScriptureReferenceInputSuggest, getScriptureReferenceSuggestions(), ScriptureReferenceSuggestion, referencesFor()

### Community 19 - "Scripture Obsidian Integration"
Cohesion: 0.08
Nodes (33): Local-first privacy, Obsidian scripture URI, ScriptureAPI compatibility facade, Required release assets, Scripture links and consolidated notes, scriptureList blocks, Scripture for Obsidian, Scripture sidebar (+25 more)

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
Cohesion: 0.18
Nodes (11): BibleDataLoader, BibleDataValidationResult, invalid(), isBibleData(), isNonEmptyString(), isNonNegativeInteger(), isPositiveInteger(), isRecord() (+3 more)

### Community 27 - "Reference Display Formatting"
Cohesion: 0.30
Nodes (9): buildEnglishAbbrevMap(), formatChapterDisplay(), formatReferenceDisplay(), getBookDisplayName(), getEnglishAbbreviation(), ReferenceDisplayOptions, shouldIncludeTranslation(), STANDARD_BOOK_ABBREVIATIONS (+1 more)

## Knowledge Gaps
- **105 isolated node(s):** `validBible`, `settings`, `BibleDataValidationResult`, `ManagedLeafTitle`, `BibleLeafInfo` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScriptureListRenderer` connect `Scripture Reference Parsing` to `Bible Data Loading`, `Bible Translation Navigation`, `Reference Formatting Utilities`, `Verse Callout Formatting`, `Bible Data Validation`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `ScriptureSettings` connect `Bible Translation Navigation` to `Scripture Reference Parsing`, `Bible Data Loading`, `Scripture Insertion Management`, `Reference Formatting Utilities`, `Verse Callout Formatting`, `Bible Note Title Management`, `Claude Code Instructions`, `Bible Data Validation`, `Reference Display Formatting`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `BibleTranslation` connect `Bible Translation Navigation` to `Scripture Reference Parsing`, `Bible Data Loading`, `Scripture Insertion Management`, `Reference Formatting Utilities`, `Scripture Modal UI`, `Scripture Note Switching UI`, `Version Management`, `Claude Code Instructions`, `Bible Data Validation`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `validBible`, `settings`, `BibleDataValidationResult` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scripture Reference Parsing` be split into smaller, more focused modules?**
  _Cohesion score 0.08470588235294117 - nodes in this community are weakly interconnected._
- **Should `Bible Data Loading` be split into smaller, more focused modules?**
  _Cohesion score 0.12941176470588237 - nodes in this community are weakly interconnected._
- **Should `Bible Translation Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.07510204081632653 - nodes in this community are weakly interconnected._