import { useState } from "react";
import { useSearchQuery } from "./SearchContext";

interface PropertySectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

export function PropertySection({ title, children, defaultExpanded = true }: PropertySectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const query = useSearchQuery();

    // When a search is active, force all sections open
    const isSearching = query.length > 0;
    const isExpanded = isSearching || expanded;

    return (
        <div className="prop-section">
            <div
                className="prop-section-header"
                onClick={() => {
                    if (!isSearching) setExpanded((v) => !v);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (!isSearching && (e.key === "Enter" || e.key === " ")) setExpanded((v) => !v);
                }}
            >
                <span className="prop-section-toggle">{isExpanded ? "▼" : "▶"}</span>
                <span className="prop-section-title">{title}</span>
            </div>
            {isExpanded && <div className="prop-section-body">{children}</div>}
        </div>
    );
}
