# Scripture Plugin for Obsidian

A comprehensive scripture study plugin for Obsidian that provides reference insertion, translation management, and Bible note formatting capabilities.

## Features

### 📖 Scripture Reference Insertion
- **Quick Reference Modal**: Insert scripture references with a modal interface
- **Smart Text Detection**: Automatically detects Bible references in selected text
- **Multiple Translations**: Support for multiple Bible translations with easy switching
- **Formatted Callouts**: Creates beautifully formatted scripture callouts with proper formatting

### 🔄 Translation Management  
- **Multiple Translation Support**: Configure and manage multiple Bible translations
- **Translation Validation**: Built-in validation to ensure Bible data files are properly formatted
- **Default Translation Setting**: Set your preferred default translation
- **Translation-Specific Linking**: Choose linking strategies for different translations

### 📝 Bible Note Integration
- **Chapter Navigation**: Navigate between the same chapter in different translations
- **Verse Number Display**: Control verse number visibility and display modes
- **Bible Note Detection**: Automatically applies styling to Bible chapter notes in your vault
- **Customizable Display**: Toggle between showing all verse numbers, first only, or none

### 📋 Scripture List Rendering
- **Code Block Table Rendering**: Render `scriptureList` code blocks as grouped scripture tables
- **Row Highlighting**: Prefix a line with `- ` (or `* `) to highlight that rendered row

### 🎨 Formatting Options
- **Verse Number Control**: Include, exclude, or show all but first verse numbers
- **Translation Display**: Choose when to show translation names in callouts
- **Callout Folding**: Configure whether scripture callouts are foldable
- **Hidden Links**: Add individual verse links for multi-verse passages
- **Linking Strategies**: Link to default translation or verse-specific translation

## Commands

- **Insert Scripture Reference** (`insert-scripture-reference`): Open the reference insertion modal
- **Open Scripture Note** (`open-scripture-note`): Quick-switcher style opener for scripture chapter notes
- **Open Chapter in Other Translation** (`open-chapter-in-translation`): Navigate between translations (available when Bible chapter note is open)  
- **Toggle Verse Numbers** (`toggle-verse-numbers`): Toggle verse number visibility
- **Show First Verse Only** (`show-first-verse-only`): Display first verse numbers only
- **Show All Verse Numbers** (`show-all-verse-numbers`): Display all verse numbers

## Installation

### Manual Installation
1. Download the latest release from the [releases page](https://github.com/yourusername/obsidian-scripture/releases)
2. Extract the files to your vault's `.obsidian/plugins/scripture/` directory
3. Reload Obsidian and enable the Scripture plugin in settings

### For Development
1. Clone this repository to your vault's `.obsidian/plugins/` directory
2. Run `npm install` to install dependencies
3. Run `npm run dev` for development or `npm run build` for production
4. Reload Obsidian and enable the plugin

## Configuration

### Adding Bible Translations
1. Go to Settings → Scripture → Bible Translations
2. Click "Add Translation"
3. Configure:
   - **Translation Name**: Short name (e.g., ESV, NIV)
   - **Full Name**: Complete name (e.g., English Standard Version)  
   - **File Path**: Path to your Bible JSON data file
   - **Available as Notes**: Check if you have Bible chapter notes in your vault
   - **Notes Directory**: Directory containing your Bible chapter notes

### Bible Data Format
Bible data files should be in JSON format with the following structure:

```json
{
  "translation": "ESV",
  "books": [
    {
      "id": "GEN",
      "title": "Genesis",
      "chapters": [
        {
          "chapter": 1,
          "verses": [
            {
              "id": "GEN.1.1",
              "book": "Genesis",
              "chapter": 1,
              "verse": 1,
              "content": ["In the beginning, God created the heavens and the earth."],
              "newParagraph": true,
              "poetry": false
            }
          ]
        }
      ]
    }
  ]
}
```

## Public API

The plugin exposes a public API for other plugins to use:

```javascript
const scriptureAPI = app.plugins.plugins['scripture'].api;

if (scriptureAPI) {
  // Get primary translation object
  const primary = scriptureAPI.getPrimaryTranslation();
  
  // Get all available translations
  const translations = scriptureAPI.getAvailableTranslations();
  
  // Get specific translation settings  
  const esv = scriptureAPI.getTranslationSettings('ESV');
  
  // Format verse references as Obsidian links
  const link = scriptureAPI.formatVerseReference("John", 3, 16, "ESV");
  
  // Parse scripture references from text
  const parsed = scriptureAPI.parseScriptureReference("John 3:16 ESV");

  // Resolve scripture note target without opening
  const target = await scriptureAPI.resolveScriptureNote("John 3:16 NLT");

  // Open scripture note directly (no modal interaction)
  await scriptureAPI.openScriptureNote("John 3:16 NLT");
  
  // Normalize book names
  const normalized = scriptureAPI.normalizeBookName("1 Cor");
}
```

### Obsidian URI protocol integration

The plugin also registers an Obsidian protocol handler:

`obsidian://scripture/open-scripture-note?reference=John%203%3A16%20NLT`

Accepted query params:
- `reference` (or `ref` / `q`): scripture input text
- `newLeaf` (`true`/`1`): open in a new leaf

## Styling and Customization

The plugin includes comprehensive CSS styling for Bible notes with Style Settings integration. Customize:

- Verse number appearance and positioning
- Typography and font settings  
- Text justification
- Heading alignment
- Margin and spacing

### Highlighting in `scriptureList` code blocks

Use the `scriptureList` code block with one reference per line:

````markdown
```scriptureList
John 3:16
- Romans 8:28-30
* Psalm 23:1-6
```
````

Lines prefixed with `- ` or `* ` are rendered as highlighted rows in the output table.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

If you find this plugin helpful, consider supporting its development:
- [Buy Me a Coffee](https://buymeacoffee.com/yourusername)
- [GitHub Sponsors](https://github.com/sponsors/yourusername)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main repository.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
