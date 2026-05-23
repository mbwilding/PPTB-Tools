import { describe, it, expect } from "vitest";
import { generateEntityFile } from "../entityGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService, buildFilterService } from "./helpers/naming";
import { contactEntity, systemUserEntity } from "./fixtures/contact";
import type { EntityMetadata } from "../types";

function makeEntitiesMap(...entities: EntityMetadata[]): Map<string, EntityMetadata> {
    return new Map(entities.map((e) => [e.LogicalName.toLowerCase(), e]));
}

describe("entityGenerator", () => {
    it("generates Contact with default settings", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact with suppressGeneratedCodeAttribute = false", () => {
        const settings = makeSettings({ suppressGeneratedCodeAttribute: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: false,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact without relationships", () => {
        const settings = makeSettings({ generateEntityRelationships: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact without attribute name consts", () => {
        const settings = makeSettings({ generateAttributeNameConsts: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact without enum properties (Picklist falls back to OptionSetValue)", () => {
        const settings = makeSettings({ generateEnumProperties: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact with a custom namespace", () => {
        const settings = makeSettings({ namespace: "RWWA.CrmBridge.CrmSdk" });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact with entity class name override", () => {
        const settings = makeSettings({ entityClassNameOverrides: { contact: "ContactRecord" } });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toMatchSnapshot();
    });

    it("generates Contact with constructors sans logical name", () => {
        const settings = makeSettings({ generateConstructorsSansLogicalName: true });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toContain("public Contact(System.Guid id)");
        expect(output).toContain("public Contact(string keyName, object keyValue)");
        expect(output).toContain("public Contact(Microsoft.Xrm.Sdk.KeyAttributeCollection keyAttributes)");
        expect(output).toMatchSnapshot();
    });

    it("generates Contact without constructors sans logical name (default)", () => {
        const settings = makeSettings({ generateConstructorsSansLogicalName: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).not.toContain("public Contact(System.Guid id)");
    });

    it("generates Contact with anonymous type constructor", () => {
        const settings = makeSettings({ generateAnonymousTypeConstructor: true });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toContain("Constructor for populating via LINQ queries given a LINQ anonymous type");
        expect(output).toContain("public Contact(object anonymousType)");
        expect(output).toContain('Attributes["contactid"] = base.Id;');
        expect(output).toMatchSnapshot();
    });

    it("generates Contact with INotify pattern", () => {
        const settings = makeSettings({ generateINotifyPattern: true });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toContain("INotifyPropertyChanging");
        expect(output).toContain("INotifyPropertyChanged");
        expect(output).toContain("public event System.ComponentModel.PropertyChangedEventHandler PropertyChanged;");
        expect(output).toContain("public event System.ComponentModel.PropertyChangingEventHandler PropertyChanging;");
        expect(output).toContain('this.OnPropertyChanging("');
        expect(output).toContain('this.OnPropertyChanged("');
        expect(output).toMatchSnapshot();
    });

    it("generates Contact without INotify pattern (default) -- no OnPropertyChanging in relationship setters", () => {
        const settings = makeSettings({ generateINotifyPattern: false });
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity, systemUserEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).not.toContain("INotifyPropertyChanging");
        expect(output).not.toContain("OnPropertyChanging");
    });

    it("output contains EntityLogicalName constant", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toContain('public const string EntityLogicalName = "contact"');
    });

    it("output contains primary ID override for base.Id", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);
        const filter = buildFilterService(settings);
        const allEntities = makeEntitiesMap(contactEntity);

        const output = generateEntityFile(contactEntity, allEntities, {
            settings,
            namingService: naming,
            filterService: filter,
            suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
        });

        expect(output).toContain("base.Id = value.Value;");
    });
});
