import { useEffect, useRef, useState } from "react";

interface TerminalPanelProps {
    output: string;
    onClear: () => void;
    onCopy: () => void;
}

export function TerminalPanel({ output, onClear, onCopy }: TerminalPanelProps) {
    const bodyRef = useRef<HTMLPreElement>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (output.length > 0) {
            setExpanded(true);
        }
    }, [output]);

    useEffect(() => {
        if (expanded && bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [output, expanded]);

    return (
        <div className={`terminal-panel${expanded ? " terminal-panel--expanded" : ""}`}>
            <div
                className="terminal-header"
                onClick={() => setExpanded((v) => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v);
                }}
                style={{ cursor: "pointer" }}
            >
                <span className="terminal-header-label">
                    <span className="prop-section-toggle">{expanded ? "▼" : "▶"}</span>
                    Output
                </span>
                {expanded && (
                    <div className="terminal-header-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="terminal-action-btn" onClick={onCopy} title="Copy output">
                            Copy
                        </button>
                        <button className="terminal-action-btn" onClick={onClear} title="Clear output">
                            Clear
                        </button>
                    </div>
                )}
            </div>
            {expanded && (
                <pre ref={bodyRef} className="terminal-body">
                    {output.length > 0 ? output : <span className="terminal-placeholder">No output yet.</span>}
                </pre>
            )}
        </div>
    );
}
