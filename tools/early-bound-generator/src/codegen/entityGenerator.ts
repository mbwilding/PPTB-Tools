import type { EbgSettings } from "../models/interfaces";
import type { EntityMetadata, AttributeMetadata } from "./types";
import { CODEGEN_TOOL_NAME } from "./types";
import { NamingService, getLocalOrDefaultText } from "./naming";
import type { FilterService } from "./filters";
import { escapeXmlComment, generateSummary, isObsolete, codeFileHeader } from "./helpers";

function getCSharpType(attr: AttributeMetadata): { csType: string; nullable: boolean; isEnum: boolean } {
    const t = attr.AttributeType;

    const typeName = attr.AttributeTypeName?.Value;
    if (typeName === "ImageType") return { csType: "byte[]", nullable: true, isEnum: false };
    if (typeName === "FileType") return { csType: "byte[]", nullable: true, isEnum: false };
    switch (t) {
        case "String":
        case "Memo":
        case "EntityName":
            return { csType: "string", nullable: true, isEnum: false };
        case "Integer":
        case "Virtual":
            return { csType: "System.Nullable<int>", nullable: false, isEnum: false };
        case "BigInt":
            return { csType: "System.Nullable<long>", nullable: false, isEnum: false };
        case "Double":
            return { csType: "System.Nullable<double>", nullable: false, isEnum: false };
        case "Decimal":
            return { csType: "System.Nullable<decimal>", nullable: false, isEnum: false };
        case "Money":
            return { csType: "Microsoft.Xrm.Sdk.Money", nullable: true, isEnum: false };
        case "Boolean":
            return { csType: "System.Nullable<bool>", nullable: false, isEnum: false };
        case "DateTime":
            return { csType: "System.Nullable<System.DateTime>", nullable: false, isEnum: false };
        case "Lookup":
        case "Customer":
        case "Owner":
            return { csType: "Microsoft.Xrm.Sdk.EntityReference", nullable: true, isEnum: false };
        case "Uniqueidentifier":
            return { csType: "System.Nullable<System.Guid>", nullable: false, isEnum: false };
        case "Picklist":
        case "Status":
        case "State":
            return { csType: "", nullable: false, isEnum: true };
        case "MultiSelectPicklist":
            return { csType: "Microsoft.Xrm.Sdk.OptionSetValueCollection", nullable: true, isEnum: false };
        case "Image":
        case "File":
            return { csType: "byte[]", nullable: true, isEnum: false };
        case "PartyList":
            return { csType: "System.Collections.Generic.IEnumerable<Microsoft.Xrm.Sdk.Entity>", nullable: true, isEnum: false };
        case "CalendarRules":
            return { csType: "System.Collections.Generic.IEnumerable<Microsoft.Xrm.Sdk.Entity>", nullable: true, isEnum: false };
        case "ManagedProperty":
            return { csType: "Microsoft.Xrm.Sdk.BooleanManagedProperty", nullable: true, isEnum: false };
        default:
            return { csType: "object", nullable: true, isEnum: false };
    }
}

const READONLY_FIELDS_EDITABLE_ATTRS = new Set(["createdby", "createdon", "modifiedby", "modifiedon", "owningbusinessunit", "owningteam", "owninguser"]);

function isReadOnly(attr: AttributeMetadata, settings: EbgSettings): boolean {
    if (settings.makeAllFieldsEditable) return false;

    if (settings.makeReadonlyFieldsEditable && READONLY_FIELDS_EDITABLE_ATTRS.has(attr.LogicalName)) return false;

    const canCreate = attr.IsValidForCreate !== false;
    const canUpdate = attr.IsValidForUpdate !== false;
    return !canCreate && !canUpdate;
}

function isPrimaryId(attr: AttributeMetadata): boolean {
    return attr.IsPrimaryId === true;
}

export interface EntityGeneratorOptions {
    settings: EbgSettings;
    namingService: NamingService;
    filterService: FilterService;
    suppressGeneratedCode: boolean;
    appVersion: string;

    legacyHeader?: boolean;
}

function pushAttributePreamble(lines: string[], attr: AttributeMetadata, logicalName: string, summary: string | undefined, settings: EbgSettings): void {
    if (summary) {
        lines.push(generateSummary(summary, "\t\t").trimEnd());
    }
    lines.push(`\t\t[Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute("${logicalName}")]`);
    if (settings.obsoleteDeprecated && (attr.DeprecatedVersion != null || isObsolete(getLocalOrDefaultText(attr.DisplayName), settings.obsoleteTokens))) {
        lines.push("\t\t[System.ObsoleteAttribute()]");
    }
}

function buildNameAttributeBlock(attr: AttributeMetadata, logicalName: string, propName: string, summary: string | undefined, settings: EbgSettings): string {
    const parentLogical = attr.AttributeOf!;
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);
    lines.push(`\t\tpublic string? ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\tif (this.FormattedValues.Contains("${parentLogical}"))`);
    lines.push("\t\t\t\t{");
    lines.push(`\t\t\t\t\treturn this.FormattedValues["${parentLogical}"];`);
    lines.push("\t\t\t\t}");
    lines.push("\t\t\t\telse");
    lines.push("\t\t\t\t{");
    lines.push("\t\t\t\t\treturn default(string);");
    lines.push("\t\t\t\t}");
    lines.push("\t\t\t}");
    if (settings.makeAllFieldsEditable) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.FormattedValues["${parentLogical}"] = value;`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildMultiSelectEnumBlock(attr: AttributeMetadata, logicalName: string, propName: string, enumName: string, summary: string | undefined, readonly_: boolean, settings: EbgSettings): string {
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);
    lines.push(`\t\tpublic virtual System.Collections.Generic.IEnumerable<${enumName}> ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\treturn EntityOptionSetEnum.GetMultiEnum<${enumName}>(this, "${logicalName}");`);
    lines.push("\t\t\t}");
    if (!readonly_) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", EntityOptionSetEnum.GetMultiEnum(this, "${logicalName}", value));`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildStateCodeBlock(attr: AttributeMetadata, logicalName: string, propName: string, summary: string | undefined, readonly_: boolean, settings: EbgSettings): string {
    const entityStateType = "Microsoft.Xrm.Sdk.EntityState";
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);
    lines.push(`\t\tpublic virtual ${entityStateType}? ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\treturn ((${entityStateType}?)(EntityOptionSetEnum.GetEnum(this, "${logicalName}")));`);
    lines.push("\t\t\t}");
    if (!readonly_) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null);`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildEnumWithBothPropertiesBlock(
    attr: AttributeMetadata,
    logicalName: string,
    propName: string,
    enumName: string,
    summary: string | undefined,
    readonly_: boolean,
    settings: EbgSettings,
): string {
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);

    lines.push(`\t\tpublic virtual Microsoft.Xrm.Sdk.OptionSetValue? ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\treturn this.GetAttributeValue<Microsoft.Xrm.Sdk.OptionSetValue>("${logicalName}");`);
    lines.push("\t\t\t}");
    if (!readonly_) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", value);`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    lines.push("\t\t");

    lines.push(`\t\t[Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute("${logicalName}")]`);
    if (settings.obsoleteDeprecated && (attr.DeprecatedVersion != null || isObsolete(getLocalOrDefaultText(attr.DisplayName), settings.obsoleteTokens))) {
        lines.push("\t\t[System.ObsoleteAttribute()]");
    }
    lines.push(`\t\tpublic virtual ${enumName}? ${propName}Enum`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\treturn ((${enumName}?)(EntityOptionSetEnum.GetEnum(this, "${logicalName}")));`);
    lines.push("\t\t\t}");
    if (!readonly_) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null);`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildEnumReplaceBlock(attr: AttributeMetadata, logicalName: string, propName: string, enumName: string, summary: string | undefined, readonly_: boolean, settings: EbgSettings): string {
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);
    lines.push(`\t\tpublic virtual ${enumName}? ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\treturn ((${enumName}?)(EntityOptionSetEnum.GetEnum(this, "${logicalName}")));`);
    lines.push("\t\t\t}");
    if (!readonly_) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null);`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildPrimaryIdBlock(attr: AttributeMetadata, logicalName: string, propName: string, summary: string | undefined, settings: EbgSettings): string {
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);
    lines.push(`\t\tpublic System.Nullable<System.Guid> ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\treturn this.GetAttributeValue<System.Nullable<System.Guid>>("${logicalName}");`);
    lines.push("\t\t\t}");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tset");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", value);`);
    lines.push("\t\t\t\tif (value.HasValue)");
    lines.push("\t\t\t\t{");
    lines.push("\t\t\t\t\tbase.Id = value.Value;");
    lines.push("\t\t\t\t}");
    lines.push("\t\t\t\telse");
    lines.push("\t\t\t\t{");
    lines.push("\t\t\t\t\tbase.Id = System.Guid.Empty;");
    lines.push("\t\t\t\t}");
    lines.push("\t\t\t}");
    lines.push("\t\t}");
    lines.push("\t\t");
    lines.push(`\t\t[Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute("${logicalName}")]`);
    lines.push("\t\tpublic override System.Guid Id");
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    lines.push("\t\t\t\treturn base.Id;");
    lines.push("\t\t\t}");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tset");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\tthis.${propName} = value;`);
    lines.push("\t\t\t}");
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildPlainTypeBlock(
    attr: AttributeMetadata,
    logicalName: string,
    propName: string,
    csType: string,
    csTypeRaw: string,
    optionSetExcluded: boolean,
    summary: string | undefined,
    readonly_: boolean,
    settings: EbgSettings,
): string {
    const lines: string[] = [];
    pushAttributePreamble(lines, attr, logicalName, summary, settings);
    lines.push(`\t\tpublic ${optionSetExcluded ? "virtual " : ""}${csType} ${propName}`);
    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    if (optionSetExcluded) {
        lines.push(`\t\t\t\tMicrosoft.Xrm.Sdk.OptionSetValue value = this.GetAttributeValue<Microsoft.Xrm.Sdk.OptionSetValue>("${logicalName}");`);
        lines.push("\t\t\t\tif ((value != null))");
        lines.push("\t\t\t\t{");
        lines.push("\t\t\t\t\treturn value.Value;");
        lines.push("\t\t\t\t}");
        lines.push("\t\t\t\treturn null;");
    } else {
        lines.push(`\t\t\t\treturn this.GetAttributeValue<${csTypeRaw}>("${logicalName}");`);
    }
    lines.push("\t\t\t}");
    if (!readonly_) {
        lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.SetAttributeValue("${logicalName}", value);`);
        lines.push("\t\t\t}");
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function buildRelationshipPropertyBlock(relType: "1:N" | "N:1" | "N:N", schemaName: string, propName: string, targetEntityName: string, isCollection: boolean, extraAttribute?: string): string {
    const lines: string[] = [];
    lines.push("\t\t/// <summary>");
    lines.push(`\t\t/// ${relType} ${schemaName}`);
    lines.push("\t\t/// </summary>");
    if (extraAttribute) {
        lines.push(`\t\t${extraAttribute}`);
    }
    lines.push(`\t\t[Microsoft.Xrm.Sdk.RelationshipSchemaNameAttribute("${schemaName}")]`);

    if (isCollection) {
        lines.push(`\t\tpublic System.Collections.Generic.IEnumerable<${targetEntityName}>? ${propName}`);
    } else {
        lines.push(`\t\tpublic ${targetEntityName}? ${propName}`);
    }

    lines.push("\t\t{");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tget");
    lines.push("\t\t\t{");
    if (isCollection) {
        lines.push(`\t\t\t\treturn this.GetRelatedEntities<${targetEntityName}>("${schemaName}", null);`);
    } else {
        lines.push(`\t\t\t\treturn this.GetRelatedEntity<${targetEntityName}>("${schemaName}", null);`);
    }
    lines.push("\t\t\t}");
    lines.push("\t\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push("\t\t\tset");
    lines.push("\t\t\t{");
    lines.push(`\t\t\t\tthis.OnPropertyChanging("${propName}");`);
    if (isCollection) {
        lines.push(`\t\t\t\tthis.SetRelatedEntities<${targetEntityName}>("${schemaName}", null, value);`);
    } else {
        lines.push(`\t\t\t\tthis.SetRelatedEntity<${targetEntityName}>("${schemaName}", null, value);`);
    }
    lines.push(`\t\t\t\tthis.OnPropertyChanged("${propName}");`);
    lines.push("\t\t\t}");
    lines.push("\t\t}");
    return lines.join("\n");
}

export function generateEntityFile(entity: EntityMetadata, allEntities: Map<string, EntityMetadata>, options: EntityGeneratorOptions): string {
    const { settings, namingService, appVersion } = options;
    const className = namingService.getNameForEntity(entity);
    const descriptionText = getLocalOrDefaultText(entity.Description);

    const classSummary = descriptionText || null;

    const lines: string[] = [];

    lines.push(...codeFileHeader(settings.namespace));
    lines.push("\t");
    lines.push("\t");

    if (classSummary) {
        lines.push("\t/// <summary>");
        lines.push(`\t/// ${escapeXmlComment(classSummary)}`);
        lines.push("\t/// </summary>");
    }

    lines.push("\t[System.Runtime.Serialization.DataContractAttribute()]");
    lines.push(`\t[Microsoft.Xrm.Sdk.Client.EntityLogicalNameAttribute("${entity.LogicalName}")]`);
    if (!settings.suppressGeneratedCodeAttribute) {
        lines.push(`\t[System.CodeDom.Compiler.GeneratedCodeAttribute("${CODEGEN_TOOL_NAME}", "${appVersion}")]`);
    }
    lines.push(`\tpublic partial class ${className} : Microsoft.Xrm.Sdk.Entity`);
    lines.push("\t{");
    lines.push("\t\t");

    lines.push("\t\t/// <summary>");
    lines.push("\t\t/// Default Constructor.");
    lines.push("\t\t/// </summary>");
    lines.push("\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push(`\t\tpublic ${className}() : `);
    lines.push("				base(EntityLogicalName)");
    lines.push("\t\t{");
    lines.push("\t\t}");
    lines.push("\t\t");
    lines.push("\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push(`\t\tpublic ${className}(System.Guid id) : `);
    lines.push("				base(EntityLogicalName, id)");
    lines.push("\t\t{");
    lines.push("\t\t}");
    lines.push("\t\t");
    lines.push("\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push(`\t\tpublic ${className}(string keyName, object keyValue) : `);
    lines.push("				base(EntityLogicalName, keyName, keyValue)");
    lines.push("\t\t{");
    lines.push("\t\t}");
    lines.push("\t\t");
    lines.push("\t\t[System.Diagnostics.DebuggerNonUserCode()]");
    lines.push(`\t\tpublic ${className}(Microsoft.Xrm.Sdk.KeyAttributeCollection keyAttributes) : `);
    lines.push("				base(EntityLogicalName, keyAttributes)");
    lines.push("\t\t{");
    lines.push("\t\t}");
    lines.push("\t\t");

    if (entity.Keys && entity.Keys.length > 0) {
        const altKeyValue = entity.Keys.map((k) => [...k.KeyAttributes].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).join(","))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .join("|");
        lines.push(`\t\tpublic const string AlternateKeys = "${altKeyValue}";`);
        lines.push("\t\t");
    }
    lines.push(`\t\tpublic const string EntityLogicalName = "${entity.LogicalName}";`);
    lines.push("\t\t");
    if (entity.PrimaryIdAttribute) {
        lines.push(`\t\tpublic const string PrimaryIdAttribute = "${entity.PrimaryIdAttribute}";`);
        lines.push("\t\t");
    }
    if (entity.PrimaryNameAttribute) {
        lines.push(`\t\tpublic const string PrimaryNameAttribute = "${entity.PrimaryNameAttribute}";`);
        lines.push("\t\t");
    }
    lines.push(`\t\tpublic const string EntitySchemaName = "${entity.SchemaName}";`);
    lines.push("\t\t");
    if (entity.LogicalCollectionName) {
        lines.push(`\t\tpublic const string EntityLogicalCollectionName = "${entity.LogicalCollectionName}";`);
        lines.push("\t\t");
    }
    if (entity.EntitySetName) {
        lines.push(`\t\tpublic const string EntitySetName = "${entity.EntitySetName}";`);
        lines.push("\t\t");
    }

    if (settings.generateAttributeNameConsts) {
        const fieldsBlock = generateFieldsClass(entity, namingService);
        if (fieldsBlock) {
            lines.push(fieldsBlock);
            lines.push("\t\t");
        }
    }

    if (settings.generateEntityRelationships) {
        const relBlock = generateRelationshipsClass(entity, namingService);
        if (relBlock) {
            lines.push(relBlock);
            lines.push("\t\t");
        }
    }

    const attrs = (entity.Attributes ?? []).filter((a) => options.filterService.shouldGenerateAttribute(entity, a));
    for (const attr of attrs) {
        const propLines = generatePropertyBlock(entity, attr, allEntities, namingService, settings);
        if (propLines) {
            lines.push(propLines);
            lines.push("\t\t");
        }
    }

    if (settings.generateEntityRelationships) {
        const relProps = generateRelationshipProperties(entity, allEntities, namingService);
        for (const rp of relProps) {
            lines.push(rp);
            lines.push("\t\t");
        }
    }

    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
        lines.pop();
    }

    lines.push("\t}");
    lines.push("}");
    lines.push("#pragma warning restore CS1591");

    return lines.join("\n") + "\n";
}

function generateFieldsClass(entity: EntityMetadata, namingService: NamingService): string | null {
    const entries: Array<[string, string]> = [];

    for (const attr of entity.Attributes ?? []) {
        const propName = namingService.getNameForAttribute(entity, attr);
        entries.push([propName, attr.LogicalName]);
    }

    if (entity.PrimaryIdAttribute) {
        entries.push(["Id", entity.PrimaryIdAttribute]);
    }

    if (!entries.length) return null;

    entries.sort((a, b) => a[0].localeCompare(b[0]));

    const innerLines: string[] = [];
    for (const [name, logical] of entries) {
        innerLines.push(`\t\t\tpublic const string ${name} = "${logical}";`);
    }

    const lines: string[] = [];
    lines.push("\t\tpublic static partial class Fields");
    lines.push("\t\t{");
    lines.push(...innerLines);
    lines.push("\t\t}");
    return lines.join("\n");
}

function generateRelationshipsClass(entity: EntityMetadata, _namingService: NamingService): string | null {
    const entries: Array<[string, string]> = [];

    for (const rel of entity.OneToManyRelationships ?? []) {
        const propName = rel.ReferencedEntityNavigationPropertyName ?? rel.SchemaName;
        entries.push([propName, rel.SchemaName]);
    }
    for (const rel of entity.ManyToOneRelationships ?? []) {
        const propName = rel.ReferencingEntityNavigationPropertyName ?? rel.SchemaName;
        entries.push([propName, rel.SchemaName]);
    }
    for (const rel of entity.ManyToManyRelationships ?? []) {
        const propName = rel.Entity1NavigationPropertyName ?? rel.SchemaName;
        entries.push([propName, rel.SchemaName]);
    }

    if (!entries.length) return null;

    entries.sort((a, b) => a[0].localeCompare(b[0]));

    const lines: string[] = [];
    lines.push("\t\tpublic static partial class Relationships");
    lines.push("\t\t{");
    for (const [name, schema] of entries) {
        lines.push(`\t\t\tpublic const string ${name} = "${schema}";`);
    }
    lines.push("\t\t}");
    return lines.join("\n");
}

function generatePropertyBlock(entity: EntityMetadata, attr: AttributeMetadata, _allEntities: Map<string, EntityMetadata>, namingService: NamingService, settings: EbgSettings): string | null {
    if (attr.IsValidForRead === false && attr.IsValidForCreate === false && attr.IsValidForUpdate === false) {
        return null;
    }

    const isEntityName = attr.AttributeType === "EntityName" || attr.AttributeTypeName?.Value === "EntityNameType" || attr.AttributeTypeName?.Value === "EntityName";
    if (isEntityName && attr.AttributeOf != null) {
        return null;
    }

    const propName = namingService.getNameForAttribute(entity, attr);
    const summary = getLocalOrDefaultText(attr.Description);
    const logicalName = attr.LogicalName;
    const readonly_ = isReadOnly(attr, settings);
    const isPrimId = isPrimaryId(attr);
    const typeInfo = getCSharpType(attr);

    const typeName = attr.AttributeTypeName?.Value;
    const isImageOrFile = typeName === "ImageType" || typeName === "FileType";
    const isNameAttr =
        !isImageOrFile &&
        settings.emitVirtualAttributes &&
        attr.AttributeOf != null &&
        (attr.AttributeType === "Virtual" || (attr.AttributeType === "String" && attr.LogicalName.endsWith("name"))) &&
        attr.LogicalName.length > 4;

    if (isNameAttr) {
        return buildNameAttributeBlock(attr, logicalName, propName, summary, settings);
    }

    const isMultiSelectPicklist = attr.AttributeTypeName?.Value === "MultiSelectPicklistType";
    if (isMultiSelectPicklist && settings.generateEnumProperties && attr.OptionSet) {
        const enumName = namingService.getNameForOptionSet(entity, attr.OptionSet);
        return buildMultiSelectEnumBlock(attr, logicalName, propName, enumName, summary, readonly_, settings);
    }

    const optionSetExcluded = !settings.emitEntityETC && (attr.LogicalName === "record1objecttypecode" || attr.LogicalName === "record2objecttypecode");

    const effectiveTypeInfo =
        typeInfo.isEnum && optionSetExcluded
            ? { csType: "System.Nullable<int>", nullable: false, isEnum: false }
            : typeInfo.isEnum && !settings.generateEnumProperties
              ? { csType: "Microsoft.Xrm.Sdk.OptionSetValue", nullable: true, isEnum: false }
              : typeInfo;

    if (effectiveTypeInfo.isEnum && settings.generateEnumProperties) {
        if (settings.useEnumForStateCodes && logicalName === "statecode") {
            return buildStateCodeBlock(attr, logicalName, propName, summary, readonly_, settings);
        }

        const optionSet = attr.OptionSet;
        const enumName = optionSet ? namingService.getNameForOptionSet(entity, optionSet) : propName + "Enum";

        if (!settings.replaceOptionSetPropertiesWithEnum) {
            return buildEnumWithBothPropertiesBlock(attr, logicalName, propName, enumName, summary, readonly_, settings);
        }

        return buildEnumReplaceBlock(attr, logicalName, propName, enumName, summary, readonly_, settings);
    }

    if (isPrimId) {
        return buildPrimaryIdBlock(attr, logicalName, propName, summary, settings);
    }

    const csTypeRaw = effectiveTypeInfo.csType;
    const csType = effectiveTypeInfo.nullable ? `${csTypeRaw}?` : csTypeRaw;
    return buildPlainTypeBlock(attr, logicalName, propName, csType, csTypeRaw, optionSetExcluded, summary, readonly_, settings);
}

function generateRelationshipProperties(entity: EntityMetadata, allEntities: Map<string, EntityMetadata>, namingService: NamingService): string[] {
    const result: string[] = [];

    const resolveEntityNameOrRaw = (logicalName: string | undefined): string => {
        if (!logicalName) return "Microsoft.Xrm.Sdk.Entity";
        const found = allEntities.get(logicalName.toLowerCase());
        return found ? namingService.getNameForEntity(found) : logicalName;
    };

    const resolveEntityNameOrBase = (logicalName: string | undefined): string => {
        if (!logicalName) return "Microsoft.Xrm.Sdk.Entity";
        const found = allEntities.get(logicalName.toLowerCase());
        return found ? namingService.getNameForEntity(found) : "Microsoft.Xrm.Sdk.Entity";
    };

    for (const rel of entity.OneToManyRelationships ?? []) {
        const propName = rel.ReferencedEntityNavigationPropertyName ?? rel.SchemaName;
        const targetEntityName = resolveEntityNameOrRaw(rel.ReferencingEntity);
        result.push(buildRelationshipPropertyBlock("1:N", rel.SchemaName, propName, targetEntityName, true));
    }

    for (const rel of entity.ManyToOneRelationships ?? []) {
        const propName = rel.ReferencingEntityNavigationPropertyName ?? rel.SchemaName;
        const targetEntityName = resolveEntityNameOrRaw(rel.ReferencedEntity);
        const extraAttr = `[Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute("${rel.SchemaName}")]`;
        result.push(buildRelationshipPropertyBlock("N:1", rel.SchemaName, propName, targetEntityName, false, extraAttr));
    }

    for (const rel of entity.ManyToManyRelationships ?? []) {
        const otherEntityLogical = rel.Entity1LogicalName === entity.LogicalName ? rel.Entity2LogicalName : rel.Entity1LogicalName;
        const targetEntityName = resolveEntityNameOrBase(otherEntityLogical);
        const propName = rel.Entity1LogicalName === entity.LogicalName ? (rel.Entity1NavigationPropertyName ?? rel.SchemaName) : (rel.Entity2NavigationPropertyName ?? rel.SchemaName);
        result.push(buildRelationshipPropertyBlock("N:N", rel.SchemaName, propName, targetEntityName, true));
    }

    return result;
}
