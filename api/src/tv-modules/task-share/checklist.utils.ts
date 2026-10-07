/**
 * Toggle the checked state of the Nth TipTap taskItem in an HTML note.
 * Only mutates data-checked / checkbox checked attributes on existing task items.
 */
export function toggleChecklistItem(html: string, itemIndex: number, checked: boolean): string | null {
    if (!html || typeof html !== 'string') return null;
    if (!Number.isInteger(itemIndex) || itemIndex < 0) return null;

    const itemRegex = /<li\b[^>]*\bdata-type=["']taskItem["'][^>]*>/gi;
    const matches = [...html.matchAll(itemRegex)];
    if (itemIndex >= matches.length) return null;

    const match = matches[itemIndex];
    const start = match.index ?? -1;
    if (start < 0) return null;

    const originalTag = match[0];
    const checkedValue = checked ? 'true' : 'false';

    let newTag: string;
    if (/\bdata-checked=["'][^"']*["']/i.test(originalTag)) {
        newTag = originalTag.replace(/\bdata-checked=["'][^"']*["']/i, `data-checked="${checkedValue}"`);
    } else {
        newTag = originalTag.replace(/>$/, ` data-checked="${checkedValue}">`);
    }

    // Also flip nested checkbox input if present in a nearby window
    const endSearch = Math.min(html.length, start + 800);
    const slice = html.slice(start, endSearch);
    let updatedSlice = slice.replace(originalTag, newTag);

    updatedSlice = updatedSlice.replace(
        /<input\b([^>]*\btype=["']checkbox["'][^>]*)>/i,
        (_full, attrs: string) => {
            let next = attrs.replace(/\schecked(=["'][^"']*["'])?/i, '');
            if (checked) next += ' checked="checked"';
            return `<input${next}>`;
        }
    );

    return html.slice(0, start) + updatedSlice + html.slice(endSearch);
}

export function countChecklistItems(html: string): number {
    if (!html) return 0;
    return (html.match(/<li\b[^>]*\bdata-type=["']taskItem["']/gi) || []).length;
}
