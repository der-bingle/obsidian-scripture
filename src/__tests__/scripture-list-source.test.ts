import { describe, expect, it } from 'vitest';
import { findScriptureListSourceRange, updateScriptureListSource } from '../scripture-list-source';

describe('scripture list source updates', () => {
	it('updates the matching block after unrelated edits shift its rendered range', () => {
		const content = [
			'# Added while references were loading',
			'',
			'```scriptureList',
			'John 3.16',
			'```',
			'',
			'Unrelated ending',
		].join('\n');

		const result = updateScriptureListSource(
			content,
			'John 3.16',
			'John 3:16',
			{ lineStart: 0, lineEnd: 3 },
		);

		expect(result.changed).toBe(true);
		expect(result.content).toBe([
			'# Added while references were loading',
			'',
			'```scriptureList',
			'John 3:16',
			'```',
			'',
			'Unrelated ending',
		].join('\n'));
	});

	it('does not overwrite a block edited while references were loading', () => {
		const content = '```scriptureList\nJohn 3:17\n```';
		const result = updateScriptureListSource(content, 'John 3.16', 'John 3:16', { lineStart: 0 });

		expect(result).toMatchObject({ content, changed: false, range: null });
	});

	it('uses the section hint to distinguish identical lists', () => {
		const content = [
			'```scriptureList',
			'John 3:16',
			'```',
			'',
			'```scriptureList',
			'John 3:16',
			'```',
		].join('\n');

		expect(findScriptureListSourceRange(content, 'John 3:16', { lineStart: 5 })).toEqual({
			lineStart: 4,
			lineEnd: 6,
		});
	});

	it('does not guess when identical lists have no usable section hint', () => {
		const content = [
			'```scriptureList',
			'John 3:16',
			'```',
			'',
			'```scriptureList',
			'John 3:16',
			'```',
		].join('\n');

		expect(findScriptureListSourceRange(content, 'John 3:16')).toBeNull();
	});

	it('allows only the first of repeated stale normalization passes to write', () => {
		const content = '```scriptureList\nJohn 3.16\n```';
		const firstResult = updateScriptureListSource(content, 'John 3.16', 'John 3:16', { lineStart: 0 });
		const repeatedResult = updateScriptureListSource(
			firstResult.content,
			'John 3.16',
			'John 3:16',
			{ lineStart: 0 },
		);

		expect(firstResult.changed).toBe(true);
		expect(repeatedResult).toMatchObject({ content: firstResult.content, changed: false, range: null });
	});
});
