import type { EbgSettings } from "../models/interfaces";
import type { EntityMetadata, OptionSetMetadata, OptionMetadata } from "./types";
import { CODEGEN_TOOL_NAME } from "./types";
import { NamingService, getLocalOrDefaultText } from "./naming";
import type { FilterService } from "./filters";
import { escapeXmlComment, codeFileHeader } from "./helpers";

export function generateEnumDeclaration(
    entity: EntityMetadata | null,
    optionSet: OptionSetMetadata,
    namingService: NamingService,
    settings: EbgSettings,
    appVersion: string,
    langCode = 1033,
): string | null {
    if (!optionSet.Options || optionSet.Options.length === 0) return null;

    const enumName = namingService.getNameForOptionSet(entity, optionSet);

    const description = getLocalOrDefaultText(optionSet.Description, langCode);

    const lines: string[] = [];
    lines.push("\t");

    if (description) {
        lines.push("\t/// <summary>");

        const descLines = description.split(/\r?\n/);
        for (const dl of descLines) {
            if (dl === "") {
                lines.push("\t///");
            } else {
                lines.push(`\t/// ${escapeXmlComment(dl)}`);
            }
        }
        lines.push("\t/// </summary>");
    }

    lines.push("\t[System.Runtime.Serialization.DataContractAttribute()]");
    if (!settings.suppressGeneratedCodeAttribute) {
        lines.push(`\t[System.CodeDom.Compiler.GeneratedCodeAttribute("${CODEGEN_TOOL_NAME}", "${appVersion}")]`);
    }
    lines.push(`\tpublic enum ${enumName}`);
    lines.push("\t{");

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
        lines.push("\t\t");

        if (opt.optionDescription) {
            lines.push("\t\t/// <summary>");
            lines.push(`\t\t/// ${escapeXmlComment(opt.optionDescription)}`);
            lines.push("\t\t/// </summary>");
        }
        lines.push("\t\t[System.Runtime.Serialization.EnumMemberAttribute()]");
        if (settings.generateOptionSetMetadataAttribute || settings.addOptionSetMetadataAttribute) {
            const optAttrArgs: string[] = [`"${escapeStringLiteral(opt.label)}"`, `${opt.metadataIdx}`];
            if (opt.color) {
                optAttrArgs.push(`"${escapeStringLiteral(opt.color)}"`);
                if (opt.optionDescription) {
                    optAttrArgs.push(`"${escapeStringLiteral(opt.optionDescription)}"`);
                }
            }
            lines.push(`\t\t[OptionSetMetadataAttribute(${optAttrArgs.join(", ")})]`);
        }
        lines.push(`\t\t${opt.name} = ${opt.value},`);
    }

    lines.push("\t}");
    return lines.join("\n");
}

function escapeStringLiteral(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function wrapEnumDeclarations(decls: Array<string | null>): string[] {
    const lines: string[] = [];
    for (const decl of decls) {
        if (decl) lines.push(decl);
    }
    lines.push("}");
    lines.push("#pragma warning restore CS1591");
    return lines;
}

export function generateOptionSetsFile(
    entityOptionSets: Array<{ entity: EntityMetadata | null; optionSet: OptionSetMetadata }>,
    namingService: NamingService,
    settings: EbgSettings,
    appVersion: string,
): string {
    const sorted = [...entityOptionSets].sort((a, b) => {
        const nameA = namingService.getNameForOptionSet(a.entity, a.optionSet);
        const nameB = namingService.getNameForOptionSet(b.entity, b.optionSet);
        return nameA.localeCompare(nameB);
    });

    const decls = sorted.map(({ entity, optionSet }) => generateEnumDeclaration(entity, optionSet, namingService, settings, appVersion));
    const lines = [...codeFileHeader(settings.namespace), "\t", ...wrapEnumDeclarations(decls)];
    return lines.join("\n") + "\n";
}

export function generateEntityOptionSetsFile(entity: EntityMetadata, optionSets: OptionSetMetadata[], namingService: NamingService, settings: EbgSettings, appVersion: string): string {
    const decls = optionSets.map((optionSet) => generateEnumDeclaration(entity, optionSet, namingService, settings, appVersion));
    const lines = [...codeFileHeader(settings.namespace), "\t", ...wrapEnumDeclarations(decls)];
    return lines.join("\n");
}

export function generateSingleOptionSetFile(entity: EntityMetadata | null, optionSet: OptionSetMetadata, namingService: NamingService, settings: EbgSettings, appVersion: string): string {
    const decl = generateEnumDeclaration(entity, optionSet, namingService, settings, appVersion);
    const lines = [...codeFileHeader(settings.namespace), "\t", ...wrapEnumDeclarations([decl])];
    return lines.join("\n");
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
