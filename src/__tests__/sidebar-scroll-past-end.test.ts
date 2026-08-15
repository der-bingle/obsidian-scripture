import { describe, expect, it } from 'vitest';
import { calculateScrollPastEndSpacerHeight } from '../sidebar-scroll-past-end';

describe('calculateScrollPastEndSpacerHeight', () => {
	it('lets the last rendered line reach the top padding in a short chapter', () => {
		const metrics = {
			clientHeight: 600,
			scrollTop: 0,
			readingTop: 100,
			lastLineTop: 300,
			spacerTop: 340,
			paddingTop: 16,
			paddingBottom: 16,
		};
		const spacerHeight = calculateScrollPastEndSpacerHeight(metrics);
		const lastLineOffset = metrics.scrollTop + metrics.lastLineTop - metrics.readingTop;
		const spacerOffset = metrics.scrollTop + metrics.spacerTop - metrics.readingTop;
		const maximumScrollTop = spacerOffset + spacerHeight + metrics.paddingBottom - metrics.clientHeight;

		expect(spacerHeight).toBe(527);
		expect(lastLineOffset - maximumScrollTop).toBe(metrics.paddingTop + 1);
	});

	it('uses scroll-relative positions when the chapter is already scrolled', () => {
		expect(calculateScrollPastEndSpacerHeight({
			clientHeight: 500,
			scrollTop: 700,
			readingTop: 100,
			lastLineTop: 600,
			spacerTop: 650,
			paddingTop: 16,
			paddingBottom: 16,
		})).toBe(417);
	});

	it('does not add space when existing trailing content already reaches the cap', () => {
		expect(calculateScrollPastEndSpacerHeight({
			clientHeight: 500,
			scrollTop: 700,
			readingTop: 100,
			lastLineTop: 600,
			spacerTop: 1300,
			paddingTop: 16,
			paddingBottom: 16,
		})).toBe(0);
	});

	it('keeps the final line inside the viewport with a configurable edge guard', () => {
		expect(calculateScrollPastEndSpacerHeight({
			clientHeight: 600,
			scrollTop: 0,
			readingTop: 100,
			lastLineTop: 300,
			spacerTop: 340,
			paddingTop: 16,
			paddingBottom: 16,
			edgeGuard: 4,
		})).toBe(524);
	});

	it('falls back to no spacer for invalid measurements', () => {
		expect(calculateScrollPastEndSpacerHeight({
			clientHeight: Number.NaN,
			scrollTop: 0,
			readingTop: 0,
			lastLineTop: 0,
			spacerTop: 0,
			paddingTop: 0,
			paddingBottom: 0,
		})).toBe(0);
	});
});
