import type { EntityMetadata } from "../../types";

export const contactEntity: EntityMetadata = {
    LogicalName: "contact",
    SchemaName: "Contact",
    DisplayName: {
        LocalizedLabels: [{ Label: "Contact", LanguageCode: 1033 }],
    },
    Description: {
        LocalizedLabels: [{ Label: "Person with whom a business unit has a relationship, such as a customer, supplier, or colleague.", LanguageCode: 1033 }],
    },
    LogicalCollectionName: "contacts",
    EntitySetName: "contacts",
    PrimaryIdAttribute: "contactid",
    PrimaryNameAttribute: "fullname",
    Keys: [],
    Attributes: [
        {
            LogicalName: "contactid",
            SchemaName: "ContactId",
            DisplayName: { LocalizedLabels: [{ Label: "Contact", LanguageCode: 1033 }] },
            AttributeType: "Uniqueidentifier",
            IsPrimaryId: true,
            IsValidForCreate: true,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        {
            LogicalName: "fullname",
            SchemaName: "FullName",
            DisplayName: { LocalizedLabels: [{ Label: "Full Name", LanguageCode: 1033 }] },
            AttributeType: "String",
            IsPrimaryName: true,
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        {
            LogicalName: "firstname",
            SchemaName: "FirstName",
            DisplayName: { LocalizedLabels: [{ Label: "First Name", LanguageCode: 1033 }] },
            AttributeType: "String",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "description",
            SchemaName: "Description",
            DisplayName: { LocalizedLabels: [{ Label: "Description", LanguageCode: 1033 }] },
            AttributeType: "Memo",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "numberofchildren",
            SchemaName: "NumberOfChildren",
            DisplayName: { LocalizedLabels: [{ Label: "No. of Children", LanguageCode: 1033 }] },
            AttributeType: "Integer",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "annualincome",
            SchemaName: "AnnualIncome",
            DisplayName: { LocalizedLabels: [{ Label: "Annual Income", LanguageCode: 1033 }] },
            AttributeType: "Money",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "donotphone",
            SchemaName: "DoNotPhone",
            DisplayName: { LocalizedLabels: [{ Label: "Do not allow Phone Calls", LanguageCode: 1033 }] },
            AttributeType: "Boolean",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "birthdate",
            SchemaName: "BirthDate",
            DisplayName: { LocalizedLabels: [{ Label: "Birthday", LanguageCode: 1033 }] },
            AttributeType: "DateTime",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "parentcustomerid",
            SchemaName: "ParentCustomerId",
            DisplayName: { LocalizedLabels: [{ Label: "Company Name", LanguageCode: 1033 }] },
            AttributeType: "Customer",
            Targets: ["account", "contact"],
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "parentcustomeridname",
            SchemaName: "ParentCustomerIdName",
            DisplayName: { LocalizedLabels: [{ Label: "Company Name (Name)", LanguageCode: 1033 }] },
            AttributeType: "String",
            AttributeOf: "parentcustomerid",
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        {
            LogicalName: "gendercode",
            SchemaName: "GenderCode",
            DisplayName: { LocalizedLabels: [{ Label: "Gender", LanguageCode: 1033 }] },
            AttributeType: "Picklist",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
            OptionSet: {
                MetadataId: "aaa00001-0000-0000-0000-000000000001",
                Name: "contact_gendercode",
                DisplayName: { LocalizedLabels: [{ Label: "Gender", LanguageCode: 1033 }] },
                Description: { LocalizedLabels: [{ Label: "Specifies the gender:\nMale\nFemale", LanguageCode: 1033 }] },
                OptionSetType: "Picklist",
                IsGlobal: false,
                Options: [
                    { Value: 1, Label: { LocalizedLabels: [{ Label: "Male", LanguageCode: 1033 }] } },
                    { Value: 2, Label: { LocalizedLabels: [{ Label: "Female", LanguageCode: 1033 }] } },
                ],
            },
        },

        {
            LogicalName: "statecode",
            SchemaName: "StateCode",
            DisplayName: { LocalizedLabels: [{ Label: "Status", LanguageCode: 1033 }] },
            AttributeType: "State",
            IsValidForCreate: false,
            IsValidForUpdate: true,
            IsValidForRead: true,
            OptionSet: {
                MetadataId: "aaa00002-0000-0000-0000-000000000001",
                Name: "contact_statecode",
                DisplayName: { LocalizedLabels: [{ Label: "Status", LanguageCode: 1033 }] },
                OptionSetType: "State",
                IsGlobal: false,
                Options: [
                    { Value: 0, Label: { LocalizedLabels: [{ Label: "Active", LanguageCode: 1033 }] } },
                    { Value: 1, Label: { LocalizedLabels: [{ Label: "Inactive", LanguageCode: 1033 }] } },
                ],
            },
        },

        {
            LogicalName: "statuscode",
            SchemaName: "StatusCode",
            DisplayName: { LocalizedLabels: [{ Label: "Status Reason", LanguageCode: 1033 }] },
            AttributeType: "Status",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
            OptionSet: {
                MetadataId: "aaa00003-0000-0000-0000-000000000001",
                Name: "contact_statuscode",
                DisplayName: { LocalizedLabels: [{ Label: "Status Reason", LanguageCode: 1033 }] },
                OptionSetType: "Status",
                IsGlobal: false,
                Options: [
                    { Value: 1, Label: { LocalizedLabels: [{ Label: "Active", LanguageCode: 1033 }] } },
                    { Value: 2, Label: { LocalizedLabels: [{ Label: "Inactive", LanguageCode: 1033 }] } },
                ],
            },
        },

        {
            LogicalName: "aging30",
            SchemaName: "Aging30",
            DisplayName: { LocalizedLabels: [{ Label: "Aging 30", LanguageCode: 1033 }] },
            AttributeType: "Money",
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        // --- Additional attribute types for coverage ---

        {
            LogicalName: "versionnumber",
            SchemaName: "VersionNumber",
            DisplayName: { LocalizedLabels: [{ Label: "Version Number", LanguageCode: 1033 }] },
            AttributeType: "BigInt",
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        {
            LogicalName: "creditlimit",
            SchemaName: "CreditLimit",
            DisplayName: { LocalizedLabels: [{ Label: "Credit Limit", LanguageCode: 1033 }] },
            AttributeType: "Decimal",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "exchangerate",
            SchemaName: "ExchangeRate",
            DisplayName: { LocalizedLabels: [{ Label: "Exchange Rate", LanguageCode: 1033 }] },
            AttributeType: "Double",
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        {
            LogicalName: "ownerid",
            SchemaName: "OwnerId",
            DisplayName: { LocalizedLabels: [{ Label: "Owner", LanguageCode: 1033 }] },
            AttributeType: "Owner",
            Targets: ["systemuser", "team"],
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "activityparties",
            SchemaName: "ActivityParties",
            DisplayName: { LocalizedLabels: [{ Label: "Activity Parties", LanguageCode: 1033 }] },
            AttributeType: "PartyList",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "entityimage",
            SchemaName: "EntityImage",
            DisplayName: { LocalizedLabels: [{ Label: "Entity Image", LanguageCode: 1033 }] },
            AttributeType: "Virtual",
            AttributeTypeName: { Value: "ImageType" },
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "document",
            SchemaName: "Document",
            DisplayName: { LocalizedLabels: [{ Label: "Document", LanguageCode: 1033 }] },
            AttributeType: "File",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "isbackofficecustomer",
            SchemaName: "IsBackofficeCustomer",
            DisplayName: { LocalizedLabels: [{ Label: "Back Office Customer", LanguageCode: 1033 }] },
            AttributeType: "ManagedProperty",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },

        {
            LogicalName: "preferredcontactmethodscode",
            SchemaName: "PreferredContactMethodsCode",
            DisplayName: { LocalizedLabels: [{ Label: "Preferred Method of Contact", LanguageCode: 1033 }] },
            AttributeType: "MultiSelectPicklist",
            AttributeTypeName: { Value: "MultiSelectPicklistType" },
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
            OptionSet: {
                MetadataId: "aaa00004-0000-0000-0000-000000000001",
                Name: "contact_preferredcontactmethodscode",
                DisplayName: { LocalizedLabels: [{ Label: "Preferred Method of Contact", LanguageCode: 1033 }] },
                OptionSetType: "Picklist",
                IsGlobal: false,
                Options: [
                    { Value: 1, Label: { LocalizedLabels: [{ Label: "Any", LanguageCode: 1033 }] } },
                    { Value: 2, Label: { LocalizedLabels: [{ Label: "Email", LanguageCode: 1033 }] } },
                    { Value: 3, Label: { LocalizedLabels: [{ Label: "Phone", LanguageCode: 1033 }] } },
                ],
            },
        },

        // Readonly system fields (for makeReadonlyFieldsEditable coverage)
        {
            LogicalName: "createdby",
            SchemaName: "CreatedBy",
            DisplayName: { LocalizedLabels: [{ Label: "Created By", LanguageCode: 1033 }] },
            AttributeType: "Lookup",
            Targets: ["systemuser"],
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        {
            LogicalName: "createdon",
            SchemaName: "CreatedOn",
            DisplayName: { LocalizedLabels: [{ Label: "Created On", LanguageCode: 1033 }] },
            AttributeType: "DateTime",
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },

        // Attribute whose SchemaName matches the entity class name -- triggers __Member suffix
        {
            LogicalName: "contact",
            SchemaName: "Contact",
            DisplayName: { LocalizedLabels: [{ Label: "Contact Self Reference", LanguageCode: 1033 }] },
            AttributeType: "String",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },
    ],
    OneToManyRelationships: [
        {
            SchemaName: "contact_customer_contacts",
            RelationshipType: "OneToManyRelationship",
            ReferencedEntity: "contact",
            ReferencingEntity: "contact",
            ReferencedEntityNavigationPropertyName: "contact_customer_contacts",
            ReferencingEntityNavigationPropertyName: "parentcustomerid_contact",
        },
    ],
    ManyToOneRelationships: [
        {
            SchemaName: "contact_owning_user",
            RelationshipType: "OneToManyRelationship",
            ReferencedEntity: "systemuser",
            ReferencingEntity: "contact",
            ReferencedEntityNavigationPropertyName: "contact_owning_user",
            ReferencingEntityNavigationPropertyName: "owninguser",
        },
    ],
    ManyToManyRelationships: [
        {
            SchemaName: "contactleads_association",
            RelationshipType: "ManyToManyRelationship",
            Entity1LogicalName: "contact",
            Entity2LogicalName: "lead",
            Entity1NavigationPropertyName: "contactleads_association",
            Entity2NavigationPropertyName: "contactleads_association",
        },
    ],
};

export const systemUserEntity: EntityMetadata = {
    LogicalName: "systemuser",
    SchemaName: "SystemUser",
    DisplayName: { LocalizedLabels: [{ Label: "User", LanguageCode: 1033 }] },
    LogicalCollectionName: "systemusers",
    EntitySetName: "systemusers",
    PrimaryIdAttribute: "systemuserid",
    PrimaryNameAttribute: "fullname",
    Keys: [],
    Attributes: [
        {
            LogicalName: "systemuserid",
            SchemaName: "SystemUserId",
            DisplayName: { LocalizedLabels: [{ Label: "User", LanguageCode: 1033 }] },
            AttributeType: "Uniqueidentifier",
            IsPrimaryId: true,
            IsValidForCreate: true,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },
        {
            LogicalName: "fullname",
            SchemaName: "FullName",
            DisplayName: { LocalizedLabels: [{ Label: "Full Name", LanguageCode: 1033 }] },
            AttributeType: "String",
            IsPrimaryName: true,
            IsValidForCreate: false,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },
    ],
    OneToManyRelationships: [],
    ManyToOneRelationships: [],
    ManyToManyRelationships: [],
};

/** Entity with AlternateKeys populated (two-key composite alternate key). */
export const accountEntity: EntityMetadata = {
    LogicalName: "account",
    SchemaName: "Account",
    DisplayName: { LocalizedLabels: [{ Label: "Account", LanguageCode: 1033 }] },
    LogicalCollectionName: "accounts",
    EntitySetName: "accounts",
    PrimaryIdAttribute: "accountid",
    PrimaryNameAttribute: "name",
    Keys: [{ KeyAttributes: ["accountnumber", "name"] }],
    Attributes: [
        {
            LogicalName: "accountid",
            SchemaName: "AccountId",
            DisplayName: { LocalizedLabels: [{ Label: "Account", LanguageCode: 1033 }] },
            AttributeType: "Uniqueidentifier",
            IsPrimaryId: true,
            IsValidForCreate: true,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },
        {
            LogicalName: "name",
            SchemaName: "Name",
            DisplayName: { LocalizedLabels: [{ Label: "Account Name", LanguageCode: 1033 }] },
            AttributeType: "String",
            IsPrimaryName: true,
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },
        {
            LogicalName: "accountnumber",
            SchemaName: "AccountNumber",
            DisplayName: { LocalizedLabels: [{ Label: "Account Number", LanguageCode: 1033 }] },
            AttributeType: "String",
            IsValidForCreate: true,
            IsValidForUpdate: true,
            IsValidForRead: true,
        },
    ],
    OneToManyRelationships: [],
    ManyToOneRelationships: [],
    ManyToManyRelationships: [],
};

/**
 * Option set with duplicate option labels -- tests appendValueForDuplicateOptionSetValueNames.
 * Both values have label "Active" at different states, triggering _Active / _Inactive dedup.
 */
export const statusWithDuplicateLabelsOptionSet = {
    MetadataId: "ccc00001-0000-0000-0000-000000000001",
    Name: "contact_dupstatuscode",
    DisplayName: { LocalizedLabels: [{ Label: "Dup Status", LanguageCode: 1033 }] },
    OptionSetType: "Status" as const,
    IsGlobal: false,
    Options: [
        { Value: 1, State: 0, Label: { LocalizedLabels: [{ Label: "Active", LanguageCode: 1033 }] } },
        { Value: 2, State: 1, Label: { LocalizedLabels: [{ Label: "Active", LanguageCode: 1033 }] } },
        { Value: 3, State: 1, Label: { LocalizedLabels: [{ Label: "Inactive", LanguageCode: 1033 }] } },
    ],
};

/**
 * Status option set where options carry State values --
 * exercises isActiveState path in duplicate-name resolution.
 */
export const statusWithStateOptionSet = {
    MetadataId: "ccc00002-0000-0000-0000-000000000001",
    Name: "contact_statuscode",
    DisplayName: { LocalizedLabels: [{ Label: "Status Reason", LanguageCode: 1033 }] },
    OptionSetType: "Status" as const,
    IsGlobal: false,
    Options: [
        { Value: 1, State: 0, Label: { LocalizedLabels: [{ Label: "Active", LanguageCode: 1033 }] } },
        { Value: 2, State: 1, Label: { LocalizedLabels: [{ Label: "Inactive", LanguageCode: 1033 }] } },
    ],
};

/** BPF entity -- schema name contains _bpf_{guid} segment. */
export const bpfEntity: EntityMetadata = {
    LogicalName: "contoso_bpf_1a2b3c4d5e6f7890abcdef1234567890_onboarding",
    SchemaName: "contoso_bpf_1a2b3c4d5e6f7890abcdef1234567890_onboarding",
    DisplayName: { LocalizedLabels: [{ Label: "Employee Onboarding", LanguageCode: 1033 }] },
    LogicalCollectionName: "contoso_bpf_1a2b3c4d5e6f7890abcdef1234567890_onboardings",
    EntitySetName: "contoso_bpf_1a2b3c4d5e6f7890abcdef1234567890_onboardings",
    PrimaryIdAttribute: "businessprocessflowinstanceid",
    PrimaryNameAttribute: "bpf_name",
    Keys: [],
    Attributes: [
        {
            LogicalName: "businessprocessflowinstanceid",
            SchemaName: "BusinessProcessFlowInstanceId",
            DisplayName: { LocalizedLabels: [{ Label: "BPF Instance", LanguageCode: 1033 }] },
            AttributeType: "Uniqueidentifier",
            IsPrimaryId: true,
            IsValidForCreate: true,
            IsValidForUpdate: false,
            IsValidForRead: true,
        },
    ],
    OneToManyRelationships: [],
    ManyToOneRelationships: [],
    ManyToManyRelationships: [],
};
