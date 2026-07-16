import { CATEGORIES } from './categories';

export interface MatchedCategory {
    key: string;
    label: string;
    emoji: string;
}

export const normalizeUrl = (url: string) =>
    url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();

export const matchCategory = (urls: string[]): MatchedCategory | null => {
    const normalizedSet = new Set(urls.map(normalizeUrl));

    for (const [key, cat] of Object.entries(CATEGORIES)) {
        const catUrls = cat.urls.map(normalizeUrl);
        if (catUrls.length !== normalizedSet.size) continue;
        if (catUrls.every(u => normalizedSet.has(u))) {
            return { key, label: cat.label, emoji: cat.emoji };
        }
    }

    return null;
};
