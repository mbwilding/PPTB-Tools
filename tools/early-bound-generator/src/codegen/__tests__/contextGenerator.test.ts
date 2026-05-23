import { describe, it, expect } from "vitest";
import { generateContextFile } from "../contextGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService } from "./helpers/naming";
import { contactEntity, systemUserEntity } from "./fixtures/contact";

describe("contextGenerator", () => {
    it("generates DataverseContext with default settings", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateContextFile([contactEntity, systemUserEntity], naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("generates DataverseContext with a custom context name", () => {
        const settings = makeSettings({ serviceContextName: "ContosoCrmContext" });
        const naming = buildNamingService(settings);

        const output = generateContextFile([contactEntity, systemUserEntity], naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("generates DataverseContext with a custom namespace", () => {
        const settings = makeSettings({ namespace: "RWWA.CrmBridge.CrmSdk" });
        const naming = buildNamingService(settings);

        const output = generateContextFile([contactEntity], naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("generates an empty context when no entities are provided", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateContextFile([], naming, settings);

        expect(output).toMatchSnapshot();
    });

    it("contains IQueryable property for each entity", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateContextFile([contactEntity, systemUserEntity], naming, settings);

        expect(output).toContain("ContactSet");
        expect(output).toContain("SystemUserSet");
    });

    it("contains OptionSetMetadataAttribute class", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateContextFile([contactEntity], naming, settings);

        expect(output).toContain("public sealed class OptionSetMetadataAttribute");
    });

    it("contains ProxyTypesAssemblyAttribute", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateContextFile([contactEntity], naming, settings);

        expect(output).toContain("[assembly: Microsoft.Xrm.Sdk.Client.ProxyTypesAssemblyAttribute()]");
    });
});
