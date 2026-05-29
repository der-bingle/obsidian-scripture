import { App, Modal, Notice, ButtonComponent, Setting, ToggleComponent, setIcon } from 'obsidian';
import { detectReferences, PassageReference } from 'scripture-references';
import type { BibleData, BibleVerse, OnSubmitCallback, BibleTranslation, ReferenceFormat, InsertScriptureFormat } from './types';
import { BibleDataLoader } from './bible-data-loader';

export class ScriptureModal extends Modal {
	private translations: BibleTranslation[];
	private selectedTranslation: string;
	private dataLoader: BibleDataLoader;
	private onSubmit: OnSubmitCallback;
	private inputEl: HTMLInputElement;
	private translationButtons: ButtonComponent[] = [];
	private previewEl: HTMLElement;
	private initialReference: string;
	private includeVerseNumbersToggle: ToggleComponent;
	private includeVerseNumbersValue: boolean;
	private showVerseNumbersToggle: boolean;
	private showOutputFormatSelector: boolean;
	private insertScriptureFormat: InsertScriptureFormat;
	private referenceFormat: ReferenceFormat;
	private initialCursorPosition: 'start' | 'end';
	private title: string;

	// defaultIncludeVerseNumbers is the default value loaded from settings
	// showVerseNumbersToggle determines whether to show the toggle in the UI
	constructor(app: App, translations: BibleTranslation[], defaultTranslation: string, dataLoader: BibleDataLoader, initialReference: string, onSubmit: OnSubmitCallback, defaultIncludeVerseNumbers: boolean, defaultInsertScriptureFormat: InsertScriptureFormat, defaultReferenceFormat: ReferenceFormat, showOutputFormatSelector: boolean = true, showVerseNumbersToggle: boolean = true, initialCursorPosition: 'start' | 'end' = 'end', title: string = 'Insert Scripture') {
		super(app);
		this.translations = translations;
		this.selectedTranslation = defaultTranslation || (translations.length > 0 ? translations[0].name : '');
		this.dataLoader = dataLoader;
		this.initialReference = initialReference || '';
		this.initialCursorPosition = initialCursorPosition;
		this.onSubmit = onSubmit;
		this.includeVerseNumbersValue = defaultIncludeVerseNumbers;
		this.showVerseNumbersToggle = showVerseNumbersToggle;
		this.showOutputFormatSelector = showOutputFormatSelector;
		this.insertScriptureFormat = defaultInsertScriptureFormat;
		this.referenceFormat = defaultReferenceFormat;
		this.title = title;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: this.title });

		if (this.translations.length === 0) {
			contentEl.createEl('p', {
				text: 'No translations configured. Please add one in the plugin settings.',
				cls: 'setting-item-description'
			});

			const closeButton = contentEl.createEl('button', { text: 'Close' });
			closeButton.onclick = () => this.close();
			return;
		}

		this.createReferenceInput(contentEl);
		this.createTranslationSelector(contentEl);
		if (this.showOutputFormatSelector) {
			this.createOutputFormatSelector(contentEl);
		}
		this.createReferenceFormatSelector(contentEl);
		if (this.showVerseNumbersToggle) {
			this.createIncludeVerseNumbersToggle(contentEl);
		}
		this.createPreview(contentEl);
		this.createButtons(contentEl);

		// Focus input when modal opens
		setTimeout(() => {
			this.inputEl.focus();
			if (this.initialReference) {
				const cursorPosition = this.initialCursorPosition === 'start' ? 0 : this.inputEl.value.length;
				this.inputEl.setSelectionRange(cursorPosition, cursorPosition);
			}
		}, 100);
	}

	private createReferenceInput(container: HTMLElement): void {
		const inputContainer = container.createDiv('scripture-input');
		inputContainer.createEl('label', { text: 'Scripture reference' });
		inputContainer.style.position = 'relative';

		this.inputEl = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter reference (e.g., John 3:16, Psalm 23:1-3)',
		});

		this.inputEl.style.width = '100%';
		this.inputEl.style.padding = '8px';
		this.inputEl.style.paddingRight = '40px';
		this.inputEl.style.margin = '5px 0 15px 0';

		const pasteButton = inputContainer.createEl('button', {
			attr: {
				type: 'button',
				'aria-label': 'Paste from clipboard',
				title: 'Paste from clipboard'
			}
		});
		pasteButton.style.position = 'absolute';
		pasteButton.style.right = '6px';
		pasteButton.style.top = '35px';
		pasteButton.style.padding = '4px 6px';
		pasteButton.style.border = 'none';
		pasteButton.style.background = 'transparent';
		pasteButton.style.cursor = 'pointer';
		setIcon(pasteButton, 'clipboard-paste');

		pasteButton.addEventListener('click', async (evt) => {
			evt.preventDefault();
			try {
				const clipText = await navigator.clipboard.readText();
				if (!clipText?.trim()) {
					new Notice('Clipboard is empty');
					return;
				}

				this.inputEl.value = clipText.trim();
				this.updatePreview();
			} catch (error) {
				console.error('Clipboard read failed:', error);
				new Notice('Unable to read clipboard in this environment');
			}
		});

		// Set initial value if we have a pre-populated reference
		if (this.initialReference) {
			this.inputEl.value = this.initialReference;
			// Trigger preview update for pre-populated reference
			setTimeout(() => this.updatePreview(), 100);
		}

		// Update preview when typing
		this.inputEl.addEventListener('input', () => {
			this.updatePreview();
		});
	}

	private createTranslationSelector(container: HTMLElement): void {
		if (this.translations.length <= 1) {
			return; // Don't show selector if only one translation
		}

		const selectorContainer = container.createDiv('bible-translation-selector');
		selectorContainer.createEl('label', { text: 'Pick translation' });

		const buttonContainer = selectorContainer.createDiv('bible-translation-buttons');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '8px';
		buttonContainer.style.margin = '5px 0 15px 0';
		buttonContainer.style.flexWrap = 'wrap';

		this.translations.forEach(translation => {
			const button = new ButtonComponent(buttonContainer);
			button
				.setButtonText(translation.name)
				.onClick(() => {
					this.selectTranslation(translation.name);
					this.updatePreview();
				});

			this.translationButtons.push(button);
		});

		// Set initial selection
		this.updateTranslationButtons();
	}

	private createPreview(container: HTMLElement): void {
		const previewContainer = container.createDiv('scripture-preview');
		previewContainer.createEl('label', { text: 'Preview' });

		this.previewEl = previewContainer.createEl('div', {
			cls: 'bible-preview-content'
		});

		this.previewEl.style.border = '1px solid var(--background-modifier-border)';
		this.previewEl.style.borderRadius = '4px';
		this.previewEl.style.padding = '12px';
		this.previewEl.style.margin = '5px 0 15px 0';
		this.previewEl.style.minHeight = '100px';
		this.previewEl.style.maxHeight = '300px';
		this.previewEl.style.overflowY = 'auto';
		this.previewEl.style.fontSize = '0.9em';
		this.previewEl.style.lineHeight = '1.4';
		this.previewEl.style.whiteSpace = 'pre-wrap'; // Preserves line breaks

		this.previewEl.innerHTML = 'Enter a reference to see preview...';
	}

	private createOutputFormatSelector(container: HTMLElement): void {
		new Setting(container)
			.setName('Output format')
			.setDesc('How to insert the Scripture text')
			.addDropdown(dropdown => dropdown
				.addOption('scripture-callout', 'Scripture callout')
				.addOption('plain-text', 'Plain text')
				.setValue(this.insertScriptureFormat)
				.onChange((value: InsertScriptureFormat) => {
					this.insertScriptureFormat = value;
				}));
	}

	private createIncludeVerseNumbersToggle(container: HTMLElement): void {
		const toggleSetting = container.createDiv('include-verse-numbers');
		const setting = new Setting(toggleSetting)
			.setName('Include verse numbers')
			.setDesc('Include verse numbers when inserting multiple verses')
			.addToggle(toggle => {
				this.includeVerseNumbersToggle = toggle;
				toggle.setValue(this.includeVerseNumbersValue || false);
				toggle.onChange((value) => {
					this.includeVerseNumbersValue = value;
				});
			});
	}

	private createReferenceFormatSelector(container: HTMLElement): void {
		new Setting(container)
			.setName('Reference format')
			.setDesc('How to display book names in the inserted Scripture reference')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'Traditional abbreviations (Jas. 1:16–18)')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.referenceFormat)
				.onChange((value: ReferenceFormat) => {
					this.referenceFormat = value;
				}));
	}

	private createButtons(container: HTMLElement): void {
		const buttonContainer = container.createDiv('scripture-buttons');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';

		const cancelButton = new ButtonComponent(buttonContainer);
		cancelButton
			.setButtonText('Cancel')
			.onClick(() => this.close());

		const insertButton = new ButtonComponent(buttonContainer);
		insertButton
			.setButtonText('Insert')
			.setCta()
			.onClick(() => this.handleSubmit());

		// Enter key submits
		this.inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.handleSubmit();
			}
		});
	}

	private selectTranslation(translationName: string): void {
		this.selectedTranslation = translationName;
		this.updateTranslationButtons();
	}

	private updateTranslationButtons(): void {
		this.translationButtons.forEach((button, index) => {
			const translation = this.translations[index];
			if (translation.name === this.selectedTranslation) {
				button.buttonEl.addClass('mod-cta');
			} else {
				button.buttonEl.removeClass('mod-cta');
			}
		});
	}

	private async updatePreview(): Promise<void> {
		const reference = this.inputEl.value.trim();

		if (!reference) {
			this.previewEl.innerHTML = 'Enter a reference to see preview...';
			return;
		}

		if (!this.selectedTranslation) {
			this.previewEl.innerHTML = 'No translation selected';
			return;
		}

		try {
			const verses = await this.parseAndLookupReference(reference);

			if (verses.length === 0) {
				this.previewEl.innerHTML = 'Reference not found or invalid format';
				return;
			}

			// Format preview text using the same line-joining logic as the callout formatter
			const formattedText = verses.map((verse, index) => {
				const verseNum = verse.verse;
				// Join multiple content lines with newlines (same as callout formatter)
				let content = verse.content.join('\n');

				// If it's poetry, add an extra newline at the end (same as callout formatter)
				if (verse.poetry) {
					content += '\n';
				}

				// Show verse numbers in preview for clarity
				return `${verseNum} ${content}`;
			}).join(' ');

			// Use innerHTML to render <br> tags for line breaks
			this.previewEl.innerHTML = formattedText.replace(/\n/g, '<br>');

		} catch (error) {
			this.previewEl.innerHTML = 'Error parsing reference';
			console.error('Preview error:', error);
		}
	}

	private async handleSubmit(): Promise<void> {
		const reference = this.inputEl.value.trim();
		if (!reference) {
			new Notice('Please enter a Scripture reference');
			return;
		}

		if (!this.selectedTranslation) {
			new Notice('Please select a translation');
			return;
		}

		try {
			const verses = await this.parseAndLookupReference(reference);
			if (verses.length === 0) {
				new Notice('Reference not found or invalid format');
				return;
			}

			// If only a single verse is being inserted, we should not include verse numbers
			const includeVerseNumbers = verses.length === 1 ? false : !!this.includeVerseNumbersValue;

			this.onSubmit(reference, verses, this.selectedTranslation, includeVerseNumbers, this.insertScriptureFormat, this.referenceFormat);
			this.close();
		} catch (error) {
			new Notice('Error processing reference');
			console.error('Submit error:', error);
		}
	}

	private async parseAndLookupReference(reference: string): Promise<BibleVerse[]> {
		try {
			console.log('Input reference:', reference);

			const matchGenerator = detectReferences(reference);
			const matches = Array.from(matchGenerator);
			console.log('Matches array:', matches);

			if (!matches || matches.length === 0) {
				console.log('No matches found');
				return [];
			}

			console.log('First match:', matches[0]);

			// Check if we have a valid match
			if (!matches[0] || !(matches[0] as any).ref) {
				console.log('Invalid match structure');
				return [];
			}

			// The structure is: match.ref contains the PassageReference
			const match = matches[0] as any;
			const passageRef = match.ref as PassageReference;

			console.log('PassageReference object:', passageRef);

			return await this.lookupVerses(passageRef);

		} catch (error) {
			console.error('Error in parseAndLookupReference:', error);
			throw error;
		}
	}

	private async lookupVerses(ref: PassageReference): Promise<BibleVerse[]> {
		// Load the selected translation
		const translation = this.translations.find(t => t.name === this.selectedTranslation);
		if (!translation) {
			throw new Error('Selected translation not found');
		}

		const bibleData = await this.dataLoader.loadTranslation(translation);
		if (!bibleData) {
			throw new Error(`Failed to load translation: ${this.selectedTranslation}`);
		}

		console.log('Bible data structure:', {
			translation: bibleData.translation,
			booksCount: bibleData.books?.length
		});

		if (!bibleData.books || !Array.isArray(bibleData.books)) {
			console.error('bibleData.books is not an array!');
			return [];
		}

		const verses: BibleVerse[] = [];

		// Convert book ID to our format (e.g., 'jhn' -> 'JHN')
		const bookCode = ref.book.toUpperCase();

		const chapter = ref.start_chapter;
		const startVerse = ref.start_verse;
		const isChapterReference = ref.type === 'chapter';

		console.log(`Looking up: ${bookCode} ${chapter}`);

		// Find the book in the books array
		const book = bibleData.books.find(b => b.id === bookCode);
		if (!book) {
			console.log(`Book not found: ${bookCode}`);
			return [];
		}

		console.log(`Found book:`, book.title);

		// Find the chapter
		if (!book.chapters || !Array.isArray(book.chapters)) {
			console.log(`Book has no chapters array`);
			return [];
		}

		const chapterData = book.chapters.find(c => c.chapter === chapter);
		if (!chapterData) {
			console.log(`Chapter not found: ${chapter}`);
			return [];
		}

		console.log(`Found chapter ${chapter}, verses:`, chapterData.verses?.length);

		// Find the verses
		if (!chapterData.verses || !Array.isArray(chapterData.verses)) {
			console.log(`Chapter has no verses array`);
			return [];
		}

		const endVerse = isChapterReference
			? chapterData.verses[chapterData.verses.length - 1]?.verse
			: (ref.end_verse || ref.start_verse);
		const lookupStartVerse = isChapterReference ? chapterData.verses[0]?.verse : startVerse;
		if (!lookupStartVerse || !endVerse) {
			return [];
		}

		for (let verseNum = lookupStartVerse; verseNum <= endVerse; verseNum++) {
			const verseData = chapterData.verses.find(v => v.verse === verseNum);
			if (verseData) {
				// Convert to our expected BibleVerse format
				const bibleVerse: BibleVerse = {
					id: verseData.id,
					book: verseData.book,
					chapter: verseData.chapter,
					verse: verseData.verse,
					content: verseData.content,
					newParagraph: verseData.newParagraph,
					poetry: verseData.poetry
				};
				verses.push(bibleVerse);
				console.log(`Found verse ${verseNum}:`, verseData.content[0]);
			} else {
				console.log(`Verse not found: ${verseNum}`);
			}
		}

		console.log(`Total verses found: ${verses.length}`);
		return verses;
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
