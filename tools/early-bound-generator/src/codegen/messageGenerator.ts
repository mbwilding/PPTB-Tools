import type { EbgSettings } from "../models/interfaces";
import type { SdkMessagePair } from "./types";
import { CODEGEN_TOOL_NAME } from "./types";
import { codeFileHeader, extractNamespaceBody } from "./helpers";
import type { NamingService } from "./naming";

const DATA_CONTRACT_NS = 'Namespace="http://schemas.microsoft.com/xrm/2011/new/"';

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

    lines.push("\t");
    lines.push("\t");
    lines.push(`\t[System.Runtime.Serialization.DataContractAttribute(${DATA_CONTRACT_NS})]`);
    lines.push(`\t[Microsoft.Xrm.Sdk.Client.RequestProxyAttribute("${logicalName}")]`);
    if (!settings.suppressGeneratedCodeAttribute) {
        lines.push(`\t[System.CodeDom.Compiler.GeneratedCodeAttribute("${CODEGEN_TOOL_NAME}", "${appVersion}")]`);
    }
    lines.push(`\tpublic partial class ${requestName} : Microsoft.Xrm.Sdk.OrganizationRequest`);
    lines.push("\t{");
    lines.push("\t\t");

    if (settings.generateMessageAttributeNameConsts) {
        lines.push("\t\tpublic static class Fields");
        lines.push("\t\t{");
        for (const field of sortedRequestFields) {
            const constName = naming.camelCase(field.Name);
            lines.push(`\t\t\tpublic const string ${constName} = "${field.Name}";`);
        }
        lines.push("\t\t}");
        lines.push("\t\t");
    }

    lines.push(`\t\tpublic const string ActionLogicalName = "${logicalName}";`);
    lines.push("\t\t");

    for (const field of sortedRequestFields) {
        const csType = parseClrType(field.ClrFormatter);
        const propName = naming.camelCase(field.Name);
        lines.push(`\t\tpublic ${csType}? ${propName}`);
        lines.push("\t\t{");
        lines.push("\t\t\tget");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tif (this.Parameters.Contains("${field.Name}"))`);
        lines.push("\t\t\t\t{");
        lines.push(`\t\t\t\t\treturn ((${csType})(this.Parameters["${field.Name}"]));`);
        lines.push("\t\t\t\t}");
        lines.push("\t\t\t\telse");
        lines.push("\t\t\t\t{");
        lines.push(`\t\t\t\t\treturn default(${csType});`);
        lines.push("\t\t\t\t}");
        lines.push("\t\t\t}");
        lines.push("\t\t\tset");
        lines.push("\t\t\t{");
        lines.push(`\t\t\t\tthis.Parameters["${field.Name}"] = value;`);
        lines.push("\t\t\t}");
        lines.push("\t\t}");
        lines.push("\t\t");
    }

    lines.push(`\t\tpublic ${requestName}()`);
    lines.push("\t\t{");
    lines.push(`\t\t\tthis.RequestName = "${logicalName}";`);
    for (const field of sortedRequestFields) {
        if (!field.IsOptional) {
            const csType = parseClrType(field.ClrFormatter);
            const propName = naming.camelCase(field.Name);
            lines.push(`\t\t\tthis.${propName} = default(${csType});`);
        }
    }
    lines.push("\t\t}");

    lines.push("\t}");

    lines.push("\t");
    lines.push(`\t[System.Runtime.Serialization.DataContractAttribute(${DATA_CONTRACT_NS})]`);
    lines.push(`\t[Microsoft.Xrm.Sdk.Client.ResponseProxyAttribute("${logicalName}")]`);
    if (!settings.suppressGeneratedCodeAttribute) {
        lines.push(`\t[System.CodeDom.Compiler.GeneratedCodeAttribute("${CODEGEN_TOOL_NAME}", "${appVersion}")]`);
    }
    lines.push(`\tpublic partial class ${responseName} : Microsoft.Xrm.Sdk.OrganizationResponse`);
    lines.push("\t{");
    lines.push("\t\t");
    lines.push(`\t\tpublic const string ActionLogicalName = "${logicalName}";`);
    lines.push("\t\t");
    lines.push(`\t\tpublic ${responseName}()`);
    lines.push("\t\t{");
    lines.push("\t\t}");

    lines.push("\t}");
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
