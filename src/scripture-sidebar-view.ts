import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from 'obsidian';
import type { BibleBook, BibleChapter, BibleData, BibleTranslation, BibleVerseData, ScriptureSettings, ScriptureSidebarSide, ScriptureSidebarState } from './types';
import { BibleDataLoader } from './bible-data-loader';
import { createScriptureSidebarState, getScriptureSidebarNavigationTarget, parseScriptureSidebarState } from './scripture-sidebar-state';
import type { ScriptureSidebarNavigationTarget } from './scripture-sidebar-state';
import { resolveScriptureReference } from './verse-lookup';
import { ScriptureReferenceInputSuggest } from './scripture-reference-input-suggest';
import { orderTranslations } from './translation-order';

export const SCRIPTURE_SIDEBAR_VIEW_TYPE = 'scripture-sidebar';

interface ScriptureSidebarCallbacks {
	getSettings: () => ScriptureSettings;
	onStateChange: (state: ScriptureSidebarState) => void;
	onUsed: (leaf: WorkspaceLeaf) => void;
	onOpenFromClipboard: () => Promise<void>;
}

export class ScriptureSidebarView extends ItemView {
	private readonly dataLoader: BibleDataLoader;
	private readonly callbacks: ScriptureSidebarCallbacks;
	private state: ScriptureSidebarState;
	private readingEl: HTMLElement | null = null;
	private referenceInputEl: HTMLInputElement | null = null;
	private referenceSuggest: ScriptureReferenceInputSuggest | null = null;
	private translationMenu: Menu | null = null;
	private opened = false;
	private renderVersion = 0;
	private persistTimer: number | null = null;
	private lastLoadError = '';

	constructor(
		leaf: WorkspaceLeaf,
		dataLoader: BibleDataLoader,
		callbacks: ScriptureSidebarCallbacks,
	) {
		super(leaf);
		this.dataLoader = dataLoader;
		this.callbacks = callbacks;
		this.state = createScriptureSidebarState(callbacks.getSettings());
	}

	getViewType(): string {
		return SCRIPTURE_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Scripture sidebar';
	}

	getIcon(): string {
		return 'book-open-text';
	}

	getState(): Record<string, unknown> {
		this.captureScrollAnchor();
		return { ...this.state };
	}

	async setState(state: unknown): Promise<void> {
		this.state = parseScriptureSidebarState(state, this.callbacks.getSettings(), this.state);
		if (this.opened) await this.render(false);
	}

	protected async onOpen(): Promise<void> {
		this.opened = true;
		this.contentEl.addClass('scripture-sidebar-view');
		this.registerDomEvent(this.contentEl, 'pointerdown', () => this.markUsed());
		await this.render(false);
	}

	protected onClose(): Promise<void> {
		this.opened = false;
		this.disposeTranslationMenu();
		this.disposeReferenceSuggest();
		this.captureScrollAnchor();
		this.flushPersist();
		return Promise.resolve();
	}

	getSidebarState(): ScriptureSidebarState {
		this.captureScrollAnchor();
		return { ...this.state };
	}

	getLastUsedAt(): number {
		return this.state.lastUsedAt;
	}

	activate(): void {
		this.markUsed();
	}

	setSide(side: ScriptureSidebarSide): void {
		if (this.state.side === side) return;
		this.state.side = side;
		this.schedulePersist();
	}

	async navigateToChapter(bookId: string, chapter: number): Promise<void> {
		await this.navigateToReference({ bookId, chapter, anchorVerse: 1 });
	}

	async navigateToReference(target: ScriptureSidebarNavigationTarget, translation?: string): Promise<void> {
		if (translation && this.callbacks.getSettings().translations.some(candidate => candidate.name === translation)) {
			this.state.translation = translation;
		}
		this.state.bookId = target.bookId;
		this.state.chapter = target.chapter;
		this.state.anchorVerse = target.anchorVerse;
		this.state.anchorOffset = 0;
		this.markUsed();
		await this.render(false);
	}

	updateSettings(): void {
		void this.render(true);
	}

	updateVerseDisplay(): void {
		if (!this.readingEl) return;
		this.readingEl.removeClass('bible-numbers-none', 'bible-numbers-first', 'bible-numbers-all');
		this.readingEl.addClass(this.getVerseNumberDisplayClass());
	}

	private markUsed(): void {
		this.state.lastUsedAt = Date.now();
		this.callbacks.onUsed(this.leaf);
		this.schedulePersist();
	}

	private async render(preserveAnchor: boolean): Promise<void> {
		if (preserveAnchor) this.captureScrollAnchor();
		this.disposeTranslationMenu();
		this.disposeReferenceSuggest();
		const version = ++this.renderVersion;
		const settings = this.callbacks.getSettings();
		const translations = orderTranslations(settings.translations, settings.defaultTranslation);
		const selectedTranslation = translations.find(translation => translation.name === this.state.translation)
			|| translations.find(translation => translation.name === settings.sidebarDefaultTranslation)
			|| translations[0];
		this.state.translation = selectedTranslation?.name || '';

		let bibleData: BibleData | null = null;
		if (selectedTranslation) {
			this.contentEl.setAttribute('aria-busy', 'true');
			bibleData = await this.dataLoader.loadTranslation(selectedTranslation);
			if (version !== this.renderVersion) return;
		}

		this.contentEl.removeAttribute('aria-busy');
		this.contentEl.empty();
		this.readingEl = null;
		this.referenceInputEl = null;
		const toolbar = this.contentEl.createDiv({ cls: 'scripture-sidebar-toolbar' });
		const previousNavigation = toolbar.createDiv({
			cls: 'scripture-sidebar-navigation scripture-sidebar-navigation-previous',
		});
		const referenceInput = this.createReferenceInput(toolbar, translations, selectedTranslation);
		referenceInput.disabled = !selectedTranslation;
		const nextNavigation = toolbar.createDiv({
			cls: 'scripture-sidebar-navigation scripture-sidebar-navigation-next',
		});

		if (!selectedTranslation) {
			this.renderEmpty('No translations are configured. Add a local Bible JSON file in Scripture settings.');
			this.schedulePersist();
			return;
		}

		if (!bibleData) {
			const errorKey = `${selectedTranslation.name}:${selectedTranslation.filePath}`;
			if (this.lastLoadError !== errorKey) {
				this.lastLoadError = errorKey;
				new Notice(`Unable to load ${selectedTranslation.fullName || selectedTranslation.name}`);
			}
			this.renderEmpty('This translation could not be loaded. Choose another translation or validate its JSON file in settings.');
			this.schedulePersist();
			return;
		}
		this.lastLoadError = '';
		this.renderLoadedChapter(previousNavigation, nextNavigation, referenceInput, bibleData);
		this.schedulePersist();
	}

	private renderLoadedChapter(
		previousNavigation: HTMLElement,
		nextNavigation: HTMLElement,
		referenceInput: HTMLInputElement,
		bibleData: BibleData,
	): void {
		const book = bibleData.books.find(candidate => candidate.id === this.state.bookId) || bibleData.books[0];
		if (!book) {
			this.renderEmpty('This translation contains no books.');
			return;
		}
		this.state.bookId = book.id;
		const chapter = book.chapters.find(candidate => candidate.chapter === this.state.chapter) || book.chapters[0];
		if (!chapter) {
			this.renderEmpty(`${book.title} contains no chapters.`);
			return;
		}
		this.state.chapter = chapter.chapter;
		const canonicalReference = `${book.title} ${chapter.chapter}`;
		referenceInput.value = canonicalReference;
		referenceInput.dataset.canonicalReference = canonicalReference;
		this.syncReferenceInputSize(referenceInput);

		const chapters = bibleData.books.flatMap(candidateBook => candidateBook.chapters.map(candidateChapter => ({
			book: candidateBook,
			chapter: candidateChapter,
		})));
		const currentIndex = chapters.findIndex(item => item.book.id === book.id && item.chapter.chapter === chapter.chapter);
		this.createNavigationButton(previousNavigation, 'Previous chapter', 'chevron-left', chapters[currentIndex - 1], currentIndex <= 0);
		this.createNavigationButton(nextNavigation, 'Next chapter', 'chevron-right', chapters[currentIndex + 1], currentIndex < 0 || currentIndex >= chapters.length - 1);

		this.readingEl = this.contentEl.createDiv({ cls: ['scripture-sidebar-reading', this.getVerseNumberDisplayClass()] });
		const readingContent = this.readingEl.createDiv({ cls: 'scripture-sidebar-reading-content' });
		this.renderVerses(readingContent, chapter.verses);
		this.readingEl.addEventListener('scroll', () => {
			this.captureScrollAnchor();
			this.markUsed();
		});
		window.requestAnimationFrame(() => this.restoreScrollAnchor(chapter));
	}

	private getVerseNumberDisplayClass(): string {
		const settings = this.callbacks.getSettings();
		return !settings.verseNumbersVisible
			? 'bible-numbers-none'
			: settings.verseNumberDisplayMode === 'all'
				? 'bible-numbers-all'
				: 'bible-numbers-first';
	}

	private createReferenceInput(
		toolbar: HTMLElement,
		translations: BibleTranslation[],
		selectedTranslation: BibleTranslation | undefined,
	): HTMLInputElement {
		const form = toolbar.createEl('form', { cls: 'scripture-sidebar-reference-form' });
		const inputShell = form.createSpan({ cls: 'scripture-sidebar-reference-input-shell' });
		const input = inputShell.createEl('input', {
			type: 'text',
			placeholder: 'Enter a Scripture reference',
			cls: 'scripture-sidebar-reference-input',
			attr: {
				'aria-label': 'Scripture reference',
				title: 'Click to edit Scripture reference',
				autocomplete: 'off',
				enterkeyhint: 'go',
				spellcheck: 'false',
			},
		});
		const translationName = selectedTranslation?.name || 'Translation';
		const translationControl = form.createSpan({ cls: 'scripture-sidebar-translation-control' });
		translationControl.createSpan({
			cls: 'scripture-sidebar-translation-separator',
			text: ', ',
			attr: { 'aria-hidden': 'true' },
		});
		const translationButton = translationControl.createEl('button', {
			cls: 'scripture-sidebar-translation',
			text: translationName,
			attr: {
				type: 'button',
				'aria-label': selectedTranslation
					? `Change translation, current ${translationName}`
					: 'Choose translation',
				'aria-haspopup': 'menu',
				'aria-expanded': 'false',
				title: selectedTranslation
					? `Change translation (${selectedTranslation.fullName || translationName})`
					: 'Choose translation',
			},
		});
		translationButton.disabled = translations.length === 0;
		const openFromClipboardButton = form.createEl('button', {
			cls: 'clickable-icon',
			attr: {
				type: 'button',
				'aria-label': 'Open sidebar from clipboard',
				title: 'Open sidebar from clipboard',
			},
		});
		setIcon(openFromClipboardButton, 'clipboard-paste');
		this.referenceInputEl = input;
		translationButton.addEventListener('click', () => {
			this.referenceSuggest?.close();
			this.openTranslationMenu(translationButton, translations);
		});
		openFromClipboardButton.addEventListener('click', () => {
			void this.callbacks.onOpenFromClipboard();
		});

		form.addEventListener('submit', event => {
			event.preventDefault();
			void this.navigateFromReference(input.value);
		});
		input.addEventListener('keydown', event => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			this.restoreCanonicalReference(input);
			input.blur();
		});
		input.addEventListener('input', () => this.syncReferenceInputSize(input));
		input.addEventListener('focus', () => this.disposeTranslationMenu());
		input.addEventListener('blur', () => this.restoreCanonicalReference(input));
		this.syncReferenceInputSize(input);
		this.referenceSuggest = new ScriptureReferenceInputSuggest(
			this.app,
			input,
			() => input.dataset.canonicalReference || '',
			reference => this.navigateFromReference(reference),
			() => this.syncReferenceInputSize(input),
		);
		return input;
	}

	private openTranslationMenu(button: HTMLButtonElement, translations: BibleTranslation[]): void {
		this.disposeTranslationMenu();
		const menu = new Menu();
		for (const translation of translations) {
			menu.addItem(item => item
				.setTitle(translation.name)
				.setChecked(translation.name === this.state.translation)
				.onClick(() => this.selectTranslation(translation.name)));
		}

		menu.onHide(() => {
			if (this.translationMenu === menu) this.translationMenu = null;
			if (button.isConnected) button.setAttribute('aria-expanded', 'false');
		});
		this.translationMenu = menu;
		button.setAttribute('aria-expanded', 'true');
		const rect = button.getBoundingClientRect();
		menu.showAtPosition({
			x: rect.left,
			y: rect.bottom,
			width: rect.width,
		}, button.ownerDocument);
	}

	private selectTranslation(translation: string): void {
		if (translation === this.state.translation) return;
		this.captureScrollAnchor();
		this.state.translation = translation;
		this.markUsed();
		void this.render(false);
	}

	private disposeTranslationMenu(): void {
		this.translationMenu?.close();
		this.translationMenu = null;
	}

	private disposeReferenceSuggest(): void {
		this.referenceSuggest?.destroy();
		this.referenceSuggest = null;
	}

	private restoreCanonicalReference(input: HTMLInputElement): void {
		const canonicalReference = input.dataset.canonicalReference;
		if (canonicalReference) input.value = canonicalReference;
		this.syncReferenceInputSize(input);
	}

	private syncReferenceInputSize(input: HTMLInputElement): void {
		const shell = input.parentElement;
		if (!shell?.classList.contains('scripture-sidebar-reference-input-shell')) return;
		shell.dataset.value = input.value || input.placeholder;
	}

	private async navigateFromReference(input: string): Promise<void> {
		const reference = input.trim();
		if (!reference) {
			new Notice('Please enter a Scripture reference');
			this.focusReferenceInput();
			return;
		}

		const settings = this.callbacks.getSettings();
		const translation = settings.translations.find(candidate => candidate.name === this.state.translation);
		if (!translation) {
			new Notice('Please select a translation');
			return;
		}

		const version = ++this.renderVersion;
		try {
			const resolved = await resolveScriptureReference(this.dataLoader, translation, reference);
			if (version !== this.renderVersion) return;
			const target = getScriptureSidebarNavigationTarget(resolved);
			if (!target) {
				new Notice('Reference not found or invalid format');
				this.focusReferenceInput();
				return;
			}

			this.state.bookId = target.bookId;
			this.state.chapter = target.chapter;
			this.state.anchorVerse = target.anchorVerse;
			this.state.anchorOffset = 0;
			this.markUsed();
			await this.render(false);
		} catch (error) {
			if (version !== this.renderVersion) return;
			console.error('Failed to navigate Scripture sidebar reference:', error);
			new Notice('Unable to load this Scripture reference');
			this.focusReferenceInput();
		}
	}

	private focusReferenceInput(): void {
		window.setTimeout(() => {
			if (!this.referenceInputEl?.isConnected) return;
			this.referenceInputEl.focus();
			this.referenceInputEl.select();
		});
	}

	private createNavigationButton(
		container: HTMLElement,
		label: string,
		icon: string,
		target: { book: BibleBook; chapter: BibleChapter } | undefined,
		disabled: boolean,
	): void {
		const button = container.createEl('button', {
			cls: 'clickable-icon',
			attr: { type: 'button', 'aria-label': label, title: label },
		});
		setIcon(button, icon);
		button.disabled = disabled;
		button.addEventListener('click', () => {
			if (!target) return;
			this.state.bookId = target.book.id;
			this.state.chapter = target.chapter.chapter;
			this.resetAnchor(target.chapter);
			this.markUsed();
			void this.render(false);
		});
	}

	private renderVerses(container: HTMLElement, verses: BibleVerseData[]): void {
		let proseBlock: HTMLParagraphElement | null = null;
		let poetryBlock: HTMLElement | null = null;
		for (const verse of verses) {
			if (verse.poetry) {
				proseBlock = null;
				if (!poetryBlock || verse.newParagraph) {
					poetryBlock = container.createDiv({ cls: 'scripture-sidebar-poetry' });
				}
				const verseEl = poetryBlock.createDiv({
					cls: 'scripture-sidebar-verse scripture-sidebar-poetry-line',
					attr: { 'data-scripture-verse': String(verse.verse) },
				});
				this.renderVerseContent(verseEl, verse, true);
				continue;
			}

			poetryBlock = null;
			if (!proseBlock || verse.newParagraph) {
				proseBlock = container.createEl('p', { cls: 'scripture-sidebar-paragraph' });
			}
			const verseEl = proseBlock.createSpan({
				cls: 'scripture-sidebar-verse',
				attr: { 'data-scripture-verse': String(verse.verse) },
			});
			this.renderVerseContent(verseEl, verse, false);
			proseBlock.appendText(' ');
		}
	}

	private renderVerseContent(container: HTMLElement, verse: BibleVerseData, breakLines: boolean): void {
		container.createEl('sup', { text: String(verse.verse) });
		verse.content.forEach((line, index) => {
			if (index > 0) container.createEl('br');
			if (breakLines) {
				container.createSpan({ text: line });
			} else {
				container.appendText(line);
			}
		});
	}

	private renderEmpty(message: string): void {
		this.readingEl = this.contentEl.createDiv({ cls: 'scripture-sidebar-reading scripture-sidebar-empty' });
		this.readingEl
			.createDiv({ cls: 'scripture-sidebar-reading-content' })
			.createEl('p', { text: message });
	}

	private resetAnchor(chapter: BibleChapter): void {
		this.state.anchorVerse = chapter.verses[0]?.verse || 1;
		this.state.anchorOffset = 0;
	}

	private captureScrollAnchor(): void {
		if (!this.readingEl?.isConnected) return;
		const verses = Array.from(this.readingEl.querySelectorAll<HTMLElement>('[data-scripture-verse]'));
		if (verses.length === 0) return;
		const containerTop = this.readingEl.getBoundingClientRect().top;
		const anchor = verses.reduce((current, candidate) =>
			candidate.getBoundingClientRect().top <= containerTop + 8 ? candidate : current,
		verses[0]!);
		this.state.anchorVerse = Number(anchor.dataset.scriptureVerse) || 1;
		this.state.anchorOffset = anchor.getBoundingClientRect().top - containerTop;
	}

	private restoreScrollAnchor(chapter: BibleChapter): void {
		if (!this.readingEl?.isConnected) return;
		const verseNumbers = chapter.verses.map(verse => verse.verse);
		const targetNumber = verseNumbers.includes(this.state.anchorVerse)
			? this.state.anchorVerse
			: verseNumbers.reduce((nearest, number) => {
				const distance = Math.abs(number - this.state.anchorVerse);
				const nearestDistance = Math.abs(nearest - this.state.anchorVerse);
				return distance < nearestDistance || (distance === nearestDistance && number < nearest) ? number : nearest;
			}, verseNumbers[0] || 1);
		const target = this.readingEl.querySelector<HTMLElement>(`[data-scripture-verse="${targetNumber}"]`);
		if (!target) return;
		const containerTop = this.readingEl.getBoundingClientRect().top;
		this.readingEl.scrollTop += target.getBoundingClientRect().top - containerTop - this.state.anchorOffset;
	}

	private schedulePersist(): void {
		if (this.persistTimer !== null) window.clearTimeout(this.persistTimer);
		this.persistTimer = window.setTimeout(() => this.flushPersist(), 250);
	}

	private flushPersist(): void {
		if (this.persistTimer !== null) window.clearTimeout(this.persistTimer);
		this.persistTimer = null;
		this.callbacks.onStateChange({ ...this.state });
	}
}
