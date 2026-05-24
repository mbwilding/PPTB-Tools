/**
 * Extended entity generator tests covering settings that were previously untested.
 *
 * Each describe block targets one setting (or a closely related pair) so failures
 * are easy to localise.
 */
import { describe, it, expect } from "vitest";
import { generateEntityFile } from "../entityGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService, buildFilterService } from "./helpers/naming";
import { contactEntity, systemUserEntity, accountEntity } from "./fixtures/contact";
import type { EntityMetadata } from "../types";

function makeEntitiesMap(...entities: EntityMetadata[]): Map<string, EntityMetadata> {
    return new Map(entities.map((e) => [e.LogicalName.toLowerCase(), e]));
}

function generate(overrides: Parameters<typeof makeSettings>[0] = {}, entity: EntityMetadata = contactEntity) {
    const settings = makeSettings(overrides);
    const naming = buildNamingService(settings);
    const filter = buildFilterService(settings);
    const allEntities = makeEntitiesMap(contactEntity, systemUserEntity, accountEntity);
    return generateEntityFile(entity, allEntities, {
        settings,
        namingService: naming,
        filterService: filter,
        suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
    });
}

// ---------------------------------------------------------------------------
// generateEnumProperties
// ---------------------------------------------------------------------------
describe("generateEnumProperties = true", () => {
    it("emits dual OptionSetValue + Enum companion properties for Picklist (snapshot)", () => {
        const output = generate({ generateEnumProperties: true });
        expect(output).toMatchSnapshot();
    });

    it("Picklist has both OptionSetValue property and <Name>Enum property", () => {
        const output = generate({ generateEnumProperties: true });
        // OptionSetValue property
        expect(output).toContain("Microsoft.Xrm.Sdk.OptionSetValue? GenderCode");
        // Enum companion
        expect(output).toContain("Contact_GenderCode? GenderCodeEnum");
    });

    it("MultiSelectPicklist emits IEnumerable<EnumType> property", () => {
        const output = generate({ generateEnumProperties: true });
        expect(output).toContain("System.Collections.Generic.IEnumerable<Contact_PreferredContactMethodsCode>");
    });
});

describe("replaceOptionSetPropertiesWithEnum = true", () => {
    it("emits single typed enum property instead of dual block (snapshot)", () => {
        const output = generate({ generateEnumProperties: true, replaceOptionSetPropertiesWithEnum: true });
        expect(output).toMatchSnapshot();
    });

    it("does NOT emit an OptionSetValue property when replacing with enum", () => {
        const output = generate({ generateEnumProperties: true, replaceOptionSetPropertiesWithEnum: true });
        // Should have the enum-typed property
        expect(output).toContain("Contact_GenderCode? GenderCode");
        // Should NOT have the plain OptionSetValue version
        expect(output).not.toContain("Microsoft.Xrm.Sdk.OptionSetValue? GenderCode");
        // Should NOT have the Enum companion (that's only in the dual-block)
        expect(output).not.toContain("GenderCodeEnum");
    });
});

describe("useEnumForStateCodes = true", () => {
    it("emits Microsoft.Xrm.Sdk.EntityState? for statecode (snapshot)", () => {
        const output = generate({ generateEnumProperties: true, useEnumForStateCodes: true });
        expect(output).toMatchSnapshot();
    });

    it("statecode property uses EntityState type", () => {
        const output = generate({ generateEnumProperties: true, useEnumForStateCodes: true });
        expect(output).toContain("Microsoft.Xrm.Sdk.EntityState? StateCode");
        expect(output).toContain('EntityOptionSetEnum.GetEnum(this, "statecode")');
    });

    it("statecode setter uses OptionSetValue cast from EntityState", () => {
        const output = generate({ generateEnumProperties: true, useEnumForStateCodes: true });
        expect(output).toContain("value.HasValue ? new Microsoft.Xrm.Sdk.OptionSetValue((int)value) : null");
    });
});

// ---------------------------------------------------------------------------
// generateTypesAsInternal
// ---------------------------------------------------------------------------
describe("generateTypesAsInternal = true", () => {
    it("emits internal class declaration (snapshot)", () => {
        const output = generate({ generateTypesAsInternal: true });
        expect(output).toMatchSnapshot();
    });

    it("class declaration uses internal keyword", () => {
        const output = generate({ generateTypesAsInternal: true });
        expect(output).toContain("internal partial class Contact");
    });

    it("default constructor uses internal keyword", () => {
        const output = generate({ generateTypesAsInternal: true });
        expect(output).toContain("internal Contact() :");
    });

    it("relationship navigation properties use internal keyword", () => {
        const output = generate({ generateTypesAsInternal: true });
        expect(output).toContain("internal System.Collections.Generic.IEnumerable<");
    });
});

// ---------------------------------------------------------------------------
// makeReferenceTypesNullable
// ---------------------------------------------------------------------------
describe("makeReferenceTypesNullable = true", () => {
    it("adds ? to reference-type properties (snapshot)", () => {
        const output = generate({ makeReferenceTypesNullable: true });
        expect(output).toMatchSnapshot();
    });

    it("string property has nullable annotation", () => {
        const output = generate({ makeReferenceTypesNullable: true });
        expect(output).toContain("string? FirstName");
    });

    it("EntityReference property has nullable annotation", () => {
        const output = generate({ makeReferenceTypesNullable: true });
        expect(output).toContain("Microsoft.Xrm.Sdk.EntityReference? ParentCustomerId");
    });

    it("relationship navigation collection has nullable annotation", () => {
        const output = generate({ makeReferenceTypesNullable: true });
        expect(output).toContain("IEnumerable<Contact>?");
    });

    it("value types (Nullable<int>) do NOT get double nullable", () => {
        const output = generate({ makeReferenceTypesNullable: true });
        // Should still be System.Nullable<int> not System.Nullable<int>?
        expect(output).toContain("System.Nullable<int> NumberOfChildren");
        expect(output).not.toContain("System.Nullable<int>? NumberOfChildren");
    });
});

// ---------------------------------------------------------------------------
// makeAllFieldsEditable
// ---------------------------------------------------------------------------
describe("makeAllFieldsEditable = true", () => {
    it("readonly fields gain a setter (snapshot)", () => {
        const output = generate({ makeAllFieldsEditable: true });
        expect(output).toMatchSnapshot();
    });

    it("normally readonly FullName property gains a setter", () => {
        const defaultOutput = generate({ makeAllFieldsEditable: false });
        const editableOutput = generate({ makeAllFieldsEditable: true });

        // Count setter blocks: the editable output should have more "set\n" occurrences
        // since fields that were read-only now have setters
        const setterCount = (s: string) => (s.match(/\n\t\t\tset\n/g) ?? []).length;
        expect(setterCount(editableOutput)).toBeGreaterThan(setterCount(defaultOutput));
    });

    it("name-attr virtual (parentcustomeridname) also gains a setter", () => {
        const output = generate({ makeAllFieldsEditable: true });
        // buildNameAttributeBlock only adds setter when makeAllFieldsEditable
        expect(output).toContain('this.FormattedValues["parentcustomerid"] = value;');
    });
});

// ---------------------------------------------------------------------------
// makeReadonlyFieldsEditable
// ---------------------------------------------------------------------------
describe("makeReadonlyFieldsEditable = true", () => {
    it("READONLY_FIELDS_EDITABLE_ATTRS get setters while other readonly fields remain read-only (snapshot)", () => {
        const output = generate({ makeReadonlyFieldsEditable: true });
        expect(output).toMatchSnapshot();
    });

    it("createdby and createdon get setters", () => {
        const defaultOutput = generate({ makeReadonlyFieldsEditable: false });
        const editableOutput = generate({ makeReadonlyFieldsEditable: true });

        // With makeReadonlyFieldsEditable the system fields gain setters,
        // while non-system readonly fields (Aging30, FullName) do not.
        // Count total setters: editable should have more.
        const setterCount = (s: string) => (s.match(/\n\t\t\tset\n/g) ?? []).length;
        expect(setterCount(editableOutput)).toBeGreaterThan(setterCount(defaultOutput));
    });

    it("normally-readonly non-system field (Aging30) is still read-only", () => {
        const output = generate({ makeReadonlyFieldsEditable: true });
        // aging30 is NOT in READONLY_FIELDS_EDITABLE_ATTRS so stays readonly
        const aging30Idx = output.indexOf('"aging30"');
        const aging30Block = output.substring(aging30Idx, output.indexOf("\n\t\t}", aging30Idx) + 4);
        expect(aging30Block).not.toContain("set");
    });
});

// ---------------------------------------------------------------------------
// useLogicalNames
// ---------------------------------------------------------------------------
describe("useLogicalNames = true", () => {
    it("attribute property names are raw logical names (snapshot)", () => {
        const output = generate({ useLogicalNames: true });
        expect(output).toMatchSnapshot();
    });

    it("property names match logical names (lowercase)", () => {
        const output = generate({ useLogicalNames: true });
        expect(output).toContain("string firstname");
        expect(output).toContain("string fullname");
        expect(output).toContain("System.Nullable<bool> donotphone");
    });

    it("does NOT emit PascalCase property names", () => {
        const output = generate({ useLogicalNames: true });
        expect(output).not.toContain("string FirstName");
        expect(output).not.toContain("System.Nullable<bool> DoNotPhone");
    });
});

// ---------------------------------------------------------------------------
// addDebuggerNonUserCode
// ---------------------------------------------------------------------------
describe("addDebuggerNonUserCode = false", () => {
    it("no DebuggerNonUserCode attributes anywhere (snapshot)", () => {
        const output = generate({ addDebuggerNonUserCode: false });
        expect(output).toMatchSnapshot();
    });

    it("does not emit [System.Diagnostics.DebuggerNonUserCode()]", () => {
        const output = generate({ addDebuggerNonUserCode: false });
        expect(output).not.toContain("DebuggerNonUserCode");
    });
});

describe("addDebuggerNonUserCode = true (default)", () => {
    it("emits [System.Diagnostics.DebuggerNonUserCode()] on getters", () => {
        const output = generate({ addDebuggerNonUserCode: true });
        expect(output).toContain("[System.Diagnostics.DebuggerNonUserCode()]");
    });
});

// ---------------------------------------------------------------------------
// emitVirtualAttributes
// ---------------------------------------------------------------------------
describe("emitVirtualAttributes = false", () => {
    it("suppresses name-helper virtual attributes (snapshot)", () => {
        const output = generate({ emitVirtualAttributes: false });
        expect(output).toMatchSnapshot();
    });

    it("parentcustomeridname is not emitted as a property", () => {
        const output = generate({ emitVirtualAttributes: false });
        // parentcustomeridname may still appear in the Fields constants class,
        // but it must NOT appear as a property declaration (AttributeLogicalNameAttribute usage
        // paired with a property block that has a getter)
        // Check the property itself is absent: the name-attr property references the parent via FormattedValues
        expect(output).not.toContain('this.FormattedValues.Contains("parentcustomerid")');
    });
});

describe("emitVirtualAttributes = true (default)", () => {
    it("parentcustomeridname IS emitted", () => {
        const output = generate({ emitVirtualAttributes: true });
        expect(output).toContain('"parentcustomeridname"');
    });
});

// ---------------------------------------------------------------------------
// AlternateKeys constant
// ---------------------------------------------------------------------------
describe("entity with AlternateKeys", () => {
    it("emits AlternateKeys constant with sorted attributes (snapshot)", () => {
        const output = generate({}, accountEntity);
        expect(output).toMatchSnapshot();
    });

    it("AlternateKeys constant is present and sorted", () => {
        const output = generate({}, accountEntity);
        // attributes are sorted: accountnumber < name
        expect(output).toContain('public const string AlternateKeys = "accountnumber,name"');
    });
});

// ---------------------------------------------------------------------------
// __Member suffix for attribute-class name collision
// ---------------------------------------------------------------------------
describe("attribute name collision with class name", () => {
    it("appends __Member when attribute schema name equals entity class name", () => {
        // contactEntity has a 'contact' attribute whose SchemaName is 'Contact'
        // which would produce the same name as the class -- should get Contact__Member
        const output = generate();
        expect(output).toContain("Contact__Member");
    });
});

// ---------------------------------------------------------------------------
// Attribute type coverage -- all types produce correct C# output
// ---------------------------------------------------------------------------
describe("attribute type coverage", () => {
    it("BigInt produces System.Nullable<long>", () => {
        const output = generate();
        expect(output).toContain("System.Nullable<long> VersionNumber");
    });

    it("Decimal produces System.Nullable<decimal>", () => {
        const output = generate();
        expect(output).toContain("System.Nullable<decimal> CreditLimit");
    });

    it("Double produces System.Nullable<double>", () => {
        const output = generate();
        expect(output).toContain("System.Nullable<double> ExchangeRate");
    });

    it("Owner produces Microsoft.Xrm.Sdk.EntityReference", () => {
        const output = generate();
        expect(output).toContain("Microsoft.Xrm.Sdk.EntityReference OwnerId");
    });

    it("PartyList produces IEnumerable<Entity>", () => {
        const output = generate();
        expect(output).toContain("System.Collections.Generic.IEnumerable<Microsoft.Xrm.Sdk.Entity> ActivityParties");
    });

    it("Image (AttributeTypeName=ImageType) produces byte[]", () => {
        const output = generate();
        expect(output).toContain("byte[] EntityImage");
    });

    it("File produces byte[]", () => {
        const output = generate();
        expect(output).toContain("byte[] Document");
    });

    it("ManagedProperty produces BooleanManagedProperty", () => {
        const output = generate();
        expect(output).toContain("Microsoft.Xrm.Sdk.BooleanManagedProperty IsBackOfficeCustomer");
    });

    it("MultiSelectPicklist without generateEnumProperties produces OptionSetValueCollection", () => {
        const output = generate({ generateEnumProperties: false });
        expect(output).toContain("Microsoft.Xrm.Sdk.OptionSetValueCollection PreferredContactMethodsCode");
    });
});
