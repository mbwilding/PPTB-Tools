import type { EbgSettings } from "../models/interfaces";
import type { EntityMetadata, AttributeMetadata } from "./types";
import { CODEGEN_TOOL_NAME, CODEGEN_TOOL_VERSION } from "./types";
import { NamingService, getLocalOrDefaultText } from "./naming";
import type { FilterService } from "./filters";
import { codeFileHeader } from "../utils/codeBuilder";
import { isObsolete } from "./filters";
import { CodeBuilder } from "../utils/codeBuilder";

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
    appVersion?: string;
    legacyHeader?: boolean;
}

/** Push `[AttributeLogicalNameAttribute]` and optional `[ObsoleteAttribute]` at the current depth. */
function pushAttributePreamble(b: CodeBuilder, attr: AttributeMetadata, logicalName: string, summary: string | undefined, settings: EbgSettings): void {
    b.summary(summary);
    b.attrArgs("Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute", `"${logicalName}"`);
    if (settings.obsoleteDeprecated && (attr.DeprecatedVersion != null || isObsolete(getLocalOrDefaultText(attr.DisplayName), settings.obsoleteTokens))) {
        b.attr("System.ObsoleteAttribute()");
    }
}

function buildNameAttributeBlock(attr: AttributeMetadata, logicalName: string, propName: string, summary: string | undefined, settings: EbgSettings): string {
    const parentLogical = attr.AttributeOf!;
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`${settings.generateTypesAsInternal ? "internal" : "public"} string${settings.makeReferenceTypesNullable ? "?" : ""} ${propName}`);
    b.getter(() => {
        b.open(`if (this.FormattedValues.Contains("${parentLogical}"))`);
        b.line(`return this.FormattedValues["${parentLogical}"];`);
        b.close();
        b.open("else");
        b.line("return default(string);");
        b.close();
    }, settings.addDebuggerNonUserCode);
    if (settings.makeAllFieldsEditable) {
        b.setter(() => {
            b.line(`this.FormattedValues["${parentLogical}"] = value;`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    return b.toString();
}

function buildMultiSelectEnumBlock(attr: AttributeMetadata, logicalName: string, propName: string, enumName: string, summary: string | undefined, readonly_: boolean, settings: EbgSettings): string {
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`public virtual System.Collections.Generic.IEnumerable<${enumName}> ${propName}`);
    b.getter(() => {
        b.line(`return EntityOptionSetEnum.GetMultiEnum<${enumName}>(this, "${logicalName}");`);
    }, settings.addDebuggerNonUserCode);
    if (!readonly_) {
        b.setter(() => {
            b.line(`this.SetAttributeValue("${logicalName}", EntityOptionSetEnum.GetMultiEnum(this, "${logicalName}", value));`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    return b.toString();
}

function buildStateCodeBlock(attr: AttributeMetadata, logicalName: string, propName: string, summary: string | undefined, readonly_: boolean, settings: EbgSettings): string {
    const entityStateType = "Microsoft.Xrm.Sdk.EntityState";
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`public virtual ${entityStateType}? ${propName}`);
    b.getter(() => {
        b.line(`return ((${entityStateType}?)(EntityOptionSetEnum.GetEnum(this, "${logicalName}")));`);
    }, settings.addDebuggerNonUserCode);
    if (!readonly_) {
        b.setter(() => {
            b.line(`this.SetAttributeValue("${logicalName}", value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null);`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    return b.toString();
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
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`public virtual Microsoft.Xrm.Sdk.OptionSetValue? ${propName}`);
    b.getter(() => {
        b.line(`return this.GetAttributeValue<Microsoft.Xrm.Sdk.OptionSetValue>("${logicalName}");`);
    }, settings.addDebuggerNonUserCode);
    if (!readonly_) {
        b.setter(() => {
            b.line(`this.SetAttributeValue("${logicalName}", value);`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    b.spacer();

    // Second property: the enum companion
    b.attrArgs("Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute", `"${logicalName}"`);
    if (settings.obsoleteDeprecated && (attr.DeprecatedVersion != null || isObsolete(getLocalOrDefaultText(attr.DisplayName), settings.obsoleteTokens))) {
        b.attr("System.ObsoleteAttribute()");
    }
    b.open(`public virtual ${enumName}? ${propName}Enum`);
    b.getter(() => {
        b.line(`return ((${enumName}?)(EntityOptionSetEnum.GetEnum(this, "${logicalName}")));`);
    }, settings.addDebuggerNonUserCode);
    if (!readonly_) {
        b.setter(() => {
            b.line(`this.SetAttributeValue("${logicalName}", value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null);`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    return b.toString();
}

function buildEnumReplaceBlock(attr: AttributeMetadata, logicalName: string, propName: string, enumName: string, summary: string | undefined, readonly_: boolean, settings: EbgSettings): string {
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`public virtual ${enumName}? ${propName}`);
    b.getter(() => {
        b.line(`return ((${enumName}?)(EntityOptionSetEnum.GetEnum(this, "${logicalName}")));`);
    }, settings.addDebuggerNonUserCode);
    if (!readonly_) {
        b.setter(() => {
            b.line(`this.SetAttributeValue("${logicalName}", value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null);`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    return b.toString();
}

function buildPrimaryIdBlock(attr: AttributeMetadata, logicalName: string, propName: string, summary: string | undefined, settings: EbgSettings): string {
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`public System.Nullable<System.Guid> ${propName}`);
    b.getter(() => {
        b.line(`return this.GetAttributeValue<System.Nullable<System.Guid>>("${logicalName}");`);
    }, settings.addDebuggerNonUserCode);
    b.setter(() => {
        b.line(`this.SetAttributeValue("${logicalName}", value);`);
        b.open("if (value.HasValue)");
        b.line("base.Id = value.Value;");
        b.close();
        b.open("else");
        b.line("base.Id = System.Guid.Empty;");
        b.close();
    }, settings.addDebuggerNonUserCode);
    b.close();
    b.spacer();

    b.attrArgs("Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute", `"${logicalName}"`);
    b.open("public override System.Guid Id");
    b.getter(() => {
        b.line("return base.Id;");
    }, settings.addDebuggerNonUserCode);
    b.setter(() => {
        b.line(`this.${propName} = value;`);
    }, settings.addDebuggerNonUserCode);
    b.close();
    return b.toString();
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
    const b = new CodeBuilder(2);
    pushAttributePreamble(b, attr, logicalName, summary, settings);
    b.open(`public ${optionSetExcluded ? "virtual " : ""}${csType} ${propName}`);
    b.getter(() => {
        if (optionSetExcluded) {
            b.line(`Microsoft.Xrm.Sdk.OptionSetValue value = this.GetAttributeValue<Microsoft.Xrm.Sdk.OptionSetValue>("${logicalName}");`);
            b.open("if ((value != null))");
            b.line("return value.Value;");
            b.close();
            b.line("return null;");
        } else {
            b.line(`return this.GetAttributeValue<${csTypeRaw}>("${logicalName}");`);
        }
    }, settings.addDebuggerNonUserCode);
    if (!readonly_) {
        b.setter(() => {
            b.line(`this.SetAttributeValue("${logicalName}", value);`);
        }, settings.addDebuggerNonUserCode);
    }
    b.close();
    return b.toString();
}

function buildRelationshipPropertyBlock(
    relType: "1:N" | "N:1" | "N:N",
    schemaName: string,
    propName: string,
    targetEntityName: string,
    isCollection: boolean,
    settings: EbgSettings,
    extraAttribute?: string,
): string {
    const b = new CodeBuilder(2);
    const access = settings.generateTypesAsInternal ? "internal" : "public";
    const nullable = settings.makeReferenceTypesNullable ? "?" : "";
    b.doc("<summary>");
    b.doc(`${relType} ${schemaName}`);
    b.doc("</summary>");
    if (extraAttribute) {
        b.line(extraAttribute);
    }
    b.attrArgs("Microsoft.Xrm.Sdk.RelationshipSchemaNameAttribute", `"${schemaName}"`);

    if (isCollection) {
        b.open(`${access} System.Collections.Generic.IEnumerable<${targetEntityName}>${nullable} ${propName}`);
    } else {
        b.open(`${access} ${targetEntityName}${nullable} ${propName}`);
    }

    b.getter(() => {
        if (isCollection) {
            b.line(`return this.GetRelatedEntities<${targetEntityName}>("${schemaName}", null);`);
        } else {
            b.line(`return this.GetRelatedEntity<${targetEntityName}>("${schemaName}", null);`);
        }
    }, settings.addDebuggerNonUserCode);
    b.setter(() => {
        if (settings.generateINotifyPattern) b.line(`this.OnPropertyChanging("${propName}");`);
        if (isCollection) {
            b.line(`this.SetRelatedEntities<${targetEntityName}>("${schemaName}", null, value);`);
        } else {
            b.line(`this.SetRelatedEntity<${targetEntityName}>("${schemaName}", null, value);`);
        }
        if (settings.generateINotifyPattern) b.line(`this.OnPropertyChanged("${propName}");`);
    }, settings.addDebuggerNonUserCode);
    b.close();
    return b.toString();
}

export function generateEntityFile(entity: EntityMetadata, allEntities: Map<string, EntityMetadata>, options: EntityGeneratorOptions): string {
    const { settings, namingService } = options;
    const className = namingService.getNameForEntity(entity);
    const classSummary = getLocalOrDefaultText(entity.Description) || null;

    const b = codeFileHeader(settings.namespace);
    b.depth = 1;
    b.spacer();
    b.spacer();

    b.summary(classSummary ?? undefined);
    b.attr("System.Runtime.Serialization.DataContractAttribute()");
    b.attrArgs("Microsoft.Xrm.Sdk.Client.EntityLogicalNameAttribute", `"${entity.LogicalName}"`);
    if (!settings.suppressGeneratedCodeAttribute) {
        b.attrArgs("System.CodeDom.Compiler.GeneratedCodeAttribute", `"${CODEGEN_TOOL_NAME}", "${CODEGEN_TOOL_VERSION}"`);
    }
    b.open(
        `${settings.generateTypesAsInternal ? "internal" : "public"} partial class ${className} : Microsoft.Xrm.Sdk.Entity${settings.generateINotifyPattern ? ", System.ComponentModel.INotifyPropertyChanging, System.ComponentModel.INotifyPropertyChanged" : ""}`,
    );
    b.spacer();

    const access = settings.generateTypesAsInternal ? "internal" : "public";

    if (settings.generateINotifyPattern) {
        b.line("public event System.ComponentModel.PropertyChangedEventHandler PropertyChanged;");
        b.spacer();
        b.line("public event System.ComponentModel.PropertyChangingEventHandler PropertyChanging;");
        b.spacer();
        if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
        b.open("private void OnPropertyChanged(string propertyName)");
        b.open("if ((this.PropertyChanged != null))");
        b.line("this.PropertyChanged(this, new System.ComponentModel.PropertyChangedEventArgs(propertyName));");
        b.close();
        b.close();
        b.spacer();
        if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
        b.open("private void OnPropertyChanging(string propertyName)");
        b.open("if ((this.PropertyChanging != null))");
        b.line("this.PropertyChanging(this, new System.ComponentModel.PropertyChangingEventArgs(propertyName));");
        b.close();
        b.close();
        b.spacer();
    }

    // Constructors
    b.doc("<summary>");
    b.doc("Default Constructor.");
    b.doc("</summary>");
    if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
    b.verbatim(`\t\t${access} ${className}() : `, "\t\t\t\tbase(EntityLogicalName)");
    b.open();
    b.close();
    b.spacer();

    if (settings.generateConstructorsSansLogicalName) {
        if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
        b.verbatim(`\t\t${access} ${className}(System.Guid id) : `, "\t\t\t\tbase(EntityLogicalName, id)");
        b.open();
        b.close();
        b.spacer();

        if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
        b.verbatim(`\t\t${access} ${className}(string keyName, object keyValue) : `, "\t\t\t\tbase(EntityLogicalName, keyName, keyValue)");
        b.open();
        b.close();
        b.spacer();

        if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
        b.verbatim(`\t\t${access} ${className}(Microsoft.Xrm.Sdk.KeyAttributeCollection keyAttributes) : `, "\t\t\t\tbase(EntityLogicalName, keyAttributes)");
        b.open();
        b.close();
        b.spacer();
    }

    if (settings.generateAnonymousTypeConstructor) {
        b.doc("<summary>");
        b.doc("Constructor for populating via LINQ queries given a LINQ anonymous type");
        b.doc('<param name="anonymousType">LINQ anonymous type.</param>');
        b.doc("</summary>");
        if (settings.addDebuggerNonUserCode) b.attr("System.Diagnostics.DebuggerNonUserCode()");
        b.verbatim(`\t\t${access} ${className}(object anonymousType) : `, "\t\t\t\tthis()");
        b.open();
        b.verbatim(
            [
                "            foreach (var p in anonymousType.GetType().GetProperties())",
                "            {",
                "                var value = p.GetValue(anonymousType, null);",
                "                var name = p.Name.ToLower();",
                "            ",
                '                if (value != null && name.EndsWith("enum") && value.GetType().BaseType == typeof(System.Enum))',
                "                {",
                "                    value = new Microsoft.Xrm.Sdk.OptionSetValue((int) value);",
                '                    name = name.Remove(name.Length - "enum".Length);',
                "                }",
                "            ",
                "                switch (name)",
                "                {",
                '                    case "id":',
                "                        base.Id = (System.Guid)value;",
                `                        Attributes["${entity.PrimaryIdAttribute}"] = base.Id;`,
                "                        break;",
                `                    case "${entity.PrimaryIdAttribute}":`,
                "                        var id = (System.Nullable<System.Guid>) value;",
                "                        if(id == null){ continue; }",
                "                        base.Id = id.Value;",
                "                        Attributes[name] = base.Id;",
                "                        break;",
                '                    case "formattedvalues":',
                "                        // Add Support for FormattedValues",
                "                        FormattedValues.AddRange((Microsoft.Xrm.Sdk.FormattedValueCollection)value);",
                "                        break;",
                "                    default:",
                "                        Attributes[name] = value;",
                "                        break;",
                "                }",
                "            }",
            ].join("\n"),
        );
        b.close();
        b.spacer();
    }

    // Constants
    if (entity.Keys && entity.Keys.length > 0) {
        const altKeyValue = entity.Keys.map((k) => [...k.KeyAttributes].sort((a, c) => a.toLowerCase().localeCompare(c.toLowerCase())).join(","))
            .sort((a, c) => a.toLowerCase().localeCompare(c.toLowerCase()))
            .join("|");
        b.line(`public const string AlternateKeys = "${altKeyValue}";`);
        b.spacer();
    }
    b.line(`public const string EntityLogicalName = "${entity.LogicalName}";`);
    b.spacer();
    if (entity.PrimaryIdAttribute) {
        b.line(`public const string PrimaryIdAttribute = "${entity.PrimaryIdAttribute}";`);
        b.spacer();
    }
    if (entity.PrimaryNameAttribute) {
        b.line(`public const string PrimaryNameAttribute = "${entity.PrimaryNameAttribute}";`);
        b.spacer();
    }
    b.line(`public const string EntitySchemaName = "${entity.SchemaName}";`);
    b.spacer();
    if (entity.LogicalCollectionName) {
        b.line(`public const string EntityLogicalCollectionName = "${entity.LogicalCollectionName}";`);
        b.spacer();
    }
    if (entity.EntitySetName) {
        b.line(`public const string EntitySetName = "${entity.EntitySetName}";`);
        b.spacer();
    }

    // Nested classes
    if (settings.generateAttributeNameConsts) {
        const fieldsBlock = generateFieldsClass(entity, namingService);
        if (fieldsBlock) {
            b.verbatim(fieldsBlock);
            b.spacer();
        }
    }

    if (settings.generateEntityRelationships) {
        const relBlock = generateRelationshipsClass(entity, namingService);
        if (relBlock) {
            b.verbatim(relBlock);
            b.spacer();
        }
    }

    // Properties
    const attrs = (entity.Attributes ?? []).filter((a) => options.filterService.shouldGenerateAttribute(entity, a));
    for (const attr of attrs) {
        const propBlock = generatePropertyBlock(entity, attr, allEntities, namingService, settings);
        if (propBlock) {
            b.verbatim(propBlock);
            b.spacer();
        }
    }

    // Relationship navigation properties
    if (settings.generateEntityRelationships) {
        const relProps = generateRelationshipProperties(entity, allEntities, namingService, settings);
        for (const rp of relProps) {
            b.verbatim(rp);
            b.spacer();
        }
    }

    b.trimEnd();
    b.depth = 2;
    b.close(); // closes class at \t}
    b.depth = 0;
    b.verbatim("}", "#pragma warning restore CS1591");

    return b.toStringWithNewline();
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

    const b = new CodeBuilder(2);
    b.open("public static partial class Fields");
    for (const [name, logical] of entries) {
        b.line(`public const string ${name} = "${logical}";`);
    }
    b.close();
    return b.toString();
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

    const b = new CodeBuilder(2);
    b.open("public static partial class Relationships");
    for (const [name, schema] of entries) {
        b.line(`public const string ${name} = "${schema}";`);
    }
    b.close();
    return b.toString();
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
    const csType = effectiveTypeInfo.nullable && settings.makeReferenceTypesNullable ? `${csTypeRaw}?` : csTypeRaw;
    return buildPlainTypeBlock(attr, logicalName, propName, csType, csTypeRaw, optionSetExcluded, summary, readonly_, settings);
}

function generateRelationshipProperties(entity: EntityMetadata, allEntities: Map<string, EntityMetadata>, namingService: NamingService, settings: EbgSettings): string[] {
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
        result.push(buildRelationshipPropertyBlock("1:N", rel.SchemaName, propName, targetEntityName, true, settings));
    }

    for (const rel of entity.ManyToOneRelationships ?? []) {
        const propName = rel.ReferencingEntityNavigationPropertyName ?? rel.SchemaName;
        const targetEntityName = resolveEntityNameOrRaw(rel.ReferencedEntity);
        const extraAttr = `[Microsoft.Xrm.Sdk.AttributeLogicalNameAttribute("${rel.SchemaName}")]`;
        result.push(buildRelationshipPropertyBlock("N:1", rel.SchemaName, propName, targetEntityName, false, settings, extraAttr));
    }

    for (const rel of entity.ManyToManyRelationships ?? []) {
        const otherEntityLogical = rel.Entity1LogicalName === entity.LogicalName ? rel.Entity2LogicalName : rel.Entity1LogicalName;
        const targetEntityName = resolveEntityNameOrBase(otherEntityLogical);
        const propName = rel.Entity1LogicalName === entity.LogicalName ? (rel.Entity1NavigationPropertyName ?? rel.SchemaName) : (rel.Entity2NavigationPropertyName ?? rel.SchemaName);
        result.push(buildRelationshipPropertyBlock("N:N", rel.SchemaName, propName, targetEntityName, true, settings));
    }

    return result;
}
