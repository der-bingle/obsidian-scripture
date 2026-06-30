import { describe, expect, it } from 'vitest';
import { parseScriptureListInput } from '../scripture-list-parser';

describe('scripture list parsing', () => {
	it('preserves highlight markers while dropping blank lines', () => {
		expect(parseScriptureListInput('John 3:16\n\n- Romans 8:28\n* Psalm 23')).toEqual([
			{ originalInput: 'John 3:16', reference: 'John 3:16', highlighted: false, highlightMarker: undefined },
			{ originalInput: '- Romans 8:28', reference: 'Romans 8:28', highlighted: true, highlightMarker: '- ' },
			{ originalInput: '* Psalm 23', reference: 'Psalm 23', highlighted: true, highlightMarker: '* ' },
		]);
	});
});
