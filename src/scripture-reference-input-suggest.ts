import { AbstractInputSuggest, App } from 'obsidian';
import {
	SCRIPTURE_REFERENCE_SUGGESTION_LIMIT,
	getScriptureReferenceSuggestions,
} from './scripture-reference-suggestions';
import type { ScriptureReferenceSuggestion } from './scripture-reference-suggestions';

type NavigateToReference = (reference: string) => void | Promise<void>;

export class ScriptureReferenceInputSuggest extends AbstractInputSuggest<ScriptureReferenceSuggestion> {
	private visibleSuggestions: ScriptureReferenceSuggestion[] = [];
	private readonly suggestionElements = new Map<ScriptureReferenceSuggestion, HTMLElement>();
	private readonly handleKeyDown: (event: KeyboardEvent) => void;
	private readonly handleKeyUp: (event: KeyboardEvent) => void;

	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
		private readonly getCanonicalReference: () => string,
		private readonly navigateToReference: NavigateToReference,
		private readonly onInputValueChange: () => void,
	) {
		super(app, inputEl);
		this.limit = SCRIPTURE_REFERENCE_SUGGESTION_LIMIT;
		this.handleKeyDown = event => this.onInputKeyDown(event);
		this.handleKeyUp = event => this.onInputKeyUp(event);
		this.inputEl.addEventListener('keydown', this.handleKeyDown, true);
		this.inputEl.addEventListener('keyup', this.handleKeyUp);
	}

	protected getSuggestions(query: string): ScriptureReferenceSuggestion[] {
		this.visibleSuggestions = getScriptureReferenceSuggestions(
			query,
			this.getCanonicalReference(),
			this.limit,
		);
		this.suggestionElements.clear();
		return this.visibleSuggestions;
	}

	renderSuggestion(suggestion: ScriptureReferenceSuggestion, el: HTMLElement): void {
		el.createDiv({
			cls: 'scripture-sidebar-reference-suggestion',
			text: suggestion.reference,
		});
		this.suggestionElements.set(suggestion, el);
	}

	selectSuggestion(suggestion: ScriptureReferenceSuggestion): void {
		this.close();
		void this.navigateToReference(suggestion.reference);
	}

	destroy(): void {
		this.inputEl.removeEventListener('keydown', this.handleKeyDown, true);
		this.inputEl.removeEventListener('keyup', this.handleKeyUp);
		this.close();
		this.visibleSuggestions = [];
		this.suggestionElements.clear();
	}

	private onInputKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'Tab' || this.visibleSuggestions.length === 0) return;

		const suggestion = this.visibleSuggestions.find(candidate =>
			this.suggestionElements.get(candidate)?.classList.contains('is-selected'))
			|| this.visibleSuggestions[0];
		if (!suggestion) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		this.setValue(suggestion.reference);
		this.onInputValueChange();
		this.close();
		this.inputEl.focus();
	}

	private onInputKeyUp(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		this.inputEl.value = this.getCanonicalReference();
		this.onInputValueChange();
		this.close();
		this.inputEl.blur();
	}
}
