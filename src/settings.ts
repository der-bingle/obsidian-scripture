import { App, PluginSettingTab, Setting, Notice, Modal, TextComponent, ButtonComponent, ToggleComponent, normalizePath } from 'obsidian';
import type { ScriptureSettings, BibleTranslation, ReferenceFormat, InsertScriptureFormat } from './types';
import { BibleDataLoader } from './bible-data-loader';
import { FileSuggest, FolderSuggest } from './file-suggest';
import type Scripture from './main';
import { orderTranslations } from './translation-order';

export class ScriptureSettingTab extends PluginSettingTab {
	private plugin: Scripture;
	private dataLoader: BibleDataLoader;

	constructor(app: App, plugin: Scripture) {
		super(app, plugin);
		this.plugin = plugin;
		this.dataLoader = new BibleDataLoader(app);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.displayHeading(containerEl, 'Scripture');

		this.displayTranslationsSection(containerEl);
		this.displaySidebarSettings(containerEl);
		this.displayInsertDefaults(containerEl);
		this.displayScriptureLinksSettings(containerEl);
		this.displayCalloutSettings(containerEl);
		this.displayScriptureListSettings(containerEl);
		this.displayScriptureNotesSettings(containerEl);
	}

	private displayHeading(containerEl: HTMLElement, name: string): void {
		new Setting(containerEl)
			.setName(name)
			.setHeading();
	}

	private displayTranslationsSection(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'Translations');

		// Translations list
		const translationsContainer = containerEl.createDiv('bible-translations-list');
		this.refreshTranslationsList(translationsContainer);

		// Add translation button
		new Setting(containerEl)
			.setName('Add translation')
			.setDesc('Add a new translation')
			.addButton(button => button
				.setButtonText('Add translation')
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
							this.plugin.settings.sidebarDefaultTranslation = translation.name;
						}
						
						await this.plugin.saveSettings();
						this.display(); // Refresh the display
						new Notice(`Added translation: ${translation.name}`);
					}).open();
				}));

		// Validate all translations button
		new Setting(containerEl)
			.setName('Validate translations')
			.setDesc('Check all configured translations for errors')
			.addButton(button => button
				.setButtonText('Validate all')
				.onClick(() => {
					void this.validateAllTranslations();
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

		orderTranslations(this.plugin.settings.translations, this.plugin.settings.defaultTranslation).forEach((translation: BibleTranslation) => {
			const index = this.plugin.settings.translations.indexOf(translation);
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
							? this.plugin.settings.translations[0]?.name ?? ''
								: '';
					}
					if (this.plugin.settings.sidebarDefaultTranslation === translation.name) {
						this.plugin.settings.sidebarDefaultTranslation = this.plugin.settings.defaultTranslation;
					}
					
					await this.plugin.saveSettings();
					this.display(); // Refresh the display
					new Notice(`Removed translation: ${translation.name}`);
				}));
		});
	}

	private displaySidebarSettings(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'Scripture sidebar');

		new Setting(containerEl)
			.setName('Default sidebar translation')
			.setDesc('Translation used by the first sidebar and contextual chapter command when no sidebar is open')
			.addDropdown(dropdown => {
				if (this.plugin.settings.translations.length === 0) {
					dropdown.addOption('', 'No translations configured');
				} else {
					orderTranslations(this.plugin.settings.translations, this.plugin.settings.defaultTranslation).forEach(translation => {
						dropdown.addOption(translation.name, translation.fullName || translation.name);
					});
				}
				dropdown
					.setValue(this.plugin.settings.sidebarDefaultTranslation)
					.onChange(async value => {
						this.plugin.settings.sidebarDefaultTranslation = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private displayInsertDefaults(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'Insert defaults');

		// Default translation
		new Setting(containerEl)
			.setName('Default translation')
			.setDesc('Translation to use by default in Scripture insert modals')
			.addDropdown(dropdown => {
				if (this.plugin.settings.translations.length === 0) {
					dropdown.addOption('', 'No translations configured');
				} else {
					orderTranslations(this.plugin.settings.translations, this.plugin.settings.defaultTranslation).forEach((translation: BibleTranslation) => {
						dropdown.addOption(translation.name, translation.fullName || translation.name);
					});
				}
				
				dropdown
					.setValue(this.plugin.settings.defaultTranslation)
					.onChange(async (value) => {
						this.plugin.settings.defaultTranslation = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName('Default insert Scripture format')
			.setDesc('How insert Scripture opens by default')
			.addDropdown(dropdown => dropdown
				.addOption('scripture-callout', 'Scripture callout')
				.addOption('plain-text', 'Plain text')
				.setValue(this.plugin.settings.insertScriptureFormat)
				.onChange(async (value) => {
					this.plugin.settings.insertScriptureFormat = value as InsertScriptureFormat;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Callout reference format')
			.setDesc('Default reference format for insert Scripture callout titles')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'Traditional abbreviations (Jas. 1:16–18)')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.plugin.settings.calloutReferenceFormat)
				.onChange(async (value) => {
					this.plugin.settings.calloutReferenceFormat = value as ReferenceFormat;
					await this.plugin.saveSettings();
				}));

		// Include verse numbers on insert (default for modal)
		new Setting(containerEl)
			.setName('Include verse numbers when inserting')
			.setDesc('Default for insert Scripture when inserting multiple verses')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeVerseNumbersOnInsert)
				.onChange(async (value) => {
					this.plugin.settings.includeVerseNumbersOnInsert = value;
					await this.plugin.saveSettings();
				}));
	}

	private displayScriptureLinksSettings(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'Scripture links');

		new Setting(containerEl)
			.setName('Link reference format')
			.setDesc('Default display format for inserted Scripture links')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'Traditional abbreviations (Jas. 1:16–18)')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.plugin.settings.linkReferenceFormat)
				.onChange(async value => {
					this.plugin.settings.linkReferenceFormat = value as ReferenceFormat;
					await this.plugin.saveSettings();
				}));

		const noteTranslationCount = this.plugin.settings.translations.filter(translation =>
			translation.availableAsNotes && translation.notesDirectory
		).length;
		new Setting(containerEl)
			.setName('Link translation')
			.setDesc(noteTranslationCount < 2
				? 'Links use the default note-enabled translation because fewer than two translations have Scripture notes'
				: 'Choose whether links target the default translation or the translation supplying the verse text')
			.addDropdown(dropdown => {
				dropdown
					.addOption('default-translation', 'Always link to default translation')
					.addOption('verse-translation', 'Link to verse translation')
					.setValue(this.plugin.settings.linkingStrategy)
					.onChange(async value => {
						this.plugin.settings.linkingStrategy = value as ScriptureSettings['linkingStrategy'];
						await this.plugin.saveSettings();
					});
				const verseOption = dropdown.selectEl.querySelector<HTMLOptionElement>('option[value="verse-translation"]');
				if (verseOption) verseOption.disabled = noteTranslationCount < 2;
			});

		new Setting(containerEl)
			.setName('Link path format')
			.setDesc('Choose whether generated wikilinks include the configured notes directory')
			.addDropdown(dropdown => dropdown
				.addOption('configured-path', 'Configured notes path')
				.addOption('basename', 'Note basename only')
				.setValue(this.plugin.settings.linkPathFormat)
				.onChange(async value => {
					this.plugin.settings.linkPathFormat = value as ScriptureSettings['linkPathFormat'];
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.linkPathFormat === 'basename') {
			containerEl.createEl('p', {
				text: 'Basename links such as [[James 5#19]] can be ambiguous when multiple notes share the same filename.',
				cls: 'setting-item-description scripture-link-warning',
			});
		}
	}

	private displayCalloutSettings(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'scripture callouts');

		// Verse numbers setting
		new Setting(containerEl)
			.setName('Verse numbers')
			.setDesc('How to handle verse numbers in Scripture callouts')
			.addDropdown(dropdown => dropdown
				.addOption('exclude', 'Don\'t include verse numbers')
				.addOption('include', 'Include verse numbers')
				.addOption('exclude-first', 'Include all but the first verse number')
				.setValue(this.plugin.settings.verseNumbers)
				.onChange(async (value) => {
					this.plugin.settings.verseNumbers = value as ScriptureSettings['verseNumbers'];
					await this.plugin.saveSettings();
				}));

		// Translation display setting
		new Setting(containerEl)
			.setName('Translation display')
			.setDesc('When to show the translation name in Scripture references')
			.addDropdown(dropdown => dropdown
				.addOption('never', 'Not included')
				.addOption('always', 'Included')
				.addOption('except-default', 'Included, except for default translation')
				.setValue(this.plugin.settings.translationDisplay)
				.onChange(async (value) => {
					this.plugin.settings.translationDisplay = value as ScriptureSettings['translationDisplay'];
					await this.plugin.saveSettings();
				}));

		// Callout folding setting
		new Setting(containerEl)
			.setName('Callout folding')
			.setDesc('Whether Scripture callouts should be foldable')
			.addDropdown(dropdown => dropdown
				.addOption('not-foldable', 'Not foldable')
				.addOption('foldable-expanded', 'Foldable, expanded by default')
				.addOption('foldable-collapsed', 'Foldable, collapsed by default')
				.setValue(this.plugin.settings.calloutFolding)
				.onChange(async (value) => {
					this.plugin.settings.calloutFolding = value as ScriptureSettings['calloutFolding'];
					await this.plugin.saveSettings();
				}));

		// Hidden links setting
		new Setting(containerEl)
			.setName('Include hidden links to all verses in ranges')
			.setDesc('Add individual verse links at the end of multi-verse Scripture callouts')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeHiddenLinks)
				.onChange(async (value) => {
					this.plugin.settings.includeHiddenLinks = value;
					await this.plugin.saveSettings();
				}));
	}

	private displayScriptureListSettings(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'Scripture lists');

		new Setting(containerEl)
			.setName('Scripture list reference format')
			.setDesc('Format for the reference column in Scripture list rendering')
			.addDropdown(dropdown => dropdown
				.addOption('full-name', 'Full book name (James 1:16–18)')
				.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
				.addOption('english-abbrev', 'Traditional abbreviations (Jas. 1:16–18)')
				.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
				.setValue(this.plugin.settings.scriptureListReferenceFormat)
				.onChange(async (value) => {
					this.plugin.settings.scriptureListReferenceFormat = value as ReferenceFormat;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reference click action')
			.setDesc('Choose whether Scripture list references open a chapter note or navigate the Scripture sidebar')
			.addDropdown(dropdown => dropdown
				.addOption('note', 'Open Scripture note')
				.addOption('sidebar', 'Open in Scripture sidebar')
				.setValue(this.plugin.settings.scriptureListReferenceAction)
				.onChange(async value => {
					this.plugin.settings.scriptureListReferenceAction = value as ScriptureSettings['scriptureListReferenceAction'];
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reformat Scripture list source')
			.setDesc('Automatically normalize references inside Scripture list source')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.scriptureListReformatSource)
				.onChange(async (value) => {
					this.plugin.settings.scriptureListReformatSource = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.scriptureListReformatSource) {
			new Setting(containerEl)
				.setName('Scripture list source reference format')
				.setDesc('Format used when normalizing references inside Scripture list source')
				.addDropdown(dropdown => dropdown
					.addOption('full-name', 'Full book name (James 1:16–18)')
					.addOption('standard-abbrev', 'Standard abbreviation (Jas 1:16–18)')
					.addOption('english-abbrev', 'Traditional abbreviations (Jas. 1:16–18)')
					.addOption('chapter-verse', 'No book name (1:16–18 or 1)')
					.setValue(this.plugin.settings.scriptureListSourceReferenceFormat)
					.onChange(async (value) => {
						this.plugin.settings.scriptureListSourceReferenceFormat = value as ReferenceFormat;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Reorder Scripture list source')
				.setDesc('Automatically reorder Scripture list source lines by book order, with a blank line between testaments')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.scriptureListReorderSourceByBook)
					.onChange(async (value) => {
						this.plugin.settings.scriptureListReorderSourceByBook = value;
						await this.plugin.saveSettings();
					}));
		}
	}

	private displayScriptureNotesSettings(containerEl: HTMLElement): void {
		this.displayHeading(containerEl, 'Scripture notes');
		containerEl.createEl('p', { 
			text: 'These settings apply to Scripture chapter notes and Scripture sidebars, not to inserted Scripture.',
			cls: 'setting-item-description'
		});

		// Verse number visibility setting
		new Setting(containerEl)
			.setName('Show verse numbers')
			.setDesc('Whether verse numbers are displayed in Scripture notes and sidebars')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.verseNumbersVisible)
				.onChange(async (value: boolean) => {
					this.plugin.settings.verseNumbersVisible = value;
					await this.plugin.saveSettings();
					
					this.plugin.refreshVerseDisplay();
				}));

		// Verse number display mode setting
		new Setting(containerEl)
			.setName('Verse number display mode')
			.setDesc('How verse numbers are displayed in Scripture notes and sidebars when visible')
			.addDropdown(dropdown => dropdown
				.addOption('first', 'Show first verse number only')
				.addOption('all', 'Show all verse numbers')
				.setValue(this.plugin.settings.verseNumberDisplayMode)
				.onChange(async (value) => {
					this.plugin.settings.verseNumberDisplayMode = value as ScriptureSettings['verseNumberDisplayMode'];
					await this.plugin.saveSettings();
					
					this.plugin.refreshVerseDisplay();
				}));

		new Setting(containerEl)
			.setName('Scripture note tab titles')
			.setDesc('When to append the translation to open Scripture note tab titles')
			.addDropdown(dropdown => dropdown
				.addOption('never', 'Never append translation')
				.addOption('duplicates-only', 'Only when duplicate chapters are open')
				.addOption('always', 'Always append translation')
				.setValue(this.plugin.settings.bibleNoteTabTitleMode)
				.onChange(async (value) => {
					this.plugin.settings.bibleNoteTabTitleMode = value as ScriptureSettings['bibleNoteTabTitleMode'];
					await this.plugin.saveSettings();

					this.plugin.refreshBibleNoteTitles();
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
	private onSubmit: (translation: BibleTranslation) => Promise<void>;
	private nameInput!: TextComponent;
	private fullNameInput!: TextComponent;
	private pathInput!: TextComponent;
	private availableAsNotesToggle!: ToggleComponent;
	private notesDirectoryInput!: TextComponent;
	private notesDirectorySetting!: Setting;

	constructor(app: App, translation: BibleTranslation | null, onSubmit: (translation: BibleTranslation) => Promise<void>) {
		super(app);
		this.translation = translation;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle(this.translation ? 'Edit translation' : 'Add translation');

		// File path
		new Setting(contentEl)
			.setName('File path')
			.setDesc('Path to the translation json file (relative to vault root). Selecting a file autofills the name and full name below.')
			.addText(text => {
				this.pathInput = text;
				text
					.setPlaceholder('Bible/ESV/esv.json')
					.setValue(this.translation?.filePath || '')
					.onChange(() => {
						this.validateForm();
						void this.autofillFromPath();
					});
				new FileSuggest(this.app, text.inputEl, 'json');
			});

		// Translation name
		new Setting(contentEl)
			.setName('Translation name')
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
			.setName('Full name')
			.setDesc('The full name of this translation (e.g., English Standard Version (ESV))')
			.addText(text => {
				this.fullNameInput = text;
				text
					.setPlaceholder('English Standard Version (ESV)')
					.setValue(this.translation?.fullName || '')
					.onChange(() => this.validateForm());
			});

		// Available as notes toggle
		new Setting(contentEl)
			.setName('Available as Scripture notes in the vault')
			.setDesc('Check if this translation has Scripture chapter notes in your vault')
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
			.setName('Scripture notes directory')
			.setDesc('Path to the directory containing Scripture chapter notes (relative to vault root)')
			.addText(text => {
				this.notesDirectoryInput = text;
				text
					.setPlaceholder('Bible/ESV/')
					.setValue(this.translation?.notesDirectory || '')
					.onChange(() => this.validateForm());
				new FolderSuggest(this.app, text.inputEl);
			});

		// Set initial visibility
		this.toggleNotesDirectoryVisibility(this.translation?.availableAsNotes || false);

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'scripture-modal-button-row' });

		new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => this.close());

		new ButtonComponent(buttonContainer)
			.setButtonText(this.translation ? 'Update' : 'Add')
			.setCta()
			.onClick(() => void this.handleSubmit());

		// Focus file path input
		window.setTimeout(() => this.pathInput.inputEl.focus(), 100);
	}

	private toggleNotesDirectoryVisibility(show: boolean): void {
		this.notesDirectorySetting.settingEl.toggleClass('scripture-setting-hidden', !show);
	}

	private async autofillFromPath(): Promise<void> {
		const rawPath = this.pathInput.getValue().trim();
		if (!rawPath) return;

		const file = this.app.vault.getFileByPath(normalizePath(rawPath));
		if (!file) return;

		let data: unknown;
		try {
			data = JSON.parse(await this.app.vault.cachedRead(file));
		} catch {
			return;
		}
		if (typeof data !== 'object' || data === null) return;

		const { translation, fullName } = data as Record<string, unknown>;
		if (typeof translation === 'string' && translation.trim() !== '') {
			this.nameInput.setValue(translation.trim());
		}
		if (typeof fullName === 'string' && fullName.trim() !== '') {
			this.fullNameInput.setValue(fullName.trim());
		}
		this.validateForm();
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

	private async handleSubmit(): Promise<void> {
		if (!this.validateForm()) {
			new Notice('Please fill in all required fields');
			return;
		}

		const translation: BibleTranslation = {
			name: this.nameInput.getValue().trim(),
			fullName: this.fullNameInput.getValue().trim(),
			filePath: normalizePath(this.pathInput.getValue().trim()),
			availableAsNotes: this.availableAsNotesToggle.getValue(),
			notesDirectory: this.availableAsNotesToggle.getValue() 
				? normalizePath(this.notesDirectoryInput.getValue().trim())
				: undefined
		};

		await this.onSubmit(translation);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
