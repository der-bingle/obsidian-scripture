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
	private readonly resolveInput: (input: string) => Promise<ScriptureNoteSuggestion | null>;
	private readonly onChoose: (suggestion: ScriptureNoteSuggestion, evt: MouseEvent | KeyboardEvent) => Promise<void>;
	private readonly initialInput: string;
	private currentSuggestion: ScriptureNoteSuggestion | null = null;

	constructor(
		app: App,
		_translations: BibleTranslation[],
		_defaultTranslation: string,
		resolveInput: (input: string) => Promise<ScriptureNoteSuggestion | null>,
		onChoose: (suggestion: ScriptureNoteSuggestion, evt: MouseEvent | KeyboardEvent) => Promise<void>,
		initialInput = ''
	) {
		super(app);
		this.resolveInput = resolveInput;
		this.onChoose = onChoose;
		this.initialInput = initialInput;
		this.setPlaceholder('Open Scripture note (e.g., John 3:16 NLT)');
	}

	onOpen(): void {
		void super.onOpen();

		if (this.inputEl) {
			this.inputEl.addClass('scripture-note-switcher-input');
			const wrapper = this.inputEl.parentElement;

			if (wrapper) {
				wrapper.addClass('scripture-note-switcher-input-wrapper');
				const pasteButton = wrapper.createEl('button', {
					cls: ['mod-cta', 'scripture-note-switcher-paste'],
					attr: {
						type: 'button',
						'aria-label': 'Paste from clipboard',
						title: 'Paste from clipboard'
					}
				});
				setIcon(pasteButton, 'clipboard-paste');

				pasteButton.addEventListener('click', (evt) => {
					evt.preventDefault();
					evt.stopPropagation();
					void this.pasteFromClipboard();
				});
			}

			if (this.initialInput?.trim()) {
				this.inputEl.value = this.initialInput.trim();
				this.dispatchInputEvent();
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
		const row = el.createDiv({ cls: 'scripture-note-suggestion' });

		const left = row.createDiv();
		left.createDiv({ text: suggestion.reference });
		left.createEl('small', { text: suggestion.path, cls: 'mod-muted' });

		row.createDiv({ cls: 'scripture-note-suggestion-translation', text: suggestion.translation });
	}

	onChooseSuggestion(suggestion: ScriptureNoteSuggestion, evt: MouseEvent | KeyboardEvent): void {
		void this.onChoose(suggestion, evt);
	}

	private async pasteFromClipboard(): Promise<void> {
		try {
			const clipText = await navigator.clipboard.readText();
			if (!clipText.trim()) {
				new Notice('Clipboard is empty');
				return;
			}
			this.inputEl.value = clipText.trim();
			this.dispatchInputEvent();
		} catch (error) {
			console.error('Clipboard read failed:', error);
			new Notice('Unable to read clipboard in this environment');
		}
	}

	private dispatchInputEvent(): void {
		const EventConstructor = this.inputEl.ownerDocument.defaultView?.Event;
		if (EventConstructor) this.inputEl.dispatchEvent(new EventConstructor('input'));
	}

}
