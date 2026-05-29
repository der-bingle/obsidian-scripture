import { Editor, EditorPosition } from 'obsidian';
import { detectReferences } from 'scripture-references';
import type { BibleVerse, ScriptureSettings } from './types';
import type { ReferenceFormat } from './reference-format';
import { formatReferenceDisplay } from './reference-format';

export interface InsertionTarget {
	from: EditorPosition;
	to: EditorPosition;
}

export class CalloutFormatter {
	private settings: ScriptureSettings;
	
	constructor(settings: ScriptureSettings) {
		this.settings = settings;
	}

	insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers: boolean, referenceFormat?: ReferenceFormat, insertionTarget?: InsertionTarget): void {
		const callout = this.formatCallout(reference, verses, translation, includeVerseNumbers, referenceFormat);
		this.insertText(editor, callout, insertionTarget);
	}

	insertPlainText(editor: Editor, verses: BibleVerse[], includeVerseNumbers: boolean, insertionTarget?: InsertionTarget): void {
		const plainText = this.formatPlainText(verses, includeVerseNumbers);
		this.insertText(editor, plainText, insertionTarget);
	}

	private formatPlainText(verses: BibleVerse[], includeVerseNumbers: boolean): string {
		// Format each verse according to settings
		const formattedVerses = verses.map((verse, index) => this.formatVerse(verse, index, verses.length, includeVerseNumbers));

		// Join verses while preserving paragraph breaks
		let versesText = '';
		for (let i = 0; i < formattedVerses.length; i++) {
			if (i === 0) {
				versesText = formattedVerses[i];
			} else {
				const startsNewParagraph = !!(verses[i].newParagraph);
				if (startsNewParagraph) {
					versesText += '\n\n' + formattedVerses[i];
				} else {
					versesText += ' ' + formattedVerses[i];
				}
			}
		}

		return versesText;
	}

	formatCallout(reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers: boolean, referenceFormat?: ReferenceFormat): string {
		// Create properly formatted reference with full book name
		const formattedReference = this.formatProperReference(reference, verses, translation, referenceFormat);
		const foldingIndicator = this.getFoldingIndicator();
		const header = `> [!scripture]${foldingIndicator} ${formattedReference}`;
		
		// Format each verse according to settings
	const formattedVerses = verses.map((verse, index) => this.formatVerse(verse, index, verses.length, includeVerseNumbers));

		// Join verses while preserving paragraph breaks.
		// If a verse has `newParagraph === true`, insert a blank line before it;
		// otherwise separate verses with a space to keep sentences flowing.
		let versesText = '';
		for (let i = 0; i < formattedVerses.length; i++) {
			if (i === 0) {
				versesText = formattedVerses[i];
			} else {
				const startsNewParagraph = !!(verses[i].newParagraph);
				if (startsNewParagraph) {
					versesText += '\n\n' + formattedVerses[i];
				} else {
					versesText += ' ' + formattedVerses[i];
				}
			}
		}
		
		// Split into lines and prefix each with "> " for callout formatting
		const calloutLines = this.formatAsCalloutLines(versesText);
		
		// Generate hidden links if enabled and there are multiple verses
		const hiddenLinks = this.generateHiddenLinks(verses, translation);
		
		// Combine header, content, hidden links, and blank line at end
		const parts = [header, calloutLines];
		if (hiddenLinks) {
			parts.push(hiddenLinks);
		}
		
		return parts.join('\n') + '\n';
	}

	private generateHiddenLinks(verses: BibleVerse[], translation: string): string | null {
		// Only generate hidden links if setting is enabled and there are multiple verses
		if (!this.settings.includeHiddenLinks || verses.length <= 1) {
			return null;
		}

		// Determine which translation to link to
		const linkTranslation = this.getLinkTranslation(translation);
		
		// Generate hidden links for all verses except the first (which is already linked in title)
		const hiddenLinks = verses.slice(1).map(verse => {
			// Convert book name for linking (Psalms → Psalm)
			const linkBookName = verse.book === 'Psalms' ? 'Psalm' : verse.book;
			const linkPath = `Bible/${linkTranslation}/${linkBookName} ${verse.chapter}`;
			return `[[${linkPath}#${verse.verse}|]]`;
		});

		// Return as callout line with space-separated links
		return `> ${hiddenLinks.join(' ')}`;
	}

	private formatProperReference(reference: string, verses: BibleVerse[], translation: string, referenceFormat?: ReferenceFormat): string {
		if (verses.length === 0) {
			return '';
		}

		const isChapterReference = this.isChapterReference(reference);

		const displayText = formatReferenceDisplay(
			verses,
			translation,
			this.settings.defaultTranslation,
			this.settings.translationDisplay,
			referenceFormat || this.settings.referenceFormat,
			{ isChapterReference }
		);
		
		// Determine which translation to link to
		const linkTranslation = this.getLinkTranslation(translation);
		
		// Convert book name for linking (Psalms → Psalm)
		const linkBookName = verses[0].book === 'Psalms' ? 'Psalm' : verses[0].book;
		
		// Create the wikilink
		const linkPath = `Bible/${linkTranslation}/${linkBookName} ${verses[0].chapter}`;
		const anchor = isChapterReference ? '' : `#${verses[0].verse.toString()}`; // Link to first verse for ranges
		
		return `[[${linkPath}${anchor}|${displayText}]]`;
	}

	private getLinkTranslation(verseTranslation: string): string {
		switch (this.settings.linkingStrategy) {
			case 'verse-translation':
				return verseTranslation;
			case 'default-translation':
			default:
				return this.settings.defaultTranslation || verseTranslation;
		}
	}

	private formatVerse(verse: BibleVerse, index: number, totalVerses: number, includeVerseNumbers: boolean): string {
		// Start with the verse content, joining multiple lines with newlines
		let content = verse.content.join('\n');
		
		// Add extra newline for poetry verses ONLY if it's not the last verse
		const isLastVerse = index === totalVerses - 1;
		if (verse.poetry && !isLastVerse) {
			content += '\n';
		}
		
		// Add verse number based on settings
	const versePrefix = this.getVersePrefix(verse.verse, index, includeVerseNumbers);
		
		return `${versePrefix}${content}`;
	}

	private getVersePrefix(verseNumber: number, index: number, includeVerseNumbers?: boolean): string {
		// If includeVerseNumbers is explicitly false, suppress numbers.
		if (includeVerseNumbers === false) return '';

		// If includeVerseNumbers is explicitly true, force inclusion for all verses.
		if (includeVerseNumbers === true) return `<sup>${verseNumber}</sup>`;

		// Otherwise (undefined): determine behavior based on global settings
		switch (this.settings.verseNumbers) {
			case 'include':
				return `<sup>${verseNumber}</sup>`;
			case 'exclude-first':
				return index === 0 ? '' : `<sup>${verseNumber}</sup>`;
			case 'exclude':
			default:
				return '';
		}
	}

	private formatAsCalloutLines(text: string): string {
		// Split text into lines and prefix each with "> " for callout formatting
		return text
			.split('\n')
			.map(line => `> ${line}`)
			.join('\n');
	}

	insertScriptureLink(editor: Editor, reference: string, verses: BibleVerse[], translation: string, referenceFormat?: ReferenceFormat, insertionTarget?: InsertionTarget): void {
		const link = this.formatScriptureLink(reference, verses, translation, referenceFormat);
		this.insertText(editor, link, insertionTarget);
	}

	private formatScriptureLink(reference: string, verses: BibleVerse[], translation: string, referenceFormat?: ReferenceFormat): string {
		// Use the same logic as formatProperReference to create the link
		return this.formatProperReference(reference, verses, translation, referenceFormat);
	}

	private isChapterReference(reference: string): boolean {
		try {
			const matches = Array.from(detectReferences(reference));
			if (!matches.length || !(matches[0] as any).ref) {
				return false;
			}

			return (matches[0] as any).ref.type === 'chapter';
		} catch (error) {
			console.error('Failed to detect reference type:', error);
			return false;
		}
	}

	private insertText(editor: Editor, text: string, insertionTarget?: InsertionTarget): void {
		const target = insertionTarget || this.getCurrentInsertionTarget(editor);
		editor.replaceRange(text, target.from, target.to);

		const endPos = this.getEndPosition(target.from, text);
		editor.setCursor(endPos);
		editor.scrollIntoView({
			from: endPos,
			to: endPos
		});
		editor.focus();
	}

	private getCurrentInsertionTarget(editor: Editor): InsertionTarget {
		const selection = editor.getSelection();
		if (selection.trim()) {
			return {
				from: editor.getCursor('from'),
				to: editor.getCursor('to')
			};
		}

		const cursor = editor.getCursor();
		return {
			from: cursor,
			to: cursor
		};
	}

	private getEndPosition(start: EditorPosition, insertedText: string): EditorPosition {
		const lines = insertedText.split('\n');
		if (lines.length === 1) {
			return {
				line: start.line,
				ch: start.ch + lines[0].length
			};
		}

		return {
			line: start.line + lines.length - 1,
			ch: lines[lines.length - 1].length
		};
	}

	updateSettings(settings: ScriptureSettings): void {
		this.settings = settings;
	}

	private getFoldingIndicator(): string {
		switch (this.settings.calloutFolding) {
			case 'foldable-expanded':
				return '+';
			case 'foldable-collapsed':
				return '-';
			case 'not-foldable':
			default:
				return '';
		}
	}
}
