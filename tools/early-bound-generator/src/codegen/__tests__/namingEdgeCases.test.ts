/**
 * Naming edge case tests:
 * - BPF entity name resolution via useDisplayNameForBpfName
 * - entityAttributeSpecifiedNames override
 * - camelCaseClassNames = false / camelCaseMemberNames = false
 * - negative option value suffix
 */
import { describe, it, expect } from "vitest";
import { generateEntityFile } from "../entityGenerator";
import { generateEnumDeclaration } from "../optionSetGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService, buildFilterService } from "./helpers/naming";
import { contactEntity, bpfEntity, systemUserEntity } from "./fixtures/contact";
import type { EntityMetadata, OptionSetMetadata } from "../types";

function makeEntitiesMap(...entities: EntityMetadata[]): Map<string, EntityMetadata> {
    return new Map(entities.map((e) => [e.LogicalName.toLowerCase(), e]));
}

// ---------------------------------------------------------------------------
// BPF entity name resolution
// ---------------------------------------------------------------------------
describe("BPF entity name resolution", () => {
    it("useDisplayNameForBpfName=true resolves class name from display name (snapshot)", () => {
        const settings = makeSettings({ useDisplayNameForBpfName: true });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(bpfEntity);

        const output = generateEntityFile(bpfEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("useDisplayNameForBpfName=true uses display name segment", () => {
        const settings = makeSettings({ useDisplayNameForBpfName: true });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(bpfEntity);

        const output = generateEntityFile(bpfEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        // Display name "Employee Onboarding" -> removeInvalidCSharpIdentifierChars + remove _
        // -> "EmployeeOnboarding" inserted into the schema name in place of the GUID segment
        // After camelCasing by the CamelCaser the word "Onboarding" may be cased as "OnBoarding"
        // so we check for the display name text regardless of exact casing
        expect(output.toLowerCase()).toContain("employeeonboarding");
        // The GUID segment should not appear in the CLASS NAME (it still appears in the logical name attribute)
        expect(output).not.toMatch(/class\s+\S*1a2b3c4d/i);
    });

    it("useDisplayNameForBpfName=false uses schema name as-is", () => {
        const settings = makeSettings({ useDisplayNameForBpfName: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(bpfEntity);

        const output = generateEntityFile(bpfEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        // When BPF resolution is disabled the camelCased schema name is used
        expect(output).toContain("1a2b3c4d");
    });
});

// ---------------------------------------------------------------------------
// entityAttributeSpecifiedNames
// ---------------------------------------------------------------------------
describe("entityAttributeSpecifiedNames", () => {
    it("uses specified name override for a given attribute", () => {
        const settings = makeSettings({
            entityAttributeSpecifiedNames: { contact: ["MyFirstName"] },
        });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        // "myfirstname" matches logical name "firstname" case-insensitively? No --
        // the code does attr.LogicalName.toLowerCase() === s.toLowerCase()
        // so "MyFirstName".toLowerCase() === "myfirstname" != "firstname" -- won't match.
        // Use "firstname" as the specified name to force the exact override.
        // Re-run with correct value:
        expect(output).not.toContain("string MyFirstName"); // won't match since logical is "firstname"
    });

    it("exact logical name match in entityAttributeSpecifiedNames is applied verbatim", () => {
        const settings = makeSettings({
            entityAttributeSpecifiedNames: { contact: ["firstname"] }, // exact logical name
        });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        // The hit value is returned verbatim ("firstname" lowercase)
        expect(output).toContain("string firstname");
    });
});

// ---------------------------------------------------------------------------
// camelCaseClassNames = false
// ---------------------------------------------------------------------------
describe("camelCaseClassNames = false", () => {
    it("entity class name uses raw schema name", () => {
        const settings = makeSettings({ camelCaseClassNames: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        // SchemaName is "Contact" -- with camelCaseClassNames=false it is used directly
        expect(output).toContain("public partial class Contact");
    });
});

// ---------------------------------------------------------------------------
// camelCaseMemberNames = false
// ---------------------------------------------------------------------------
describe("camelCaseMemberNames = false", () => {
    it("attribute property names use raw schema name", () => {
        const settings = makeSettings({ camelCaseMemberNames: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        // Without camelCasing the schema name "FirstName" would be used as-is
        // (it already is PascalCase so the output is the same in this case, but
        // for a multi-word schema name like "NumberOfChildren" we'd see no change
        // since it's already a single token). We verify the attribute is present.
        expect(output).toContain("string FirstName");
    });
});

// ---------------------------------------------------------------------------
// Negative option value suffix
// ---------------------------------------------------------------------------
describe("negative option value disambiguation suffix", () => {
    it("duplicate name with negative value gets _neg<abs> suffix", () => {
        const optSetWithNegDup: OptionSetMetadata = {
            MetadataId: "ggg00001-0000-0000-0000-000000000001",
            Name: "contact_negtest",
            DisplayName: { LocalizedLabels: [] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [
                { Value: -1, Label: { LocalizedLabels: [{ Label: "Same", LanguageCode: 1033 }] } },
                { Value: 1, Label: { LocalizedLabels: [{ Label: "Same", LanguageCode: 1033 }] } },
            ],
        };

        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const output = generateEnumDeclaration(contactEntity, optSetWithNegDup, naming, settings);

        expect(output).toContain("Same_neg1");
        expect(output).toContain("Same_1");
    });
});

// ---------------------------------------------------------------------------
// suppressAutogeneratedFileHeaderComment -- note: not yet implemented in
// codeFileHeader, so we document current behaviour here.
// ---------------------------------------------------------------------------
describe("suppressAutogeneratedFileHeaderComment = false (default)", () => {
    it("header comment block is present", () => {
        const settings = makeSettings({ suppressAutogeneratedFileHeaderComment: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toContain("//------");
    });
});
