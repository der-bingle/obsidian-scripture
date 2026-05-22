import { Editor, MarkdownPostProcessorContext, MarkdownSectionInformation, MarkdownView, Notice, setIcon, WorkspaceLeaf } from 'obsidian';
import { detectReferences, PassageReference } from 'scripture-references';
import type { BibleVerse, BibleTranslation, ProcessedReference, ScriptureSettings } from './types';
import { BibleDataLoader } from './bible-data-loader';
import { CalloutFormatter } from './callout-formatter';
import { formatReferenceDisplay } from './reference-format';

type ScriptureListButtonPosition = 'top' | 'bottom' | 'inline';
type ScriptureListAction = 'edit' | 'add';

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

export class ScriptureListRenderer {
	private static readonly FOLD_STATE_KEY = 'scripture-plugin:scripture-list-fold-state';
	private dataLoader: BibleDataLoader;
	private calloutFormatter: CalloutFormatter;
	private translations: BibleTranslation[];
	private defaultTranslation: string;
	private settings: ScriptureSettings;

	constructor(
		dataLoader: BibleDataLoader,
		calloutFormatter: CalloutFormatter,
		translations: BibleTranslation[],
		defaultTranslation: string,
		settings: ScriptureSettings
	) {
		this.dataLoader = dataLoader;
		this.calloutFormatter = calloutFormatter;
		this.translations = translations;
		this.defaultTranslation = defaultTranslation;
		this.settings = settings;
	}

	/**
	 * Parse codeblock content into individual reference lines
	 */
	parseScriptureListInput(content: string): string[] {
		return content
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);
	}

	/**
	 * Parse and look up all references, returning processed data
	 */
	async parseAndLookupReferences(references: string[]): Promise<ProcessedReference[]> {
		const processed: ProcessedReference[] = [];

		for (const input of references) {
			try {
				// Parse the reference and extract translation if specified
				const { reference, translation } = this.parseReferenceAndTranslation(input);
				const translationToUse = translation || this.defaultTranslation;

				// Find the translation object
				const translationObj = this.translations.find(t => t.name === translationToUse);
				if (!translationObj) {
					processed.push({
						originalInput: input,
						parsedReference: reference,
						translation: translationToUse,
						error: `Translation "${translationToUse}" not found`
					});
					continue;
				}

				// Detect the reference using scripture-references library
				const matchGenerator = detectReferences(reference);
				const matches = Array.from(matchGenerator);

				if (!matches || matches.length === 0 || !(matches[0] as any).ref) {
					processed.push({
						originalInput: input,
						parsedReference: reference,
						translation: translationToUse,
						error: 'Invalid reference format'
					});
					continue;
				}

				const passageRef = (matches[0] as any).ref as PassageReference;

				// Look up the verses
				const verses = await this.lookupVerses(passageRef, translationObj);

				if (!verses || verses.length === 0) {
					processed.push({
						originalInput: input,
						parsedReference: reference,
						translation: translationToUse,
						error: 'Verses not found'
					});
					continue;
				}

				// Determine testament and bookNumber from first verse's book
				const testament = await this.getTestament(verses[0].book, translationObj);
				const bookNumber = await this.getBookNumber(verses[0].book, translationObj);

				// Format the proper reference display (e.g., "John 3:16" or "John 3:16, NLT")
				const displayRef = this.formatReferenceDisplay(verses, translationToUse, passageRef.type === 'chapter');

				processed.push({
					originalInput: input,
					parsedReference: displayRef,
					translation: translationToUse,
					verses,
					testament,
					bookNumber,
					isChapterReference: passageRef.type === 'chapter'
				});

			} catch (error) {
				console.error('Error processing reference:', input, error);
				processed.push({
					originalInput: input,
					parsedReference: input,
					translation: this.defaultTranslation,
					error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
				});
			}
		}

		return processed;
	}

	/**
	 * Parse reference and extract translation if specified
	 */
	private parseReferenceAndTranslation(text: string): { reference: string; translation: string | null } {
		// Look for translation patterns at the end: "John 3:16, NET" or "John 3:16, NLT"
		const translationPattern = /,\s*([A-Z]{2,5})$/;
		const match = text.match(translationPattern);

		if (match) {
			const possibleTranslation = match[1];
			const foundTranslation = this.translations.find(t =>
				t.name.toUpperCase() === possibleTranslation.toUpperCase()
			);

			if (foundTranslation) {
				const reference = text.replace(translationPattern, '').trim();
				return { reference, translation: foundTranslation.name };
			}
		}

		return { reference: text.trim(), translation: null };
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
	private formatReferenceDisplay(verses: BibleVerse[], translation: string, isChapterReference: boolean = false): string {
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
		const wrapper = container.createEl('div', { cls: 'scripture-list-wrapper' });
		wrapper.style.position = 'relative';

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
		references.sort((a, b) => {
			// First, sort by book number
			const bookA = a.bookNumber ?? Number.MAX_SAFE_INTEGER;
			const bookB = b.bookNumber ?? Number.MAX_SAFE_INTEGER;
			if (bookA !== bookB) {
				return bookA - bookB;
			}

			// If same book, sort by chapter
			const chapterA = a.verses?.[0]?.chapter ?? 0;
			const chapterB = b.verses?.[0]?.chapter ?? 0;
			if (chapterA !== chapterB) {
				return chapterA - chapterB;
			}

			// If same chapter, sort by verse
			const verseA = a.verses?.[0]?.verse ?? 0;
			const verseB = b.verses?.[0]?.verse ?? 0;
			return verseA - verseB;
		});
	}

	/**
	 * Render a collapsible testament section with h6 header
	 */
	private renderTestamentSection(container: HTMLElement, testamentName: string, references: ProcessedReference[], renderContext?: ScriptureListRenderContext): void {
		const section = container.createEl('div', { cls: 'scripture-list-testament-section' });
		section.style.marginBottom = '16px';

		// Create h6 header
		const header = section.createEl('h6', { cls: 'scripture-list-testament-header' });
		header.style.cursor = 'pointer';
		header.style.userSelect = 'none';
		header.style.display = 'flex';
		header.style.alignItems = 'center';
		header.style.gap = '6px';

		// Add testament name
		header.createSpan({ text: testamentName });

		// Add collapse indicator icon right after the text
		const indicator = header.createSpan({ cls: 'collapse-indicator' });
		indicator.style.display = 'flex';
		indicator.style.alignItems = 'center';
		setIcon(indicator, 'chevron-down');

		// Create table
		const table = section.createEl('table', { cls: 'scripture-list-table' });
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';
		table.style.marginTop = '8px';

		const foldStateKey = this.getFoldStateKey(renderContext, testamentName);
		let isExpanded = this.getStoredFoldState(foldStateKey);
		table.style.display = isExpanded ? '' : 'none';
		indicator.empty();
		setIcon(indicator, isExpanded ? 'chevron-down' : 'chevron-right');

		const tbody = table.createEl('tbody');

		// Render reference rows
		for (const ref of references) {
			const row = tbody.createEl('tr', { cls: 'scripture-list-row' });
			row.style.borderBottom = '1px solid var(--background-modifier-border)';

			// Reference column
			const refCell = row.createEl('td', {
				attr: { style: 'padding: 8px; vertical-align: top; white-space: nowrap;' }
			});

			if (!ref.error && ref.verses) {
				this.renderReferenceLink(refCell, ref);
			} else {
				refCell.textContent = ref.parsedReference;
			}

			// Text column
			const textCell = row.createEl('td', {
				attr: { style: 'padding: 8px; vertical-align: top;' }
			});
			textCell.style.whiteSpace = 'pre-wrap';

			if (ref.error) {
				textCell.innerHTML = `<span style="color: var(--text-error);">❌ ${ref.error}</span>`;
			} else if (ref.verses) {
				textCell.textContent = this.formatVerseText(ref.verses);
			}

			// Copy button column
			const copyCell = row.createEl('td', {
				attr: { style: 'padding: 8px; text-align: center; vertical-align: top; width: 60px;' }
			});

			if (!ref.error && ref.verses) {
				this.renderCopyButton(copyCell, ref);
			}
		}

		// Add collapse/expand functionality
		header.addEventListener('click', () => {
			isExpanded = !isExpanded;
			table.style.display = isExpanded ? '' : 'none';
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
			// Use Obsidian's internal link navigation
			const app = (window as any).app;
			if (app) {
				app.workspace.openLinkText(`${linkPath}${anchor}`, '', false, { active: true });
			}
		});
	}

	/**
	 * Format verse text for display in table
	 */
	private formatVerseText(verses: BibleVerse[]): string {
		let formattedText = '';

		for (let i = 0; i < verses.length; i++) {
			const verse = verses[i];
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
			const rawState = window.localStorage.getItem(ScriptureListRenderer.FOLD_STATE_KEY);
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
			const rawState = window.localStorage.getItem(ScriptureListRenderer.FOLD_STATE_KEY);
			const parsedState = rawState ? JSON.parse(rawState) as Record<string, boolean> : {};
			parsedState[foldStateKey] = isExpanded;
			window.localStorage.setItem(
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
		const wrapper = container.createEl('div', { cls: 'scripture-list-wrapper' });
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
	}

	private renderListActionButton(
		container: HTMLElement,
		renderContext: ScriptureListRenderContext,
		action: ScriptureListAction
	): void {
		const actionConfig = action === 'add'
			? {
				ariaLabel: 'Add scripture to list',
				icon: 'plus',
				text: 'Add Scripture'
			}
			: {
				ariaLabel: 'Edit scripture list',
				icon: 'edit',
				text: 'Edit List'
			};

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

		// Handle click to switch to source mode
		button.addEventListener('click', (e) => {
			consumeEditorMouseEvent(e);

			setTimeout(() => {
				this.openCodeBlockForAction(renderContext, action);
			}, 0);
		});

		// Hover effect
		button.addEventListener('mouseenter', () => {
			button.style.color = 'var(--text-normal)';
		});
		button.addEventListener('mouseleave', () => {
			button.style.color = 'var(--text-muted)';
		});
	}

	private openCodeBlockForAction(renderContext: ScriptureListRenderContext, action: ScriptureListAction): void {
		const app = (window as any).app;
		if (!app) return;

		const markdownView = this.getMarkdownViewForRenderContext(app, renderContext);
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
			(markdownView as any).setMode('source');

			setTimeout(() => {
				applyAction();
			}, 150);
			return;
		}

		applyAction();
	}

	private getMarkdownViewForRenderContext(app: any, renderContext: ScriptureListRenderContext): MarkdownView | null {
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

		const targetLine = Math.max(codeBlockRange.lineStart + 1, codeBlockRange.lineEnd - 1);
		const lineContent = editor.getLine(targetLine) || '';

		return {
			line: targetLine,
			ch: lineContent.length
		};
	}

	private resolveCodeBlockRange(editor: Editor, sectionData?: MarkdownSectionInformation | null): { lineStart: number; lineEnd: number } | null {
		if (sectionData?.lineStart !== undefined && sectionData?.lineEnd !== undefined) {
			return {
				lineStart: sectionData.lineStart,
				lineEnd: sectionData.lineEnd
			};
		}

		const content = editor.getValue();
		const lines = content.split('\n');

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '```scriptureList' || lines[i].trim().startsWith('```scriptureList ')) {
				for (let j = i + 1; j < lines.length; j++) {
					if (lines[j].trim() === '```') {
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
		setTimeout(() => {
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

		const insertAtLine = codeBlockRange.lineEnd - 1;
		const insertAtCh = (editor.getLine(insertAtLine) || '').length;

		editor.replaceRange('\n', { line: insertAtLine, ch: insertAtCh });

		const targetLine = insertAtLine + 1;
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
				'aria-label': 'Copy scripture callout',
				style: 'cursor: pointer; padding: 4px 8px; border: none; background: transparent; color: var(--text-muted);'
			}
		});

		// Add Lucide copy icon
		setIcon(button, 'copy');

		// Handle click
		button.addEventListener('click', async () => {
			if (!ref.verses) return;

			try {
				// Use CalloutFormatter to generate the exact same callout as the Insert command
				const callout = this.calloutFormatter.formatCallout(
					ref.parsedReference,
					ref.verses,
					ref.translation,
					ref.verses.length > 1 // Include verse numbers for multi-verse selections
				);

				// Copy to clipboard
				await navigator.clipboard.writeText(callout);

				// Show success feedback
				new Notice('Scripture callout copied to clipboard');

				// Visual feedback on button
				button.style.color = 'var(--text-success)';
				setTimeout(() => {
					button.style.color = 'var(--text-muted)';
				}, 1000);

			} catch (error) {
				console.error('Error copying to clipboard:', error);
				new Notice('Failed to copy to clipboard');
			}
		});

		// Hover effect
		button.addEventListener('mouseenter', () => {
			button.style.color = 'var(--text-normal)';
		});
		button.addEventListener('mouseleave', () => {
			button.style.color = 'var(--text-muted)';
		});
	}
}
