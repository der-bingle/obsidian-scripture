import { App, SuggestModal, setIcon, Notice } from 'obsidian';
import type { BibleTranslation } from './types';

export interface ScriptureNoteSuggestion {
	reference: string;
	translation: string;
	translationFullName: string;
	path: string;
	anchor?: string;
}

export class ScriptureNoteSwitcherModal extends SuggestModal<ScriptureNoteSuggestion> {
	private readonly appRef: App;
	private readonly translations: BibleTranslation[];
	private readonly defaultTranslation: string;
	private readonly resolveInput: (input: string) => Promise<ScriptureNoteSuggestion | null>;
	private readonly onChoose: (suggestion: ScriptureNoteSuggestion, evt: MouseEvent | KeyboardEvent) => Promise<void>;
	private readonly initialInput: string;
	private currentSuggestion: ScriptureNoteSuggestion | null = null;

	constructor(
		app: App,
		translations: BibleTranslation[],
		defaultTranslation: string,
		resolveInput: (input: string) => Promise<ScriptureNoteSuggestion | null>,
		onChoose: (suggestion: ScriptureNoteSuggestion, evt: MouseEvent | KeyboardEvent) => Promise<void>,
		initialInput: string = ''
	) {
		super(app);
		this.appRef = app;
		this.translations = translations;
		this.defaultTranslation = defaultTranslation;
		this.resolveInput = resolveInput;
		this.onChoose = onChoose;
		this.initialInput = initialInput;
		this.setPlaceholder('Open scripture note (e.g., John 3:16 NLT)');
	}

	onOpen(): void {
		super.onOpen();

		if (this.inputEl) {
			this.inputEl.style.paddingRight = '40px';
			const wrapper = this.inputEl.parentElement;

			if (wrapper) {
				wrapper.style.position = 'relative';
				const pasteButton = wrapper.createEl('button', {
					cls: 'mod-cta',
					attr: {
						type: 'button',
						'aria-label': 'Paste from clipboard',
						title: 'Paste from clipboard'
					}
				});
				pasteButton.style.position = 'absolute';
				pasteButton.style.right = '6px';
				pasteButton.style.top = '50%';
				pasteButton.style.transform = 'translateY(-50%)';
				pasteButton.style.padding = '4px 6px';
				pasteButton.style.minHeight = 'unset';
				setIcon(pasteButton, 'clipboard-paste');

				pasteButton.addEventListener('click', async (evt) => {
					evt.preventDefault();
					evt.stopPropagation();
					try {
						const clipText = await navigator.clipboard.readText();
						if (!clipText?.trim()) {
							new Notice('Clipboard is empty');
							return;
						}
						this.inputEl.value = clipText.trim();
						this.inputEl.dispatchEvent(new Event('input'));
					} catch (error) {
						console.error('Clipboard read failed:', error);
						new Notice('Unable to read clipboard in this environment');
					}
				});
			}

			if (this.initialInput?.trim()) {
				this.inputEl.value = this.initialInput.trim();
				this.inputEl.dispatchEvent(new Event('input'));
			}
		}
	}

	async getSuggestions(query: string): Promise<ScriptureNoteSuggestion[]> {
		if (!query?.trim()) {
			this.currentSuggestion = null;
			return [];
		}

		const suggestion = await this.resolveInput(query);
		this.currentSuggestion = suggestion;
		return suggestion ? [suggestion] : [];
	}

	renderSuggestion(suggestion: ScriptureNoteSuggestion, el: HTMLElement): void {
		const row = el.createEl('div');
		row.style.display = 'flex';
		row.style.justifyContent = 'space-between';
		row.style.gap = '8px';

		const left = row.createEl('div');
		left.createEl('div', { text: suggestion.reference });
		left.createEl('small', { text: suggestion.path, cls: 'mod-muted' });

		const right = row.createEl('div');
		right.style.opacity = '0.8';
		right.style.fontSize = '0.85em';
		right.textContent = suggestion.translation;
	}

	async onChooseSuggestion(suggestion: ScriptureNoteSuggestion, evt: MouseEvent | KeyboardEvent): Promise<void> {
		await this.onChoose(suggestion, evt);
	}

}
