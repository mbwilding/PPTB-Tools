import type { EbgSettings } from "../models/interfaces";
import type { SdkMessagePair } from "./types";
import { CODEGEN_TOOL_NAME } from "./types";
import { T, T2, T3, T4, codeFileHeader, extractNamespaceBody } from "./helpers";
import type { NamingService } from "./naming";

const DATA_CONTRACT_NS = `Namespace="http://schemas.microsoft.com/xrm/2011/new/"`;

const CLR_TYPE_ALIASES: Record<string, string> = {
    "System.String": "string",
    "System.Boolean": "bool",
    "System.Int32": "int",
    "System.Int64": "long",
    "System.Double": "double",
    "System.Decimal": "decimal",
    "System.Single": "float",
    "System.Guid": "System.Guid",
    "System.DateTime": "System.DateTime",
    "System.Object": "object",
};

function parseClrType(raw: string | undefined): string {
    if (!raw) return "object";
    // Assembly-qualified names look like "System.String, mscorlib, Version=..."
    // Strip everything after the first comma to get just the type name.
    const typeName = raw.split(",")[0].trim();
    return CLR_TYPE_ALIASES[typeName] ?? typeName;
}

export function generateMessageFile(messagePair: SdkMessagePair, settings: EbgSettings, appVersion: string, naming: NamingService): string {
    const logicalName = messagePair.Request.Name;
    const className = naming.camelCase(logicalName);
    const sortedRequestFields = [...messagePair.Request.Fields].sort((a, b) => naming.camelCase(a.Name).localeCompare(naming.camelCase(b.Name)));
    const requestName = className + "Request";
    const responseName = className + "Response";
    const lines = codeFileHeader(settings.namespace);

    // Request class
    lines.push(`${T}`);
    lines.push(`${T}`);
    lines.push(`${T}[System.Runtime.Serialization.DataContractAttribute(${DATA_CONTRACT_NS})]`);
    lines.push(`${T}[Microsoft.Xrm.Sdk.Client.RequestProxyAttribute("${logicalName}")]`);
    if (!settings.suppressGeneratedCodeAttribute) {
        lines.push(`${T}[System.CodeDom.Compiler.GeneratedCodeAttribute("${CODEGEN_TOOL_NAME}", "${appVersion}")]`);
    }
    lines.push(`${T}public partial class ${requestName} : Microsoft.Xrm.Sdk.OrganizationRequest`);
    lines.push(`${T}{`);
    lines.push(`${T2}`);

    if (settings.generateMessageAttributeNameConsts) {
        lines.push(`${T2}public static class Fields`);
        lines.push(`${T2}{`);
        for (const field of sortedRequestFields) {
            const constName = naming.camelCase(field.Name);
            lines.push(`${T3}public const string ${constName} = "${field.Name}";`);
        }
        lines.push(`${T2}}`);
        lines.push(`${T2}`);
    }

    lines.push(`${T2}public const string ActionLogicalName = "${logicalName}";`);
    lines.push(`${T2}`);

    for (const field of sortedRequestFields) {
        const csType = parseClrType(field.ClrFormatter);
        const propName = naming.camelCase(field.Name);
        lines.push(`${T2}public ${csType}? ${propName}`);
        lines.push(`${T2}{`);
        lines.push(`${T3}get`);
        lines.push(`${T3}{`);
        lines.push(`${T4}if (this.Parameters.Contains("${field.Name}"))`);
        lines.push(`${T4}{`);
        lines.push(`${T4}${T}return ((${csType})(this.Parameters["${field.Name}"]));`);
        lines.push(`${T4}}`);
        lines.push(`${T4}else`);
        lines.push(`${T4}{`);
        lines.push(`${T4}${T}return default(${csType});`);
        lines.push(`${T4}}`);
        lines.push(`${T3}}`);
        lines.push(`${T3}set`);
        lines.push(`${T3}{`);
        lines.push(`${T4}this.Parameters["${field.Name}"] = value;`);
        lines.push(`${T3}}`);
        lines.push(`${T2}}`);
        lines.push(`${T2}`);
    }

    lines.push(`${T2}public ${requestName}()`);
    lines.push(`${T2}{`);
    lines.push(`${T3}this.RequestName = "${logicalName}";`);
    for (const field of sortedRequestFields) {
        if (!field.IsOptional) {
            const csType = parseClrType(field.ClrFormatter);
            const propName = naming.camelCase(field.Name);
            lines.push(`${T3}this.${propName} = default(${csType});`);
        }
    }
    lines.push(`${T2}}`);

    lines.push(`${T}}`);

    // Response class
    lines.push(`${T}`);
    lines.push(`${T}[System.Runtime.Serialization.DataContractAttribute(${DATA_CONTRACT_NS})]`);
    lines.push(`${T}[Microsoft.Xrm.Sdk.Client.ResponseProxyAttribute("${logicalName}")]`);
    if (!settings.suppressGeneratedCodeAttribute) {
        lines.push(`${T}[System.CodeDom.Compiler.GeneratedCodeAttribute("${CODEGEN_TOOL_NAME}", "${appVersion}")]`);
    }
    lines.push(`${T}public partial class ${responseName} : Microsoft.Xrm.Sdk.OrganizationResponse`);
    lines.push(`${T}{`);
    lines.push(`${T2}`);
    lines.push(`${T2}public const string ActionLogicalName = "${logicalName}";`);
    lines.push(`${T2}`);
    lines.push(`${T2}public ${responseName}()`);
    lines.push(`${T2}{`);
    lines.push(`${T2}}`);

    lines.push(`${T}}`);
    lines.push("}");
    lines.push("#pragma warning restore CS1591");
    lines.push("");

    return lines.join("\n");
}

export function generateMessagesFile(messagePairs: SdkMessagePair[], settings: EbgSettings, appVersion: string, naming: NamingService): string {
    const lines = codeFileHeader(settings.namespace);

    for (const pair of messagePairs) {
        const content = generateMessageFile(pair, settings, appVersion, naming);

        const inner = extractNamespaceBody(content, settings.namespace);
        if (inner) lines.push(inner);
    }

    lines.push("}");
    lines.push("#pragma warning restore CS1591");
    return lines.join("\n");
}
