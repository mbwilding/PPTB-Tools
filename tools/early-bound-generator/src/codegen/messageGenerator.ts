import type { EbgSettings } from "../models/interfaces";
import type { SdkMessagePair } from "./types";
import { CODEGEN_TOOL_NAME, CODEGEN_TOOL_VERSION } from "./types";
import { codeFileHeader, extractNamespaceBody } from "../utils/codeBuilder";
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

export function generateMessageFile(messagePair: SdkMessagePair, settings: EbgSettings, naming: NamingService): string {
    const logicalName = messagePair.Request.Name;
    const className = naming.camelCase(logicalName);
    const sortedRequestFields = [...messagePair.Request.Fields].sort((a, b) => naming.camelCase(a.Name).localeCompare(naming.camelCase(b.Name)));
    const requestName = className + "Request";
    const responseName = className + "Response";

    const b = codeFileHeader(settings.namespace);
    const access = settings.generateTypesAsInternal ? "internal" : "public";

    b.spacer();
    b.spacer();
    b.attrArgs("System.Runtime.Serialization.DataContractAttribute", DATA_CONTRACT_NS);
    b.attrArgs("Microsoft.Xrm.Sdk.Client.RequestProxyAttribute", `"${logicalName}"`);
    if (!settings.suppressGeneratedCodeAttribute) {
        b.attrArgs("System.CodeDom.Compiler.GeneratedCodeAttribute", `"${CODEGEN_TOOL_NAME}", "${CODEGEN_TOOL_VERSION}"`);
    }
    b.open(`${access} partial class ${requestName} : Microsoft.Xrm.Sdk.OrganizationRequest`);
    b.spacer();

    if (settings.generateMessageAttributeNameConsts) {
        b.open(`${access} static class Fields`);
        for (const field of sortedRequestFields) {
            const constName = naming.camelCase(field.Name);
            b.line(`public const string ${constName} = "${field.Name}";`);
        }
        b.close();
        b.spacer();
    }

    b.line(`public const string ActionLogicalName = "${logicalName}";`);
    b.spacer();

    for (const field of sortedRequestFields) {
        const csType = parseClrType(field.ClrFormatter);
        const propName = naming.camelCase(field.Name);
        b.open(`public ${csType}? ${propName}`);
        b.getter(() => {
            b.open(`if (this.Parameters.Contains("${field.Name}"))`);
            b.line(`return ((${csType})(this.Parameters["${field.Name}"]));`);
            b.close();
            b.open("else");
            b.line(`return default(${csType});`);
            b.close();
        }, false);
        b.setter(() => {
            b.line(`this.Parameters["${field.Name}"] = value;`);
        }, false);
        b.close();
        b.spacer();
    }

    b.open(`public ${requestName}()`);
    b.line(`this.RequestName = "${logicalName}";`);
    for (const field of sortedRequestFields) {
        if (!field.IsOptional) {
            const csType = parseClrType(field.ClrFormatter);
            const propName = naming.camelCase(field.Name);
            b.line(`this.${propName} = default(${csType});`);
        }
    }
    b.close();

    b.close();

    b.spacer();
    b.attrArgs("System.Runtime.Serialization.DataContractAttribute", DATA_CONTRACT_NS);
    b.attrArgs("Microsoft.Xrm.Sdk.Client.ResponseProxyAttribute", `"${logicalName}"`);
    if (!settings.suppressGeneratedCodeAttribute) {
        b.attrArgs("System.CodeDom.Compiler.GeneratedCodeAttribute", `"${CODEGEN_TOOL_NAME}", "${CODEGEN_TOOL_VERSION}"`);
    }
    b.open(`${access} partial class ${responseName} : Microsoft.Xrm.Sdk.OrganizationResponse`);
    b.spacer();
    b.line(`public const string ActionLogicalName = "${logicalName}";`);
    b.spacer();
    b.open(`public ${responseName}()`);
    b.close();
    b.close();

    b.verbatim("}", "#pragma warning restore CS1591", "");

    return b.toString();
}

export function generateMessagesFile(messagePairs: SdkMessagePair[], settings: EbgSettings, naming: NamingService): string {
    const b = codeFileHeader(settings.namespace);

    for (const pair of messagePairs) {
        const content = generateMessageFile(pair, settings, naming);
        const inner = extractNamespaceBody(content, settings.namespace);
        if (inner) b.verbatim(inner);
    }

    b.verbatim("}", "#pragma warning restore CS1591");
    return b.toString();
}
