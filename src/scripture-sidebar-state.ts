import type { ScriptureSettings, ScriptureSidebarSide, ScriptureSidebarState } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const createInstanceId = (): string => {
	const randomUuid = typeof window !== 'undefined' ? window.crypto?.randomUUID?.() : undefined;
	return randomUuid || `scripture-sidebar-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getSidebarDefaultTranslation = (settings: ScriptureSettings): string => {
	const configured = settings.translations.find(translation => translation.name === settings.sidebarDefaultTranslation);
	if (configured) return configured.name;
	const primary = settings.translations.find(translation => translation.name === settings.defaultTranslation);
	return primary?.name || settings.translations[0]?.name || '';
};

export const createScriptureSidebarState = (
	settings: ScriptureSettings,
	seed: Partial<ScriptureSidebarState> = {},
): ScriptureSidebarState => ({
	instanceId: seed.instanceId || createInstanceId(),
	translation: seed.translation || getSidebarDefaultTranslation(settings),
	bookId: seed.bookId || '',
	chapter: Number.isInteger(seed.chapter) && (seed.chapter || 0) > 0 ? seed.chapter! : 1,
	anchorVerse: Number.isInteger(seed.anchorVerse) && (seed.anchorVerse || 0) > 0 ? seed.anchorVerse! : 1,
	anchorOffset: typeof seed.anchorOffset === 'number' && Number.isFinite(seed.anchorOffset) ? seed.anchorOffset : 0,
	side: seed.side === 'left' ? 'left' : 'right',
	lastUsedAt: typeof seed.lastUsedAt === 'number' && Number.isFinite(seed.lastUsedAt) ? seed.lastUsedAt : Date.now(),
});

export const parseScriptureSidebarState = (
	value: unknown,
	settings: ScriptureSettings,
	fallback: Partial<ScriptureSidebarState> = {},
): ScriptureSidebarState => {
	if (!isRecord(value)) return createScriptureSidebarState(settings, fallback);
	const side: ScriptureSidebarSide = value.side === 'left' ? 'left' : 'right';
	return createScriptureSidebarState(settings, {
		...fallback,
		instanceId: typeof value.instanceId === 'string' && value.instanceId ? value.instanceId : fallback.instanceId,
		translation: typeof value.translation === 'string' ? value.translation : fallback.translation,
		bookId: typeof value.bookId === 'string' ? value.bookId : fallback.bookId,
		chapter: typeof value.chapter === 'number' ? value.chapter : fallback.chapter,
		anchorVerse: typeof value.anchorVerse === 'number' ? value.anchorVerse : fallback.anchorVerse,
		anchorOffset: typeof value.anchorOffset === 'number' ? value.anchorOffset : fallback.anchorOffset,
		side,
		lastUsedAt: typeof value.lastUsedAt === 'number' ? value.lastUsedAt : fallback.lastUsedAt,
	});
};

export const cloneScriptureSidebarState = (
	settings: ScriptureSettings,
	state: ScriptureSidebarState,
): ScriptureSidebarState => createScriptureSidebarState(settings, {
	...state,
	instanceId: undefined,
	lastUsedAt: Date.now(),
});
