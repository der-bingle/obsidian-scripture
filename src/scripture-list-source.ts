export interface ScriptureListSectionHint {
	lineStart?: number;
	lineEnd?: number;
}

export interface ScriptureListSourceRange {
	lineStart: number;
	lineEnd: number;
}

export interface ScriptureListSourceUpdate {
	content: string;
	changed: boolean;
	range: ScriptureListSourceRange | null;
	replacementSource: string;
}

const isScriptureListOpening = (line: string): boolean =>
	line.trim() === '```scriptureList' || line.trim().startsWith('```scriptureList ');

const isClosingFence = (line: string): boolean => line.trim() === '```';

const collectScriptureListRanges = (lines: string[]): ScriptureListSourceRange[] => {
	const ranges: ScriptureListSourceRange[] = [];

	for (let lineStart = 0; lineStart < lines.length; lineStart++) {
		const openingLine = lines[lineStart];
		if (!openingLine || !isScriptureListOpening(openingLine)) continue;

		for (let lineEnd = lineStart + 1; lineEnd < lines.length; lineEnd++) {
			const closingLine = lines[lineEnd];
			if (!closingLine || !isClosingFence(closingLine)) continue;

			ranges.push({ lineStart, lineEnd });
			lineStart = lineEnd;
			break;
		}
	}

	return ranges;
};

const getRangeSource = (lines: string[], range: ScriptureListSourceRange): string =>
	lines.slice(range.lineStart + 1, range.lineEnd).join('\n');

const distanceFromHint = (range: ScriptureListSourceRange, hint: ScriptureListSectionHint): number => {
	const hintedLine = hint.lineStart ?? hint.lineEnd;
	if (hintedLine === undefined) return 0;
	if (hintedLine >= range.lineStart && hintedLine <= range.lineEnd) return 0;
	return Math.min(Math.abs(hintedLine - range.lineStart), Math.abs(hintedLine - range.lineEnd));
};

export const findScriptureListSourceRange = (
	content: string,
	expectedSource: string,
	hint: ScriptureListSectionHint = {},
): ScriptureListSourceRange | null => {
	const lines = content.split(/\r?\n/);
	const matchingRanges = collectScriptureListRanges(lines)
		.filter(range => getRangeSource(lines, range) === expectedSource);

	if (matchingRanges.length === 0) return null;
	if (matchingRanges.length === 1) return matchingRanges[0] ?? null;

	if (hint.lineStart === undefined && hint.lineEnd === undefined) return null;

	const rangesByDistance = [...matchingRanges]
		.sort((a, b) => distanceFromHint(a, hint) - distanceFromHint(b, hint));
	const nearestRange = rangesByDistance[0];
	const nextRange = rangesByDistance[1];
	if (!nearestRange || (nextRange && distanceFromHint(nearestRange, hint) === distanceFromHint(nextRange, hint))) {
		return null;
	}

	return nearestRange;
};

export const updateScriptureListSource = (
	content: string,
	expectedSource: string,
	replacementSource: string,
	hint: ScriptureListSectionHint = {},
): ScriptureListSourceUpdate => {
	const range = findScriptureListSourceRange(content, expectedSource, hint);
	if (!range || expectedSource === replacementSource) {
		return { content, changed: false, range, replacementSource };
	}

	const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split(/\r?\n/);
	lines.splice(
		range.lineStart + 1,
		range.lineEnd - range.lineStart - 1,
		...replacementSource.split('\n'),
	);

	return {
		content: lines.join(lineEnding),
		changed: true,
		range,
		replacementSource,
	};
};
