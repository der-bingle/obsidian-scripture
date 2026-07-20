import { App, Modal, Notice, ButtonComponent, Setting, ToggleComponent, setIcon } from 'obsidian';
import type { BibleVerse, OnSubmitCallback, BibleTranslation, ReferenceFormat, InsertScriptureFormat } from './types';
import { BibleDataLoader } from './bible-data-loader';
import { parseAndLookupReference as resolveReferenceToVerses } from './verse-lookup';

export class ScriptureModal extends Modal {
	private translations: BibleTranslation[];
	private selectedTranslation: string;
	private dataLoader: BibleDataLoader;
	private onSubmit: OnSubmitCallback;
	private inputEl!: HTMLInputElement;
	private translationButtons: ButtonComponent[] = [];
	private previewEl!: HTMLElement;
	private initialReference: string;
	private includeVerseNumbersToggle!: ToggleComponent;
	private includeVerseNumbersValue: boolean;
	private showVerseNumbersToggle: boolean;
	private showOutputFormatSelector: boolean;
	private insertScriptureFormat: InsertScriptureFormat;
	private referenceFormat: ReferenceFormat;
	private initialCursorPosition: 'start' | 'end';
	private title: string;

	// defaultIncludeVerseNumbers is the default value loaded from settings
	// showVerseNumbersToggle determines whether to show the toggle in the UI
	constructor(app: App, translations: BibleTranslation[], defaultTranslation: string, dataLoader: BibleDataLoader, initialReference: string, onSubmit: OnSubmitCallback, defaultIncludeVerseNumbers: boolean, defaultInsertScriptureFormat: InsertScriptureFormat, defaultReferenceFormat: ReferenceFormat, showOutputFormatSelector = true, showVerseNumbersToggle = true, initialCursorPosition: 'start' | 'end' = 'end', title = 'Insert scripture') {
		super(app);
		this.translations = translations;
		this.selectedTranslation = defaultTranslation || translations[0]?.name || '';
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
		this.setTitle(this.title);

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
		window.setTimeout(() => {
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

		this.inputEl = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter reference (e.g., John 3:16, Psalm 23:1-3)',
		});

		this.inputEl.addClass('scripture-reference-input');

		const pasteButton = inputContainer.createEl('button', {
			attr: {
				type: 'button',
				'aria-label': 'Paste from clipboard',
				title: 'Paste from clipboard'
			},
			cls: 'scripture-input-paste-button'
		});
		setIcon(pasteButton, 'clipboard-paste');

		pasteButton.addEventListener('click', (evt) => {
			evt.preventDefault();
			void this.pasteReferenceFromClipboard();
		});

		// Set initial value if we have a pre-populated reference
		if (this.initialReference) {
			this.inputEl.value = this.initialReference;
			// Trigger preview update for pre-populated reference
			window.setTimeout(() => void this.updatePreview(), 100);
		}

		// Update preview when typing
		this.inputEl.addEventListener('input', () => {
			void this.updatePreview();
		});
	}

	private createTranslationSelector(container: HTMLElement): void {
		if (this.translations.length <= 1) {
			return; // Don't show selector if only one translation
		}

		const selectorContainer = container.createDiv('bible-translation-selector');
		selectorContainer.createEl('label', { text: 'Pick translation' });

		const buttonContainer = selectorContainer.createDiv('bible-translation-buttons');

		this.translations.forEach(translation => {
			const button = new ButtonComponent(buttonContainer);
			button
				.setButtonText(translation.name)
				.onClick(() => {
					this.selectTranslation(translation.name);
					void this.updatePreview();
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

		this.previewEl.setText('Enter a reference to see preview...');
	}

	private createOutputFormatSelector(container: HTMLElement): void {
		new Setting(container)
			.setName('Output format')
			.setDesc('How to insert the Scripture text')
			.addDropdown(dropdown => dropdown
				.addOption('scripture-callout', 'Scripture callout')
				.addOption('plain-text', 'Plain text')
				.setValue(this.insertScriptureFormat)
				.onChange((value) => {
					this.insertScriptureFormat = value as InsertScriptureFormat;
				}));
	}

	private createIncludeVerseNumbersToggle(container: HTMLElement): void {
		const toggleSetting = container.createDiv('include-verse-numbers');
		new Setting(toggleSetting)
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
				.onChange((value) => {
					this.referenceFormat = value as ReferenceFormat;
				}));
	}

	private createButtons(container: HTMLElement): void {
		const buttonContainer = container.createDiv('scripture-modal-button-row');

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
				e.preventDefault();
				e.stopPropagation();
				void this.handleSubmit();
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
			if (translation?.name === this.selectedTranslation) {
				button.buttonEl.addClass('mod-cta');
			} else {
				button.buttonEl.removeClass('mod-cta');
			}
		});
	}

	private async updatePreview(): Promise<void> {
		const reference = this.inputEl.value.trim();

		if (!reference) {
			this.previewEl.setText('Enter a reference to see preview...');
			return;
		}

		if (!this.selectedTranslation) {
			this.previewEl.setText('No translation selected');
			return;
		}

		try {
			const verses = await this.parseAndLookupReference(reference);

			if (verses.length === 0) {
				this.previewEl.setText('Reference not found or invalid format');
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

			this.previewEl.setText(formattedText);

		} catch (error) {
			this.previewEl.setText('Error parsing reference');
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
			// Load the selected translation
			const translation = this.translations.find(t => t.name === this.selectedTranslation);
			if (!translation) {
				throw new Error('Selected translation not found');
			}

			return await resolveReferenceToVerses(this.dataLoader, translation, reference);

		} catch (error) {
			console.error('Error in parseAndLookupReference:', error);
			throw error;
		}
	}

	private async pasteReferenceFromClipboard(): Promise<void> {
		try {
			const clipText = await navigator.clipboard.readText();
			if (!clipText.trim()) {
				new Notice('Clipboard is empty');
				return;
			}

			this.inputEl.value = clipText.trim();
			await this.updatePreview();
		} catch (error) {
			console.error('Clipboard read failed:', error);
			new Notice('Unable to read clipboard in this environment');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
