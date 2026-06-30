# Scripture Sidebar Implementation Plan

Add local-JSON Scripture sidebars for reading and comparing translations while preserving existing plugin compatibility. Multiple independent sidebars may be opened and restored through Obsidian workspace state.

## Implementation checklist

- [x] Extend persisted settings and migrations for sidebar defaults/state and link path formatting.
- [x] Strengthen nested Bible JSON validation without requiring a fixed canon.
- [x] Replace hardcoded Scripture-note link paths with a shared configured-path/basename resolver.
- [x] Move link controls into a root-level **Scripture links** settings section.
- [x] Implement the multi-instance Scripture sidebar view with independent state.
- [x] Add sticky translation, book, chapter, and previous/next controls.
- [x] Render paragraph and poetry structure while following shared verse-number settings.
- [x] Preserve the visible verse across translation changes and persisted workspace state.
- [x] Add ribbon and commands for opening, cloning, and contextually navigating sidebars.
- [x] Track and target the most recently used sidebar without synchronizing instances.
- [x] Add focused unit tests and desktop/mobile smoke-test guidance.
- [x] Update README configuration, commands, and consolidation guidance.
- [x] Run `npm run check` successfully.

## Decided behavior

- The normal open command and ribbon reveal the most recently used sidebar or create the first.
- **Open new Scripture sidebar** clones the most recently used sidebar into a split for immediate comparison.
- **Open current chapter in Scripture sidebar** updates the most recently used sidebar; if none exists, it creates one using the sidebar default translation.
- Sidebars do not automatically follow active notes or synchronize with one another.
- Each sidebar persists translation, book, chapter, verse-relative scroll position, and side placement.
- The first sidebar defaults to the right at Genesis 1. Later views remember or clone prior state.
- Translation changes preserve the top-visible verse, falling back to the nearest available verse.
- The reader uses normal text selection; custom verse-selection and copying are out of scope.
- Existing verse-number settings and commands affect both chapter notes and all open sidebars.
- Basename links are opt-in and display a warning about ambiguous duplicate note names.
- Existing Markdown is never rewritten and vault-note consolidation remains manual.

## Compatibility and verification

- Preserve released command IDs, persisted setting keys, URI behavior, `ScriptureAPI` signatures, and the legacy API alias.
- Continue supporting Obsidian 1.9.0 and mobile; use supported workspace, view-state, vault, and DOM APIs.
- Keep all variable data out of `innerHTML`.
- Validate pure navigation, migration, validation, and link-target logic with Vitest.
- Smoke-test independent sidebar state, cloning, restoration, contextual jumps, translation comparison, invalid JSON handling, and consolidated `Bible/James 5.md` links.
