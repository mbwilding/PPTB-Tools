import { useSearchQuery, rowMatches } from "./SearchContext";

interface SettingRowProps {
    label: string;
    hint?: string;
    children: React.ReactNode;
}

export function SettingRow({ label, hint, children }: SettingRowProps) {
    const query = useSearchQuery();
    if (!rowMatches(query, label, hint)) return null;

    return (
        <div className="prop-row">
            <span className="prop-label" title={hint ?? label}>
                {label}
            </span>
            <div>{children}</div>
        </div>
    );
}
