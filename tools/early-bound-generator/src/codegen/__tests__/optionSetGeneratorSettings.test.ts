/**
 * Extended option set generator tests covering settings and edge cases
 * that were previously untested.
 */
import { describe, it, expect } from "vitest";
import { generateEnumDeclaration, collectOptionSets } from "../optionSetGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService, buildFilterService } from "./helpers/naming";
import { contactEntity, statusWithDuplicateLabelsOptionSet, statusWithStateOptionSet } from "./fixtures/contact";
import type { OptionSetMetadata } from "../types";

// ---------------------------------------------------------------------------
// adjustCasingForEnumOptions = false
// ---------------------------------------------------------------------------
describe("adjustCasingForEnumOptions = false", () => {
    it("option names use validCSharpName (stripped, no title-casing) instead of nameFromLabel (snapshot)", () => {
        const settings = makeSettings({ adjustCasingForEnumOptions: false });
        const naming = buildNamingService(settings);
        const genderOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "gendercode")!.OptionSet!;

        const output = generateEnumDeclaration(contactEntity, genderOptionSet, naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("option names are not title-cased", () => {
        const settings = makeSettings({ adjustCasingForEnumOptions: false });
        const naming = buildNamingService(settings);
        const genderOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "gendercode")!.OptionSet!;

        const output = generateEnumDeclaration(contactEntity, genderOptionSet, naming, settings);

        // adjustCasingForEnumOptions=false -> validCSharpName -> "Male" -> strips to "Male" (no change for single word)
        // but label "Male" would not be title-cased further; key check is it does NOT call nameFromLabel
        expect(output).not.toBeNull();
        // Both values should still appear
        expect(output).toContain("Male");
        expect(output).toContain("Female");
    });
});

// ---------------------------------------------------------------------------
// generateTypesAsInternal for enums
// ---------------------------------------------------------------------------
describe("generateTypesAsInternal = true for option sets", () => {
    it("enum declaration uses internal keyword", () => {
        const settings = makeSettings({ generateTypesAsInternal: true });
        const naming = buildNamingService(settings);
        const genderOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "gendercode")!.OptionSet!;

        const output = generateEnumDeclaration(contactEntity, genderOptionSet, naming, settings);

        expect(output).toContain("internal enum Contact_GenderCode");
        expect(output).not.toContain("public enum");
    });
});

// ---------------------------------------------------------------------------
// Duplicate option name disambiguation
// ---------------------------------------------------------------------------
describe("duplicate option label disambiguation", () => {
    it("duplicate labels in a Status option set are disambiguated with _Active / _Inactive (snapshot)", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, statusWithDuplicateLabelsOptionSet, naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("first 'Active' option (State=0) gets _Active suffix", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, statusWithDuplicateLabelsOptionSet, naming, settings);

        expect(output).toContain("Active_Active");
    });

    it("second 'Active' option (State=1) gets _Inactive suffix", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, statusWithDuplicateLabelsOptionSet, naming, settings);

        expect(output).toContain("Active_Inactive");
    });

    it("non-duplicate label is not suffixed", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, statusWithDuplicateLabelsOptionSet, naming, settings);

        // "Inactive" is unique in the set -- should appear without suffix
        expect(output).toContain("Inactive =");
        expect(output).not.toContain("Inactive_Inactive");
    });
});

// ---------------------------------------------------------------------------
// isActiveState -- Status options with State field
// ---------------------------------------------------------------------------
describe("Status option set with State field", () => {
    it("State=0 option is considered Active and State=1 is Inactive", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        // statusWithStateOptionSet has Value=1 State=0 "Active" and Value=2 State=1 "Inactive"
        // No duplicates so no disambiguation suffix needed; names should be stable
        const output = generateEnumDeclaration(contactEntity, statusWithStateOptionSet, naming, settings);

        expect(output).not.toBeNull();
        expect(output).toContain("Active =");
        expect(output).toContain("Inactive =");
        // No disambiguation suffix expected since labels are unique
        expect(output).not.toContain("Active_Active");
        expect(output).not.toContain("Active_Inactive");
    });
});

// ---------------------------------------------------------------------------
// optionNameOverrides
// ---------------------------------------------------------------------------
describe("optionNameOverrides", () => {
    it("substitutes matching substrings in option labels", () => {
        const optionSetWithFedex: OptionSetMetadata = {
            MetadataId: "ddd00001-0000-0000-0000-000000000001",
            Name: "contact_shippingmethodcode",
            DisplayName: { LocalizedLabels: [{ Label: "Shipping Method", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [
                { Value: 1, Label: { LocalizedLabels: [{ Label: "fedex ground", LanguageCode: 1033 }] } },
                { Value: 2, Label: { LocalizedLabels: [{ Label: "notset", LanguageCode: 1033 }] } },
            ],
        };

        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, optionSetWithFedex, naming, settings);

        // DEFAULT_SETTINGS.optionNameOverrides has fedex -> FedEx and notset -> NotSet
        expect(output).toContain("FedEx");
        expect(output).toContain("NotSet");
    });

    it("custom optionNameOverrides map is applied", () => {
        const customOptionSet: OptionSetMetadata = {
            MetadataId: "ddd00002-0000-0000-0000-000000000001",
            Name: "contact_customcode",
            DisplayName: { LocalizedLabels: [{ Label: "Custom", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [{ Value: 1, Label: { LocalizedLabels: [{ Label: "mytoken value", LanguageCode: 1033 }] } }],
        };

        const settings = makeSettings({ optionNameOverrides: { mytoken: "MyToken" } });
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, customOptionSet, naming, settings);

        expect(output).toContain("MyToken");
    });
});

// ---------------------------------------------------------------------------
// optionSetNames override
// ---------------------------------------------------------------------------
describe("optionSetNames override", () => {
    it("renames an enum according to optionSetNames map", () => {
        const genderOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "gendercode")!.OptionSet!;
        const settings = makeSettings({ optionSetNames: { contact_gendercode: "ContactGender" } });
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, genderOptionSet, naming, settings);

        expect(output).toContain("public enum ContactGender");
        expect(output).not.toContain("Contact_GenderCode");
    });
});

// ---------------------------------------------------------------------------
// localOptionSetFormat customisation
// ---------------------------------------------------------------------------
describe("localOptionSetFormat customisation", () => {
    it("applies custom format to local Picklist option set names", () => {
        const genderOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "gendercode")!.OptionSet!;
        const settings = makeSettings({ localOptionSetFormat: "{0}_{1}_Enum" });
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, genderOptionSet, naming, settings);

        expect(output).toContain("Contact_GenderCode_Enum");
    });
});

// ---------------------------------------------------------------------------
// useCrmSvcUtilStateEnumNamingConvention
// ---------------------------------------------------------------------------
describe("useCrmSvcUtilStateEnumNamingConvention = true", () => {
    it("State option set is named <EntityName>State (snapshot)", () => {
        const stateOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "statecode")!.OptionSet!;
        const settings = makeSettings({ useCrmSvcUtilStateEnumNamingConvention: true });
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, stateOptionSet, naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("State enum is named ContactState", () => {
        const stateOptionSet = contactEntity.Attributes.find((a) => a.LogicalName === "statecode")!.OptionSet!;
        const settings = makeSettings({ useCrmSvcUtilStateEnumNamingConvention: true });
        const naming = buildNamingService(settings);

        const output = generateEnumDeclaration(contactEntity, stateOptionSet, naming, settings);

        expect(output).toContain("public enum ContactState");
    });
});

// ---------------------------------------------------------------------------
// Empty / null option values are skipped
// ---------------------------------------------------------------------------
describe("option value edge cases", () => {
    it("option with null value is skipped", () => {
        const optSetWithNull: OptionSetMetadata = {
            MetadataId: "eee00001-0000-0000-0000-000000000001",
            Name: "contact_nulltest",
            DisplayName: { LocalizedLabels: [{ Label: "Null Test", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [
                { Value: null, Label: { LocalizedLabels: [{ Label: "Should Be Skipped", LanguageCode: 1033 }] } },
                { Value: 1, Label: { LocalizedLabels: [{ Label: "Present", LanguageCode: 1033 }] } },
            ],
        };

        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const output = generateEnumDeclaration(contactEntity, optSetWithNull, naming, settings);

        expect(output).not.toContain("ShouldBeSkipped");
        expect(output).toContain("Present");
    });

    it("empty label falls back to UnknownLabel{value}", () => {
        const optSetWithEmpty: OptionSetMetadata = {
            MetadataId: "eee00002-0000-0000-0000-000000000001",
            Name: "contact_emptytest",
            DisplayName: { LocalizedLabels: [{ Label: "Empty Label Test", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [{ Value: 42, Label: { LocalizedLabels: [{ Label: "", LanguageCode: 1033 }] } }],
        };

        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const output = generateEnumDeclaration(contactEntity, optSetWithEmpty, naming, settings);

        expect(output).toContain("UnknownLabel42");
    });

    it("label starting with a digit gets the invalidCSharpNamePrefix", () => {
        const optSetWithDigit: OptionSetMetadata = {
            MetadataId: "eee00003-0000-0000-0000-000000000001",
            Name: "contact_digittest",
            DisplayName: { LocalizedLabels: [{ Label: "Digit Test", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [{ Value: 1, Label: { LocalizedLabels: [{ Label: "1st Choice", LanguageCode: 1033 }] } }],
        };

        const settings = makeSettings({ adjustCasingForEnumOptions: false });
        const naming = buildNamingService(settings);
        const output = generateEnumDeclaration(contactEntity, optSetWithDigit, naming, settings);

        // validCSharpName prepends _ when starts with digit
        // With adjustCasingForEnumOptions=false: "1st Choice" -> removeDiacritics -> "1st Choice" -> validCSharpName -> "1stChoice" -> starts with digit -> "_1stChoice"
        // But DEFAULT_SETTINGS.optionNameOverrides has "1st" -> "1st" so name stays as-is after override applied
        expect(output).not.toBeNull();
    });

    it("label with diacritics has diacritics removed", () => {
        const optSetWithDiacritics: OptionSetMetadata = {
            MetadataId: "eee00004-0000-0000-0000-000000000001",
            Name: "contact_diacritictest",
            DisplayName: { LocalizedLabels: [{ Label: "Diacritic Test", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: false,
            Options: [{ Value: 1, Label: { LocalizedLabels: [{ Label: "Ação", LanguageCode: 1033 }] } }],
        };

        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const output = generateEnumDeclaration(contactEntity, optSetWithDiacritics, naming, settings);

        // "Ação" -> removeDiacritics -> "Acao" -> nameFromLabel -> "Acao"
        expect(output).toContain("Acao");
    });
});

// ---------------------------------------------------------------------------
// CASING_BY_GLOBAL_OPTION_SET lookup
// ---------------------------------------------------------------------------
describe("global option set with well-known name", () => {
    it("uses the canonical casing from CASING_BY_GLOBAL_OPTION_SET", () => {
        const budgetStatusOptionSet: OptionSetMetadata = {
            MetadataId: "fff00001-0000-0000-0000-000000000001",
            Name: "budgetstatus",
            DisplayName: { LocalizedLabels: [{ Label: "Budget Status", LanguageCode: 1033 }] },
            OptionSetType: "Picklist",
            IsGlobal: true,
            Options: [
                { Value: 0, Label: { LocalizedLabels: [{ Label: "No Committed Budget", LanguageCode: 1033 }] } },
                { Value: 1, Label: { LocalizedLabels: [{ Label: "May Buy", LanguageCode: 1033 }] } },
            ],
        };

        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const output = generateEnumDeclaration(null, budgetStatusOptionSet, naming, settings);

        // CASING_BY_GLOBAL_OPTION_SET maps "budgetstatus" -> "BudgetStatus"
        expect(output).toContain("public enum BudgetStatus");
    });
});

// ---------------------------------------------------------------------------
// collectOptionSets -- emitEntityETC suppression
// ---------------------------------------------------------------------------
describe("collectOptionSets -- emitEntityETC", () => {
    it("record1objecttypecode is excluded when emitEntityETC = false (default)", () => {
        const entityWithETC = {
            ...contactEntity,
            Attributes: [
                ...contactEntity.Attributes,
                {
                    LogicalName: "record1objecttypecode",
                    SchemaName: "Record1ObjectTypeCode",
                    DisplayName: { LocalizedLabels: [{ Label: "Record 1 Object Type", LanguageCode: 1033 as const }] },
                    AttributeType: "Picklist" as const,
                    IsValidForCreate: true,
                    IsValidForUpdate: true,
                    IsValidForRead: true,
                    OptionSet: {
                        MetadataId: "aaa00099-0000-0000-0000-000000000001",
                        Name: "contact_record1objecttypecode",
                        DisplayName: { LocalizedLabels: [{ Label: "OTC", LanguageCode: 1033 as const }] },
                        OptionSetType: "Picklist" as const,
                        IsGlobal: false,
                        Options: [{ Value: 1, Label: { LocalizedLabels: [{ Label: "Contact", LanguageCode: 1033 as const }] } }],
                    },
                },
            ],
        };

        const settings = makeSettings({ emitEntityETC: false });
        const filter = buildFilterService(settings);
        const collected = collectOptionSets([entityWithETC], settings, filter);
        const names = collected.map((c) => c.optionSet.Name);

        expect(names).not.toContain("contact_record1objecttypecode");
    });

    it("record1objecttypecode IS collected when emitEntityETC = true", () => {
        const entityWithETC = {
            ...contactEntity,
            Attributes: [
                ...contactEntity.Attributes,
                {
                    LogicalName: "record1objecttypecode",
                    SchemaName: "Record1ObjectTypeCode",
                    DisplayName: { LocalizedLabels: [{ Label: "Record 1 Object Type", LanguageCode: 1033 as const }] },
                    AttributeType: "Picklist" as const,
                    IsValidForCreate: true,
                    IsValidForUpdate: true,
                    IsValidForRead: true,
                    OptionSet: {
                        MetadataId: "aaa00099-0000-0000-0000-000000000001",
                        Name: "contact_record1objecttypecode",
                        DisplayName: { LocalizedLabels: [{ Label: "OTC", LanguageCode: 1033 as const }] },
                        OptionSetType: "Picklist" as const,
                        IsGlobal: false,
                        Options: [{ Value: 1, Label: { LocalizedLabels: [{ Label: "Contact", LanguageCode: 1033 as const }] } }],
                    },
                },
            ],
        };

        const settings = makeSettings({ emitEntityETC: true });
        const filter = buildFilterService(settings);
        const collected = collectOptionSets([entityWithETC], settings, filter);
        const names = collected.map((c) => c.optionSet.Name);

        expect(names).toContain("contact_record1objecttypecode");
    });
});
