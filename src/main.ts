import { App, Editor, MarkdownView, Plugin, Notice, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';
import { detectReferences } from 'scripture-references';
import { ScriptureModal } from './modal';
import { ScriptureSettingTab } from './settings';
import { CalloutFormatter } from './callout-formatter';
import { BibleDataLoader } from './bible-data-loader';
import { BibleVerseDisplayManager } from './bible-verse-display-manager';
import { BibleChapterNavigator } from './bible-chapter-navigator';
import { BibleNoteTitleManager } from './bible-note-title-manager';
import { createScriptureListRenderContext, ScriptureListRenderer } from './scripture-list-renderer';
import { ScriptureNoteSwitcherModal } from './scripture-note-switcher';
import type { ScriptureSettings, BibleVerse, ScriptureAPI, ScriptureCalloutOptions, ScriptureCalloutResult, BibleTranslation, ReferenceFormat, ScriptureSidebarSide, ScriptureSidebarState } from './types';
import { parseAndLookupReference } from './verse-lookup';
import type { InsertionTarget } from './callout-formatter';
import { migrateStoredSettings } from './settings-migrations';
import { getBibleNoteChapterReference } from './bible-note-utils';
import { resolveScriptureLink } from './scripture-link';
import { cloneScriptureSidebarState, createScriptureSidebarState, getSidebarDefaultTranslation } from './scripture-sidebar-state';
import { SCRIPTURE_SIDEBAR_VIEW_TYPE, ScriptureSidebarView } from './scripture-sidebar-view';
import { orderTranslations } from './translation-order';

interface AppWithPlugins extends App {
	plugins: {
		plugins: Record<string, Scripture>;
	};
}

export default class Scripture extends Plugin {
	settings!: ScriptureSettings;
	private calloutFormatter!: CalloutFormatter;
	private dataLoader!: BibleDataLoader;
	private verseDisplayManager!: BibleVerseDisplayManager;
	private chapterNavigator!: BibleChapterNavigator;
	private bibleNoteTitleManager!: BibleNoteTitleManager;
	private lastUsedSidebarLeaf: WorkspaceLeaf | null = null;
	private translationConfigSignature = '';
	public api!: ScriptureAPI;

	async onload() {
		await this.loadSettings();
		
		// Initialize components
		this.calloutFormatter = new CalloutFormatter(this.settings);
		this.dataLoader = new BibleDataLoader(this.app);
		this.translationConfigSignature = this.getTranslationConfigSignature();
		this.verseDisplayManager = new BibleVerseDisplayManager(this.app, this.settings);
		this.chapterNavigator = new BibleChapterNavigator(this.app, this.settings);
		this.bibleNoteTitleManager = new BibleNoteTitleManager(this.app, this.settings);

		this.registerView(SCRIPTURE_SIDEBAR_VIEW_TYPE, leaf => new ScriptureSidebarView(
			leaf,
			this.dataLoader,
			{
				getSettings: () => this.settings,
				onStateChange: state => this.persistSidebarState(state),
				onUsed: usedLeaf => this.markSidebarUsed(usedLeaf),
			},
		));

		this.addRibbonIcon('book-open-text', 'Open Scripture sidebar', () => {
			void this.openScriptureSidebar();
		});

		this.addCommand({
			id: 'open-scripture-sidebar',
			name: 'Open sidebar',
			icon: 'book-open-text',
			callback: () => void this.openScriptureSidebar(),
		});

		this.addCommand({
			id: 'open-new-scripture-sidebar',
			name: 'Open new sidebar',
			icon: 'book-copy',
			callback: () => void this.openNewScriptureSidebar(),
		});

		this.addCommand({
			id: 'open-current-chapter-in-scripture-sidebar',
			name: 'Open current chapter in sidebar',
			icon: 'panel-right-open',
			checkCallback: checking => {
				const reference = this.getActiveBibleNoteReference();
				if (!reference) return false;
				if (!checking) void this.openCurrentChapterInSidebar(reference.bookId, reference.chapter);
				return true;
			},
		});

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
			name: 'Insert',
			icon: 'book-plus',
			editorCallback: (editor: Editor) => {
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
					'Insert scripture'
				).open();
			}
		});

		// Add command to insert a Scripture link only
		this.addCommand({
			id: 'insert-scripture-link',
			name: 'Insert link',
			icon: 'link',
			editorCallback: (editor: Editor) => {
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
					'Insert scripture link'
				).open();
			}
		});

		// Add command to navigate between Bible chapter translations
		this.addCommand({
			id: 'open-chapter-in-translation',
			name: 'Open chapter in other translation',
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
			name: 'Open note',
			icon: 'search',
			callback: () => {
				const noteTranslations = this.getNoteEnabledTranslations();
				if (noteTranslations.length === 0) {
					new Notice('No translations configured with Scripture notes. Enable "available as notes" in settings.');
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
						};
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
			name: 'Open from clipboard',
			icon: 'clipboard-paste',
			callback: async () => {
				const noteTranslations = this.getNoteEnabledTranslations();
				if (noteTranslations.length === 0) {
					new Notice('No translations configured with Scripture notes. Enable "available as notes" in settings.');
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
					new Notice('No valid Scripture reference found in clipboard');
				}
			}
		});

		// Add command to toggle verse number visibility
		this.addCommand({
			id: 'toggle-verse-numbers',
			name: 'Toggle verse numbers',
			callback: () => {
				const displayName = this.verseDisplayManager.toggleVerseNumbers();
				this.refreshSidebarVerseDisplay();
				void this.saveSettings();
				new Notice(`Verse numbers: ${displayName}`);
			}
		});

		// Add command to show first verse only
		this.addCommand({
			id: 'show-first-verse-only',
			name: 'Show first verse only',
			callback: () => {
				const displayName = this.verseDisplayManager.showFirstVerseOnly();
				this.refreshSidebarVerseDisplay();
				void this.saveSettings();
				new Notice(`Verse numbers: ${displayName}`);
			}
		});

		// Add command to show all verse numbers
		this.addCommand({
			id: 'show-all-verse-numbers',
			name: 'Show all verse numbers',
			callback: () => {
				const displayName = this.verseDisplayManager.showAllVerseNumbers();
				this.refreshSidebarVerseDisplay();
				void this.saveSettings();
				new Notice(`Verse numbers: ${displayName}`);
			}
		});

		// Listen for file open events to apply verse display to Bible notes
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file && this.verseDisplayManager.isBibleNote(file)) {
					// Use setTimeout to ensure the view is fully loaded
					window.setTimeout(() => this.verseDisplayManager.applyVerseDisplayToOpenFiles(), 100);
				}

				this.bibleNoteTitleManager.scheduleRefreshSequence();
			})
		);

		// Listen for layout changes (switching between modes)
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				// Apply verse display to any newly opened Bible notes
				window.setTimeout(() => {
					this.verseDisplayManager.applyVerseDisplayToOpenFiles();
				}, 100);

				this.bibleNoteTitleManager.scheduleRefresh();
				this.refreshSidebarSides();
			})
		);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				this.bibleNoteTitleManager.scheduleRefresh();
				if (leaf?.view instanceof ScriptureSidebarView) this.markSidebarUsed(leaf);
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
		
		// Apply verse display to any Bible notes that are already open
		window.setTimeout(() => {
			this.verseDisplayManager.applyVerseDisplayToOpenFiles();
			this.bibleNoteTitleManager.refreshOpenNoteTitles();
		}, 1000);

		// Initialize and expose the public API
		this.initializeAPI();
		
	}

	onunload(): void {
		if (this.bibleNoteTitleManager) {
			this.bibleNoteTitleManager.restoreAllTitles();
		}
		this.lastUsedSidebarLeaf = null;

		// Clean up API reference
		const legacyAlias = (this.app as AppWithPlugins).plugins.plugins.scripture;
		if (legacyAlias?.api === this.api) {
			delete (legacyAlias as Partial<Scripture>).api;
		}
	}

	async loadSettings(): Promise<void> {
		const migration = migrateStoredSettings(await this.loadData(), normalizePath);
		this.settings = migration.settings;
		if (migration.didMigrate) {
			await this.saveSettings();
			new Notice('Scripture settings migrated to the current format. Please verify translations in settings.');
		}
	}

	async saveSettings(): Promise<void> {
		const noteTranslationCount = this.settings.translations.filter(translation => translation.availableAsNotes && translation.notesDirectory).length;
		if (noteTranslationCount < 2 && this.settings.linkingStrategy === 'verse-translation') {
			this.settings.linkingStrategy = 'default-translation';
		}
		if (!this.settings.translations.some(translation => translation.name === this.settings.sidebarDefaultTranslation)) {
			this.settings.sidebarDefaultTranslation = getSidebarDefaultTranslation(this.settings);
		}
		const translationConfigSignature = this.getTranslationConfigSignature();
		if (this.dataLoader && translationConfigSignature !== this.translationConfigSignature) {
			this.dataLoader.clearCache();
			this.translationConfigSignature = translationConfigSignature;
		}
		await this.saveData(this.settings);
		
		// Update components when settings change
		this.updateComponentSettings();
	}

	private updateComponentSettings(): void {
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
		this.getSidebarViews().forEach(({ view }) => view.updateSettings());
	}

	private getTranslationConfigSignature(): string {
		return JSON.stringify(this.settings.translations.map(translation => ({
			name: translation.name,
			filePath: translation.filePath,
		})));
	}

	refreshVerseDisplay(): void {
		this.verseDisplayManager.applyVerseDisplayToOpenFiles();
		this.refreshSidebarVerseDisplay();
	}

	refreshBibleNoteTitles(): void {
		this.bibleNoteTitleManager.refreshOpenNoteTitles();
	}

	private getSidebarViews(): Array<{ leaf: WorkspaceLeaf; view: ScriptureSidebarView }> {
		return this.app.workspace.getLeavesOfType(SCRIPTURE_SIDEBAR_VIEW_TYPE)
			.flatMap(leaf => leaf.view instanceof ScriptureSidebarView ? [{ leaf, view: leaf.view }] : []);
	}

	private refreshSidebarVerseDisplay(): void {
		this.getSidebarViews().forEach(({ view }) => view.updateVerseDisplay());
	}

	private getMostRecentSidebar(): { leaf: WorkspaceLeaf; view: ScriptureSidebarView } | null {
		if (this.lastUsedSidebarLeaf?.view instanceof ScriptureSidebarView) {
			return { leaf: this.lastUsedSidebarLeaf, view: this.lastUsedSidebarLeaf.view };
		}
		const mostRecent = this.getSidebarViews().sort((left, right) => right.view.getLastUsedAt() - left.view.getLastUsedAt())[0] || null;
		this.lastUsedSidebarLeaf = mostRecent?.leaf || null;
		return mostRecent;
	}

	private markSidebarUsed(leaf: WorkspaceLeaf): void {
		if (leaf.view instanceof ScriptureSidebarView) this.lastUsedSidebarLeaf = leaf;
	}

	private persistSidebarState(state: ScriptureSidebarState): void {
		if (!this.settings.lastSidebarState || state.lastUsedAt >= this.settings.lastSidebarState.lastUsedAt) {
			this.settings.lastSidebarState = { ...state };
			void this.saveData(this.settings);
		}
		this.app.workspace.requestSaveLayout();
	}

	private async openScriptureSidebar(): Promise<void> {
		const existing = this.getMostRecentSidebar();
		if (existing) {
			existing.view.activate();
			await this.app.workspace.revealLeaf(existing.leaf);
			return;
		}
		const state = this.settings.lastSidebarState
			? createScriptureSidebarState(this.settings, this.settings.lastSidebarState)
			: createScriptureSidebarState(this.settings);
		await this.createSidebar(state, false);
	}

	private async openNewScriptureSidebar(): Promise<void> {
		const existing = this.getMostRecentSidebar();
		const source = existing?.view.getSidebarState() || this.settings.lastSidebarState;
		const state = source
			? cloneScriptureSidebarState(this.settings, source)
			: createScriptureSidebarState(this.settings);
		await this.createSidebar(state, true);
	}

	private async openCurrentChapterInSidebar(bookId: string, chapter: number): Promise<void> {
		const existing = this.getMostRecentSidebar();
		if (existing) {
			await existing.view.navigateToChapter(bookId, chapter);
			await this.app.workspace.revealLeaf(existing.leaf);
			return;
		}

		const state = createScriptureSidebarState(this.settings, {
			translation: getSidebarDefaultTranslation(this.settings),
			bookId,
			chapter,
			anchorVerse: 1,
			anchorOffset: 0,
			side: this.settings.lastSidebarState?.side || 'right',
		});
		await this.createSidebar(state, false);
	}

	private async createSidebar(state: ScriptureSidebarState, split: boolean): Promise<void> {
		const leaf = state.side === 'left'
			? this.app.workspace.getLeftLeaf(split)
			: this.app.workspace.getRightLeaf(split);
		if (!leaf) {
			new Notice('Unable to create Scripture sidebar');
			return;
		}
		await leaf.setViewState({ type: SCRIPTURE_SIDEBAR_VIEW_TYPE, active: true, state: { ...state } });
		if (leaf.view instanceof ScriptureSidebarView) {
			this.lastUsedSidebarLeaf = leaf;
			leaf.view.activate();
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	private getActiveBibleNoteReference(): { bookId: string; chapter: number } | null {
		const file = this.app.workspace.getActiveFile();
		return file ? getBibleNoteChapterReference(this.app, this.settings, file) : null;
	}

	private refreshSidebarSides(): void {
		for (const { leaf, view } of this.getSidebarViews()) {
			const side = this.getLeafSide(leaf);
			if (side) view.setSide(side);
		}
	}

	private getLeafSide(leaf: WorkspaceLeaf): ScriptureSidebarSide | null {
		let item: unknown = leaf.parent;
		while (item && typeof item === 'object') {
			if (item === this.app.workspace.leftSplit) return 'left';
			if (item === this.app.workspace.rightSplit) return 'right';
			item = (item as { parent?: unknown }).parent;
		}
		return null;
	}

	private insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers?: boolean, referenceFormat?: ReferenceFormat, insertionTarget?: InsertionTarget) {
		// If includeVerseNumbers not provided, fall back to global setting
		const includeNumbers = typeof includeVerseNumbers === 'boolean' ? includeVerseNumbers : !!this.settings.includeVerseNumbersOnInsert;
		this.notifyLinkFallback(verses, translation);
		this.calloutFormatter.insertScriptureCallout(editor, reference, verses, translation, includeNumbers, referenceFormat, insertionTarget);
	}

	private insertPlainText(editor: Editor, verses: BibleVerse[], includeVerseNumbers?: boolean, insertionTarget?: InsertionTarget) {
		// If includeVerseNumbers not provided, fall back to global setting
		const includeNumbers = typeof includeVerseNumbers === 'boolean' ? includeVerseNumbers : !!this.settings.includeVerseNumbersOnInsert;
		this.calloutFormatter.insertPlainText(editor, verses, includeNumbers, insertionTarget);
	}

	private insertScriptureLink(editor: Editor, reference: string, verses: BibleVerse[], translation: string, referenceFormat?: ReferenceFormat, insertionTarget?: InsertionTarget) {
		this.notifyLinkFallback(verses, translation);
		this.calloutFormatter.insertScriptureLink(editor, reference, verses, translation, referenceFormat, insertionTarget);
	}

	private notifyLinkFallback(verses: BibleVerse[], translation: string): void {
		const firstVerse = verses[0];
		if (!firstVerse) return;
		const resolution = resolveScriptureLink(this.settings, translation, firstVerse.book, firstVerse.chapter, firstVerse.verse);
		if (resolution.warning) new Notice(resolution.warning);
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
				if (matches.length > 0) {
					const { reference, translation } = this.parseReferenceAndTranslation(trimmedText);
					return { reference, translation };
				}
			} catch {
				return { reference: '', translation: null };
		}

		if (this.isChapterVerseOnlyReference(trimmedText)) {
			const reference = selectedText.startsWith(' ') ? selectedText : ` ${trimmedText}`;
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
				const possibleTranslation = match?.[1];
				if (possibleTranslation) {
				
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
		const normalized = normalizePath(path);
		return normalized.endsWith('/') ? normalized : `${normalized}/`;
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
		const firstMatch = matches[0];
		if (!firstMatch) return null;

		const ref = firstMatch.ref;
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
				new Notice('Could not resolve Scripture note from input');
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
			openScriptureNote: this.openScriptureNote.bind(this),
			getScriptureCallout: this.getScriptureCallout.bind(this),
			getScriptureCallouts: this.getScriptureCallouts.bind(this)
		};

		const pluginRegistry = (this.app as AppWithPlugins).plugins.plugins;
		pluginRegistry.scripture ??= this;
		pluginRegistry.scripture.api = this.api;

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
	 * Build a formatted scripture callout without touching an editor.
	 * Returns null when the reference cannot be resolved.
	 */
	private async getScriptureCallout(reference: string, options?: ScriptureCalloutOptions): Promise<string | null> {
		const result = await this.buildScriptureCallout(reference, options);
		return result.callout;
	}

	/**
	 * Batch form of getScriptureCallout. Individual failures are reported per
	 * reference rather than aborting the whole batch.
	 */
	private async getScriptureCallouts(references: string[], options?: ScriptureCalloutOptions): Promise<ScriptureCalloutResult[]> {
		const results: ScriptureCalloutResult[] = [];
		for (const reference of references) {
			results.push(await this.buildScriptureCallout(reference, options));
		}
		return results;
	}

	private async buildScriptureCallout(reference: string, options?: ScriptureCalloutOptions): Promise<ScriptureCalloutResult> {
		try {
			const { reference: parsedReference, translation: detectedTranslation } = this.parseScriptureReference(reference);
			if (!parsedReference) {
				return { reference, callout: null, error: 'No scripture reference detected' };
			}

			const translationName = options?.translation || detectedTranslation || this.settings.defaultTranslation;
			const translation = this.getTranslationSettings(translationName);
			if (!translation) {
				return { reference, callout: null, error: `Translation not configured: ${translationName}` };
			}

			const verses = await parseAndLookupReference(this.dataLoader, translation, parsedReference);
			if (verses.length === 0) {
				return { reference, callout: null, error: `No verses found for: ${parsedReference}` };
			}

			// includeVerseNumbers is passed through as-is: when undefined the
			// formatter falls back to the global `verseNumbers` setting.
			const callout = this.calloutFormatter.formatCallout(
				parsedReference,
				verses,
				translation.name,
				options?.includeVerseNumbers,
				options?.referenceFormat
			);

			return { reference, callout };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { reference, callout: null, error: message };
		}
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
		return orderTranslations(this.settings.translations, this.settings.defaultTranslation);
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

		const resolution = resolveScriptureLink(this.settings, translationSettings.name, normalizedBook, chapter, verse);
		return resolution.target ? `[[${resolution.target}]]` : reference;
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

}
