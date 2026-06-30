export interface ParsedScriptureListEntry {
	originalInput: string;
	reference: string;
	highlighted: boolean;
	highlightMarker?: string;
}

export const parseScriptureListInput = (content: string): ParsedScriptureListEntry[] =>
	content
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.map(line => {
			const highlightMarker = line.match(/^([-*]\s+)/)?.[1];
			return {
				originalInput: line,
				reference: highlightMarker ? line.slice(highlightMarker.length).trim() : line,
				highlighted: Boolean(highlightMarker),
				highlightMarker,
			};
		});
