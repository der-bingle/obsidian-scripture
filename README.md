# Scripture for Obsidian

Scripture is an Obsidian plugin for inserting Bible passages, opening chapter notes, switching between translations, and rendering reference lists from local Bible data.

The plugin works locally. It does not make network requests, collect analytics, or transmit vault contents.

## Features

- Insert a passage as a Scripture callout or plain text, with a live preview.
- Insert only a linked scripture reference.
- Configure multiple local Bible translations and choose the default translation.
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

## Commands

Command IDs remain stable for hotkeys and integrations.

| Command | ID |
| --- | --- |
| Insert | `insert-scripture` |
| Insert link | `insert-scripture-link` |
| Open note | `open-scripture-note` |
| Open from clipboard | `open-scripture-from-clipboard` |
| Open chapter in other translation | `open-chapter-in-translation` |
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

Open a scripture note through:

```text
obsidian://scripture/open-scripture-note?reference=John%203%3A16%20NLT
```

Accepted parameters:

- `reference`, `ref`, or `q`: scripture input.
- `newLeaf=true` or `newLeaf=1`: open in a new leaf.

## Privacy and permissions

- Translation JSON and chapter notes are read from the vault.
- `scriptureList` source can be updated when its normalization or edit actions are used.
- Clipboard access occurs only when the user invokes a paste, copy, or clipboard-opening action.
- No account, payment, telemetry, or external service is required.

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for development expectations. Version history and release assets are available on [GitHub Releases](https://github.com/der-bingle/obsidian-scripture/releases).

## Support and license

Scripture is licensed under the [MIT License](LICENSE). Development can be supported through [Buy Me a Coffee](https://buymeacoffee.com/derbingle).
