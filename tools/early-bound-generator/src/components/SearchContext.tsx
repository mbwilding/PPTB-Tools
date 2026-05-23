import { createContext, useContext } from "react";

export const SearchContext = createContext("");

export function useSearchQuery() {
    return useContext(SearchContext);
}

/** Returns true if the row matches the query (case-insensitive substring on label or hint). */
export function rowMatches(query: string, label: string, hint?: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return label.toLowerCase().includes(q) || (hint ?? "").toLowerCase().includes(q);
}
