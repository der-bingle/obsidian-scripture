import { transformReferences } from 'scripture-references';
import type { PassageMatch } from 'scripture-references';
import { formatPassageReferenceDisplay } from './reference-format';
import { resolveScriptureLink } from './scripture-link';
import type { ScriptureSettings } from './types';

export interface ScriptureReferenceLinkTransform {
	text: string;
	count: number;
}

interface TextRange {
	start: number;
	end: number;
}

export function convertScriptureReferencesToLinks(
	text: string,
	settings: ScriptureSettings,
): ScriptureReferenceLinkTransform {
	const protectedRanges = findProtectedMarkdownRanges(text);
	let cursor = 0;
	let count = 0;
	let output = '';

	for (const range of protectedRanges) {
		const transformed = transformSegment(text.slice(cursor, range.start), settings);
		output += transformed.text;
		output += text.slice(range.start, range.end);
		count += transformed.count;
		cursor = range.end;
	}

	const transformed = transformSegment(text.slice(cursor), settings);
	output += transformed.text;
	count += transformed.count;

	return { text: output, count };
}

function transformSegment(text: string, settings: ScriptureSettings): ScriptureReferenceLinkTransform {
	let count = 0;
	const transformed = transformReferences((match: PassageMatch) => {
		const replacement = formatScriptureReferenceLink(match, settings);
		if (replacement !== match.text) count += 1;
		return replacement;
	}, text);

	return { text: transformed, count };
}

function formatScriptureReferenceLink(match: PassageMatch, settings: ScriptureSettings): string {
	const ref = match.ref;
	if (!ref.args_valid || ref.type === 'book' || !ref.start_chapter) return match.text;

	const isChapterTarget = ref.type === 'chapter' || ref.type === 'range_chapters';
	const verse = isChapterTarget ? undefined : ref.start_verse;
	if (!isChapterTarget && !verse) return match.text;

	const bookName = ref.getBookName();
	const resolution = resolveScriptureLink(
		settings,
		settings.defaultTranslation,
		bookName,
		ref.start_chapter,
		verse,
	);
	if (!resolution.target) return match.text;

	const displayText = formatPassageReferenceDisplay(ref, settings.linkReferenceFormat);
	return `[[${resolution.target}|${displayText}]]`;
}

function findProtectedMarkdownRanges(text: string): TextRange[] {
	const ranges: TextRange[] = [];
	addFrontmatterRange(text, ranges);
	addFencedCodeRanges(text, ranges);
	addReferenceDefinitionRanges(text, ranges);

	let index = 0;
	while (index < text.length) {
		const containingRange = ranges.find(range => index >= range.start && index < range.end);
		if (containingRange) {
			index = containingRange.end;
			continue;
		}

		const codeEnd = getInlineCodeEnd(text, index);
		if (codeEnd !== null) {
			ranges.push({ start: index, end: codeEnd });
			index = codeEnd;
			continue;
		}

		const wikiLinkEnd = getWikiLinkEnd(text, index);
		if (wikiLinkEnd !== null) {
			const start = index > 0 && text[index - 1] === '!' ? index - 1 : index;
			ranges.push({ start, end: wikiLinkEnd });
			index = wikiLinkEnd;
			continue;
		}

		const markdownLink = getMarkdownLinkRange(text, index);
		if (markdownLink) {
			ranges.push(markdownLink);
			index = markdownLink.end;
			continue;
		}

		index += 1;
	}

	return mergeRanges(ranges);
}

function addFrontmatterRange(text: string, ranges: TextRange[]): void {
	const opening = /^(?:\uFEFF)?---[\t ]*\r?\n/.exec(text);
	if (!opening) return;

	const closingPattern = /^(?:---|\.\.\.)[\t ]*(?:\r?\n|$)/gm;
	closingPattern.lastIndex = opening[0].length;
	const closing = closingPattern.exec(text);
	ranges.push({ start: 0, end: closing ? closing.index + closing[0].length : text.length });
}

function addFencedCodeRanges(text: string, ranges: TextRange[]): void {
	const openingPattern = /^ {0,3}(`{3,}|~{3,})[^\r\n]*(?:\r?\n|$)/gm;
	let opening: RegExpExecArray | null;
	while ((opening = openingPattern.exec(text)) !== null) {
		if (ranges.some(range => opening!.index >= range.start && opening!.index < range.end)) continue;

		const marker = opening[1];
		if (!marker) continue;
		const closingPattern = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[\\t ]*(?:\\r?\\n|$)`, 'gm');
		closingPattern.lastIndex = opening.index + opening[0].length;
		const closing = closingPattern.exec(text);
		const end = closing ? closing.index + closing[0].length : text.length;
		ranges.push({ start: opening.index, end });
		openingPattern.lastIndex = end;
	}
}

function addReferenceDefinitionRanges(text: string, ranges: TextRange[]): void {
	const pattern = /^ {0,3}\[[^\]\r\n]+\]:[^\r\n]*(?:\r?\n|$)/gm;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text)) !== null) {
		ranges.push({ start: match.index, end: match.index + match[0].length });
	}
}

function getInlineCodeEnd(text: string, index: number): number | null {
	if (text[index] !== '`' || isEscaped(text, index)) return null;

	let markerEnd = index;
	while (text[markerEnd] === '`') markerEnd += 1;
	const marker = text.slice(index, markerEnd);
	const closing = text.indexOf(marker, markerEnd);
	return closing === -1 ? null : closing + marker.length;
}

function getWikiLinkEnd(text: string, index: number): number | null {
	if (!text.startsWith('[[', index) || isEscaped(text, index)) return null;
	const closing = text.indexOf(']]', index + 2);
	return closing === -1 ? null : closing + 2;
}

function getMarkdownLinkRange(text: string, index: number): TextRange | null {
	if (text[index] !== '[' || text[index + 1] === '[' || isEscaped(text, index)) return null;
	const labelEnd = findClosingBracket(text, index + 1);
	if (labelEnd === -1) return null;

	const destinationStart = labelEnd + 1;
	let end = -1;
	if (text[destinationStart] === '(') {
		end = findBalancedClosingParenthesis(text, destinationStart + 1);
	} else if (text[destinationStart] === '[') {
		end = findClosingBracket(text, destinationStart + 1);
	}
	if (end === -1) return null;

	return {
		start: index > 0 && text[index - 1] === '!' ? index - 1 : index,
		end: end + 1,
	};
}

function findClosingBracket(text: string, start: number): number {
	let depth = 0;
	for (let index = start; index < text.length; index += 1) {
		if (isEscaped(text, index)) continue;
		if (text[index] === '[') depth += 1;
		if (text[index] === ']') {
			if (depth === 0) return index;
			depth -= 1;
		}
	}
	return -1;
}

function findBalancedClosingParenthesis(text: string, start: number): number {
	let depth = 0;
	for (let index = start; index < text.length; index += 1) {
		if (isEscaped(text, index)) continue;
		if (text[index] === '(') depth += 1;
		if (text[index] === ')') {
			if (depth === 0) return index;
			depth -= 1;
		}
	}
	return -1;
}

function isEscaped(text: string, index: number): boolean {
	let backslashes = 0;
	for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) backslashes += 1;
	return backslashes % 2 === 1;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
	const sorted = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
	const merged: TextRange[] = [];
	for (const range of sorted) {
		const previous = merged[merged.length - 1];
		if (!previous || range.start > previous.end) {
			merged.push({ ...range });
		} else {
			previous.end = Math.max(previous.end, range.end);
		}
	}
	return merged;
}
