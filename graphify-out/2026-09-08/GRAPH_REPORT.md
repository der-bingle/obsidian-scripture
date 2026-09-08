# Graph Report - .  (2026-09-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 551 nodes · 1199 edges · 32 communities (18 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fadc9573`
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
- [[_COMMUNITY_Build Configuration|Build Configuration]]
- [[_COMMUNITY_Scripture Obsidian Integration|Scripture Obsidian Integration]]
- [[_COMMUNITY_Technical Debt|Technical Debt]]
- [[_COMMUNITY_Technical Debt Planning|Technical Debt Planning]]
- [[_COMMUNITY_Sidebar Implementation Plan|Sidebar Implementation Plan]]
- [[_COMMUNITY_Contribution Workflow|Contribution Workflow]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Copilot Project Instructions|Copilot Project Instructions]]
- [[_COMMUNITY_Bible Data Validation|Bible Data Validation]]
- [[_COMMUNITY_Bible Note Utilities|Bible Note Utilities]]
- [[_COMMUNITY_Reference Format Module|Reference Format Module]]
- [[_COMMUNITY_Scripture List Parsing|Scripture List Parsing]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `Scripture` - 63 edges
2. `ScriptureListRenderer` - 56 edges
3. `ScriptureSidebarView` - 47 edges
4. `BibleTranslation` - 43 edges
5. `ScriptureSettings` - 34 edges
6. `BibleVerse` - 29 edges
7. `CalloutFormatter` - 27 edges
8. `ScriptureModal` - 23 edges
9. `BibleDataLoader` - 22 edges
10. `BibleNoteTitleManager` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Version consistency guardrails` --references--> `release-manual workflow`  [EXTRACTED]
  technical-debt-remediation-plan.html → .github/workflows/manual-release.yaml
- `TranslationOption` --references--> `BibleTranslation`  [EXTRACTED]
  src/bible-chapter-navigator.ts → src/types.ts
- `BibleNoteInfo` --references--> `BibleTranslation`  [EXTRACTED]
  src/bible-note-utils.ts → src/types.ts
- `ScriptureLinkResolution` --references--> `BibleTranslation`  [EXTRACTED]
  src/scripture-link.ts → src/types.ts
- `LegacyScriptureSettings` --references--> `ReferenceFormat`  [EXTRACTED]
  src/settings-migrations.ts → src/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Manual release pipeline** — workflows_manual_release_version_determination, workflows_manual_release_version_metadata_sync, workflows_manual_release_release_tag_creation, workflows_manual_release_production_build, workflows_manual_release_release_artifact_verification, workflows_manual_release_github_release_publication [EXTRACTED 1.00]
- **Staged debt remediation phases** — technical_debt_remediation_plan_version_consistency_guardrails, technical_debt_remediation_plan_scripture_list_modularization, technical_debt_remediation_plan_plugin_shell, technical_debt_remediation_plan_settings_modularization, technical_debt_remediation_plan_compatibility_shim_isolation, technical_debt_remediation_plan_css_fixture_matrix, technical_debt_remediation_plan_cross_platform_validation [EXTRACTED 1.00]

## Communities (32 total, 14 thin omitted)

### Community 0 - "Scripture Reference Parsing"
Cohesion: 0.10
Nodes (33): BibleDataLoader, AppWithPlugins, ScriptureNoteSuggestion, cloneScriptureSidebarState(), createInstanceId(), createScriptureSidebarState(), getScriptureSidebarNavigationTarget(), isRecord() (+25 more)

### Community 1 - "Bible Data Loading"
Cohesion: 0.08
Nodes (5): escapeRegExp(), parseReferenceAndTranslationFromTranslations(), ScriptureListRenderer, SourceLineReference, ProcessedReference

### Community 2 - "Bible Translation Navigation"
Cohesion: 0.07
Nodes (20): BibleChapterNavigator, TranslationOption, TranslationSelectorModal, BibleLeafInfo, ManagedLeafTitle, BibleNoteChapterReference, BibleNoteInfo, getBibleNoteChapterKey() (+12 more)

### Community 3 - "Project Dependencies Metadata"
Cohesion: 0.08
Nodes (4): Scripture, getSidebarDefaultTranslation(), ScriptureCalloutOptions, ScriptureCalloutResult

### Community 4 - "Scripture Insertion Management"
Cohesion: 0.09
Nodes (5): ScriptureSidebarView, calculateScrollPastEndSpacerHeight(), ScrollPastEndMetrics, BibleChapter, BibleVerseData

### Community 5 - "Reference Formatting Utilities"
Cohesion: 0.12
Nodes (15): CalloutFormatter, InsertionTarget, buildEnglishAbbrevMap(), formatChapterDisplay(), formatPassageReferenceDisplay(), formatReferenceDisplay(), getBookDisplayName(), getEnglishAbbreviation() (+7 more)

### Community 6 - "Verse Callout Formatting"
Cohesion: 0.10
Nodes (25): getDefaultNoteTranslation(), getEffectiveLinkingStrategy(), getNoteTranslations(), getRequestedNoteTranslation(), getScriptureNoteTitle(), joinVaultPath(), LinkpathResolver, resolveExistingScriptureTarget() (+17 more)

### Community 7 - "Scripture Modal UI"
Cohesion: 0.07
Nodes (29): author, dependencies, scripture-references, description, devDependencies, esbuild, eslint, @eslint/js (+21 more)

### Community 8 - "TypeScript Compiler Settings"
Cohesion: 0.11
Nodes (22): Canonical release design, Compatibility shim isolation, Desktop and mobile validation, CSS fixture validation matrix, Technical debt definition of done, Minimum Obsidian version 1.9.0, Single-responsibility plugin shell, Reproducible attested release (+14 more)

### Community 9 - "Bible Note Title Management"
Cohesion: 0.22
Nodes (16): addFencedCodeRanges(), addFrontmatterRange(), addReferenceDefinitionRanges(), convertScriptureReferencesToLinks(), findBalancedClosingParenthesis(), findClosingBracket(), findProtectedMarkdownRanges(), getInlineCodeEnd() (+8 more)

### Community 10 - "Source Code Files"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, inlineSourceMap, inlineSources, isolatedModules, lib, module (+8 more)

### Community 11 - "Scripture Settings UI"
Cohesion: 0.20
Nodes (5): NavigateToReference, ScriptureReferenceInputSuggest, getScriptureReferenceSuggestions(), ScriptureReferenceSuggestion, referencesFor()

### Community 15 - "Version Management"
Cohesion: 0.31
Nodes (9): BibleDataValidationResult, invalid(), isBibleData(), isNonEmptyString(), isNonNegativeInteger(), isPositiveInteger(), isRecord(), validateBibleData() (+1 more)

### Community 16 - "Claude Code Instructions"
Cohesion: 0.20
Nodes (9): author, authorUrl, description, fundingUrl, id, isDesktopOnly, minAppVersion, name (+1 more)

### Community 17 - "Contributing Guidelines"
Cohesion: 0.24
Nodes (3): FileSuggest, FolderSuggest, VaultPathSuggest

### Community 18 - "Build Configuration"
Cohesion: 0.25
Nodes (7): Architecture, Coding conventions, Commands, Compatibility contracts, Project, Release and repository hygiene, Testing

### Community 21 - "Technical Debt Planning"
Cohesion: 0.60
Nodes (3): isTrue(), parseScriptureSidebarUriRequest(), ScriptureSidebarUriRequest

## Knowledge Gaps
- **102 isolated node(s):** `Project`, `Commands`, `Architecture`, `Compatibility contracts`, `Coding conventions` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScriptureListRenderer` connect `Bible Data Loading` to `Scripture Reference Parsing`, `Bible Translation Navigation`, `Reference Formatting Utilities`, `Verse Callout Formatting`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `Scripture` connect `Project Dependencies Metadata` to `Scripture Reference Parsing`, `Bible Translation Navigation`, `Reference Formatting Utilities`, `Project Manifest Metadata`, `Scripture Reference Types`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `ScriptureSidebarView` connect `Scripture Insertion Management` to `Scripture Reference Parsing`, `Scripture Settings UI`, `Project Dependencies Metadata`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `Project`, `Commands`, `Architecture` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scripture Reference Parsing` be split into smaller, more focused modules?**
  _Cohesion score 0.09679370840895342 - nodes in this community are weakly interconnected._
- **Should `Bible Data Loading` be split into smaller, more focused modules?**
  _Cohesion score 0.07982583454281568 - nodes in this community are weakly interconnected._
- **Should `Bible Translation Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.07020408163265306 - nodes in this community are weakly interconnected._