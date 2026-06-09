import { App, Editor, MarkdownView, Plugin, Notice, WorkspaceLeaf, TFile } from 'obsidian';
import { detectReferences } from 'scripture-references';
import { ScriptureModal } from './src/modal';
import { ScriptureSettingTab } from './src/settings';
import { CalloutFormatter } from './src/callout-formatter';
import { BibleDataLoader } from './src/bible-data-loader';
import { BibleVerseDisplayManager } from './src/bible-verse-display-manager';
import { BibleChapterNavigator } from './src/bible-chapter-navigator';
import { BibleNoteTitleManager } from './src/bible-note-title-manager';
import { createScriptureListRenderContext, ScriptureListRenderer } from './src/scripture-list-renderer';
import { ScriptureNoteSwitcherModal, type ScriptureNoteSuggestion } from './src/scripture-note-switcher';
import type { ScriptureSettings, BibleVerse, ScriptureAPI, BibleTranslation, ReferenceFormat } from './src/types';
import type { InsertionTarget } from './src/callout-formatter';
import { DEFAULT_SETTINGS } from './src/types';

export default class Scripture extends Plugin {
	settings: ScriptureSettings;
	private calloutFormatter: CalloutFormatter;
	private dataLoader: BibleDataLoader;
	private verseDisplayManager: BibleVerseDisplayManager;
	private chapterNavigator: BibleChapterNavigator;
	private bibleNoteTitleManager: BibleNoteTitleManager;
	public api: ScriptureAPI;

	async onload() {
		await this.loadSettings();
		
		// Initialize components
		this.calloutFormatter = new CalloutFormatter(this.settings);
		this.dataLoader = new BibleDataLoader(this.app);
		this.verseDisplayManager = new BibleVerseDisplayManager(this.app, this.settings);
		this.chapterNavigator = new BibleChapterNavigator(this.app, this.settings);
		this.bibleNoteTitleManager = new BibleNoteTitleManager(this.app, this.settings);

		// Register scriptureList codeblock processor
		this.registerMarkdownCodeBlockProcessor('scriptureList', async (source, el, ctx) => {
			const renderContext = createScriptureListRenderContext(el, ctx);
			const renderer = new ScriptureListRenderer(
				this.app,
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
				renderer.renderEmptyState(el, renderContext);
				return;
			}

			// Process references
			const processedReferences = await renderer.parseAndLookupReferences(references);

			await renderer.normalizeCodeBlockSource(source, processedReferences, renderContext);

			// Render table with section info for edit button
			await renderer.renderTable(el, processedReferences, renderContext);
		});

		// Add command to insert Scripture text
		this.addCommand({
			id: 'insert-scripture',
			name: 'Insert Scripture',
			icon: 'book-plus',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (this.settings.translations.length === 0) {
					new Notice('No translations configured. Please add translations in plugin settings.');
					return;
				}

				// Check if there's selected text and if it contains a Scripture reference
				const selectedText = editor.getSelection();
				const selectionInfo = this.extractReferenceFromSelection(selectedText);
				const insertionTarget = this.getInsertionTarget(editor, selectedText);

				new ScriptureModal(
					this.app,
					this.settings.translations,
					selectionInfo.translation || this.settings.defaultTranslation,
					this.dataLoader,
					selectionInfo.reference,
					(reference, verses, translation, includeVerseNumbers, insertScriptureFormat, referenceFormat) => {
						if (insertScriptureFormat === 'plain-text') {
							this.insertPlainText(editor, verses, includeVerseNumbers, insertionTarget);
						} else {
							this.insertScriptureCallout(editor, reference, verses, translation, includeVerseNumbers, referenceFormat, insertionTarget);
						}
					},
					this.settings.includeVerseNumbersOnInsert,
					this.settings.insertScriptureFormat,
					this.settings.calloutReferenceFormat,
					true,
					true,
					selectionInfo.cursorPosition,
					'Insert Scripture'
				).open();
			}
		});

		// Add command to insert a Scripture link only
		this.addCommand({
			id: 'insert-scripture-link',
			name: 'Insert Scripture Link',
			icon: 'link',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (this.settings.translations.length === 0) {
					new Notice('No translations configured. Please add translations in plugin settings.');
					return;
				}

				// Check if there's selected text and if it contains a Scripture reference
				const selectedText = editor.getSelection();
				const selectionInfo = this.extractReferenceFromSelection(selectedText);
				const insertionTarget = this.getInsertionTarget(editor, selectedText);

				new ScriptureModal(
					this.app,
					this.settings.translations,
					selectionInfo.translation || this.settings.defaultTranslation,
					this.dataLoader,
					selectionInfo.reference,
					(reference, verses, translation, includeVerseNumbers, _insertScriptureFormat, referenceFormat) => {
						this.insertScriptureLink(editor, reference, verses, translation, referenceFormat, insertionTarget);
					},
					this.settings.includeVerseNumbersOnInsert,
					'scripture-callout',
					this.settings.linkReferenceFormat,
					false,
					false, // Don't show verse numbers toggle for link-only insertion
					selectionInfo.cursorPosition,
					'Insert Scripture Link'
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

		// Add command to open scripture notes (quick-switcher style)
		this.addCommand({
			id: 'open-scripture-note',
			name: 'Open Scripture Note',
			icon: 'search',
			callback: () => {
				const noteTranslations = this.getNoteEnabledTranslations();
				if (noteTranslations.length === 0) {
					new Notice('No translations configured with scripture notes. Enable "Available as Notes" in settings.');
					return;
				}

				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				const selectedText = activeView?.editor?.getSelection().trim() || '';
				const initialInput = this.extractReferenceFromSelection(selectedText).reference;

				new ScriptureNoteSwitcherModal(
					this.app,
					noteTranslations,
					this.settings.defaultTranslation,
					async (input) => {
						const resolved = await this.resolveScriptureNote(input);
						if (!resolved) return null;
						const translationObj = this.settings.translations.find(t => t.name === resolved.translation);
						return {
							reference: resolved.reference,
							translation: resolved.translation,
							translationFullName: translationObj?.fullName || resolved.translation,
							path: resolved.path,
							anchor: resolved.anchor
						} as ScriptureNoteSuggestion;
					},
					async (suggestion, evt) => {
						await this.openResolvedScriptureNote(suggestion.path, suggestion.anchor, evt instanceof KeyboardEvent ? evt : undefined);
					},
					initialInput
				).open();
			}
		});

		// Add command to open scripture note from clipboard
		this.addCommand({
			id: 'open-scripture-from-clipboard',
			name: 'Open Scripture from Clipboard',
			icon: 'clipboard-paste',
			callback: async () => {
				const noteTranslations = this.getNoteEnabledTranslations();
				if (noteTranslations.length === 0) {
					new Notice('No translations configured with scripture notes. Enable "Available as Notes" in settings.');
					return;
				}

				let clipboardText: string;
				try {
					clipboardText = await navigator.clipboard.readText();
				} catch {
					new Notice('Unable to read clipboard');
					return;
				}

				if (!clipboardText.trim()) {
					new Notice('Clipboard is empty');
					return;
				}

				const success = await this.openScriptureNote(clipboardText.trim());
				if (!success) {
					new Notice('No valid scripture reference found in clipboard');
				}
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

				this.bibleNoteTitleManager.scheduleRefreshSequence();
			})
		);

		// Listen for layout changes (switching between modes)
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				// Apply verse display to any newly opened Bible notes
				setTimeout(() => {
					this.verseDisplayManager.applyVerseDisplayToOpenFiles();
				}, 100);

				this.bibleNoteTitleManager.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.bibleNoteTitleManager.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.bibleNoteTitleManager.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.bibleNoteTitleManager.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', () => {
				this.bibleNoteTitleManager.scheduleRefresh();
			})
		);

		// Add settings tab
		this.addSettingTab(new ScriptureSettingTab(this.app, this));
		
		console.log('Scripture Plugin loaded');
		console.log('Configured translations:', this.settings.translations.map(t => t.name));

		// Apply verse display to any Bible notes that are already open
		setTimeout(() => {
			this.verseDisplayManager.applyVerseDisplayToOpenFiles();
			this.bibleNoteTitleManager.refreshOpenNoteTitles();
		}, 1000);

		// Initialize and expose the public API
		this.initializeAPI();
		
		// Log API availability for verification
		console.log('Scripture Plugin API exposed at app.plugins.plugins["scripture"].api');
	}

	async onunload() {
		if (this.bibleNoteTitleManager) {
			this.bibleNoteTitleManager.restoreAllTitles();
		}

		// Clean up API reference
		if ((this.app as any).plugins?.plugins?.['scripture']?.api) {
			delete (this.app as any).plugins.plugins['scripture'].api;
		}
		console.log('Scripture Plugin unloaded');
	}

	async loadSettings() {
		const loadedSettings = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
		this.migrateReferenceFormatSettings(loadedSettings);
		
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
		if (this.bibleNoteTitleManager) {
			this.bibleNoteTitleManager.updateSettings(this.settings);
		}
	}

	private insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers?: boolean, referenceFormat?: ReferenceFormat, insertionTarget?: InsertionTarget) {
		// If includeVerseNumbers not provided, fall back to global setting
		const includeNumbers = typeof includeVerseNumbers === 'boolean' ? includeVerseNumbers : !!this.settings.includeVerseNumbersOnInsert;
		this.calloutFormatter.insertScriptureCallout(editor, reference, verses, translation, includeNumbers, referenceFormat, insertionTarget);
	}

	private insertPlainText(editor: Editor, verses: BibleVerse[], includeVerseNumbers?: boolean, insertionTarget?: InsertionTarget) {
		// If includeVerseNumbers not provided, fall back to global setting
		const includeNumbers = typeof includeVerseNumbers === 'boolean' ? includeVerseNumbers : !!this.settings.includeVerseNumbersOnInsert;
		this.calloutFormatter.insertPlainText(editor, verses, includeNumbers, insertionTarget);
	}

	private insertScriptureLink(editor: Editor, reference: string, verses: BibleVerse[], translation: string, referenceFormat?: ReferenceFormat, insertionTarget?: InsertionTarget) {
		this.calloutFormatter.insertScriptureLink(editor, reference, verses, translation, referenceFormat, insertionTarget);
	}

	private getInsertionTarget(editor: Editor, selectedText: string): InsertionTarget {
		if (selectedText.trim()) {
			return {
				from: editor.getCursor('from'),
				to: editor.getCursor('to')
			};
		}

		const cursor = editor.getCursor();
		return {
			from: cursor,
			to: cursor
		};
	}

	private extractReferenceFromSelection(selectedText: string): { reference: string; translation: string | null; cursorPosition?: 'start' | 'end' } {
		const trimmedText = selectedText.trim();

		// Only check for references if the selection is reasonable length (not a whole document)
		if (!trimmedText || selectedText.length > 100 || selectedText.includes('\n')) {
			return { reference: '', translation: null };
		}

		try {
			const matchGenerator = detectReferences(trimmedText);
			const matches = Array.from(matchGenerator);
			
			// If we found a valid reference, extract the reference and translation
			if (matches && matches.length > 0 && (matches[0] as any).ref) {
				const { reference, translation } = this.parseReferenceAndTranslation(trimmedText);
				console.log('Found Bible reference in selection:', reference, translation ? `(${translation})` : '');
				return { reference, translation };
			}
		} catch (error) {
			// If there's any error with detection, just return empty
			console.log('No Bible reference detected in selection');
		}

		if (this.isChapterVerseOnlyReference(trimmedText)) {
			const reference = selectedText.startsWith(' ') ? selectedText : ` ${trimmedText}`;
			console.log('Found chapter and verse selection:', reference);
			return { reference, translation: null, cursorPosition: 'start' };
		}

		return { reference: '', translation: null };
	}

	private isChapterVerseOnlyReference(text: string): boolean {
		return /^\d{1,3}:\d{1,3}(?:\s*[-–—]\s*(?:\d{1,3}:)?\d{1,3})?$/.test(text);
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

	private getNoteEnabledTranslations(): BibleTranslation[] {
		return this.settings.translations.filter(t => t.availableAsNotes && !!t.notesDirectory);
	}

	private normalizeDirectory(path: string): string {
		if (!path) return '';
		return path.endsWith('/') ? path : `${path}/`;
	}

	private resolveTranslationForInput(requestedTranslation: string | null): BibleTranslation | null {
		const noteTranslations = this.getNoteEnabledTranslations();
		if (noteTranslations.length === 0) return null;

		if (requestedTranslation) {
			const explicit = noteTranslations.find(t => t.name.toUpperCase() === requestedTranslation.toUpperCase());
			if (explicit) return explicit;
		}

		const defaultTranslation = noteTranslations.find(t => t.name === this.settings.defaultTranslation);
		if (defaultTranslation) return defaultTranslation;

		return noteTranslations[0] || null;
	}

	private findChapterNoteFile(translation: BibleTranslation, bookName: string, chapter: number): TFile | null {
		const notesDir = this.normalizeDirectory(translation.notesDirectory || '');
		if (!notesDir) return null;

		const candidates = [
			`${bookName} ${chapter}`,
			bookName === 'Psalms' ? `Psalm ${chapter}` : `${bookName} ${chapter}`,
			bookName === 'Psalm' ? `Psalms ${chapter}` : `${bookName} ${chapter}`
		];

		const allFiles = this.app.vault.getMarkdownFiles();
		return allFiles.find(file => {
			if (!file.path.startsWith(notesDir)) return false;
			return candidates.includes(file.basename);
		}) || null;
	}

	private async openResolvedScriptureNote(path: string, anchor?: string, evt?: KeyboardEvent): Promise<void> {
		const targetPath = anchor ? `${path}#${anchor}` : path;
		const currentFilePath = this.app.workspace.getActiveFile()?.path || '';
		const newLeaf = !!(evt && (evt.metaKey || evt.ctrlKey));
		await this.app.workspace.openLinkText(targetPath, currentFilePath, newLeaf, { active: true });
	}

	private async resolveScriptureNote(input: string): Promise<{ reference: string; translation: string; path: string; anchor?: string } | null> {
		if (!input?.trim()) return null;

		const { reference, translation: requestedTranslation } = this.parseReferenceAndTranslation(input.trim());
		const translation = this.resolveTranslationForInput(requestedTranslation);
		if (!translation) return null;

		const matches = Array.from(detectReferences(reference));
		if (!matches.length || !(matches[0] as any).ref) return null;

		const ref = (matches[0] as any).ref;
		const chapter = ref.start_chapter;
		const verse = ref.start_verse;

		const bibleData = await this.dataLoader.loadTranslation(translation);
		if (!bibleData?.books?.length) return null;

		const bookId = String(ref.book || '').toUpperCase();
		const book = bibleData.books.find(b => b.id === bookId);
		if (!book || !chapter) return null;

		const chapterFile = this.findChapterNoteFile(translation, book.title, chapter);
		if (!chapterFile) return null;

		return {
			reference,
			translation: translation.name,
			path: chapterFile.path,
			anchor: verse ? String(verse) : undefined
		};
	}

	private async openScriptureNote(input: string, options?: { openInNewLeaf?: boolean; silent?: boolean }): Promise<boolean> {
		const resolved = await this.resolveScriptureNote(input);
		if (!resolved) {
			if (!options?.silent) {
				new Notice('Could not resolve scripture note from input');
			}
			return false;
		}

		const currentFilePath = this.app.workspace.getActiveFile()?.path || '';
		const targetPath = resolved.anchor ? `${resolved.path}#${resolved.anchor}` : resolved.path;
		await this.app.workspace.openLinkText(targetPath, currentFilePath, !!options?.openInNewLeaf, { active: true });
		return true;
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
			normalizeBookName: this.normalizeBookName.bind(this),
			resolveScriptureNote: this.resolveScriptureNote.bind(this),
			openScriptureNote: this.openScriptureNote.bind(this)
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

		this.registerObsidianProtocolHandler('open-scripture-note', async (params: Record<string, string>) => {
			const input = params.reference || params.ref || params.q || '';
			if (!input) {
				new Notice('Missing reference parameter');
				return;
			}

			const openInNewLeaf = params.newLeaf === '1' || params.newLeaf === 'true';
			await this.openScriptureNote(input, { openInNewLeaf });
		});
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

	private migrateReferenceFormatSettings(loadedSettings: any): void {
		const legacyReferenceFormat = loadedSettings?.referenceFormat as ReferenceFormat | undefined;
		if (legacyReferenceFormat && !loadedSettings.calloutReferenceFormat) {
			this.settings.calloutReferenceFormat = legacyReferenceFormat;
		}
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
