# AGENTS.md - AI Assistant Reference

This document provides comprehensive context for AI assistants (Codex, GPT, etc.) working on this project.

## Project Overview

**Purpose**: Obsidian plugin for inserting and managing scripture references with Bible translation data integration.

**Type**: Obsidian TypeScript Plugin
**Target**: Obsidian desktop and mobile apps
**Build System**: esbuild with TypeScript

## Core Features

### 1. Scripture Reference Insertion

Insert Bible verses as formatted callouts or plain text:

- **Modal Interface**: Fuzzy search for scripture references (e.g., "John 3:16", "Romans 8:28-39")
- **Real-time Preview**: Shows verse text as user types
- **Multiple Formats**: Callout blocks, plain text, or link-only
- **Translation Selection**: Choose from configured Bible translations
- **Smart Detection**: Pre-populates modal with selected text if it contains a scripture reference

### 2. Scripture Callout Creation

This plugin creates Markdown for scripture callouts. The actual rendering is handled natively by Obsidian.

Example output:

```markdown
> [!scripture]+ [[Bible/CSB/John 3#16|John 3:16]]
> For God so loved the world that he gave his one and only Son...
```

**Features**:
- Generates properly formatted callout Markdown
- Verse number display options (all, first only, none)
- Translation indicators in wikilinks
- Poetry/prose formatting awareness
- Display text after wikilink (e.g., `|John 3:16`)

### 3. Bible Chapter Notes Navigation

Navigate between different translation versions of the same chapter:

- **Context-Aware**: Detects when a Bible chapter note is open
- **Translation Switcher**: Fuzzy search modal to jump to same chapter in different translation
- **Modifier Key Support**: Ctrl/Cmd for new tab, Ctrl+Shift for split pane

### 4. Scripture List Renderer

Code block processor for rendering scripture reference tables:

````markdown
```scriptureList
John 3:16
Romans 8:28-30
Psalm 23:1-6
```
````

**Output**: Interactive table with book, testament, chapter, verses, and click-to-open links.

## Architecture & Big Picture

### Component Overview

This plugin follows a modular architecture with clear separation of concerns:

- **[main.ts](main.ts)** - Plugin lifecycle, command registration, settings load/save, public API exposure (`app.plugins.plugins['scripture'].api`)
- **[src/](src/)** - Modular helper classes and UI components:
  - **[bible-data-loader.ts](src/bible-data-loader.ts)** - Loads/validates JSON Bible translation data and caches results
  - **[callout-formatter.ts](src/callout-formatter.ts)** - Constructs and inserts scripture callouts into editor
  - **[bible-verse-display-manager.ts](src/bible-verse-display-manager.ts)** - Applies verse-number display rules to opened Bible notes
  - **[bible-chapter-navigator.ts](src/bible-chapter-navigator.ts)** - Handles opening other translation chapter notes
  - **[modal.ts](src/modal.ts)** - Scripture insertion modal UI (extends Obsidian's `Modal`)
  - **[settings.ts](src/settings.ts)** - Settings UI for adding/editing/removing translations
  - **[scripture-list-renderer.ts](src/scripture-list-renderer.ts)** - Renders `scriptureList` code blocks as tables
  - **[types.ts](src/types.ts)** - Domain types and `DEFAULT_SETTINGS`
  - **[scripture-references.d.ts](src/scripture-references.d.ts)** - Type definitions for external scripture detection library

### External Dependencies

- **`scripture-references`** - External package (`github:der-bingle/scripture-references`) providing reference detection/parsing utilities:
  - `detectReferences(text)` - Finds scripture references in text
  - `PassageReference` - Parsed reference object with book, chapter, verses
  - `transformReferences(transformer)` - Transforms references in text

### Data Flow

```
User Command → ScriptureModal
    ↓
detectReferences() parses user input
    ↓
BibleDataLoader fetches verses from JSON
    ↓
CalloutFormatter builds markdown callout
    ↓
Editor.replaceSelection() inserts into document
```

**Settings Changes**:
```
User edits settings → saveData() persists to disk
    ↓
Components receive updateSettings() calls
    ↓
UI refreshes with new configuration
```

## Build / Dev Workflow

### Installation

```bash
npm install
```

### Development (Watch Mode)

```bash
npm run dev
```

This runs `node esbuild.config.mjs` in watch mode. Obsidian requires the built `main.js` to be present in the plugin folder to load the plugin.

### Production Build

```bash
npm run build
```

This runs TypeScript type checking (`tsc --noEmit`) and then bundles with esbuild.

### Build Notes

- **esbuild config**: `esbuild.config.mjs` uses top-level await and outputs CommonJS `main.js`
- **Output**: All code bundles to single `main.js` file
- **Source maps**: Generated in dev mode for debugging
- **External modules**: Obsidian API is marked external (provided by app at runtime)

## Project-Specific Conventions

### Settings Persistence

Use Obsidian's Plugin API for settings:

```typescript
// Load settings
await this.loadData(); // Returns saved settings object

// Save settings
await this.saveData(this.settings);
```

See [main.ts:20-28](main.ts#L20-L28) for implementation.

### Bible Translation Configuration

Translations are stored in `settings.translations` with this schema:

```typescript
interface BibleTranslation {
  name: string;              // Short name (e.g., "ESV", "NIV")
  fullName: string;          // Full name (e.g., "English Standard Version")
  filePath: string;          // Path to JSON Bible data file
  availableAsNotes?: boolean; // Whether this translation has chapter notes
  notesDirectory?: string;   // Path to chapter notes directory
}
```

Always use `BibleDataLoader.validateTranslation()` before adding a translation in the UI.

### UI Patterns

- **Modal Pattern**: Extend `Modal` or `SuggestModal<T>` from Obsidian API
- **Settings Pattern**: Extend `PluginSettingTab`, use `Setting` component for form controls
- **Component Updates**: After settings change, call `component.updateSettings(newSettings)` on each component
- **Refresh Pattern**: In settings tab, call `this.plugin.saveSettings()` followed by `this.display()` to refresh UI

### Timing Considerations

Rely on small `setTimeout` delays (100-1000ms) before operating on active leaves/views after file-open/layout-change events. This allows Obsidian views to finish loading.

Example from [bible-verse-display-manager.ts](src/bible-verse-display-manager.ts):

```typescript
this.app.workspace.on('file-open', (file) => {
  setTimeout(() => {
    this.applyVerseNumberDisplay(file);
  }, 100);
});
```

## Functional Programming & Ramda Guidance

This project prefers pure, composable functions for business logic where possible, while using classes for Obsidian's lifecycle/view APIs.

### Core Principles

1. **Pure Functions**: No side effects except at system boundaries (Obsidian API calls, file I/O, DOM manipulation)
2. **Immutability**: Prefer spreading objects (`{ ...obj, newProp }`) over mutation
3. **Composition**: Build complex operations from simple, testable functions
4. **Named Imports**: Always use named imports, never `import * as R`
5. **Data-Last Pattern**: Custom utility functions should follow Ramda conventions (data comes last for currying)

### Import Style

**✅ ALWAYS: Named imports**
```typescript
import { pipe, map, filter, prop, sortBy } from 'ramda';
```

**❌ NEVER: Namespace imports**
```typescript
import * as R from 'ramda'; // ❌ Reduces readability, hurts tree-shaking
```

### Ramda Usage Patterns

#### Data Access

```typescript
import { prop, path, pathOr, pluck } from 'ramda';

// Get property
const getTitle = prop('title');
const titles = verses.map(getTitle);

// Get nested property with default
const getDate = pathOr(null, ['metadata', 'date']);

// Extract from array of objects
const getNumbers = pluck('number');
const numbers = getNumbers(sermons);
```

#### Data Transformation

```typescript
import { pipe, map, filter, groupBy } from 'ramda';

// Transform collection
const processTranslations = pipe(
  filter(t => t.isValid),           // Remove invalid
  map(normalizeTranslation),        // Transform each
  groupBy(prop('testament'))        // Group by testament
);

const processed = processTranslations(translations);
```

#### Predicates and Logic

```typescript
import { propEq, test, allPass, anyPass, complement } from 'ramda';

// Simple predicates
const isESV = propEq('name', 'ESV');
const hasVerseNumbers = test(/\d+:\d+/);

// Composed predicates
const isValidTranslation = allPass([
  prop('filePath'),
  prop('name'),
  t => t.name.length > 0
]);

// Negation
const isNotNil = complement(isNil);
```

#### String Manipulation

```typescript
import { pipe, trim, replace, split, join, toUpper } from 'ramda';

// Text cleaning
const cleanReference = pipe(
  trim,
  replace(/\s+/g, ' '),
  replace(/[,;]+$/, '')
);

// Book code normalization
const normalizeBookCode = pipe(
  trim,
  toUpper,
  replace(/\s+/g, '_')
);
```

### Practical Functional Patterns for Obsidian Plugins

#### Pure Business Logic

Keep logic functions pure and extract them from class methods:

```typescript
// Pure helper - easy to test
const buildCalloutHeader = (reference: string, translation: string): string => {
  return `> [!scripture]+ [[${translation} ${reference}]]`;
};

// Class method handles side effects
class CalloutFormatter {
  insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[]): void {
    const header = buildCalloutHeader(reference, this.settings.defaultTranslation);
    const body = this.formatVerses(verses); // Also pure
    const callout = `${header}\n${body}`;

    // Side effect isolated here
    editor.replaceSelection(callout);
  }
}
```

#### Verse Formatting Pipeline

```typescript
import { pipe, map, join } from 'ramda';

// Pure transformation pipeline
const formatVerses = (includeNumbers: boolean) => pipe(
  map((verse: BibleVerse) => formatSingleVerse(verse, includeNumbers)),
  join('\n')
);

// Usage
const formattedText = formatVerses(true)(verses);
```

#### Settings Transformation

```typescript
import { pipe, filter, map, sortBy, prop } from 'ramda';

// Get available translations with notes
const getNotesTranslations = pipe(
  filter((t: BibleTranslation) => t.availableAsNotes && t.notesDirectory),
  sortBy(prop('name'))
);

const notesTranslations = getNotesTranslations(this.settings.translations);
```

#### Conditional Logic

```typescript
import { cond, equals, always, T } from 'ramda';

// Pattern matching for display mode
const getVerseNumberDisplay = cond([
  [equals('all'), always(true)],
  [equals('first'), always('first-only')],
  [equals('none'), always(false)],
  [T, always(true)] // Default
]);

const displayMode = getVerseNumberDisplay(settings.verseNumberDisplayMode);
```

### Balancing OOP and FP

**Use Classes For**:
- Obsidian API integration (Plugin, Modal, PluginSettingTab)
- Component lifecycle management
- Stateful UI components
- Side effect coordination

**Use Pure Functions For**:
- Data transformation
- Formatting logic
- Validation
- Parsing
- Filtering and sorting

**Example Structure**:

```typescript
// Pure utilities (top of file or separate module)
const parseReference = (text: string): ParsedReference | null => { /* ... */ };
const formatCallout = (ref: ParsedReference, verses: BibleVerse[]): string => { /* ... */ };

// Class for Obsidian integration
export class ScriptureModal extends Modal {
  // State managed by class
  private selectedTranslation: string;

  // Side effects in methods
  async handleSubmit(): Promise<void> {
    const reference = this.inputEl.value;

    // Call pure functions
    const parsed = parseReference(reference);
    if (!parsed) return;

    const verses = await this.lookupVerses(parsed);
    const callout = formatCallout(parsed, verses);

    // Side effect
    this.onSubmit(callout);
    this.close();
  }
}
```

## Module Organization

### Pure Logic Modules (Prefer Functional Style)

These should contain primarily pure functions:

- **Date utilities**: ISO formatting, parsing
- **Reference parsing**: Extract book/chapter/verse from strings
- **Text formatting**: Build callouts, format verses
- **Validation**: Check translation validity, reference format

**Characteristics**:
- Export pure functions
- No Obsidian API imports
- Easily testable
- Deterministic

### Impure Integration Modules (Class-Based)

These handle Obsidian API integration:

- **UI Components**: Modals, settings tabs
- **File Operations**: Read/write vault files
- **Workspace Management**: Open files, manage views
- **Event Handling**: File-open, layout-change listeners

**Characteristics**:
- Extend Obsidian base classes
- Handle I/O and side effects
- Manage component lifecycle
- Coordinate between pure functions and Obsidian API

## Type Definitions

### Core Domain Types

```typescript
interface BibleVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  content: string[];       // Lines of text
  newParagraph?: boolean;
  poetry?: boolean;
}

interface BibleTranslation {
  name: string;
  fullName: string;
  filePath: string;
  availableAsNotes?: boolean;
  notesDirectory?: string;
}

interface ScriptureSettings {
  translations: BibleTranslation[];
  defaultTranslation: string;
  verseNumbers: 'include' | 'exclude' | 'exclude-first';
  translationDisplay: 'never' | 'always' | 'except-default';
  linkingStrategy: 'default-translation' | 'verse-translation';
  includeHiddenLinks: boolean;
  includeVerseNumbersOnInsert: boolean;
  calloutFolding: 'not-foldable' | 'foldable-expanded' | 'foldable-collapsed';
  verseNumbersVisible: boolean;
  verseNumberDisplayMode: 'first' | 'all';
}
```

## Common Implementation Patterns

### Adding a New Command

Modify [main.ts](main.ts) inside `onload()`:

```typescript
this.addCommand({
  id: 'my-command',
  name: 'My Command',
  icon: 'book',
  editorCallback: (editor: Editor, view: MarkdownView) => {
    // Command implementation
  }
});
```

For conditionally available commands, use `checkCallback`:

```typescript
this.addCommand({
  id: 'conditional-command',
  name: 'Conditional Command',
  checkCallback: (checking: boolean) => {
    const canRun = this.someCondition();

    if (checking) {
      return canRun; // Just check, don't execute
    }

    if (canRun) {
      // Execute command
      return true;
    }
    return false;
  }
});
```

### Adding a New Setting

1. **Extend type** in [src/types.ts](src/types.ts):

```typescript
export interface ScriptureSettings {
  // ... existing settings
  myNewSetting: boolean;
}

export const DEFAULT_SETTINGS: ScriptureSettings = {
  // ... existing defaults
  myNewSetting: false,
};
```

2. **Add UI control** in [src/settings.ts](src/settings.ts):

```typescript
new Setting(containerEl)
  .setName('My New Setting')
  .setDesc('Description of what this does')
  .addToggle(toggle => toggle
    .setValue(this.plugin.settings.myNewSetting)
    .onChange(async (value) => {
      this.plugin.settings.myNewSetting = value;
      await this.plugin.saveSettings();
    }));
```

3. **Update components** that need the new setting:

```typescript
// In component
updateSettings(settings: ScriptureSettings): void {
  this.settings = settings;
  if (settings.myNewSetting) {
    // Apply setting
  }
}
```

### Using Scripture Reference Detection

The `scripture-references` library provides robust detection:

```typescript
import { detectReferences, PassageReference } from 'scripture-references';

// Detect references in text
const text = "See John 3:16 and Romans 8:28-30";
const matches = Array.from(detectReferences(text));

// Access parsed reference
if (matches.length > 0) {
  const match = matches[0];
  const ref = match.ref as PassageReference;

  console.log(ref.book);           // "jhn"
  console.log(ref.start_chapter);  // 3
  console.log(ref.start_verse);    // 16
  console.log(ref.end_verse);      // 16 (or undefined if no range)
}
```

### Transforming References in Text

```typescript
import { transformReferences } from 'scripture-references';

// Create transformer function
const toWikilink = (match) => {
  const ref = match.ref;
  const bookName = ref.getBookName();
  const chapter = ref.start_chapter;
  const startVerse = ref.start_verse;
  const endVerse = ref.end_verse;

  const verseRange = (endVerse && endVerse !== startVerse)
    ? `${startVerse}-${endVerse}`
    : startVerse;

  return `[[${bookName} ${chapter}#${verseRange}]]`;
};

// Apply to text
const linkified = transformReferences(toWikilink)("Read John 3:16");
// Result: "Read [[John 3#16]]"
```

### Working with Bible Data

```typescript
// Load translation data
const bibleData = await this.dataLoader.loadTranslation(translation);

// Structure:
// bibleData.translation: string
// bibleData.books: BibleBook[]

// Find book
const book = bibleData.books.find(b => b.id === 'JHN');

// Find chapter
const chapter = book.chapters.find(c => c.chapter === 3);

// Find verses
const verses = chapter.verses.filter(v =>
  v.verse >= 16 && v.verse <= 17
);
```

## Testing Considerations

### Pure Function Testing

Pure functions are easy to test in isolation:

```typescript
import { formatCallout } from './callout-formatter';

describe('formatCallout', () => {
  it('formats single verse correctly', () => {
    const verses = [{
      id: 'JHN-3-16',
      book: 'John',
      chapter: 3,
      verse: 16,
      content: ['For God so loved the world...'],
      poetry: false
    }];

    const result = formatCallout('John 3:16', verses, 'ESV', false);

    expect(result).toContain('> [!scripture]');
    expect(result).toContain('For God so loved the world');
  });
});
```

### Mocking Obsidian API

For components that use Obsidian API:

```typescript
import { App, Editor } from 'obsidian';

// Mock app
const mockApp = {
  vault: {
    getMarkdownFiles: jest.fn(() => []),
  },
  workspace: {
    getActiveFile: jest.fn(() => null),
  }
} as unknown as App;

// Mock editor
const mockEditor = {
  getSelection: jest.fn(() => ''),
  replaceSelection: jest.fn(),
} as unknown as Editor;
```

## Common Edge Cases

### Scripture Reference Detection

**Edge Case**: Book names in regular text
```
The book of James teaches us...
```

**Solution**: The `scripture-references` library requires chapter:verse pattern by default.

**Edge Case**: Verse ranges across chapters
```
John 3:36-4:2
```

**Solution**: Library handles cross-chapter ranges. Check `ref.end_chapter` in addition to `ref.end_verse`.

### Translation Configuration

**Edge Case**: Missing translation file
```typescript
// Always validate before adding
const validation = await this.dataLoader.validateTranslation(translation);
if (!validation.isValid) {
  new Notice(`Error: ${validation.errorMessage}`);
  return;
}
```

**Edge Case**: Notes directory doesn't exist
```typescript
// Check filesystem
const exists = await this.app.vault.adapter.exists(translation.notesDirectory);
if (!exists) {
  // Handle gracefully
}
```

### Verse Formatting

**Edge Case**: Poetry vs. prose
```typescript
// BibleVerse.poetry flag indicates poetic text
if (verse.poetry) {
  // Add extra line break after verse
  content += '\n';
}
```

**Edge Case**: Multi-line verse content
```typescript
// Verse content is array of lines
const verseText = verse.content.join('\n');
```

## Performance Considerations

### Efficient Data Access

```typescript
import { memoizeWith, identity } from 'ramda';

// Memoize expensive lookups
const getBookByCode = memoizeWith(
  identity,
  (code: string) => bibleData.books.find(b => b.id === code)
);
```

### Lazy Loading Translations

Only load Bible data when needed:

```typescript
// BibleDataLoader caches loaded translations
const bibleData = await this.dataLoader.loadTranslation(translation);
// Subsequent calls return cached data
```

### Batch Operations

Process collections efficiently:

```typescript
import { pipe, map, filter } from 'ramda';

// ❌ Multiple passes
const result = verses
  .map(formatVerse)
  .filter(isValid)
  .map(addLineBreaks);

// ✅ Single pass with composed function
const processVerse = pipe(formatVerse, addLineBreaks);
const result = verses
  .map(processVerse)
  .filter(isValid);
```

## Debugging Tips

### Trace Data Flow

Add logging tap points:

```typescript
import { tap } from 'ramda';

const logWith = (label: string) => tap((x: any) => console.log(label, x));

const process = pipe(
  logWith('Input:'),
  transform,
  logWith('After transform:'),
  format,
  logWith('Final:')
);
```

### Validate Transformations

```typescript
const validateVerse = (verse: BibleVerse): BibleVerse => {
  if (!verse.book) throw new Error('Verse missing book');
  if (!verse.chapter) throw new Error('Verse missing chapter');
  return verse;
};

const process = pipe(
  parseVerse,
  validateVerse,
  formatVerse
);
```

### Use Obsidian Developer Tools

- **Console**: Accessible via Ctrl+Shift+I (or Cmd+Opt+I on Mac)
- **Plugin Reloading**: Use "Reload app without saving" to test changes quickly
- **Debugging**: Set breakpoints in Chrome DevTools when running in dev mode

## Extension Points

### Custom Scripture Link Formats

The plugin uses this format for scripture wikilinks:

```typescript
// Current format: [[Bible/CSB/John 3#16|John 3:16]]
// Structure: [[filepath|display text]]
const toWikilink = (book, chapter, verse, translation, displayText) =>
  `[[Bible/${translation}/${book} ${chapter}#${verse}|${displayText}]]`;

// The display text (after |) shows the reference in human-readable format
// The filepath (before |) is the actual note location
```

Note: The display text is important for readability in Reading View.

### Additional Callout Types

Create specialized callout formatters:

```typescript
const formatMemoryVerse = (verse: BibleVerse): string => {
  return `> [!verse-memory]\n> ${verse.content.join(' ')}`;
};

const formatDevotional = (verse: BibleVerse, note: string): string => {
  return `> [!devotional]\n> ${verse.content.join(' ')}\n>\n> ${note}`;
};
```

### Public API Extension

Add methods to the public API in [main.ts](main.ts):

```typescript
this.api = {
  // Existing methods...

  // New method
  getVersesInRange: async (book: string, chapter: number, startVerse: number, endVerse: number) => {
    // Implementation
  }
};
```

Other plugins can then access:

```typescript
const scripturePlugin = app.plugins.plugins['scripture'];
const verses = await scripturePlugin.api.getVersesInRange('John', 3, 16, 17);
```

## Dependencies

### Production Dependencies

- `obsidian` - Obsidian Plugin API (provided by app, marked external in build)
- `scripture-references` - Scripture reference detection and parsing (github:der-bingle/scripture-references)

### Development Dependencies

- `typescript` - Type checking and compilation
- `esbuild` - Fast bundling
- `@types/node` - Node.js type definitions

## Project Structure

```
obsidian-scripture/
├── main.ts                          # Plugin entry point
├── src/
│   ├── types.ts                     # Domain types and interfaces
│   ├── modal.ts                     # Scripture insertion modal
│   ├── settings.ts                  # Settings UI
│   ├── callout-formatter.ts         # Callout building logic
│   ├── bible-data-loader.ts         # Translation loading/validation
│   ├── bible-verse-display-manager.ts  # Verse display customization
│   ├── bible-chapter-navigator.ts   # Translation switching
│   ├── scripture-list-renderer.ts   # Code block processor
│   └── scripture-references.d.ts    # Type definitions for external lib
├── esbuild.config.mjs               # Build configuration
├── manifest.json                    # Plugin metadata
├── package.json                     # NPM dependencies
└── styles.css                       # Plugin styles
```

## Gotchas & Important Notes

- **Scripture References Package**: This project uses the external `scripture-references` package from GitHub. Import it directly; type definitions are in `src/scripture-references.d.ts`.

- **esbuild Config**: `esbuild.config.mjs` uses top-level await; Node must support it (Node 14.8+).

- **Reference Detection Limits**: Selection-based pre-population ignores selections longer than 100 characters or containing newlines. See [main.ts:265-290](main.ts#L265-L290).

- **Timing Delays**: Many UI flows rely on `setTimeout` delays after `file-open` or `layout-change` events. Removing these without proper replacement can cause race conditions.

- **Bible Data Format**: Translation JSON files must follow specific structure (see `BibleData` interface in [types.ts](src/types.ts)). Always validate with `BibleDataLoader.validateTranslation()`.

- **Frontmatter IDs**: Bible chapter notes use frontmatter ID format: `{BOOK_CODE}.{THREE-DIGIT_CHAPTER_NUMBER}` (e.g., "JAS.001" for James 1, "JHN.003" for John 3).

## Quick Reference Links

### Essential Files to Understand First

1. **[main.ts](main.ts)** - Plugin lifecycle, commands, API exposure
2. **[src/types.ts](src/types.ts)** - All domain types and interfaces
3. **[src/modal.ts](src/modal.ts)** - Scripture insertion UI and reference detection
4. **[src/callout-formatter.ts](src/callout-formatter.ts)** - How callouts are built
5. **[src/bible-data-loader.ts](src/bible-data-loader.ts)** - Translation loading and validation

### Key External Documentation

- **Obsidian Plugin API**: https://github.com/obsidianmd/obsidian-api
- **scripture-references**: https://github.com/der-bingle/scripture-references
- **Ramda**: https://ramdajs.com/docs/

## Best Practices Summary

### Code Organization
- ✅ Extract pure functions from class methods
- ✅ Use named imports always
- ✅ Keep side effects at boundaries
- ✅ Prefer composition over inheritance

### Type Safety
- ✅ Define interfaces for all domain objects
- ✅ Use TypeScript strict mode
- ✅ Avoid `any` type; use `unknown` if needed

### Performance
- ✅ Memoize expensive operations
- ✅ Cache loaded Bible data
- ✅ Use single-pass transformations
- ✅ Lazy-load translations

### Testing
- ✅ Unit test pure functions
- ✅ Mock Obsidian API for integration tests
- ✅ Validate edge cases (empty data, missing files, invalid references)

### User Experience
- ✅ Provide helpful error messages
- ✅ Show loading indicators for async operations
- ✅ Support keyboard shortcuts and modifier keys
- ✅ Match Obsidian's native UI patterns

## Final Notes

This plugin balances functional programming principles with Obsidian's object-oriented API. Keep business logic pure and testable, while using classes for Obsidian integration. Prefer Ramda for data transformations but don't force it where native JavaScript is clearer.

When in doubt:
1. **Extract pure logic** from impure methods
2. **Use named imports** from Ramda
3. **Test in isolation** before integration
4. **Follow Obsidian patterns** for UI/lifecycle

---

**Last Updated**: January 2026
**Maintained By**: Luke Murray
**AI-Assisted Development**: Codex (Anthropic)
