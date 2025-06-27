import { App, PluginSettingTab, Setting, Notice, Modal, TextComponent, ButtonComponent } from 'obsidian';
import type { BibleReferenceSettings, BibleTranslation } from './types';
import { BibleDataLoader } from './bible-data-loader';

export class BibleReferenceSettingTab extends PluginSettingTab {
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

		containerEl.createEl('h2', { text: 'Bible Reference Settings' });

		this.displayTranslationsSection(containerEl);
		this.displayGeneralSettings(containerEl);
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
				.setName(translation.name)
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
		containerEl.createEl('h3', { text: 'General Settings' });

		// Default translation
		new Setting(containerEl)
			.setName('Default Translation')
			.setDesc('The translation to use by default in the modal')
			.addDropdown(dropdown => {
				if (this.plugin.settings.translations.length === 0) {
					dropdown.addOption('', 'No translations configured');
				} else {
					this.plugin.settings.translations.forEach((translation: BibleTranslation) => {
						dropdown.addOption(translation.name, translation.name);
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
					this.plugin.updateFormatterSettings();
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
					this.plugin.updateFormatterSettings();
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
	private pathInput: TextComponent;

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

	private validateForm(): boolean {
		// Basic validation - just check if fields are not empty
		return this.nameInput.getValue().trim() !== '' && this.pathInput.getValue().trim() !== '';
	}

	private handleSubmit(): void {
		if (!this.validateForm()) {
			new Notice('Please fill in all fields');
			return;
		}

		const translation: BibleTranslation = {
			name: this.nameInput.getValue().trim(),
			filePath: this.pathInput.getValue().trim()
		};

		this.onSubmit(translation);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
