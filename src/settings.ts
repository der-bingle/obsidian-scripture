import { App, PluginSettingTab, Setting, Notice, Modal, TextComponent, ButtonComponent, ToggleComponent } from 'obsidian';
import type { ScriptureSettings, BibleTranslation } from './types';
import { BibleDataLoader } from './bible-data-loader';

export class ScriptureSettingTab extends PluginSettingTab {
	private plugin: any; // Will be properly typed when we update main.ts
	private dataLoader: BibleDataLoader;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
		this.dataLoader = new BibleDataLoader(app);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Scripture Settings' });

		this.displayTranslationsSection(containerEl);
		this.displayGeneralSettings(containerEl);
		this.displayBibleNotesSettings(containerEl);
	}

	private displayTranslationsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Bible Translations' });

		// Translations list
		const translationsContainer = containerEl.createDiv('bible-translations-list');
		this.refreshTranslationsList(translationsContainer);

		// Add translation button
		new Setting(containerEl)
			.setName('Add Translation')
			.setDesc('Add a new Bible translation')
			.addButton(button => button
				.setButtonText('Add Translation')
				.setCta()
				.onClick(() => {
					new TranslationModal(this.app, null, async (translation) => {
						// Validate the translation
						const validation = await this.dataLoader.validateTranslation(translation);
						if (!validation.isValid) {
							new Notice(`Error: ${validation.errorMessage}`);
							return;
						}

						// Add to settings
						this.plugin.settings.translations.push(translation);
						
						// Set as default if it's the first one
						if (this.plugin.settings.translations.length === 1) {
							this.plugin.settings.defaultTranslation = translation.name;
						}
						
						await this.plugin.saveSettings();
						this.display(); // Refresh the display
						new Notice(`Added translation: ${translation.name}`);
					}).open();
				}));
	}

	private refreshTranslationsList(container: HTMLElement): void {
		container.empty();

		if (this.plugin.settings.translations.length === 0) {
			container.createEl('p', { 
				text: 'No translations configured. Add one to get started.',
				cls: 'setting-item-description'
			});
			return;
		}

		this.plugin.settings.translations.forEach((translation: BibleTranslation, index: number) => {
			const setting = new Setting(container)
				.setName(translation.fullName || translation.name)
				.setDesc(translation.filePath);

			// Add validation status
			if (translation.isValid === false) {
				setting.setDesc(`${translation.filePath} - ❌ ${translation.errorMessage || 'Invalid'}`);
			}

			// Edit button
			setting.addButton(button => button
				.setButtonText('Edit')
				.onClick(() => {
					new TranslationModal(this.app, translation, async (updatedTranslation) => {
						// Validate the updated translation
						const validation = await this.dataLoader.validateTranslation(updatedTranslation);
						if (!validation.isValid) {
							new Notice(`Error: ${validation.errorMessage}`);
							return;
						}

						// Update in settings
						this.plugin.settings.translations[index] = updatedTranslation;
						
						// Clear cache for old translation
						this.dataLoader.clearCache(translation.name);
						
						await this.plugin.saveSettings();
						this.display(); // Refresh the display
						new Notice(`Updated translation: ${updatedTranslation.name}`);
					}).open();
				}));

			// Remove button
			setting.addButton(button => button
				.setButtonText('Remove')
				.setWarning()
				.onClick(async () => {
					// Remove from settings
					this.plugin.settings.translations.splice(index, 1);
					
					// Clear cache
					this.dataLoader.clearCache(translation.name);
					
					// Update default if removed translation was default
					if (this.plugin.settings.defaultTranslation === translation.name) {
						this.plugin.settings.defaultTranslation = 
							this.plugin.settings.translations.length > 0 
								? this.plugin.settings.translations[0].name 
								: '';
					}
					
					await this.plugin.saveSettings();
					this.display(); // Refresh the display
					new Notice(`Removed translation: ${translation.name}`);
				}));
		});
	}

	private displayGeneralSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Reference Insertion Settings' });

		// Default translation
		new Setting(containerEl)
			.setName('Default Translation')
			.setDesc('The translation to use by default in the modal')
			.addDropdown(dropdown => {
				if (this.plugin.settings.translations.length === 0) {
					dropdown.addOption('', 'No translations configured');
				} else {
					this.plugin.settings.translations.forEach((translation: BibleTranslation) => {
						dropdown.addOption(translation.name, translation.fullName || translation.name);
					});
				}
				
				dropdown
					.setValue(this.plugin.settings.defaultTranslation)
					.onChange(async (value) => {
						this.plugin.settings.defaultTranslation = value;
						await this.plugin.saveSettings();
					});
			});

		// Verse numbers setting
		new Setting(containerEl)
			.setName('Verse Numbers')
			.setDesc('How to handle verse numbers in scripture callouts')
			.addDropdown(dropdown => dropdown
				.addOption('exclude', 'Don\'t include verse numbers')
				.addOption('include', 'Include verse numbers')
				.addOption('exclude-first', 'Include all but the first verse number')
				.setValue(this.plugin.settings.verseNumbers)
				.onChange(async (value: 'include' | 'exclude' | 'exclude-first') => {
					this.plugin.settings.verseNumbers = value;
					await this.plugin.saveSettings();
				}));

		// Translation display setting
		new Setting(containerEl)
			.setName('Translation Display')
			.setDesc('When to show the translation name in scripture callouts')
			.addDropdown(dropdown => dropdown
				.addOption('never', 'Not included')
				.addOption('always', 'Included')
				.addOption('except-default', 'Included, except for default translation')
				.setValue(this.plugin.settings.translationDisplay)
				.onChange(async (value: 'never' | 'always' | 'except-default') => {
					this.plugin.settings.translationDisplay = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reference Format')
			.setDesc('Default format for inserted scripture references')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'English abbreviations from scripture-references')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.plugin.settings.referenceFormat)
				.onChange(async (value: 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse') => {
					this.plugin.settings.referenceFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Scripture List Reference Format')
			.setDesc('Format for the reference column in scriptureList codeblock rendering')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'English abbreviations from scripture-references')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.plugin.settings.scriptureListReferenceFormat)
				.onChange(async (value: 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse') => {
					this.plugin.settings.scriptureListReferenceFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Scripture List Source Reference Format')
			.setDesc('Format used when normalizing references inside scriptureList codeblock source')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'English abbreviations from scripture-references')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.plugin.settings.scriptureListSourceReferenceFormat)
				.onChange(async (value: 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse') => {
					this.plugin.settings.scriptureListSourceReferenceFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reorder Scripture List Source')
			.setDesc('Automatically reorder scriptureList source lines by book order, with a blank line between testaments')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.scriptureListReorderSourceByBook)
				.onChange(async (value) => {
					this.plugin.settings.scriptureListReorderSourceByBook = value;
					await this.plugin.saveSettings();
				}));

		// Linking strategy setting
		new Setting(containerEl)
			.setName('Linking Strategy')
			.setDesc('Which translation to link to in scripture callout titles')
			.addDropdown(dropdown => dropdown
				.addOption('default-translation', 'Always link to default translation')
				.addOption('verse-translation', 'Link to verse translation')
				.setValue(this.plugin.settings.linkingStrategy)
				.onChange(async (value: 'default-translation' | 'verse-translation') => {
					this.plugin.settings.linkingStrategy = value;
					await this.plugin.saveSettings();
				}));

		// Callout folding setting
		new Setting(containerEl)
			.setName('Callout Folding')
			.setDesc('Whether scripture callouts should be foldable')
			.addDropdown(dropdown => dropdown
				.addOption('not-foldable', 'Not foldable')
				.addOption('foldable-expanded', 'Foldable, expanded by default')
				.addOption('foldable-collapsed', 'Foldable, collapsed by default')
				.setValue(this.plugin.settings.calloutFolding)
				.onChange(async (value: 'not-foldable' | 'foldable-expanded' | 'foldable-collapsed') => {
					this.plugin.settings.calloutFolding = value;
					await this.plugin.saveSettings();
				}));

		// Hidden links setting
		new Setting(containerEl)
			.setName('Include hidden links to all verses in ranges')
			.setDesc('Add individual verse links at the end of multi-verse callouts')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeHiddenLinks)
				.onChange(async (value) => {
					this.plugin.settings.includeHiddenLinks = value;
					await this.plugin.saveSettings();
				}));

		// Include verse numbers on insert (default for modal)
		new Setting(containerEl)
			.setName('Include verse numbers when inserting')
			.setDesc('Default for the insert modal: include verse numbers in multi-verse callouts')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeVerseNumbersOnInsert)
				.onChange(async (value) => {
					this.plugin.settings.includeVerseNumbersOnInsert = value;
					await this.plugin.saveSettings();
				}));

		// Validate all translations button
		new Setting(containerEl)
			.setName('Validate Translations')
			.setDesc('Check all configured translations for errors')
			.addButton(button => button
				.setButtonText('Validate All')
				.onClick(async () => {
					await this.validateAllTranslations();
				}));
	}

	private displayBibleNotesSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Bible Notes Display' });
		containerEl.createEl('p', { 
			text: 'These settings apply to Bible chapter notes in your vault, not to inserted scripture callouts.',
			cls: 'setting-item-description'
		});

		// Verse number visibility setting
		new Setting(containerEl)
			.setName('Show Verse Numbers')
			.setDesc('Whether verse numbers are displayed in Bible chapter notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.verseNumbersVisible)
				.onChange(async (value: boolean) => {
					this.plugin.settings.verseNumbersVisible = value;
					await this.plugin.saveSettings();
					
					// Apply the new setting to currently open Bible notes
					if (this.plugin.verseDisplayManager) {
						this.plugin.verseDisplayManager.applyVerseDisplayToOpenFiles();
					}
				}));

		// Verse number display mode setting
		new Setting(containerEl)
			.setName('Verse Number Display Mode')
			.setDesc('How verse numbers are displayed when visible')
			.addDropdown(dropdown => dropdown
				.addOption('first', 'Show first verse number only')
				.addOption('all', 'Show all verse numbers')
				.setValue(this.plugin.settings.verseNumberDisplayMode)
				.onChange(async (value: 'first' | 'all') => {
					this.plugin.settings.verseNumberDisplayMode = value;
					await this.plugin.saveSettings();
					
					// Apply the new setting to currently open Bible notes
					if (this.plugin.verseDisplayManager) {
						this.plugin.verseDisplayManager.applyVerseDisplayToOpenFiles();
					}
				}));

		new Setting(containerEl)
			.setName('Bible Note Tab Titles')
			.setDesc('When to append the translation to open Bible note tab titles')
			.addDropdown(dropdown => dropdown
				.addOption('never', 'Never append translation')
				.addOption('duplicates-only', 'Only when duplicate chapters are open')
				.addOption('always', 'Always append translation')
				.setValue(this.plugin.settings.bibleNoteTabTitleMode)
				.onChange(async (value: 'never' | 'duplicates-only' | 'always') => {
					this.plugin.settings.bibleNoteTabTitleMode = value;
					await this.plugin.saveSettings();

					if (this.plugin.bibleNoteTitleManager) {
						this.plugin.bibleNoteTitleManager.refreshOpenNoteTitles();
					}
				}));
	}

	private async validateAllTranslations(): Promise<void> {
		let validCount = 0;
		let invalidCount = 0;

		for (const translation of this.plugin.settings.translations) {
			const validation = await this.dataLoader.validateTranslation(translation);
			translation.isValid = validation.isValid;
			translation.errorMessage = validation.errorMessage;

			if (validation.isValid) {
				validCount++;
			} else {
				invalidCount++;
			}
		}

		await this.plugin.saveSettings();
		this.display(); // Refresh to show validation results

		new Notice(`Validation complete: ${validCount} valid, ${invalidCount} invalid`);
	}
}

class TranslationModal extends Modal {
	private translation: BibleTranslation | null;
	private onSubmit: (translation: BibleTranslation) => void;
	private nameInput: TextComponent;
	private fullNameInput: TextComponent;
	private pathInput: TextComponent;
	private availableAsNotesToggle: ToggleComponent;
	private notesDirectoryInput: TextComponent;
	private notesDirectorySetting: Setting;

	constructor(app: App, translation: BibleTranslation | null, onSubmit: (translation: BibleTranslation) => void) {
		super(app);
		this.translation = translation;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: this.translation ? 'Edit Translation' : 'Add Translation' });

		// Translation name
		new Setting(contentEl)
			.setName('Translation Name')
			.setDesc('A short name for this translation (e.g., ESV, NIV, CSB)')
			.addText(text => {
				this.nameInput = text;
				text
					.setPlaceholder('ESV')
					.setValue(this.translation?.name || '')
					.onChange(() => this.validateForm());
			});

		// Translation full name
		new Setting(contentEl)
			.setName('Full Name')
			.setDesc('The full name of this translation (e.g., English Standard Version (ESV))')
			.addText(text => {
				this.fullNameInput = text;
				text
					.setPlaceholder('English Standard Version (ESV)')
					.setValue(this.translation?.fullName || '')
					.onChange(() => this.validateForm());
			});

		// File path
		new Setting(contentEl)
			.setName('File Path')
			.setDesc('Path to the Bible JSON file (relative to vault root)')
			.addText(text => {
				this.pathInput = text;
				text
					.setPlaceholder('Bible/ESV/esv.json')
					.setValue(this.translation?.filePath || '')
					.onChange(() => this.validateForm());
			});

		// Available as notes toggle
		new Setting(contentEl)
			.setName('Available as notes in the vault')
			.setDesc('Check if this translation has Bible chapter notes in your vault')
			.addToggle(toggle => {
				this.availableAsNotesToggle = toggle;
				toggle
					.setValue(this.translation?.availableAsNotes || false)
					.onChange((value) => {
						this.toggleNotesDirectoryVisibility(value);
						this.validateForm();
					});
			});

		// Notes directory (initially hidden if not available as notes)
		this.notesDirectorySetting = new Setting(contentEl)
			.setName('Notes Directory')
			.setDesc('Path to the directory containing Bible chapter notes (relative to vault root)')
			.addText(text => {
				this.notesDirectoryInput = text;
				text
					.setPlaceholder('Bible/ESV/')
					.setValue(this.translation?.notesDirectory || '')
					.onChange(() => this.validateForm());
			});

		// Set initial visibility
		this.toggleNotesDirectoryVisibility(this.translation?.availableAsNotes || false);

		// Buttons
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';

		const cancelButton = new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => this.close());

		const submitButton = new ButtonComponent(buttonContainer)
			.setButtonText(this.translation ? 'Update' : 'Add')
			.setCta()
			.onClick(() => this.handleSubmit());

		// Focus name input
		setTimeout(() => this.nameInput.inputEl.focus(), 100);
	}

	private toggleNotesDirectoryVisibility(show: boolean): void {
		if (this.notesDirectorySetting) {
			this.notesDirectorySetting.settingEl.style.display = show ? '' : 'none';
		}
	}

	private validateForm(): boolean {
		const nameValid = this.nameInput.getValue().trim() !== '';
		const fullNameValid = this.fullNameInput.getValue().trim() !== '';
		const pathValid = this.pathInput.getValue().trim() !== '';
		
		// If available as notes is checked, notes directory is required
		const notesValid = !this.availableAsNotesToggle.getValue() || 
			this.notesDirectoryInput.getValue().trim() !== '';
		
		return nameValid && fullNameValid && pathValid && notesValid;
	}

	private handleSubmit(): void {
		if (!this.validateForm()) {
			new Notice('Please fill in all required fields');
			return;
		}

		const translation: BibleTranslation = {
			name: this.nameInput.getValue().trim(),
			fullName: this.fullNameInput.getValue().trim(),
			filePath: this.pathInput.getValue().trim(),
			availableAsNotes: this.availableAsNotesToggle.getValue(),
			notesDirectory: this.availableAsNotesToggle.getValue() 
				? this.notesDirectoryInput.getValue().trim() 
				: undefined
		};

		this.onSubmit(translation);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
