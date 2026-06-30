import { App, View, WorkspaceLeaf } from 'obsidian';
import type { ScriptureSettings } from './types';
import { getBibleNoteInfo, resolveLeafFile } from './bible-note-utils';

interface ManagedLeafTitle {
	leafTitle: () => string;
	view: View;
	viewTitle: () => string;
}

interface BibleLeafInfo {
	leaf: WorkspaceLeaf;
	baseTitle: string;
	translationName: string;
	chapterKey: string;
}

export class BibleNoteTitleManager {
	private app: App;
	private settings: ScriptureSettings;
	private originalTitles = new WeakMap<WorkspaceLeaf, ManagedLeafTitle>();
	private managedLeaves = new Set<WorkspaceLeaf>();
	private refreshTimer: number | null = null;
	private followUpRefreshTimers = new Set<number>();

	constructor(app: App, settings: ScriptureSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: ScriptureSettings): void {
		this.settings = settings;
		this.scheduleRefresh();
	}

	scheduleRefresh(delay = 100): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			this.refreshOpenNoteTitles();
		}, delay);
	}

	scheduleRefreshSequence(delays = [100, 500, 1000]): void {
		this.clearFollowUpRefreshes();

		delays.forEach(delay => {
			const timer = window.setTimeout(() => {
				this.followUpRefreshTimers.delete(timer);
				this.refreshOpenNoteTitles();
			}, delay);

			this.followUpRefreshTimers.add(timer);
		});
	}

	refreshOpenNoteTitles(): void {
		const openBibleLeaves = this.getOpenBibleLeaves();
		const desiredTitles = this.getDesiredTitles(openBibleLeaves);
		const activeLeaves = new Set(openBibleLeaves.map(info => info.leaf));

		Array.from(this.managedLeaves)
			.filter(leaf => !activeLeaves.has(leaf))
			.forEach(leaf => this.restoreLeafTitle(leaf));

		openBibleLeaves.forEach(info => {
			const desiredTitle = desiredTitles.get(info.leaf);
			if (!desiredTitle || desiredTitle === info.baseTitle) {
				this.restoreLeafTitle(info.leaf);
				return;
			}

			this.applyLeafTitle(info.leaf, desiredTitle);
		});

		if (this.app.workspace.layoutReady) {
			void this.app.workspace.requestSaveLayout();
		}
	}

	restoreAllTitles(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}

		this.clearFollowUpRefreshes();

		Array.from(this.managedLeaves).forEach(leaf => this.restoreLeafTitle(leaf));
	}

	private getOpenBibleLeaves(): BibleLeafInfo[] {
		const leaves: WorkspaceLeaf[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.getViewState().type === 'markdown') {
				leaves.push(leaf);
			}
		});

		return leaves
			.map(leaf => {
				const file = resolveLeafFile(this.app, leaf);
				if (!file) return null;

				const noteInfo = getBibleNoteInfo(this.app, this.settings, file);
				if (!noteInfo) return null;

				return {
					leaf,
					baseTitle: noteInfo.baseTitle,
					translationName: noteInfo.translation.name,
					chapterKey: noteInfo.chapterKey
				};
			})
			.filter((info): info is BibleLeafInfo => !!info);
	}

	private getDesiredTitles(openBibleLeaves: BibleLeafInfo[]): Map<WorkspaceLeaf, string> {
		const chapterTranslations = new Map<string, Set<string>>();

		openBibleLeaves.forEach(info => {
			const translations = chapterTranslations.get(info.chapterKey) || new Set<string>();
			translations.add(info.translationName);
			chapterTranslations.set(info.chapterKey, translations);
		});

		return new Map(
			openBibleLeaves.map(info => {
				const translationCount = chapterTranslations.get(info.chapterKey)?.size || 0;
				const shouldAppendTranslation = this.shouldAppendTranslation(translationCount);
				const title = shouldAppendTranslation
					? `${info.baseTitle} (${info.translationName})`
					: info.baseTitle;

				return [info.leaf, title] as [WorkspaceLeaf, string];
			})
		);
	}

	private shouldAppendTranslation(translationCount: number): boolean {
		switch (this.settings.bibleNoteTabTitleMode) {
			case 'always':
				return true;
			case 'duplicates-only':
				return translationCount > 1;
			case 'never':
			default:
				return false;
		}
	}

	private applyLeafTitle(leaf: WorkspaceLeaf, title: string): void {
		this.getOriginalTitles(leaf);
		(leaf as WorkspaceLeaf & { getDisplayText: () => string }).getDisplayText = () => title;
		(this.getLeafView(leaf) as View & { getDisplayText: () => string }).getDisplayText = () => title;
		this.managedLeaves.add(leaf);
		this.refreshLeafHeader(leaf);
	}

	private restoreLeafTitle(leaf: WorkspaceLeaf): void {
		const originals = this.originalTitles.get(leaf);
		if (!originals) return;

		(leaf as WorkspaceLeaf & { getDisplayText: () => string }).getDisplayText = originals.leafTitle;
		if (this.getLeafView(leaf) === originals.view) {
			(originals.view as View & { getDisplayText: () => string }).getDisplayText = originals.viewTitle;
		}
		this.originalTitles.delete(leaf);
		this.managedLeaves.delete(leaf);
		this.refreshLeafHeader(leaf);
	}

	private getOriginalTitles(leaf: WorkspaceLeaf): ManagedLeafTitle {
		const existing = this.originalTitles.get(leaf);
		const view = this.getLeafView(leaf);
		if (existing) {
			if (existing.view !== view) {
				existing.view = view;
				existing.viewTitle = view.getDisplayText.bind(view);
			}
			return existing;
		}

		const originals = {
			leafTitle: leaf.getDisplayText.bind(leaf),
			view,
			viewTitle: view.getDisplayText.bind(view)
		};

		this.originalTitles.set(leaf, originals);
		return originals;
	}

	private getLeafView(leaf: WorkspaceLeaf): View {
		return leaf.view;
	}

	private refreshLeafHeader(leaf: WorkspaceLeaf): void {
		(leaf as WorkspaceLeaf & { updateHeader?: () => void }).updateHeader?.();
	}

	private clearFollowUpRefreshes(): void {
		this.followUpRefreshTimers.forEach(timer => window.clearTimeout(timer));
		this.followUpRefreshTimers.clear();
	}
}
