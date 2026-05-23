import { describe, it, expect } from "vitest";
import { generateMessageFile, generateMessagesFile } from "../messageGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService } from "./helpers/naming";
import { calculateCommissionMessage, noFieldsMessage } from "./fixtures/messages";

describe("messageGenerator", () => {
    describe("generateMessageFile", () => {
        it("generates a single message file with request and response fields", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toMatchSnapshot();
        });

        it("generates a message file with no fields", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(noFieldsMessage, settings, naming);

            expect(output).toMatchSnapshot();
        });

        it("includes Fields nested class when generateMessageAttributeNameConsts = true", () => {
            const settings = makeSettings({ generateMessageAttributeNameConsts: true });
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toContain("public static class Fields");
        });

        it("omits Fields nested class when generateMessageAttributeNameConsts = false", () => {
            const settings = makeSettings({ generateMessageAttributeNameConsts: false });
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).not.toContain("public static class Fields");
        });

        it("uses camelCased class name derived from message name", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            // Class name is the camelCased form of the logical name
            expect(output).toContain("public partial class");
            expect(output).toContain("CalculateCommissionRequest");
            expect(output).toContain("CalculateCommissionResponse");
        });

        it("includes ActionLogicalName const on both classes", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toContain('public const string ActionLogicalName = "contoso_CalculateCommission"');
        });

        it("properties use if/else getter pattern", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toContain('if (this.Parameters.Contains("OpportunityId"))');
            expect(output).toContain("return default(");
        });

        it("contains RequestProxyAttribute with message name", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toContain('[Microsoft.Xrm.Sdk.Client.RequestProxyAttribute("contoso_CalculateCommission")]');
        });

        it("constructor initialises non-optional fields to default", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toContain("this.OpportunityId = default(System.Guid)");
            // OverrideRate is optional so should not be initialised
            expect(output).not.toContain("this.OverrideRate = default");
        });

        it("DataContractAttribute includes namespace", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessageFile(calculateCommissionMessage, settings, naming);

            expect(output).toContain('DataContractAttribute(Namespace="http://schemas.microsoft.com/xrm/2011/new/")');
        });
    });

    describe("generateMessagesFile", () => {
        it("generates a combined messages file", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessagesFile([calculateCommissionMessage, noFieldsMessage], settings, naming);

            expect(output).toMatchSnapshot();
        });

        it("combined file contains both message class pairs", () => {
            const settings = makeSettings();
            const naming = buildNamingService(settings);

            const output = generateMessagesFile([calculateCommissionMessage, noFieldsMessage], settings, naming);

            expect(output).toContain("CalculateCommissionRequest");
            expect(output).toContain("CalculateCommissionResponse");
            expect(output).toContain("TriggerSyncRequest");
            expect(output).toContain("TriggerSyncResponse");
        });
    });
});
