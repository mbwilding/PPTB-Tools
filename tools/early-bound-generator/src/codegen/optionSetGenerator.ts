import type { EbgSettings } from "../models/interfaces";
import type { EntityMetadata, OptionSetMetadata, OptionMetadata } from "./types";
import { CODEGEN_TOOL_NAME, CODEGEN_TOOL_VERSION } from "./types";
import { NamingService, getLocalOrDefaultText } from "./naming";
import type { FilterService } from "./filters";
import { codeFileHeader } from "../utils/codeBuilder";
import { CodeBuilder } from "../utils/codeBuilder";

export function generateEnumDeclaration(entity: EntityMetadata | null, optionSet: OptionSetMetadata, namingService: NamingService, settings: EbgSettings, langCode = 1033): string | null {
    if (!optionSet.Options || optionSet.Options.length === 0) return null;

    const enumName = namingService.getNameForOptionSet(entity, optionSet);
    const description = getLocalOrDefaultText(optionSet.Description, langCode);

    const b = new CodeBuilder(1);
    b.spacer();
    b.summary(description);
    b.attr("System.Runtime.Serialization.DataContractAttribute()");
    if (!settings.suppressGeneratedCodeAttribute) {
        b.attrArgs("System.CodeDom.Compiler.GeneratedCodeAttribute", `"${CODEGEN_TOOL_NAME}", "${CODEGEN_TOOL_VERSION}"`);
    }
    b.open(`public enum ${enumName}`);

    const metadataOrderByValue = new Map<number, number>();
    optionSet.Options.forEach((opt, i) => {
        if (opt.Value !== null && opt.Value !== undefined) {
            metadataOrderByValue.set(opt.Value, i);
        }
    });

    const namedOptions: Array<{ name: string; label: string; value: number; metadataIdx: number; color: string; optionDescription: string }> = [];

    for (const opt of optionSet.Options) {
        if (opt.Value === null || opt.Value === undefined) continue;
        const name = namingService.getNameForOption(optionSet, opt, langCode);
        const labelText = getLocalOrDefaultText(opt.Label, langCode);
        const optionDescription = getLocalOrDefaultText(opt.Description, langCode) ?? "";
        const color = opt.Color ?? "";
        namedOptions.push({
            name,
            label: labelText,
            value: opt.Value,
            metadataIdx: metadataOrderByValue.get(opt.Value) ?? 0,
            color,
            optionDescription,
        });
    }

    namedOptions.sort((a, b) => a.name.localeCompare(b.name));

    for (const opt of namedOptions) {
        b.spacer();
        b.summary(opt.optionDescription || undefined);
        b.attr("System.Runtime.Serialization.EnumMemberAttribute()");
        if (settings.generateOptionSetMetadataAttribute || settings.addOptionSetMetadataAttribute) {
            const optAttrArgs: string[] = [`"${escapeStringLiteral(opt.label)}"`, `${opt.metadataIdx}`];
            if (opt.color) {
                optAttrArgs.push(`"${escapeStringLiteral(opt.color)}"`);
                if (opt.optionDescription) {
                    optAttrArgs.push(`"${escapeStringLiteral(opt.optionDescription)}"`);
                }
            }
            b.attrArgs("OptionSetMetadataAttribute", optAttrArgs.join(", "));
        }
        b.line(`${opt.name} = ${opt.value},`);
    }

    b.close();
    return b.toString();
}

function escapeStringLiteral(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function appendEnumDeclarations(b: CodeBuilder, decls: Array<string | null>): void {
    for (const decl of decls) {
        if (decl) b.verbatim(decl);
    }
    b.verbatim("}", "#pragma warning restore CS1591");
}

export function generateOptionSetsFile(entityOptionSets: Array<{ entity: EntityMetadata | null; optionSet: OptionSetMetadata }>, namingService: NamingService, settings: EbgSettings): string {
    const sorted = [...entityOptionSets].sort((a, b) => {
        const nameA = namingService.getNameForOptionSet(a.entity, a.optionSet);
        const nameB = namingService.getNameForOptionSet(b.entity, b.optionSet);
        return nameA.localeCompare(nameB);
    });

    const decls = sorted.map(({ entity, optionSet }) => generateEnumDeclaration(entity, optionSet, namingService, settings));
    const b = codeFileHeader(settings.namespace);
    b.spacer();
    appendEnumDeclarations(b, decls);
    return b.toStringWithNewline();
}

export function generateEntityOptionSetsFile(entity: EntityMetadata, optionSets: OptionSetMetadata[], namingService: NamingService, settings: EbgSettings): string {
    const decls = optionSets.map((optionSet) => generateEnumDeclaration(entity, optionSet, namingService, settings));
    const b = codeFileHeader(settings.namespace);
    b.spacer();
    appendEnumDeclarations(b, decls);
    return b.toString();
}

export function generateSingleOptionSetFile(entity: EntityMetadata | null, optionSet: OptionSetMetadata, namingService: NamingService, settings: EbgSettings): string {
    const decl = generateEnumDeclaration(entity, optionSet, namingService, settings);
    const b = codeFileHeader(settings.namespace);
    b.spacer();
    appendEnumDeclarations(b, [decl]);
    return b.toString();
}

export function collectOptionSets(entities: EntityMetadata[], settings: EbgSettings, _filterService: FilterService): Array<{ entity: EntityMetadata | null; optionSet: OptionSetMetadata }> {
    const result: Array<{ entity: EntityMetadata | null; optionSet: OptionSetMetadata }> = [];
    const globalSeen = new Set<string>();
    const localSeen = new Set<string>();

    for (const entity of entities) {
        for (const attr of entity.Attributes ?? []) {
            const os = attr.OptionSet;
            if (!os) continue;
            if (attr.AttributeOf) continue;

            if (!settings.emitEntityETC && (attr.LogicalName === "record1objecttypecode" || attr.LogicalName === "record2objecttypecode")) continue;

            if (os.IsGlobal) {
                const key = os.MetadataId ?? os.Name;
                const alreadySeen = globalSeen.has(key);

                if (!alreadySeen) {
                    globalSeen.add(key);
                    result.push({ entity: null, optionSet: os });
                }
            } else {
                const key = `${entity.LogicalName}||${os.Name}`;
                if (!localSeen.has(key)) {
                    localSeen.add(key);
                    result.push({ entity, optionSet: os });
                }
            }
        }
    }

    return result;
}

export type { OptionMetadata, OptionSetMetadata };
