import type { SdkMessagePair } from "../../types";

export const calculateCommissionMessage: SdkMessagePair = {
    Request: {
        Name: "contoso_CalculateCommission",
        Fields: [
            {
                Name: "OpportunityId",
                ClrFormatter: "System.Guid",
                IsOptional: false,
                Index: 0,
            },
            {
                Name: "OverrideRate",
                ClrFormatter: "System.Nullable<decimal>",
                IsOptional: true,
                Index: 1,
            },
        ],
    },
    Response: {
        Fields: [
            {
                Name: "CommissionAmount",
                ClrFormatter: "System.Nullable<decimal>",
                Index: 0,
            },
            {
                Name: "BreakdownJson",
                ClrFormatter: "string",
                Index: 1,
            },
        ],
    },
};

export const noFieldsMessage: SdkMessagePair = {
    Request: {
        Name: "contoso_TriggerSync",
        Fields: [],
    },
    Response: {
        Fields: [],
    },
};

/**
 * Message with CLR alias types in response fields -- exercises the CLR_TYPE_ALIASES
 * map and verifies System.String -> string, System.Boolean -> bool, System.Int32 -> int.
 */
export const clrAliasMessage: SdkMessagePair = {
    Request: {
        Name: "contoso_CheckEligibility",
        Fields: [
            {
                Name: "ContactId",
                ClrFormatter: "System.Guid",
                IsOptional: false,
                Index: 0,
            },
        ],
    },
    Response: {
        Fields: [
            {
                Name: "IsEligible",
                ClrFormatter: "System.Boolean",
                Index: 0,
            },
            {
                Name: "Reason",
                ClrFormatter: "System.String",
                Index: 1,
            },
            {
                Name: "Score",
                ClrFormatter: "System.Int32",
                Index: 2,
            },
        ],
    },
};
