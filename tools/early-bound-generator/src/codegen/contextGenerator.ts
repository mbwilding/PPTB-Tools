import type { EbgSettings } from "../models/interfaces";
import type { EntityMetadata } from "./types";
import { CODEGEN_TOOL_NAME, CODEGEN_TOOL_VERSION } from "./types";
import { NamingService } from "./naming";
import { codeFileHeader } from "../utils/codeBuilder";
import { CodeBuilder } from "../utils/codeBuilder";

const OPTION_SET_METADATA_ATTRIBUTE_LINES: string[] = [
    "\t",
    "\t/// <summary>",
    "\t/// Attribute to handle storing the OptionSet's Metadata.",
    "\t/// </summary>",
    "\t[System.AttributeUsageAttribute(System.AttributeTargets.Field)]",
    "\tpublic sealed class OptionSetMetadataAttribute : System.Attribute",
    "\t{",
    "\t\t",
    "\t\tprivate object[] _nameObjects;",
    "\t\t",
    "\t\tprivate System.Collections.Generic.Dictionary<int, string> _names;",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// Color of the OptionSetValue.",
    "\t\t/// </summary>",
    "\t\tpublic string Color { get; set; }",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// Description of the OptionSetValue.",
    "\t\t/// </summary>",
    "\t\tpublic string Description { get; set; }",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// Display order index of the OptionSetValue.",
    "\t\t/// </summary>",
    "\t\tpublic int DisplayIndex { get; set; }",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// External value of the OptionSetValue.",
    "\t\t/// </summary>",
    "\t\tpublic string ExternalValue { get; set; }",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// Name of the OptionSetValue.",
    "\t\t/// </summary>",
    "\t\tpublic string Name { get; set; }",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// Names of the OptionSetValue.",
    "\t\t/// </summary>",
    "\t\tpublic System.Collections.Generic.Dictionary<int, string> Names",
    "\t\t{",
    "\t\t\tget",
    "\t\t\t{",
    "\t\t\t\treturn _names ?? (_names = CreateNames());",
    "\t\t\t} ",
    "\t\t\tset",
    "\t\t\t{",
    "\t\t\t\t_names = value;",
    "\t\t\t\tif (value == null)",
    "\t\t\t\t{",
    "\t\t\t\t    _nameObjects = new object[0];",
    "\t\t\t\t}",
    "\t\t\t\telse",
    "\t\t\t\t{",
    "\t\t\t\t    _nameObjects = null;",
    "\t\t\t\t}",
    "\t\t\t}",
    "\t\t}",
    "\t\t",
    "\t\t/// <summary>",
    '\t\t/// Initializes a new instance of the <see cref="OptionSetMetadataAttribute"/> class.',
    "\t\t/// </summary>",
    '\t\t/// <param name="name">Name of the value.</param>',
    '\t\t/// <param name="displayIndex">Display order index of the value.</param>',
    '\t\t/// <param name="color">Color of the value.</param>',
    '\t\t/// <param name="description">Description of the value.</param>',
    '\t\t/// <param name="externalValue">External value of the value.</param>',
    '\t\t/// <param name="names">Names of the value.</param>',
    "\t\tpublic OptionSetMetadataAttribute(string name, int displayIndex, string color = null, string description = null, string externalValue = null, params object[] names)",
    "\t\t{",
    "\t\t\tthis.Color = color;",
    "\t\t\tthis.Description = description;",
    "\t\t\tthis._nameObjects = names;",
    "\t\t\tthis.ExternalValue = externalValue;",
    "\t\t\tthis.DisplayIndex = displayIndex;",
    "\t\t\tthis.Name = name;",
    "\t\t}",
    "\t\t",
    "\t\tprivate System.Collections.Generic.Dictionary<int, string> CreateNames()",
    "\t\t{",
    "\t\t\tSystem.Collections.Generic.Dictionary<int, string> names = new System.Collections.Generic.Dictionary<int, string>();",
    "\t\t\tfor (int i = 0; (i < _nameObjects.Length); i = (i + 2))",
    "\t\t\t{",
    "\t\t\t\tnames.Add(((int)(_nameObjects[i])), ((string)(_nameObjects[(i + 1)])));",
    "\t\t\t}",
    "\t\t\treturn names;",
    "\t\t}",
    "\t}",
];

const OPTION_SET_EXTENSION_LINES: string[] = [
    "\t",
    "\t/// <summary>",
    "\t/// Extension class to handle retrieving of OptionSetMetadataAttribute.",
    "\t/// </summary>",
    "\tpublic static class OptionSetExtension",
    "\t{",
    "\t\t",
    "\t\t/// <summary>",
    "\t\t/// Returns the OptionSetMetadataAttribute for the given enum value",
    "\t\t/// </summary>",
    '\t\t/// <typeparam name="T">OptionSet Enum Type</typeparam>',
    '\t\t/// <param name="value">Enum Value with OptionSetMetadataAttribute</param>',
    "\t\tpublic static OptionSetMetadataAttribute GetMetadata<T>(this T value)",
    "\t\t\twhere T :  struct, System.IConvertible",
    "\t\t{",
    "\t\t\tSystem.Type enumType = typeof(T);",
    "\t\t\tif (!enumType.IsEnum)",
    "\t\t\t{",
    '\t\t\t\tthrow new System.ArgumentException("T must be an enum!");',
    "\t\t\t}",
    "\t\t\tSystem.Reflection.MemberInfo[] members = enumType.GetMember(value.ToString());",
    "\t\t\tfor (int i = 0; (i < members.Length); i++",
    "\t\t\t)",
    "\t\t\t{",
    "\t\t\t\tSystem.Attribute attribute = System.Reflection.CustomAttributeExtensions.GetCustomAttribute(members[i], typeof(OptionSetMetadataAttribute));",
    "\t\t\t\tif (attribute != null)",
    "\t\t\t\t{",
    "\t\t\t\t\treturn ((OptionSetMetadataAttribute)(attribute));",
    "\t\t\t\t}",
    "\t\t\t}",
    '\t\t\tthrow new System.ArgumentException("T must be an enum adorned with an OptionSetMetadataAttribute!");',
    "\t\t}",
    "\t}",
];

export function generateContextFile(entities: EntityMetadata[], namingService: NamingService, settings: EbgSettings): string {
    const ns = settings.namespace;
    const contextName = settings.serviceContextName;

    // Build the file header without the namespace block (we need to insert the assembly attribute first).
    // codeFileHeader emits: ...header lines..., "", `namespace X`, `{`
    // We keep everything up to and including the blank line, then insert the assembly attribute.
    const header = codeFileHeader(ns);
    const headerLines = header.toLines();
    // Last 3 lines are: "", `namespace X`, `{` -- keep the blank line, drop namespace+brace
    const preamble = headerLines.slice(0, -2);

    const b = new CodeBuilder();
    b.verbatim(...preamble);
    b.verbatim("[assembly: Microsoft.Xrm.Sdk.Client.ProxyTypesAssemblyAttribute()]");
    b.verbatim("");
    b.verbatim(`namespace ${ns}`, "{");
    b.depth = 1;

    b.spacer();
    b.spacer();
    b.summary("Represents a source of entities bound to a Dataverse service. It tracks and manages changes made to the retrieved entities.");
    b.attrArgs("System.CodeDom.Compiler.GeneratedCodeAttribute", `"${CODEGEN_TOOL_NAME}", "${CODEGEN_TOOL_VERSION}"`);
    b.open(`public partial class ${contextName} : Microsoft.Xrm.Sdk.Client.OrganizationServiceContext`);
    b.spacer();

    b.summary("Constructor.");
    b.verbatim(`\t\tpublic ${contextName}(Microsoft.Xrm.Sdk.IOrganizationService service) : `, "\t\t\t\tbase(service)");
    b.open();
    b.close();

    for (const entity of entities) {
        const className = namingService.getNameForEntity(entity);
        const propName = `${className}Set`;
        const qualifiedName = `${ns}.${className}`;

        b.spacer();
        b.summaryRaw(`Gets a binding to the set of all <see cref="${qualifiedName}"/> entities.`);
        b.open(`public System.Linq.IQueryable<${qualifiedName}> ${propName}`);
        b.getter(() => {
            b.line(`return this.CreateQuery<${qualifiedName}>();`);
        }, false);
        b.close();
    }

    b.close();

    b.depth = 0;
    b.verbatim(...OPTION_SET_METADATA_ATTRIBUTE_LINES);
    b.verbatim(...OPTION_SET_EXTENSION_LINES);
    b.verbatim("}", "#pragma warning restore CS1591");

    return b.toStringWithNewline();
}
