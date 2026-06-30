import { ItemView, Notice, WorkspaceLeaf, setIcon } from 'obsidian';
import type { BibleBook, BibleChapter, BibleData, BibleVerseData, ScriptureSettings, ScriptureSidebarSide, ScriptureSidebarState } from './types';
import { BibleDataLoader } from './bible-data-loader';
import { createScriptureSidebarState, parseScriptureSidebarState } from './scripture-sidebar-state';

export const SCRIPTURE_SIDEBAR_VIEW_TYPE = 'scripture-sidebar';

interface ScriptureSidebarCallbacks {
	getSettings: () => ScriptureSettings;
	onStateChange: (state: ScriptureSidebarState) => void;
	onUsed: (leaf: WorkspaceLeaf) => void;
}

export class ScriptureSidebarView extends ItemView {
	private readonly dataLoader: BibleDataLoader;
	private readonly callbacks: ScriptureSidebarCallbacks;
	private state: ScriptureSidebarState;
	private readingEl: HTMLElement | null = null;
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
		this.state.bookId = bookId;
		this.state.chapter = chapter;
		this.state.anchorVerse = 1;
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
		const version = ++this.renderVersion;
		const settings = this.callbacks.getSettings();
		const selectedTranslation = settings.translations.find(translation => translation.name === this.state.translation)
			|| settings.translations.find(translation => translation.name === settings.sidebarDefaultTranslation)
			|| settings.translations[0];
		this.state.translation = selectedTranslation?.name || '';

		this.contentEl.empty();
		const toolbar = this.contentEl.createDiv({ cls: 'scripture-sidebar-toolbar' });
		const translationSelect = this.createSelect(toolbar, 'Translation');
		for (const translation of settings.translations) {
			translationSelect.createEl('option', { text: translation.fullName || translation.name, value: translation.name });
		}
		translationSelect.value = this.state.translation;
		translationSelect.disabled = settings.translations.length === 0;
		translationSelect.addEventListener('change', () => {
			this.captureScrollAnchor();
			this.state.translation = translationSelect.value;
			this.markUsed();
			void this.render(false);
		});

		if (!selectedTranslation) {
			this.renderEmpty('No translations are configured. Add a local Bible JSON file in Scripture settings.');
			this.schedulePersist();
			return;
		}

		const bibleData = await this.dataLoader.loadTranslation(selectedTranslation);
		if (version !== this.renderVersion) return;
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
		this.renderLoadedChapter(toolbar, bibleData);
		this.schedulePersist();
	}

	private renderLoadedChapter(toolbar: HTMLElement, bibleData: BibleData): void {
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

		const bookSelect = this.createSelect(toolbar, 'Book');
		for (const candidate of bibleData.books) {
			bookSelect.createEl('option', { text: candidate.title, value: candidate.id });
		}
		bookSelect.value = book.id;
		bookSelect.addEventListener('change', () => {
			const nextBook = bibleData.books.find(candidate => candidate.id === bookSelect.value);
			if (!nextBook?.chapters[0]) return;
			this.state.bookId = nextBook.id;
			this.state.chapter = nextBook.chapters[0].chapter;
			this.resetAnchor(nextBook.chapters[0]);
			this.markUsed();
			void this.render(false);
		});

		const chapterSelect = this.createSelect(toolbar, 'Chapter');
		for (const candidate of book.chapters) {
			chapterSelect.createEl('option', { text: String(candidate.chapter), value: String(candidate.chapter) });
		}
		chapterSelect.value = String(chapter.chapter);
		chapterSelect.addEventListener('change', () => {
			const nextChapter = book.chapters.find(candidate => candidate.chapter === Number(chapterSelect.value));
			if (!nextChapter) return;
			this.state.chapter = nextChapter.chapter;
			this.resetAnchor(nextChapter);
			this.markUsed();
			void this.render(false);
		});

		const navigation = toolbar.createDiv({ cls: 'scripture-sidebar-navigation' });
		const chapters = bibleData.books.flatMap(candidateBook => candidateBook.chapters.map(candidateChapter => ({
			book: candidateBook,
			chapter: candidateChapter,
		})));
		const currentIndex = chapters.findIndex(item => item.book.id === book.id && item.chapter.chapter === chapter.chapter);
		this.createNavigationButton(navigation, 'Previous chapter', 'chevron-left', chapters[currentIndex - 1], currentIndex <= 0);
		this.createNavigationButton(navigation, 'Next chapter', 'chevron-right', chapters[currentIndex + 1], currentIndex < 0 || currentIndex >= chapters.length - 1);

		this.readingEl = this.contentEl.createDiv({ cls: ['scripture-sidebar-reading', this.getVerseNumberDisplayClass()] });
		this.readingEl.createEl('h2', { text: `${book.title} ${chapter.chapter}` });
		this.renderVerses(this.readingEl, chapter.verses);
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

	private createSelect(toolbar: HTMLElement, label: string): HTMLSelectElement {
		const wrapper = toolbar.createEl('label', { cls: 'scripture-sidebar-control' });
		wrapper.createSpan({ text: label, cls: 'scripture-sidebar-control-label' });
		return wrapper.createEl('select', { attr: { 'aria-label': label } });
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
			attr: { 'aria-label': label, title: label },
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
		this.readingEl.createEl('p', { text: message });
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
