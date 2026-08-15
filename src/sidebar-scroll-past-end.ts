export interface ScrollPastEndMetrics {
	clientHeight: number;
	scrollTop: number;
	readingTop: number;
	lastLineTop: number;
	spacerTop: number;
	paddingTop: number;
	paddingBottom: number;
	edgeGuard?: number;
}

export function calculateScrollPastEndSpacerHeight(metrics: ScrollPastEndMetrics): number {
	const edgeGuard = metrics.edgeGuard ?? 1;
	const lastLineOffset = metrics.scrollTop + metrics.lastLineTop - metrics.readingTop;
	const spacerOffset = metrics.scrollTop + metrics.spacerTop - metrics.readingTop;
	const maximumScrollTop = Math.max(0, lastLineOffset - metrics.paddingTop - edgeGuard);
	const naturalContentEnd = spacerOffset + metrics.paddingBottom;
	const spacerHeight = maximumScrollTop + metrics.clientHeight - naturalContentEnd;

	return Number.isFinite(spacerHeight) ? Math.max(0, spacerHeight) : 0;
}
