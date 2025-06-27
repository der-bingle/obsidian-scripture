import { App, Modal, Notice, ButtonComponent } from 'obsidian';
import { detect_references, PassageReference } from '../bible-references/index.js';
import type { BibleData, BibleVerse, OnSubmitCallback, BibleTranslation } from './types';
import { BibleDataLoader } from './bible-data-loader';

export class BibleReferenceModal extends Modal {
	private translations: BibleTranslation[];
	private selectedTranslation: string;
	private dataLoader: BibleDataLoader;
	private onSubmit: OnSubmitCallback;
	private inputEl: HTMLInputElement;
	private translationButtons: ButtonComponent[] = [];
	private previewEl: HTMLElement;
	private initialReference: string;

	constructor(app: App, translations: BibleTranslation[], defaultTranslation: string, dataLoader: BibleDataLoader, initialReference: string, onSubmit: OnSubmitCallback) {
		super(app);
		this.translations = translations;
		this.selectedTranslation = defaultTranslation || (translations.length > 0 ? translations[0].name : '');
		this.dataLoader = dataLoader;
		this.initialReference = initialReference || '';
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Insert Bible Reference' });

		if (this.translations.length === 0) {
			contentEl.createEl('p', {
				text: 'No translations configured. Please add translations in plugin settings.',
				cls: 'setting-item-description'
			});

			const closeButton = contentEl.createEl('button', { text: 'Close' });
			closeButton.onclick = () => this.close();
			return;
		}

		this.createReferenceInput(contentEl);
		this.createTranslationSelector(contentEl);
		this.createPreview(contentEl);
		this.createButtons(contentEl);

		// Focus input when modal opens
		setTimeout(() => this.inputEl.focus(), 100);
	}

	private createReferenceInput(container: HTMLElement): void {
		const inputContainer = container.createDiv('bible-reference-input');
		inputContainer.createEl('label', { text: 'Insert reference' });

		this.inputEl = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter reference (e.g., John 3:16, Psalm 23:1-3)',
		});

		this.inputEl.style.width = '100%';
		this.inputEl.style.padding = '8px';
		this.inputEl.style.margin = '5px 0 15px 0';

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
		const previewContainer = container.createDiv('bible-reference-preview');
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

	private createButtons(container: HTMLElement): void {
		const buttonContainer = container.createDiv('bible-reference-buttons');
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
			new Notice('Please enter a Bible reference');
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

			this.onSubmit(reference, verses, this.selectedTranslation);
			this.close();
		} catch (error) {
			new Notice('Error processing reference');
			console.error('Submit error:', error);
		}
	}

	private async parseAndLookupReference(reference: string): Promise<BibleVerse[]> {
		try {
			console.log('Input reference:', reference);

			const matchGenerator = detect_references(reference);
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
		const endVerse = ref.end_verse || ref.start_verse;

		console.log(`Looking up: ${bookCode} ${chapter}:${startVerse}-${endVerse}`);

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

		for (let verseNum = startVerse; verseNum <= endVerse; verseNum++) {
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
