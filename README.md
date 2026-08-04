# Scripture for Obsidian

Scripture is an Obsidian plugin for inserting Bible passages, opening chapter notes, switching between translations, and rendering reference lists from local Bible data.

The plugin works locally. It does not make network requests, collect analytics, or transmit vault contents.

## Features

- Insert a passage as a Scripture callout or plain text, with a live preview.
- Insert only a linked scripture reference.
- Configure multiple local Bible translations and choose the default translation.
- Read local translations in one or more independently navigable Scripture sidebars.
- Open a scripture chapter note from typed, selected, or clipboard text.
- Switch an open chapter note to the corresponding chapter in another translation.
- Control verse-number display and translation-aware tab titles for Bible notes.
- Render interactive `scriptureList` code blocks with folding, highlighting, editing, pasting, and copyable callouts.
- Choose full book names, standard abbreviations, traditional abbreviations, or chapter-and-verse-only display.

## Installation

### From a release

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/der-bingle/obsidian-scripture/releases/latest).
2. Place the files in `<vault>/.obsidian/plugins/obsidian-scripture/`.
3. Reload Obsidian and enable **Scripture** under **Settings → Community plugins**.

### Development

```sh
npm install
npm run dev
```

The watch build writes `main.js` at the repository root. Reload Obsidian after rebuilding the plugin.

Useful checks:

```sh
npm run lint
npm run test
npm run build
npm run check
```

## Configuration

Open **Settings → Scripture** to add one or more translations. Each translation needs:

- A short name such as `CSB` or `NLT`.
- A full display name.
- The vault-relative path to its Bible JSON file.
- Optionally, a vault-relative directory containing its chapter notes.

Translation data uses this shape:

```json
{
  "translation": "CSB",
  "books": [
    {
      "id": "JHN",
      "title": "John",
      "bookNumber": 43,
      "testament": "New Testament",
      "abbreviations": ["Jn", "Jhn"],
      "chapters": [
        {
          "id": "JHN.003",
          "book": "John",
          "chapter": 3,
          "verseCount": 36,
          "wordCount": 0,
          "verses": [
            {
              "id": "JHN.3.16",
              "book": "John",
              "chapter": 3,
              "verse": 16,
              "content": ["For God loved the world in this way…"],
              "newParagraph": false,
              "poetry": false
            }
          ]
        }
      ]
    }
  ]
}
```

Bible chapter notes are recognized by their configured directory. Translation switching uses a frontmatter `id` such as `JHN.003` to locate the same chapter in another translation.

### Scripture sidebar

Choose a default sidebar translation under **Scripture sidebar**. The ribbon and **Open sidebar** command reveal the most recently used sidebar. **Open new sidebar** clones its translation, chapter, and reading position into another split so two translations can be compared directly. Sidebars retain independent state and do not automatically follow open notes.

Type a reference into the chapter title and press Enter to open it. On tablets and phones, focusing the input also reveals a paste button that loads the first reference from the clipboard immediately; desktop users can paste with the normal keyboard shortcut. The input accepts the same full names, abbreviations, punctuation variants, and surrounding text as the insertion commands. Once the book is unambiguous, a compact suggestion menu offers its first chapters; a complete passage produces one canonical suggestion. Use the arrow keys to move through suggestions, Enter or click to open one, or Tab to fill it without navigating so a verse or range can be added. Ambiguous book prefixes remain unchanged until the reference parser can identify one book. Verse references open the containing chapter at the starting verse, after which the input returns to the canonical chapter title. The current translation abbreviation appears inline as part of the chapter title; click or tap it to switch among configured translations without changing the displayed chapter. Previous and next chapter controls flank the centered title. On narrow panes the title scales down to a readable minimum while mobile arrow controls retain their full touch targets.

Sidebar Scripture text inherits the theme's text font, size, and line height by default and is centered within a font-aware maximum reading width of `65ch`. It uses normal native text selection and copying, including keyboard shortcuts, desktop contextual menus, and mobile long-press selection. With the Style Settings plugin, the **Scripture sidebar** section customizes the passage input and Scripture typography, maximum width, text alignment, reading padding, paragraph spacing, poetry indentation, and verse-number gutter.

Use **Open current chapter in sidebar** from a recognized chapter note to move the most recently used sidebar to that chapter. If none is open, the command creates one using the configured sidebar default.

### Scripture links and consolidated notes

The **Scripture links** settings choose both the note translation and path style used by generated links:

- **Configured notes path** produces links such as `[[Bible/James 5#19]]` from the selected translation's notes directory.
- **Note basename only** produces `[[James 5#19]]`. Use this only when chapter-note basenames are unique in the vault; otherwise Obsidian may resolve the link ambiguously.

To retain a single canonical note set while reading other translations from JSON:

1. Move the retained chapter notes manually to their shared directory, such as `Bible/`.
2. Set that translation's Scripture notes directory to `Bible`.
3. Disable **Available as Scripture notes in the vault** for JSON-only comparison translations.
4. Select **Note basename only** if unqualified links are desired and note names are unique.

The plugin does not move or rewrite existing notes or Markdown automatically.

## Commands

Command IDs remain stable for hotkeys and integrations.

| Command | ID |
| --- | --- |
| Insert | `insert-scripture` |
| Insert link | `insert-scripture-link` |
| Open note | `open-scripture-note` |
| Open from clipboard | `open-scripture-from-clipboard` |
| Open chapter in other translation | `open-chapter-in-translation` |
| Open sidebar | `open-scripture-sidebar` |
| Open new sidebar | `open-new-scripture-sidebar` |
| Open current chapter in sidebar | `open-current-chapter-in-scripture-sidebar` |
| Toggle verse numbers | `toggle-verse-numbers` |
| Show first verse only | `show-first-verse-only` |
| Show all verse numbers | `show-all-verse-numbers` |

## Scripture lists

Use one reference per line:

````markdown
```scriptureList
John 3:16
- Romans 8:28-30
* Psalm 23:1-6
```
````

Prefixing a line with `- ` or `* ` highlights that row. The rendered list can edit its source, append a blank entry, paste references from the clipboard, and copy a passage as a callout. Optional settings can normalize and reorder the source.

Under **Scripture lists**, **Reference click action** chooses whether reference-column links open their configured chapter notes or navigate the most recently used Scripture sidebar. Sidebar navigation preserves the sidebar's current translation and opens the first verse in the list reference. If no sidebar is open, the plugin creates one with the configured sidebar default. When sidebar navigation is selected, `Cmd`-click on macOS or `Ctrl`-click on Windows and Linux still opens the chapter note in a new tab.

## Public API

The compatibility alias remains available to other plugins:

```js
const scripture = app.plugins.plugins['scripture']?.api;

const primary = scripture?.getPrimaryTranslation();
const translations = scripture?.getAvailableTranslations();
const csb = scripture?.getTranslationSettings('CSB');
const link = scripture?.formatVerseReference('John', 3, 16, 'CSB');
const parsed = scripture?.parseScriptureReference('John 3:16 CSB');
const normalized = scripture?.normalizeBookName('1 Cor');
const target = await scripture?.resolveScriptureNote('John 3:16 NLT');
await scripture?.openScriptureNote('John 3:16 NLT');
```

The canonical plugin instance is registered under `obsidian-scripture`; the shorter `scripture` registry entry is retained for compatibility.

### Obsidian URI

Open a Scripture note through:

```text
obsidian://scripture/open-scripture-note?reference=John%203%3A16%20NLT
```

Open the same reference in the Scripture sidebar through:

```text
obsidian://scripture/open-scripture-sidebar?reference=John%203%3A16
```

The sidebar URI navigates the most recently used sidebar and preserves its current translation. If no sidebar is open, it creates one with the configured sidebar default. Add `translation=NLT` to select a translation explicitly or `newSidebar=true` to open the reference in a new Scripture sidebar. `newLeaf=true` is also accepted as an alias for `newSidebar=true`.

Both actions accept these reference parameters:

- `reference`, `ref`, or `q`: scripture input.

The note action additionally accepts `newLeaf=true` or `newLeaf=1` to open in a new leaf.

The sidebar URI can also be used as a Markdown action link:

```markdown
[John 3:16](obsidian://scripture/open-scripture-sidebar?reference=John%203%3A16)
```

## Privacy and permissions

- Translation JSON and chapter notes are read from the vault.
- `scriptureList` source can be updated when its normalization or edit actions are used.
- Clipboard access occurs only when the user invokes a paste, copy, or clipboard-opening action.
- No account, payment, telemetry, or external service is required.

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for development expectations. Version history and release assets are available on [GitHub Releases](https://github.com/der-bingle/obsidian-scripture/releases).

## Support and license

Scripture is licensed under the [MIT License](LICENSE). Development can be supported through [Buy Me a Coffee](https://buymeacoffee.com/derbingle).
