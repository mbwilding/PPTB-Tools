/**
 * Extended message generator tests covering response field properties and
 * makeResponseMessagesEditable, plus CLR type alias mapping.
 */
import { describe, it, expect } from "vitest";
import { generateMessageFile, generateMessagesFile } from "../messageGenerator";
import { makeSettings } from "./helpers/settings";
import { buildNamingService } from "./helpers/naming";
import { calculateCommissionMessage, noFieldsMessage, clrAliasMessage } from "./fixtures/messages";

// ---------------------------------------------------------------------------
// Response field properties -- always emitted
// ---------------------------------------------------------------------------
describe("response field properties", () => {
    it("response fields are emitted as properties (snapshot, makeResponseMessagesEditable=true default)", () => {
        const settings = makeSettings({ makeResponseMessagesEditable: true });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        expect(output).toMatchSnapshot();
    });

    it("response fields are emitted as properties (snapshot, makeResponseMessagesEditable=false)", () => {
        const settings = makeSettings({ makeResponseMessagesEditable: false });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        expect(output).toMatchSnapshot();
    });

    it("response fields are always generated regardless of makeResponseMessagesEditable", () => {
        const editable = generateMessageFile(calculateCommissionMessage, makeSettings({ makeResponseMessagesEditable: true }), buildNamingService(makeSettings()));
        const readonly_ = generateMessageFile(calculateCommissionMessage, makeSettings({ makeResponseMessagesEditable: false }), buildNamingService(makeSettings()));

        // Both outputs contain the response field property names
        expect(editable).toContain("CommissionAmount");
        expect(editable).toContain("BreakdownJson");
        expect(readonly_).toContain("CommissionAmount");
        expect(readonly_).toContain("BreakdownJson");
    });

    it("no response field properties when response has no fields", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(noFieldsMessage, settings, naming);

        // The response class should still exist with ActionLogicalName + empty constructor
        expect(output).toContain("TriggerSyncResponse");
        expect(output).toContain("ActionLogicalName");
        // But no property blocks other than the const
        expect(output).not.toContain("this.Results");
    });
});

// ---------------------------------------------------------------------------
// Response getter uses this.Results, not this.Parameters
// ---------------------------------------------------------------------------
describe("response field getter uses this.Results", () => {
    it("getter reads from this.Results collection", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        expect(output).toContain('this.Results.Contains("CommissionAmount")');
        expect(output).toContain('this.Results["CommissionAmount"]');
    });

    it("getter does NOT read from this.Parameters", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        // Response class section: after the Response class opens, Parameters should not appear
        const responseClassIdx = output.indexOf("CalculateCommissionResponse");
        const responseSection = output.substring(responseClassIdx);
        expect(responseSection).not.toContain('this.Parameters.Contains("CommissionAmount")');
        expect(responseSection).not.toContain('this.Parameters["CommissionAmount"]');
    });

    it("getter returns default(T) when key not present", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        // The response section should have a default(...) return
        const responseClassIdx = output.indexOf("CalculateCommissionResponse");
        expect(output.substring(responseClassIdx)).toContain("return default(");
    });
});

// ---------------------------------------------------------------------------
// makeResponseMessagesEditable controls setter presence
// ---------------------------------------------------------------------------
describe("makeResponseMessagesEditable", () => {
    it("setter is emitted when makeResponseMessagesEditable = true", () => {
        const settings = makeSettings({ makeResponseMessagesEditable: true });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        // Setter writes to this.Results
        expect(output).toContain('this.Results["CommissionAmount"] = value;');
        expect(output).toContain('this.Results["BreakdownJson"] = value;');
    });

    it("setter is NOT emitted when makeResponseMessagesEditable = false", () => {
        const settings = makeSettings({ makeResponseMessagesEditable: false });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        expect(output).not.toContain('this.Results["CommissionAmount"] = value;');
        expect(output).not.toContain('this.Results["BreakdownJson"] = value;');
    });

    it("setter writes to this.Results (not this.Parameters) when editable", () => {
        const settings = makeSettings({ makeResponseMessagesEditable: true });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        // Critically: setter must use Results, not Parameters
        const responseIdx = output.indexOf("CalculateCommissionResponse");
        const responseSection = output.substring(responseIdx);
        expect(responseSection).not.toContain('this.Parameters["CommissionAmount"] = value;');
        expect(responseSection).toContain('this.Results["CommissionAmount"] = value;');
    });
});

// ---------------------------------------------------------------------------
// Fields nested class in response (when generateMessageAttributeNameConsts)
// ---------------------------------------------------------------------------
describe("response Fields class", () => {
    it("Fields class is emitted in response when generateMessageAttributeNameConsts = true and response has fields", () => {
        const settings = makeSettings({ generateMessageAttributeNameConsts: true });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        // There should be a Fields class inside the response class containing the response field names
        const responseIdx = output.indexOf("CalculateCommissionResponse");
        const responseSection = output.substring(responseIdx);
        expect(responseSection).toContain("public static class Fields");
        expect(responseSection).toContain('"CommissionAmount"');
        expect(responseSection).toContain('"BreakdownJson"');
    });

    it("Fields class is NOT emitted in response when generateMessageAttributeNameConsts = false", () => {
        const settings = makeSettings({ generateMessageAttributeNameConsts: false });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(calculateCommissionMessage, settings, naming);

        const responseIdx = output.indexOf("CalculateCommissionResponse");
        const responseSection = output.substring(responseIdx);
        expect(responseSection).not.toContain("public static class Fields");
    });

    it("Fields class is NOT emitted in response when response has no fields", () => {
        const settings = makeSettings({ generateMessageAttributeNameConsts: true });
        const naming = buildNamingService(settings);

        const output = generateMessageFile(noFieldsMessage, settings, naming);

        const responseIdx = output.indexOf("TriggerSyncResponse");
        const responseSection = output.substring(responseIdx);
        expect(responseSection).not.toContain("public static class Fields");
    });
});

// ---------------------------------------------------------------------------
// CLR type aliases in response fields
// ---------------------------------------------------------------------------
describe("CLR type aliases in response fields", () => {
    it("System.Boolean maps to bool (snapshot)", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(clrAliasMessage, settings, naming);

        expect(output).toMatchSnapshot();
    });

    it("System.Boolean -> bool", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(clrAliasMessage, settings, naming);

        expect(output).toContain("bool? IsEligible");
    });

    it("System.String -> string", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(clrAliasMessage, settings, naming);

        expect(output).toContain("string? Reason");
    });

    it("System.Int32 -> int", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(clrAliasMessage, settings, naming);

        expect(output).toContain("int? Score");
    });

    it("CLR aliases also work in request fields (System.Guid -> System.Guid)", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessageFile(clrAliasMessage, settings, naming);

        expect(output).toContain("System.Guid? ContactId");
    });
});

// ---------------------------------------------------------------------------
// Combined messages file includes response field properties
// ---------------------------------------------------------------------------
describe("generateMessagesFile with response fields", () => {
    it("combined file snapshot includes response fields", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessagesFile([calculateCommissionMessage, noFieldsMessage], settings, naming);

        expect(output).toMatchSnapshot();
    });

    it("combined file contains response field properties from first message", () => {
        const settings = makeSettings();
        const naming = buildNamingService(settings);

        const output = generateMessagesFile([calculateCommissionMessage, noFieldsMessage], settings, naming);

        expect(output).toContain("CommissionAmount");
        expect(output).toContain('this.Results.Contains("CommissionAmount")');
    });
});
