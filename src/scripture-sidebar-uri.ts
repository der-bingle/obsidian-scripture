export interface ScriptureSidebarUriRequest {
	reference: string;
	translation?: string;
	newSidebar: boolean;
}

const isTrue = (value: string | undefined): boolean =>
	value === '1' || value?.toLowerCase() === 'true';

export const parseScriptureSidebarUriRequest = (
	params: Record<string, string | undefined>,
): ScriptureSidebarUriRequest => {
	const reference = (params.reference || params.ref || params.q || '').trim();
	const translation = params.translation?.trim();

	return {
		reference,
		translation: translation || undefined,
		newSidebar: isTrue(params.newSidebar) || isTrue(params.newLeaf),
	};
};
