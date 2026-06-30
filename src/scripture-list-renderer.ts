import { App, MarkdownView, Notice, setIcon, TFile } from 'obsidian';
import type { Editor, MarkdownPostProcessorContext, MarkdownSectionInformation, WorkspaceLeaf } from 'obsidian';
import { detectReferences } from 'scripture-references';
import type { PassageReference, PassageMatch } from 'scripture-references';
import type { BibleVerse, BibleTranslation, ProcessedReference, ScriptureSettings } from './types';
import { BibleDataLoader } from './bible-data-loader';
import { CalloutFormatter } from './callout-formatter';
import { formatReferenceDisplay } from './reference-format';
import { parseScriptureListInput } from './scripture-list-parser';
import type { ParsedScriptureListEntry } from './scripture-list-parser';

type ScriptureListButtonPosition = 'top' | 'bottom' | 'inline';
type ScriptureListAction = 'edit' | 'add' | 'paste';
export interface ScriptureListRenderContext {
	sourcePath: string;
	containerEl: HTMLElement;
	getSectionInfo: () => MarkdownSectionInformation | null;
}

export const createScriptureListRenderContext = (
	containerEl: HTMLElement,
	ctx: MarkdownPostProcessorContext
): ScriptureListRenderContext => ({
	sourcePath: ctx.sourcePath,
	containerEl,
	getSectionInfo: () => ctx.getSectionInfo(containerEl)
});

interface CodeBlockCursorTarget {
	line: number;
	ch: number;
}

interface SourceLineReference {
	originalLine: string;
	processedReference?: ProcessedReference;
}

type ScriptureReferenceMatch = PassageMatch;

interface MarkdownViewWithSetMode extends MarkdownView {
	setMode(mode: 'source' | 'preview'): void;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseReferenceAndTranslationFromTranslations = (
	text: string,
	translations: BibleTranslation[]
): { reference: string; translation: string | null } => {
	const trimmedText = text.trim();
	const translationAlternates = translations
		.map(translation => translation.name)
		.filter(name => name.trim().length > 0)
		.sort((a, b) => b.length - a.length)
		.map(escapeRegExp)
		.join('|');

	if (!translationAlternates) {
		return { reference: trimmedText, translation: null };
	}

	const translationPattern = new RegExp(`(?:,\\s*|\\s+|\\s*\\()(${translationAlternates})\\)?$`, 'i');
	const match = trimmedText.match(translationPattern);

	if (!match) {
		return { reference: trimmedText, translation: null };
	}

	const matchedTranslation = match[1];
	if (!matchedTranslation) return { reference: trimmedText, translation: null };

	const foundTranslation = translations.find(t =>
		t.name.toUpperCase() === matchedTranslation.toUpperCase()
	);

	if (!foundTranslation) {
		return { reference: trimmedText, translation: null };
	}

	return {
		reference: trimmedText.replace(translationPattern, '').trim(),
		translation: foundTranslation.name
	};
};

export class ScriptureListRenderer {
	private static readonly FOLD_STATE_KEY = 'scripture-plugin:scripture-list-fold-state';
	private app: App;
	private dataLoader: BibleDataLoader;
	private calloutFormatter: CalloutFormatter;
	private translations: BibleTranslation[];
	private defaultTranslation: string;
	private settings: ScriptureSettings;

	constructor(
		app: App,
		dataLoader: BibleDataLoader,
		calloutFormatter: CalloutFormatter,
		translations: BibleTranslation[],
		defaultTranslation: string,
		settings: ScriptureSettings
	) {
		this.app = app;
		this.dataLoader = dataLoader;
		this.calloutFormatter = calloutFormatter;
		this.translations = translations;
		this.defaultTranslation = defaultTranslation;
		this.settings = settings;
	}

	/**
	 * Parse codeblock content into individual reference lines
	 */
	parseScriptureListInput(content: string): ParsedScriptureListEntry[] {
		return parseScriptureListInput(content);
	}

	/**
	 * Parse and look up all references, returning processed data
	 */
	async parseAndLookupReferences(references: ParsedScriptureListEntry[]): Promise<ProcessedReference[]> {
		const processed: ProcessedReference[] = [];

		for (const entry of references) {
			try {
				// Parse the reference and extract translation if specified
				const { reference, translation } = this.parseReferenceAndTranslation(entry.reference);
				const translationToUse = translation || this.defaultTranslation;

				// Find the translation object
				const translationObj = this.translations.find(t => t.name === translationToUse);
				if (!translationObj) {
					processed.push({
						originalInput: entry.originalInput,
						parsedReference: reference,
						translation: translationToUse,
						highlighted: entry.highlighted,
						highlightMarker: entry.highlightMarker,
						error: `Translation "${translationToUse}" not found`
					});
					continue;
				}

				// Detect the reference using scripture-references library
				const firstMatch = Array.from(detectReferences(reference))[0];

				if (!firstMatch) {
					processed.push({
						originalInput: entry.originalInput,
						parsedReference: reference,
						translation: translationToUse,
						highlighted: entry.highlighted,
						highlightMarker: entry.highlightMarker,
						error: 'Invalid reference format'
					});
					continue;
				}

				const passageRef = firstMatch.ref;

				// Look up the verses
				const verses = await this.lookupVerses(passageRef, translationObj);

				if (!verses || verses.length === 0) {
					processed.push({
						originalInput: entry.originalInput,
						parsedReference: reference,
						translation: translationToUse,
						highlighted: entry.highlighted,
						highlightMarker: entry.highlightMarker,
						error: 'Verses not found'
					});
					continue;
				}

				// Determine testament and bookNumber from first verse's book
				const firstVerse = verses[0];
				if (!firstVerse) continue;
				const testament = await this.getTestament(firstVerse.book, translationObj);
				const bookNumber = await this.getBookNumber(firstVerse.book, translationObj);

				// Format the proper reference display (e.g., "John 3:16" or "John 3:16, NLT")
				const displayRef = this.formatReferenceDisplay(verses, translationToUse, passageRef.type === 'chapter');

				processed.push({
					originalInput: entry.originalInput,
					parsedReference: displayRef,
					translation: translationToUse,
					highlighted: entry.highlighted,
					highlightMarker: entry.highlightMarker,
					verses,
					testament,
					bookNumber,
					isChapterReference: passageRef.type === 'chapter'
				});

			} catch (error) {
				console.error('Error processing reference:', entry.originalInput, error);
				processed.push({
					originalInput: entry.originalInput,
					parsedReference: entry.reference,
					translation: this.defaultTranslation,
					highlighted: entry.highlighted,
					highlightMarker: entry.highlightMarker,
					error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
				});
			}
		}

		return processed;
	}

	async normalizeCodeBlockSource(
		source: string,
		processedReferences: ProcessedReference[],
		renderContext?: ScriptureListRenderContext
	): Promise<void> {
		if (!this.settings.scriptureListReformatSource) {
			return;
		}

		if (!renderContext) {
			return;
		}

		const normalizedSource = this.buildNormalizedSource(source, processedReferences);
		if (normalizedSource === source) {
			return;
		}

		const sectionInfo = renderContext.getSectionInfo();
		if (!sectionInfo) {
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(renderContext.sourcePath);
		if (!(file instanceof TFile)) {
			return;
		}

		try {
			await this.app.vault.process(file, (content) => {
				const lines = content.split('\n');
				const codeBlockRange = this.resolveCodeBlockRangeFromLines(lines, sectionInfo);
				if (!codeBlockRange) {
					return content;
				}

				const startLine = codeBlockRange.lineStart + 1;
				const endLine = codeBlockRange.lineEnd;

				if (startLine > endLine || startLine < 0 || endLine > lines.length) {
					return content;
				}

				const currentSource = lines.slice(startLine, endLine).join('\n');
				if (currentSource === normalizedSource) {
					return content;
				}

				lines.splice(startLine, endLine - startLine, ...normalizedSource.split('\n'));
				return lines.join('\n');
			});
		} catch (error) {
			console.error('Failed to normalize scriptureList source:', error);
		}
	}

	private buildNormalizedSource(source: string, processedReferences: ProcessedReference[]): string {
		const sourceLines = this.mapSourceLinesToReferences(source, processedReferences);

		if (!this.settings.scriptureListReorderSourceByBook) {
			return sourceLines
				.map(sourceLine => this.normalizeSourceLine(sourceLine) ?? sourceLine.originalLine)
				.join('\n');
		}

		const validReferences = sourceLines
			.map(sourceLine => sourceLine.processedReference)
			.filter((reference): reference is ProcessedReference => this.canNormalizeReference(reference))
			.sort((a, b) => this.compareReferencesByBookOrder(a, b));

		const normalizedValidLines = this.buildSortedSourceLines(validReferences);
		let nextValidLineIndex = 0;
		const normalizedLines: string[] = [];

		for (const sourceLine of sourceLines) {
			if (sourceLine.originalLine.trim().length === 0) {
				continue;
			}

			if (!this.canNormalizeReference(sourceLine.processedReference)) {
				normalizedLines.push(sourceLine.originalLine);
				continue;
			}

			const nextLine = normalizedValidLines[nextValidLineIndex];
			nextValidLineIndex += 1;

			if (nextLine === undefined) {
				normalizedLines.push(sourceLine.originalLine);
				continue;
			}

			if (nextLine === '') {
				normalizedLines.push('');
				normalizedLines.push(normalizedValidLines[nextValidLineIndex] ?? sourceLine.originalLine);
				nextValidLineIndex += 1;
				continue;
			}

			normalizedLines.push(nextLine);
		}

		return normalizedLines.join('\n');
	}

	private mapSourceLinesToReferences(source: string, processedReferences: ProcessedReference[]): SourceLineReference[] {
		let nextReferenceIndex = 0;

		return source.split('\n').map(originalLine => {
			if (originalLine.trim().length === 0) {
				return { originalLine };
			}

			const processedReference = processedReferences[nextReferenceIndex];
			nextReferenceIndex += 1;

			return {
				originalLine,
				processedReference
			};
		});
	}

	private normalizeSourceLine(sourceLine: SourceLineReference): string | null {
		const processedReference = sourceLine.processedReference;
		if (!this.canNormalizeReference(processedReference)) {
			return null;
		}

		return this.formatSourceReference(processedReference);
	}

	private canNormalizeReference(reference: ProcessedReference | undefined): reference is ProcessedReference {
		return Boolean(reference && !reference.error && reference.verses && reference.verses.length > 0);
	}

	private buildSortedSourceLines(references: ProcessedReference[]): string[] {
		const lines: string[] = [];

		for (let i = 0; i < references.length; i++) {
			const previous = references[i - 1];
			const current = references[i];
			if (!current) continue;
			if (previous && this.shouldSeparateTestaments(previous, current)) {
				lines.push('');
			}

			lines.push(this.formatSourceReference(current));
		}

		return lines;
	}

	private shouldSeparateTestaments(previous: ProcessedReference, current: ProcessedReference): boolean {
		return Boolean(
			previous.testament &&
			current.testament &&
			previous.testament !== current.testament
		);
	}

	private formatSourceReference(reference: ProcessedReference): string {
		const referenceText = formatReferenceDisplay(
			reference.verses ?? [],
			reference.translation,
			this.defaultTranslation,
			'never',
			this.settings.scriptureListSourceReferenceFormat,
			{ isChapterReference: reference.isChapterReference }
		);
		const explicitTranslation = this.parseReferenceAndTranslation(reference.originalInput).translation;

		const normalizedReference = explicitTranslation ? `${referenceText}, ${explicitTranslation}` : referenceText;
		const highlightMarker = reference.highlightMarker ?? (reference.highlighted ? '- ' : '');

		return `${highlightMarker}${normalizedReference}`;
	}

	/**
	 * Parse reference and extract translation if specified
	 */
	private parseReferenceAndTranslation(text: string): { reference: string; translation: string | null } {
		return parseReferenceAndTranslationFromTranslations(text, this.translations);
	}

	/**
	 * Look up verses from a PassageReference
	 */
	private async lookupVerses(ref: PassageReference, translation: BibleTranslation): Promise<BibleVerse[]> {
		const bibleData = await this.dataLoader.loadTranslation(translation);
		if (!bibleData || !bibleData.books) {
			return [];
		}

		const bookCode = ref.book.toUpperCase();
		const book = bibleData.books.find(b => b.id === bookCode);
		if (!book) {
			return [];
		}

		const chapter = ref.start_chapter;
		const chapterData = book.chapters.find(c => c.chapter === chapter);
		if (!chapterData) {
			return [];
		}

		const verses: BibleVerse[] = [];
		const isChapterReference = ref.type === 'chapter';
		const lookupStartVerse = isChapterReference ? chapterData.verses[0]?.verse : ref.start_verse;
		const endVerse = isChapterReference
			? chapterData.verses[chapterData.verses.length - 1]?.verse
			: (ref.end_verse || ref.start_verse);

		if (!lookupStartVerse || !endVerse) {
			return [];
		}

		for (let verseNum = lookupStartVerse; verseNum <= endVerse; verseNum++) {
			const verseData = chapterData.verses.find(v => v.verse === verseNum);
			if (verseData) {
				verses.push({
					id: verseData.id,
					book: verseData.book,
					chapter: verseData.chapter,
					verse: verseData.verse,
					content: verseData.content,
					newParagraph: verseData.newParagraph,
					poetry: verseData.poetry
				});
			}
		}

		return verses;
	}

	/**
	 * Get testament for a book
	 */
	private async getTestament(bookName: string, translation: BibleTranslation): Promise<'OLD' | 'NEW' | undefined> {
		const bibleData = await this.dataLoader.loadTranslation(translation);
		if (!bibleData || !bibleData.books) {
			return undefined;
		}

		const book = bibleData.books.find(b => b.title === bookName);
		if (!book) {
			return undefined;
		}

		// The testament field is a string like "Old Testament" or "New Testament"
		if (book.testament.toLowerCase().includes('old')) {
			return 'OLD';
		} else if (book.testament.toLowerCase().includes('new')) {
			return 'NEW';
		}

		return undefined;
	}

	/**
	 * Get book number for canonical ordering
	 */
	private async getBookNumber(bookName: string, translation: BibleTranslation): Promise<number | undefined> {
		const bibleData = await this.dataLoader.loadTranslation(translation);
		if (!bibleData || !bibleData.books) {
			return undefined;
		}

		const book = bibleData.books.find(b => b.title === bookName);
		return book?.bookNumber;
	}

	/**
	 * Format reference display with translation suffix if needed
	 */
	private formatReferenceDisplay(verses: BibleVerse[], translation: string, isChapterReference = false): string {
		return formatReferenceDisplay(
			verses,
			translation,
			this.defaultTranslation,
			this.settings.translationDisplay,
			this.settings.scriptureListReferenceFormat,
			{ isChapterReference }
		);
	}

	/**
	 * Generate HTML table from processed references
	 */
	async renderTable(container: HTMLElement, processedReferences: ProcessedReference[], renderContext?: ScriptureListRenderContext): Promise<void> {
		// Add wrapper for positioning
		const wrapper = container.createDiv({ cls: 'scripture-list-wrapper' });

		// Add edit button at the top right
		if (renderContext) {
			this.renderListActionButtons(wrapper, renderContext, 'top');
		}

		// Group by testament
		const oldTestament = processedReferences.filter(r => r.testament === 'OLD');
		const newTestament = processedReferences.filter(r => r.testament === 'NEW');
		const unknownTestament = processedReferences.filter(r => !r.testament);

		// Sort each testament group by book order, then chapter, then verse
		this.sortReferencesByBookOrder(oldTestament);
		this.sortReferencesByBookOrder(newTestament);
		this.sortReferencesByBookOrder(unknownTestament);

		// Render Old Testament section
		if (oldTestament.length > 0) {
			this.renderTestamentSection(wrapper, 'Old Testament', oldTestament, renderContext);
		}

		// Render New Testament section
		if (newTestament.length > 0) {
			this.renderTestamentSection(wrapper, 'New Testament', newTestament, renderContext);
		}

		// Render unknown testament section
		if (unknownTestament.length > 0) {
			this.renderTestamentSection(wrapper, 'Other', unknownTestament, renderContext);
		}

		// Add edit button at the bottom right
		if (renderContext) {
			this.renderListActionButtons(wrapper, renderContext, 'bottom');
		}
	}

	/**
	 * Sort references by book order, then chapter, then verse
	 */
	private sortReferencesByBookOrder(references: ProcessedReference[]): void {
		references.sort((a, b) => this.compareReferencesByBookOrder(a, b));
	}

	private compareReferencesByBookOrder(a: ProcessedReference, b: ProcessedReference): number {
		const bookA = a.bookNumber ?? Number.MAX_SAFE_INTEGER;
		const bookB = b.bookNumber ?? Number.MAX_SAFE_INTEGER;
		if (bookA !== bookB) {
			return bookA - bookB;
		}

		const chapterA = a.verses?.[0]?.chapter ?? 0;
		const chapterB = b.verses?.[0]?.chapter ?? 0;
		if (chapterA !== chapterB) {
			return chapterA - chapterB;
		}

		const verseA = a.verses?.[0]?.verse ?? 0;
		const verseB = b.verses?.[0]?.verse ?? 0;
		return verseA - verseB;
	}

	/**
	 * Render a collapsible testament section with h6 header
	 */
	private renderTestamentSection(container: HTMLElement, testamentName: string, references: ProcessedReference[], renderContext?: ScriptureListRenderContext): void {
		const section = container.createDiv({ cls: 'scripture-list-testament-section' });

		// Create h6 header
		const header = section.createEl('h6', { cls: 'scripture-list-testament-header' });

		// Add testament name
		header.createSpan({ text: testamentName });

		// Add collapse indicator icon right after the text
		const indicator = header.createSpan({ cls: 'collapse-indicator' });
		setIcon(indicator, 'chevron-down');

		// Create table
		const table = section.createEl('table', { cls: 'scripture-list-table' });

		const foldStateKey = this.getFoldStateKey(renderContext, testamentName);
		let isExpanded = this.getStoredFoldState(foldStateKey);
		table.toggleClass('scripture-list-collapsed', !isExpanded);
		indicator.empty();
		setIcon(indicator, isExpanded ? 'chevron-down' : 'chevron-right');

		const tbody = table.createEl('tbody');

		// Render reference rows
		for (const ref of references) {
			const rowClasses = ['scripture-list-row'];
			if (ref.highlighted) {
				rowClasses.push('scripture-list-row-highlighted');
			}

			const row = tbody.createEl('tr', { cls: rowClasses.join(' ') });

			// Reference column
			const refCell = row.createEl('td', { cls: 'scripture-list-reference-cell' });

			if (!ref.error && ref.verses) {
				this.renderReferenceLink(refCell, ref);
			} else {
				refCell.textContent = ref.parsedReference;
			}

			// Text column
			const textCell = row.createEl('td', { cls: 'scripture-list-text-cell' });

			if (ref.error) {
				textCell.createSpan({ cls: 'scripture-list-error', text: `❌ ${ref.error}` });
			} else if (ref.verses) {
				textCell.textContent = this.formatVerseText(ref.verses);
			}

			// Copy button column
			const copyCell = row.createEl('td', { cls: 'scripture-list-copy-cell' });

			if (!ref.error && ref.verses) {
				this.renderCopyButton(copyCell, ref);
			}
		}

		// Add collapse/expand functionality
		header.addEventListener('click', () => {
			isExpanded = !isExpanded;
			table.toggleClass('scripture-list-collapsed', !isExpanded);
			indicator.empty();
			setIcon(indicator, isExpanded ? 'chevron-down' : 'chevron-right');
			this.storeFoldState(foldStateKey, isExpanded);
		});
	}

	/**
	 * Render reference as a clickable link to chapter note
	 */
	private renderReferenceLink(cell: HTMLElement, ref: ProcessedReference): void {
		if (!ref.verses || ref.verses.length === 0) {
			cell.textContent = ref.parsedReference;
			return;
		}

		const firstVerse = ref.verses[0];
		if (!firstVerse) return;
		const bookName = firstVerse.book;
		const chapter = firstVerse.chapter;
		const verse = firstVerse.verse;

		// Determine which translation to link to
		const translationObj = this.translations.find(t => t.name === ref.translation);
		let linkTranslation = ref.translation;

		// If translation not available as notes, fall back to default translation
		if (translationObj && !translationObj.availableAsNotes) {
			const defaultTranslationObj = this.translations.find(t => t.name === this.defaultTranslation);
			if (defaultTranslationObj && defaultTranslationObj.availableAsNotes) {
				linkTranslation = this.defaultTranslation;
			}
		}

		// Convert book name for linking (Psalms → Psalm)
		const linkBookName = bookName === 'Psalms' ? 'Psalm' : bookName;

		// Create the link path
		const linkPath = `Bible/${linkTranslation}/${linkBookName} ${chapter}`;
		const anchor = ref.isChapterReference ? '' : `#${verse}`;

		// Create clickable link
		const link = cell.createEl('a', {
			cls: 'internal-link',
			attr: {
				'data-href': `${linkPath}${anchor}`,
				href: `${linkPath}${anchor}`,
				target: '_blank',
				rel: 'noopener'
			}
		});
		link.textContent = ref.parsedReference;

		// Handle click to navigate within Obsidian
		link.addEventListener('click', (e) => {
			e.preventDefault();
			void this.app.workspace.openLinkText(`${linkPath}${anchor}`, '', false, { active: true });
		});
	}

	/**
	 * Format verse text for display in table
	 */
	private formatVerseText(verses: BibleVerse[]): string {
		let formattedText = '';

		for (let i = 0; i < verses.length; i++) {
			const verse = verses[i];
			if (!verse) continue;
			const verseText = verse.content.join('\n');

			if (i === 0) {
				formattedText = verseText;
				continue;
			}

			if (verse.newParagraph) {
				formattedText += `\n\n${verseText}`;
				continue;
			}

			if (verse.poetry || verses[i - 1]?.poetry) {
				formattedText += `\n${verseText}`;
				continue;
			}

			formattedText += ` ${verseText}`;
		}

		return formattedText;
	}

	private getFoldStateKey(renderContext: ScriptureListRenderContext | undefined, testamentName: string): string {
		const sourcePath = renderContext?.sourcePath ?? 'unknown-source';
		const lineStart = renderContext?.getSectionInfo()?.lineStart ?? -1;
		return `${sourcePath}:${lineStart}:${testamentName}`;
	}

	private getStoredFoldState(foldStateKey: string): boolean {
		try {
			const rawState = this.getLocalStorage()?.getItem(ScriptureListRenderer.FOLD_STATE_KEY);
			if (!rawState) {
				return true;
			}

			const parsedState = JSON.parse(rawState) as Record<string, boolean>;
			return parsedState[foldStateKey] ?? true;
		} catch (error) {
			console.error('Failed to read scripture list fold state:', error);
			return true;
		}
	}

	private storeFoldState(foldStateKey: string, isExpanded: boolean): void {
		try {
			const storage = this.getLocalStorage();
			if (!storage) return;
			const rawState = storage.getItem(ScriptureListRenderer.FOLD_STATE_KEY);
			const parsedState = rawState ? JSON.parse(rawState) as Record<string, boolean> : {};
			parsedState[foldStateKey] = isExpanded;
			storage.setItem(
				ScriptureListRenderer.FOLD_STATE_KEY,
				JSON.stringify(parsedState)
			);
		} catch (error) {
			console.error('Failed to save scripture list fold state:', error);
		}
	}

	/**
	 * Render edit button to switch to source mode
	 */
	public renderEmptyState(container: HTMLElement, renderContext?: ScriptureListRenderContext): void {
		const wrapper = container.createDiv({ cls: 'scripture-list-wrapper' });
		const emptyMessage = wrapper.createDiv({ cls: 'scripture-list-empty' });
		emptyMessage.textContent = 'No references provided';

		if (renderContext) {
			this.renderListActionButtons(wrapper, renderContext, 'inline');
		}
	}

	private renderListActionButtons(
		container: HTMLElement,
		renderContext: ScriptureListRenderContext,
		position: ScriptureListButtonPosition
	): void {
		const buttonContainer = container.createEl('div', {
			cls: `scripture-list-edit-container scripture-list-edit-${position}`
		});

		this.renderListActionButton(buttonContainer, renderContext, 'edit');
		this.renderListActionButton(buttonContainer, renderContext, 'add');
		this.renderListActionButton(buttonContainer, renderContext, 'paste');
	}

	private renderListActionButton(
		container: HTMLElement,
		renderContext: ScriptureListRenderContext,
		action: ScriptureListAction
	): void {
		const actionConfig = {
			add: {
				ariaLabel: 'Add scripture to list',
				icon: 'plus',
				text: 'Add scripture'
			},
			edit: {
				ariaLabel: 'Edit scripture list',
				icon: 'edit',
				text: 'Edit list'
			},
			paste: {
				ariaLabel: 'Paste scripture from clipboard',
				icon: 'clipboard-paste',
				text: 'Paste scripture'
			}
		}[action];

		const button = container.createEl('button', {
			cls: 'scripture-edit-button',
			attr: {
				'aria-label': actionConfig.ariaLabel
			}
		});

		// Add Lucide icon
		const iconSpan = button.createSpan({ cls: 'scripture-edit-icon' });
		setIcon(iconSpan, actionConfig.icon);

		// Add button text
		button.createSpan({
			text: actionConfig.text,
			cls: 'scripture-edit-text'
		});

		const consumeEditorMouseEvent = (e: MouseEvent | PointerEvent) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		};

		button.addEventListener('pointerdown', consumeEditorMouseEvent);
		button.addEventListener('mousedown', consumeEditorMouseEvent);

		button.addEventListener('click', (e) => {
			consumeEditorMouseEvent(e);

			if (action === 'paste') {
				void this.pasteReferenceFromClipboard(renderContext);
				return;
			}

			window.setTimeout(() => {
				this.openCodeBlockForAction(renderContext, action);
			}, 0);
		});

	}

	private async pasteReferenceFromClipboard(renderContext: ScriptureListRenderContext): Promise<void> {
		let clipboardText: string;
		try {
			clipboardText = await navigator.clipboard.readText();
		} catch (error) {
			console.error('Clipboard read failed:', error);
			new Notice('Unable to read clipboard in this environment');
			return;
		}

		if (!clipboardText.trim()) {
			new Notice('Clipboard is empty');
			return;
		}

		const references = this.extractFirstScriptureListReferences(clipboardText);
		if (references.length === 0) {
			new Notice('No Scripture reference found in clipboard');
			return;
		}

		const processedReferences = await this.parseAndLookupReferences(references.map(reference => ({
			originalInput: reference,
			reference,
			highlighted: false
		})));

		const invalidReference = processedReferences.find(reference =>
			reference.error || !reference.verses || reference.verses.length === 0
		);
		if (invalidReference) {
			new Notice(invalidReference.error || 'Unable to validate scripture reference');
			return;
		}

		await this.appendLinesToCodeBlockSource(
			renderContext,
			processedReferences.map(reference => this.formatSourceReference(reference))
		);
	}

	private extractFirstScriptureListReferences(text: string): string[] {
		const matches = Array.from(detectReferences(text));
		const firstMatch = matches[0];
		if (!firstMatch) {
			return [];
		}

		const referenceGroup = this.extractLeadingCommaSeparatedReferenceGroup(text, matches);
		const lastMatch = referenceGroup.at(-1);
		if (!lastMatch) return [];
		const suffixStart = this.getMatchEndIndex(text, lastMatch);
		const suffix = suffixStart !== null
			? this.extractTrailingTranslationSuffix(text.slice(suffixStart))
			: null;
		const references = this.expandCommaSeparatedReferenceGroup(referenceGroup);

		return suffix
			? references.map(reference => `${reference}, ${suffix}`)
			: references;
	}

	private extractLeadingCommaSeparatedReferenceGroup(
		text: string,
		matches: ScriptureReferenceMatch[]
	): ScriptureReferenceMatch[] {
		const firstMatch = matches[0];
		if (!firstMatch) return [];
		const group: ScriptureReferenceMatch[] = [firstMatch];

		for (const match of matches.slice(1)) {
			const previousMatch = group.at(-1);
			if (!previousMatch) break;
			const previousEnd = this.getMatchEndIndex(text, previousMatch);
			const nextStart = this.getMatchStartIndex(text, match);
			if (previousEnd === null || nextStart === null) {
				break;
			}

			const separator = text.slice(previousEnd, nextStart);
			if (!/^\s*,\s*$/.test(separator)) {
				break;
			}

			group.push(match);
		}

		return group;
	}

	private expandCommaSeparatedReferenceGroup(matches: ScriptureReferenceMatch[]): string[] {
		const references: string[] = [];
		let currentRangeStart: ScriptureReferenceMatch | null = null;
		let currentRangeEnd: ScriptureReferenceMatch | null = null;

		const pushCurrentRange = () => {
			if (!currentRangeStart || !currentRangeEnd) {
				return;
			}

			references.push(this.formatReferenceRange(currentRangeStart.ref, currentRangeEnd.ref));
			currentRangeStart = null;
			currentRangeEnd = null;
		};

		for (const match of matches) {
			if (!currentRangeStart || !currentRangeEnd) {
				currentRangeStart = match;
				currentRangeEnd = match;
				continue;
			}

			if (this.areSequentialVerses(currentRangeEnd.ref, match.ref)) {
				currentRangeEnd = match;
				continue;
			}

			pushCurrentRange();
			currentRangeStart = match;
			currentRangeEnd = match;
		}

		pushCurrentRange();
		return references;
	}

	private areSequentialVerses(previous: PassageReference, current: PassageReference): boolean {
		return (
			previous.book === current.book &&
			previous.start_chapter === current.start_chapter &&
			(previous.end_chapter || previous.start_chapter) === current.start_chapter &&
			(previous.end_verse || previous.start_verse) + 1 === current.start_verse
		);
	}

	private formatReferenceRange(start: PassageReference, end: PassageReference): string {
		const startReference = String(start);
		if (start === end) {
			return startReference;
		}

		if (start.book === end.book && start.start_chapter === end.start_chapter) {
			return `${start.getBookName()} ${start.start_chapter}:${start.start_verse}-${end.end_verse || end.start_verse}`;
		}

		return `${startReference}-${String(end)}`;
	}

	private getMatchStartIndex(text: string, match: ScriptureReferenceMatch): number | null {
		if (typeof match.index === 'number') {
			return match.index;
		}

		const index = text.indexOf(String(match.text));
		return index >= 0 ? index : null;
	}

	private getMatchEndIndex(text: string, match: ScriptureReferenceMatch): number | null {
		const start = this.getMatchStartIndex(text, match);
		return start === null ? null : start + String(match.text).length;
	}

	private extractTrailingTranslationSuffix(text: string): string | null {
		const trimmedText = text.trimStart();
		const translationsByLength = [...this.translations]
			.filter(translation => translation.name.trim().length > 0)
			.sort((a, b) => b.name.length - a.name.length);

		for (const translation of translationsByLength) {
			const escapedName = escapeRegExp(translation.name);
			const suffixPattern = new RegExp(`^(?:,\\s*|\\(\\s*|\\s*)(${escapedName})(?:\\s*\\))?(?=$|[\\s,.;:!?\\)])`, 'i');
			if (suffixPattern.test(trimmedText)) {
				return translation.name;
			}
		}

		return null;
	}

	private openCodeBlockForAction(renderContext: ScriptureListRenderContext, action: ScriptureListAction): void {
		const markdownView = this.getMarkdownViewForRenderContext(this.app, renderContext);
		if (!markdownView) return;

		const sectionInfo = renderContext.getSectionInfo();

		const applyAction = () => {
			const editor = markdownView.editor;
			let target: CodeBlockCursorTarget | null;

			if (action === 'add') {
				target = this.addBlankLineToCodeBlock(editor, sectionInfo);
			} else {
				target = this.getCodeBlockCursorTarget(editor, sectionInfo);
				if (target) {
					this.placeCursorInEditor(editor, target);
				}
			}

			if (target) {
				this.retryCursorPlacementIfNeeded(editor, target);
			}
		};

		if (markdownView.getMode() !== 'source') {
			(markdownView as MarkdownViewWithSetMode).setMode('source');

			window.setTimeout(() => {
				applyAction();
			}, 150);
			return;
		}

		applyAction();
	}

	private async appendLineToCodeBlockSource(renderContext: ScriptureListRenderContext, line: string): Promise<void> {
		await this.appendLinesToCodeBlockSource(renderContext, [line]);
	}

	private async appendLinesToCodeBlockSource(renderContext: ScriptureListRenderContext, linesToAppend: string[]): Promise<void> {
		const sectionInfo = renderContext.getSectionInfo();
		if (!sectionInfo) {
			new Notice('Unable to locate Scripture list');
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(renderContext.sourcePath);
		if (!(file instanceof TFile)) {
			new Notice('Unable to locate Scripture list file');
			return;
		}

		let didAppend = false;

		try {
			await this.app.vault.process(file, (content) => {
				const lines = content.split('\n');
				const codeBlockRange = this.resolveCodeBlockRangeFromLines(lines, sectionInfo);
				if (!codeBlockRange) {
					return content;
				}

				lines.splice(codeBlockRange.lineEnd, 0, ...linesToAppend);
				didAppend = true;
				return lines.join('\n');
			});
		} catch (error) {
			console.error('Failed to append scripture list reference:', error);
			new Notice('Failed to update Scripture list');
			return;
		}

		if (didAppend) {
			new Notice(linesToAppend.length === 1
				? `Added ${linesToAppend[0]} to scripture list`
				: `Added ${linesToAppend.length} references to scripture list`
			);
		} else {
			new Notice('Unable to locate Scripture list');
		}
	}

	private getMarkdownViewForRenderContext(app: App, renderContext: ScriptureListRenderContext): MarkdownView | null {
		let matchingView: MarkdownView | null = null;

		app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			if (matchingView || !(leaf.view instanceof MarkdownView)) {
				return;
			}

			if (leaf.view.containerEl.contains(renderContext.containerEl)) {
				matchingView = leaf.view;
			}
		});

		return matchingView ?? app.workspace.getActiveViewOfType(MarkdownView);
	}

	private getCodeBlockCursorTarget(editor: Editor, sectionData: MarkdownSectionInformation | null): CodeBlockCursorTarget | null {
		const codeBlockRange = this.resolveCodeBlockRange(editor, sectionData);
		if (!codeBlockRange) {
			return null;
		}

		const targetLine = codeBlockRange.lineStart + 1 < codeBlockRange.lineEnd
			? codeBlockRange.lineEnd - 1
			: codeBlockRange.lineEnd;
		const lineContent = editor.getLine(targetLine) || '';

		return {
			line: targetLine,
			ch: lineContent.length
		};
	}

	private resolveCodeBlockRange(editor: Editor, sectionData?: MarkdownSectionInformation | null): { lineStart: number; lineEnd: number } | null {
		const content = editor.getValue();
		const lines = content.split('\n');

		return this.resolveCodeBlockRangeFromLines(lines, sectionData);
	}

	private resolveCodeBlockRangeFromLines(lines: string[], sectionData?: MarkdownSectionInformation | null): { lineStart: number; lineEnd: number } | null {
		const isScriptureListOpening = (line: string): boolean =>
			line.trim() === '```scriptureList' || line.trim().startsWith('```scriptureList ');

		const isClosingFence = (line: string): boolean => line.trim() === '```';

		if (sectionData?.lineStart !== undefined) {
			const startAt = Math.min(sectionData.lineStart, lines.length - 1);

			for (let i = startAt; i >= 0; i--) {
				const line = lines[i];
				if (!line || !isScriptureListOpening(line)) {
					continue;
				}

				for (let j = i + 1; j < lines.length; j++) {
					const closingLine = lines[j];
					if (closingLine && isClosingFence(closingLine)) {
						if (sectionData.lineStart <= j || sectionData.lineEnd === undefined || sectionData.lineEnd <= j + 1) {
							return {
								lineStart: i,
								lineEnd: j
							};
						}

						break;
					}
				}
			}
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line && isScriptureListOpening(line)) {
				for (let j = i + 1; j < lines.length; j++) {
					const closingLine = lines[j];
					if (closingLine && isClosingFence(closingLine)) {
						return {
							lineStart: i,
							lineEnd: j
						};
					}
				}

				return null;
			}
		}

		return null;
	}

	/**
	 * Position cursor inside the codeblock in source mode
	 */
	private placeCursorInEditor(editor: Editor, target: CodeBlockCursorTarget): void {
		editor.setCursor(target);
		editor.scrollIntoView({
			from: target,
			to: target
		});
		editor.focus();
	}

	private retryCursorPlacementIfNeeded(editor: Editor, target: CodeBlockCursorTarget): void {
		window.setTimeout(() => {
			const cursor = editor.getCursor();
			if (cursor.line === target.line && cursor.ch === target.ch) {
				return;
			}

			this.placeCursorInEditor(editor, target);
		}, 75);
	}

	private addBlankLineToCodeBlock(editor: Editor, sectionData: MarkdownSectionInformation | null): CodeBlockCursorTarget | null {
		const codeBlockRange = this.resolveCodeBlockRange(editor, sectionData);
		if (!codeBlockRange) {
			return null;
		}

		const insertAtLine = codeBlockRange.lineEnd;
		const insertAtCh = 0;

		editor.replaceRange('\n', { line: insertAtLine, ch: insertAtCh });

		const targetLine = insertAtLine;
		const target = { line: targetLine, ch: 0 };
		this.placeCursorInEditor(editor, target);
		return target;
	}

	/**
	 * Render copy button
	 */
	private renderCopyButton(cell: HTMLElement, ref: ProcessedReference): void {
		const button = cell.createEl('button', {
			cls: 'scripture-copy-button',
			attr: {
				'aria-label': 'Copy Scripture callout'
			}
		});

		// Add Lucide copy icon
		setIcon(button, 'copy');

		// Handle click
		button.addEventListener('click', () => {
			void this.copyCalloutToClipboard(button, ref);
		});
	}

	private getLocalStorage(): Storage | null {
		return this.app.workspace.containerEl.ownerDocument.defaultView?.localStorage ?? null;
	}

	private async copyCalloutToClipboard(button: HTMLButtonElement, ref: ProcessedReference): Promise<void> {
		if (!ref.verses) return;
		try {
			const callout = this.calloutFormatter.formatCallout(
				ref.parsedReference,
				ref.verses,
				ref.translation,
				ref.verses.length > 1
			);
			await navigator.clipboard.writeText(callout);
			new Notice('Scripture callout copied to clipboard');
			button.addClass('is-copied');
			window.setTimeout(() => button.removeClass('is-copied'), 1000);
		} catch (error) {
			console.error('Error copying to clipboard:', error);
			new Notice('Failed to copy to clipboard');
		}
	}
}
