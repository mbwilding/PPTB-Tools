/**
 * Lightweight C# code builder that tracks indentation and provides
 * typed helpers for common constructs. Eliminates manual tab counting
 * and raw string[] push patterns across the codegen files.
 *
 * Indentation is always tab-based to match the existing CrmSvcUtil output format.
 */
export class CodeBuilder {
    private readonly lines: string[] = [];
    depth: number;

    constructor(initialDepth = 0) {
        this.depth = initialDepth;
    }

    // ── Core ──────────────────────────────────────────────────────────────────

    /** Emit one line at the current indent level. */
    line(content = ""): this {
        this.lines.push(content === "" ? "" : `${"\t".repeat(this.depth)}${content}`);
        return this;
    }

    /** Emit a blank spacer line that contains only the current indent (matches existing codegen style). */
    spacer(): this {
        this.lines.push(this.depth > 0 ? "\t".repeat(this.depth) : "");
        return this;
    }

    /** Emit multiple pre-built lines verbatim (no extra indentation applied). */
    verbatim(...prebuiltLines: string[]): this {
        for (const l of prebuiltLines) this.lines.push(l);
        return this;
    }

    /** Emit the output of a nested CodeBuilder verbatim. */
    embed(child: CodeBuilder): this {
        return this.verbatim(...child.lines);
    }

    /** Open a `{` block, increase depth. */
    open(header?: string): this {
        if (header !== undefined) this.line(header);
        this.line("{");
        this.depth++;
        return this;
    }

    /** Close a `}` block, decrease depth. */
    close(suffix = ""): this {
        this.depth--;
        this.line(`}${suffix}`);
        return this;
    }

    /** Increase depth without emitting a `{`. */
    indent(): this {
        this.depth++;
        return this;
    }

    /** Decrease depth without emitting a `}`. */
    dedent(): this {
        this.depth--;
        return this;
    }

    // ── XML doc comments ──────────────────────────────────────────────────────

    /**
     * Emit a `/// <summary>` block. Multi-line text is split on newlines.
     * Special XML characters (`&`, `<`, `>`) in `text` are escaped.
     * Use `summaryRaw` when the text already contains valid XML markup (e.g. `<see cref="..."/>`).
     */
    summary(text: string | undefined): this {
        if (!text) return this;
        return this.summaryRaw(escapeXmlDoc(text));
    }

    /**
     * Emit a `/// <summary>` block without escaping. Use when `text` contains
     * intentional XML markup such as `<see cref="..."/>`.
     */
    summaryRaw(text: string | undefined): this {
        if (!text) return this;
        const docLines = text.split(/\r?\n/);
        this.line("/// <summary>");
        for (const dl of docLines) {
            this.line(dl.trim() === "" ? "///" : `/// ${dl.trim()}`);
        }
        this.line("/// </summary>");
        return this;
    }

    /** Emit a single `/// text` line. */
    doc(text: string): this {
        this.line(`/// ${text}`);
        return this;
    }

    // ── C# attributes ─────────────────────────────────────────────────────────

    /** Emit `[AttrName]`. */
    attr(name: string): this {
        return this.line(`[${name}]`);
    }

    /** Emit `[AttrName(args)]`. */
    attrArgs(name: string, args: string): this {
        return this.line(`[${name}(${args})]`);
    }

    // ── Convenience: common C# constructs ────────────────────────────────────

    /**
     * Emit a `[DebuggerNonUserCode()] get { body }` accessor block.
     * Pass `debuggerNonUserCode: false` to omit the attribute (used in message generator).
     */
    getter(body: () => void, debuggerNonUserCode = true): this {
        if (debuggerNonUserCode) this.attr("System.Diagnostics.DebuggerNonUserCode()");
        this.open("get");
        body();
        this.close();
        return this;
    }

    /** Emit a `[DebuggerNonUserCode()] set { body }` accessor block. */
    setter(body: () => void, debuggerNonUserCode = true): this {
        if (debuggerNonUserCode) this.attr("System.Diagnostics.DebuggerNonUserCode()");
        this.open("set");
        body();
        this.close();
        return this;
    }

    // ── Trimming ──────────────────────────────────────────────────────────────

    /** Remove trailing blank/whitespace-only lines. */
    trimEnd(): this {
        while (this.lines.length > 0 && this.lines[this.lines.length - 1].trim() === "") {
            this.lines.pop();
        }
        return this;
    }

    // ── Output ────────────────────────────────────────────────────────────────

    /** Build the final string, joining lines with `\n`. */
    toString(): string {
        return this.lines.join("\n");
    }

    /** Build the final string with a trailing newline. */
    toStringWithNewline(): string {
        return this.toString() + "\n";
    }

    /** Return a copy of the internal lines array (for spreading into another builder). */
    toLines(): string[] {
        return [...this.lines];
    }
}

/** Escape characters that are invalid inside XML doc comments. */
function escapeXmlDoc(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Extract the body content between the outermost `{` and `}` of a C# namespace block.
 * Used when combining multiple individually-generated files into one.
 */
export function extractNamespaceBody(fileContent: string, namespace_: string): string {
    const nsLine = `namespace ${namespace_}`;
    const start = fileContent.indexOf(nsLine);
    if (start === -1) return fileContent;

    const braceStart = fileContent.indexOf("{", start);
    if (braceStart === -1) return fileContent;

    let depth = 0;
    let end = braceStart;
    for (let i = braceStart; i < fileContent.length; i++) {
        if (fileContent[i] === "{") depth++;
        else if (fileContent[i] === "}") {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    return fileContent.slice(braceStart + 1, end).trimEnd();
}

/** Return a `CodeBuilder` pre-loaded with the standard auto-generated file header and namespace opening, at depth 1. */
export function codeFileHeader(namespace_: string): CodeBuilder {
    const b = new CodeBuilder();
    b.verbatim(
        "#nullable enable",
        "#pragma warning disable CS1591",
        "//------------------------------------------------------------------------------",
        "// <auto-generated>",
        "//     This code was generated by a tool.",
        "//",
        "//     Changes to this file may cause incorrect behavior and will be lost if",
        "//     the code is regenerated.",
        "// </auto-generated>",
        "//------------------------------------------------------------------------------",
        "",
        `namespace ${namespace_}`,
        "{",
    );
    b.depth = 1;
    return b;
}
