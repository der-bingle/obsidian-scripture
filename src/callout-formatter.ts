import { Editor } from 'obsidian';
import type { BibleVerse, ScriptureSettings } from './types';

export class CalloutFormatter {
	private settings: ScriptureSettings;
	
	constructor(settings: ScriptureSettings) {
		this.settings = settings;
	}

	insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers: boolean): void {
		const callout = this.formatCallout(reference, verses, translation, includeVerseNumbers);
		const selection = editor.getSelection();

		if (selection.trim()) {
			// Replace selected text with the callout
			editor.replaceSelection(callout);
		} else {
			// No selection—insert at cursor position (original behavior)
			const cursor = editor.getCursor();
			editor.replaceRange(callout, cursor);

			// Move cursor to after the callout
			const lines = callout.split('\n');
			const endPos = {
				line: cursor.line + lines.length - 1,
				ch: 0
			};
			editor.setCursor(endPos);
		}
	}

	insertPlainText(editor: Editor, verses: BibleVerse[], includeVerseNumbers: boolean): void {
		const plainText = this.formatPlainText(verses, includeVerseNumbers);
		const selection = editor.getSelection();

		if (selection.trim()) {
			// Replace selected text with the plain text
			editor.replaceSelection(plainText);
		} else {
			// No selection—insert at cursor position
			const cursor = editor.getCursor();
			editor.replaceRange(plainText, cursor);
		}
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

	private formatCallout(reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers: boolean): string {
		// Create properly formatted reference with full book name
		const formattedReference = this.formatProperReference(verses, translation);
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

	private formatProperReference(verses: BibleVerse[], translation: string): string {
		if (verses.length === 0) {
			return '';
		}

		const firstVerse = verses[0];
		const lastVerse = verses[verses.length - 1];
		
		// Get the full book name from the first verse
		const bookName = firstVerse.book;
		const chapter = firstVerse.chapter;
		
		// Format verse range
		let verseRange: string;
		if (verses.length === 1) {
			// Single verse
			verseRange = firstVerse.verse.toString();
		} else if (firstVerse.chapter === lastVerse.chapter) {
			// Same chapter, verse range
			verseRange = `${firstVerse.verse}–${lastVerse.verse}`;
		} else {
			// Cross-chapter range
			verseRange = `${firstVerse.verse}–${lastVerse.chapter}:${lastVerse.verse}`;
		}
		
		// Determine if translation should be included in display text
		const shouldIncludeTranslation = this.shouldIncludeTranslation(translation);
		const translationSuffix = shouldIncludeTranslation ? `, ${translation}` : '';
		
		// Create the display text
		const displayText = `${bookName} ${chapter}:${verseRange}${translationSuffix}`;
		
		// Determine which translation to link to
		const linkTranslation = this.getLinkTranslation(translation);
		
		// Convert book name for linking (Psalms → Psalm)
		const linkBookName = bookName === 'Psalms' ? 'Psalm' : bookName;
		
		// Create the wikilink
		const linkPath = `Bible/${linkTranslation}/${linkBookName} ${chapter}`;
		const anchor = firstVerse.verse.toString(); // Link to first verse for ranges
		
		return `[[${linkPath}#${anchor}|${displayText}]]`;
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

	private shouldIncludeTranslation(translation: string): boolean {
		switch (this.settings.translationDisplay) {
			case 'never':
				return false;
			case 'always':
				return true;
			case 'except-default':
				return translation !== this.settings.defaultTranslation;
			default:
				return false;
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
		if (includeVerseNumbers === true) return `<sup>${verseNumber}</sup> `;

		// Otherwise (undefined): determine behavior based on global settings
		switch (this.settings.verseNumbers) {
			case 'include':
				return `<sup>${verseNumber}</sup> `;
			case 'exclude-first':
				return index === 0 ? '' : `<sup>${verseNumber}</sup> `;
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

	insertScriptureLink(editor: Editor, verses: BibleVerse[], translation: string): void {
		const link = this.formatScriptureLink(verses, translation);
		const selection = editor.getSelection();

		if (selection.trim()) {
			// Replace selected text with the link
			editor.replaceSelection(link);
		} else {
			// No selection—insert at cursor position
			const cursor = editor.getCursor();
			editor.replaceRange(link, cursor);
		}
	}

	private formatScriptureLink(verses: BibleVerse[], translation: string): string {
		// Use the same logic as formatProperReference to create the link
		return this.formatProperReference(verses, translation);
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