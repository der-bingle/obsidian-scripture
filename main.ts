import { App, Editor, MarkdownView, Plugin, Notice, WorkspaceLeaf } from 'obsidian';
import { ScriptureModal } from './src/modal';
import { ScriptureSettingTab } from './src/settings';
import { CalloutFormatter } from './src/callout-formatter';
import { BibleDataLoader } from './src/bible-data-loader';
import { BibleVerseDisplayManager } from './src/bible-verse-display-manager';
import { BibleChapterNavigator } from './src/bible-chapter-navigator';
import { ScriptureListRenderer } from './src/scripture-list-renderer';
import type { ScriptureSettings, BibleVerse, ScriptureAPI, BibleTranslation } from './src/types';
import { DEFAULT_SETTINGS } from './src/types';

export default class Scripture extends Plugin {
	settings: ScriptureSettings;
	private calloutFormatter: CalloutFormatter;
	private dataLoader: BibleDataLoader;
	private verseDisplayManager: BibleVerseDisplayManager;
	private chapterNavigator: BibleChapterNavigator;
	public api: ScriptureAPI;

	async onload() {
		await this.loadSettings();
		
		// Initialize components
		this.calloutFormatter = new CalloutFormatter(this.settings);
		this.dataLoader = new BibleDataLoader(this.app);
		this.verseDisplayManager = new BibleVerseDisplayManager(this.app, this.settings);
		this.chapterNavigator = new BibleChapterNavigator(this.app, this.settings);

		// Register scriptureList codeblock processor
		this.registerMarkdownCodeBlockProcessor('scriptureList', async (source, el, ctx) => {
			const renderer = new ScriptureListRenderer(
				this.dataLoader,
				this.calloutFormatter,
				this.settings.translations,
				this.settings.defaultTranslation,
				this.settings
			);

			// Parse input
			const references = renderer.parseScriptureListInput(source);

			if (references.length === 0) {
				// Empty codeblock - render empty state with edit option
				renderer.renderEmptyState(el, ctx);
				return;
			}

			// Process references
			const processedReferences = await renderer.parseAndLookupReferences(references);

			// Render table with section info for edit button
			await renderer.renderTable(el, processedReferences, ctx);
		});

		// Add command to open reference modal
		this.addCommand({
			id: 'insert-scripture-reference',
			name: 'Insert Scripture Reference',
			icon: 'book-plus',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (this.settings.translations.length === 0) {
					new Notice('No Bible translations configured. Please add translations in plugin settings.');
					return;
				}

				// Check if there's selected text and if it contains a Bible reference
				const selectedText = editor.getSelection().trim();
				const selectionInfo = this.extractReferenceFromSelection(selectedText);

				new ScriptureModal(
					this.app,
					this.settings.translations,
					selectionInfo.translation || this.settings.defaultTranslation,
					this.dataLoader,
					selectionInfo.reference,
					(reference, verses, translation, includeVerseNumbers, insertAsPlainText, referenceFormat) => {
						if (insertAsPlainText) {
							this.insertPlainText(editor, verses, includeVerseNumbers);
						} else {
							this.insertScriptureCallout(editor, reference, verses, translation, includeVerseNumbers, referenceFormat);
						}
					},
					this.settings.includeVerseNumbersOnInsert,
					this.settings.referenceFormat
				).open();
			}
		});

		// Add command to insert scripture link only
		this.addCommand({
			id: 'insert-scripture-link',
			name: 'Insert Scripture Link',
			icon: 'link',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (this.settings.translations.length === 0) {
					new Notice('No Bible translations configured. Please add translations in plugin settings.');
					return;
				}

				// Check if there's selected text and if it contains a Bible reference
				const selectedText = editor.getSelection().trim();
				const selectionInfo = this.extractReferenceFromSelection(selectedText);

				new ScriptureModal(
					this.app,
					this.settings.translations,
					selectionInfo.translation || this.settings.defaultTranslation,
					this.dataLoader,
					selectionInfo.reference,
					(reference, verses, translation, includeVerseNumbers, insertAsPlainText, referenceFormat) => {
						this.insertScriptureLink(editor, verses, translation, referenceFormat);
					},
					this.settings.includeVerseNumbersOnInsert,
					this.settings.referenceFormat,
					false // Don't show verse numbers toggle for link-only insertion
				).open();
			}
		});

		// Add command to navigate between Bible chapter translations
		this.addCommand({
			id: 'open-chapter-in-translation',
			name: 'Open Chapter in Other Translation',
			icon: 'book-open',
			checkCallback: (checking: boolean) => {
				// Only enable command when a Bible chapter note is open
				if (this.chapterNavigator.canNavigate()) {
					if (!checking) {
						this.chapterNavigator.openTranslationSelector();
					}
					return true;
				}
				return false;
			}
		});

		// Add command to toggle verse number visibility
		this.addCommand({
			id: 'toggle-verse-numbers',
			name: 'Toggle Verse Numbers',
			callback: () => {
				const displayName = this.verseDisplayManager.toggleVerseNumbers();
				this.saveSettings();
				new Notice(`Verse numbers: ${displayName}`);
			}
		});

		// Add command to show first verse only
		this.addCommand({
			id: 'show-first-verse-only',
			name: 'Show First Verse Only',
			callback: () => {
				const displayName = this.verseDisplayManager.showFirstVerseOnly();
				this.saveSettings();
				new Notice(`Verse numbers: ${displayName}`);
			}
		});

		// Add command to show all verse numbers
		this.addCommand({
			id: 'show-all-verse-numbers',
			name: 'Show All Verse Numbers',
			callback: () => {
				const displayName = this.verseDisplayManager.showAllVerseNumbers();
				this.saveSettings();
				new Notice(`Verse numbers: ${displayName}`);
			}
		});

		// Listen for file open events to apply verse display to Bible notes
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file && this.verseDisplayManager.isBibleNote(file)) {
					// Use setTimeout to ensure the view is fully loaded
					setTimeout(() => {
						const activeLeaf = this.app.workspace.activeLeaf;
						if (activeLeaf) {
							this.verseDisplayManager.applyVerseDisplayToLeaf(activeLeaf);
						}
					}, 100);
				}
			})
		);

		// Listen for layout changes (switching between modes)
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				// Apply verse display to any newly opened Bible notes
				setTimeout(() => {
					this.verseDisplayManager.applyVerseDisplayToOpenFiles();
				}, 100);
			})
		);

		// Add settings tab
		this.addSettingTab(new ScriptureSettingTab(this.app, this));
		
		console.log('Scripture Plugin loaded');
		console.log('Configured translations:', this.settings.translations.map(t => t.name));

		// Apply verse display to any Bible notes that are already open
		setTimeout(() => {
			this.verseDisplayManager.applyVerseDisplayToOpenFiles();
		}, 1000);

		// Initialize and expose the public API
		this.initializeAPI();
		
		// Log API availability for verification
		console.log('Scripture Plugin API exposed at app.plugins.plugins["scripture"].api');
	}

	async onunload() {
		// Clean up API reference
		if ((this.app as any).plugins?.plugins?.['scripture']?.api) {
			delete (this.app as any).plugins.plugins['scripture'].api;
		}
		console.log('Scripture Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		
		// Migrate old settings if needed
		await this.migrateOldSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// Update components when settings change
		this.updateComponentSettings();
	}

	private updateComponentSettings() {
		if (this.calloutFormatter) {
			this.calloutFormatter.updateSettings(this.settings);
		}
		if (this.verseDisplayManager) {
			this.verseDisplayManager.updateSettings(this.settings);
		}
		if (this.chapterNavigator) {
			this.chapterNavigator.updateSettings(this.settings);
		}
	}

	private insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers?: boolean, referenceFormat?: ScriptureSettings['referenceFormat']) {
		// If includeVerseNumbers not provided, fall back to global setting
		const includeNumbers = typeof includeVerseNumbers === 'boolean' ? includeVerseNumbers : !!this.settings.includeVerseNumbersOnInsert;
		this.calloutFormatter.insertScriptureCallout(editor, reference, verses, translation, includeNumbers, referenceFormat);
	}

	private insertPlainText(editor: Editor, verses: BibleVerse[], includeVerseNumbers?: boolean) {
		// If includeVerseNumbers not provided, fall back to global setting
		const includeNumbers = typeof includeVerseNumbers === 'boolean' ? includeVerseNumbers : !!this.settings.includeVerseNumbersOnInsert;
		this.calloutFormatter.insertPlainText(editor, verses, includeNumbers);
	}

	private insertScriptureLink(editor: Editor, verses: BibleVerse[], translation: string, referenceFormat?: ScriptureSettings['referenceFormat']) {
		this.calloutFormatter.insertScriptureLink(editor, verses, translation, referenceFormat);
	}

	private extractReferenceFromSelection(selectedText: string): { reference: string; translation: string | null } {
		// Only check for references if the selection is reasonable length (not a whole document)
		if (!selectedText || selectedText.length > 100 || selectedText.includes('\n')) {
			return { reference: '', translation: null };
		}

		try {
			// Import detect_references for validation
			const { detectReferences } = require('scripture-references');
			
			const matchGenerator = detectReferences(selectedText);
			const matches = Array.from(matchGenerator);
			
			// If we found a valid reference, extract the reference and translation
			if (matches && matches.length > 0 && (matches[0] as any).ref) {
				const { reference, translation } = this.parseReferenceAndTranslation(selectedText);
				console.log('Found Bible reference in selection:', reference, translation ? `(${translation})` : '');
				return { reference, translation };
			}
		} catch (error) {
			// If there's any error with detection, just return empty
			console.log('No Bible reference detected in selection');
		}

		return { reference: '', translation: null };
	}

	private parseReferenceAndTranslation(text: string): { reference: string; translation: string | null } {
		// Look for common translation patterns at the end of the reference
		// Matches patterns like: "John 3:16, NET" or "John 3:16 (ESV)" or "John 3:16 NET"
		const translationPatterns = [
			/, ([A-Z]{2,5})$/,           // "John 3:16, NET"
			/\(([A-Z]{2,5})\)$/,         // "John 3:16 (NET)"
			/ ([A-Z]{2,5})$/             // "John 3:16 NET"
		];

		for (const pattern of translationPatterns) {
			const match = text.match(pattern);
			if (match) {
				const possibleTranslation = match[1];
				
				// Check if this translation exists in our configured translations
				const foundTranslation = this.settings.translations.find(t => 
					t.name.toUpperCase() === possibleTranslation.toUpperCase()
				);
				
				if (foundTranslation) {
					// Remove the translation part to get clean reference
					const reference = text.replace(pattern, '').trim();
					return { reference, translation: foundTranslation.name };
				}
			}
		}

		// No translation found or translation not configured, return full text as reference
		return { reference: text.trim(), translation: null };
	}

	/**
	 * Initialize and expose the public API for other plugins to use
	 * 
	 * Usage example:
	 * ```javascript
	 * const scriptureAPI = app.plugins.plugins['scripture'].api;
	 * if (scriptureAPI) {
	 *   const primary = scriptureAPI.getPrimaryTranslation();
	 *   const link = scriptureAPI.formatVerseReference("John", 3, 16);
	 *   console.log(`Primary translation: ${primary?.name}, Link: ${link}`);
	 * }
	 * ```
	 */
	private initializeAPI(): void {
		this.api = {
			getPrimaryTranslation: this.getPrimaryTranslation.bind(this),
			getAvailableTranslations: this.getAvailableTranslations.bind(this),
			getTranslationSettings: this.getTranslationSettings.bind(this),
			formatVerseReference: this.formatVerseReference.bind(this),
			parseScriptureReference: this.parseScriptureReference.bind(this),
			normalizeBookName: this.normalizeBookName.bind(this)
		};

		// Expose API on the global app object
		if (!(this.app as any).plugins) {
			(this.app as any).plugins = {};
		}
		if (!(this.app as any).plugins.plugins) {
			(this.app as any).plugins.plugins = {};
		}
		if (!(this.app as any).plugins.plugins['scripture']) {
			(this.app as any).plugins.plugins['scripture'] = this;
		}
		(this.app as any).plugins.plugins['scripture'].api = this.api;
	}

	/**
	 * Get the currently configured primary/default translation
	 */
	private getPrimaryTranslation(): BibleTranslation | null {
		if (!this.settings || !this.settings.defaultTranslation) {
			return null;
		}
		return this.getTranslationSettings(this.settings.defaultTranslation);
	}

	/**
	 * Get all configured Bible translations
	 */
	private getAvailableTranslations(): BibleTranslation[] {
		if (!this.settings || !this.settings.translations) {
			return [];
		}
		return [...this.settings.translations]; // Return a copy to prevent external modification
	}

	/**
	 * Get settings for a specific translation
	 */
	private getTranslationSettings(translationId: string): BibleTranslation | null {
		if (!this.settings || !this.settings.translations || !translationId) {
			return null;
		}
		
		const found = this.settings.translations.find(t => t.name === translationId);
		return found ? { ...found } : null; // Return a copy to prevent external modification
	}

	/**
	 * Format a verse reference into proper Obsidian link format
	 */
	private formatVerseReference(book: string, chapter: number, verse?: number, translation?: string): string {
		if (!book || !chapter) {
			return '';
		}

		// Use provided translation or fall back to primary translation
		let translationSettings: BibleTranslation | null;
		if (translation) {
			translationSettings = this.getTranslationSettings(translation);
		} else {
			translationSettings = this.getPrimaryTranslation();
		}
		if (!translationSettings) {
			return '';
		}

		// Normalize the book name if possible
		const normalizedBook = this.normalizeBookName(book);

		// Format the reference based on whether we have verse number
		let reference: string;
		if (verse) {
			reference = `${normalizedBook} ${chapter}:${verse}`;
		} else {
			reference = `${normalizedBook} ${chapter}`;
		}

		// If translation has notes available, create a link to the chapter note
		if (translationSettings.availableAsNotes && translationSettings.notesDirectory) {
			const notesDir = translationSettings.notesDirectory.endsWith('/') 
				? translationSettings.notesDirectory 
				: translationSettings.notesDirectory + '/';
			
			if (verse) {
				// Link to chapter with verse anchor
				return `[[${notesDir}${normalizedBook} ${chapter}#${verse}]]`;
			} else {
				// Link to chapter
				return `[[${notesDir}${normalizedBook} ${chapter}]]`;
			}
		} else {
			// Return formatted reference without link if no notes available
			return reference;
		}
	}

	/**
	 * Parse scripture references from text using existing plugin functionality
	 */
	private parseScriptureReference(text: string): { reference: string; translation: string | null } {
		if (!text || text.trim() === '') {
			return { reference: '', translation: null };
		}

		// Use the existing parseReferenceAndTranslation method
		return this.parseReferenceAndTranslation(text);
	}

	/**
	 * Normalize book name variations and abbreviations to standard form
	 */
	private normalizeBookName(bookName: string): string {
		if (!bookName || bookName.trim() === '') {
			return bookName;
		}

	// For now, return the book name as-is since the plugin doesn't have 
	// a comprehensive book name normalization system implemented yet.
	// This could be enhanced to use the `scripture-references` package
	// or create a book name mapping table.
		return bookName.trim();
	}

	private async migrateOldSettings() {
		// Check if we have old single-translation settings to migrate
		const oldSettings = this.settings as any;
		
		if (oldSettings.bibleDataPath && this.settings.translations.length === 0) {
			console.log('Migrating old Bible Reference settings...');
			
			// Create a translation entry from old settings
			const translation = {
				name: oldSettings.defaultVersion || 'Default',
				fullName: oldSettings.defaultVersion || 'Default',
				filePath: oldSettings.bibleDataPath
			};
			
			this.settings.translations = [translation];
			this.settings.defaultTranslation = translation.name;
			
			// Clean up old properties
			delete oldSettings.bibleDataPath;
			delete oldSettings.defaultVersion;
			
			await this.saveSettings();
			
			new Notice('Scripture settings migrated to new format. Please verify translations in settings.');
		}
	}
}
