import type { EbgSettings } from "../models/interfaces";
import type { EntityMetadata, AttributeMetadata, OptionSetMetadata, EntityKeyMetadata } from "./types";
import { NamingService } from "./naming";
import { FilterService } from "./filters";
import { CamelCaser, buildDictionary } from "./camelCaser";
import { generateEntityFile } from "./entityGenerator";
import { generateOptionSetsFile, generateEntityOptionSetsFile, generateSingleOptionSetFile, collectOptionSets } from "./optionSetGenerator";
import { generateContextFile } from "./contextGenerator";
import { generateMessageFile, generateMessagesFile } from "./messageGenerator";
import { extractNamespaceBody, codeFileHeader } from "../utils/codeBuilder";
import { joinPath } from "../utils/pathUtils";
import { getErrorMessage } from "../utils/getErrorMessage";
import type { SdkMessagePair } from "./types";

export type LogFn = (message: string) => void;

async function fetchEntityMetadataFull(logicalName: string, log?: LogFn): Promise<EntityMetadata> {
    const base = `EntityDefinitions(LogicalName='${logicalName}')`;
    const optionTypes = ["PicklistAttributeMetadata", "StatusAttributeMetadata", "StateAttributeMetadata", "BooleanAttributeMetadata", "MultiSelectPicklistAttributeMetadata"] as const;

    const [entityResult, attrResult, o2mResult, m2oResult, m2mResult, keysResult, ...typedResults] = await Promise.all([
        window.dataverseAPI.getEntityMetadata(logicalName, true),
        window.dataverseAPI.getEntityRelatedMetadata(logicalName, "Attributes"),
        window.dataverseAPI.getEntityRelatedMetadata(logicalName, "OneToManyRelationships"),
        window.dataverseAPI.getEntityRelatedMetadata(logicalName, "ManyToOneRelationships"),
        window.dataverseAPI.getEntityRelatedMetadata(logicalName, "ManyToManyRelationships"),
        window.dataverseAPI.getEntityRelatedMetadata(logicalName, "Keys"),
        ...optionTypes.map((t) => window.dataverseAPI.queryData(`${base}/Attributes/Microsoft.Dynamics.CRM.${t}?$select=LogicalName&$expand=OptionSet`)),
    ]);

    const raw = entityResult as Record<string, unknown>;

    const optionSetByLogicalName = new Map<string, OptionSetMetadata>();
    for (const result of typedResults) {
        for (const item of result.value) {
            const logName = item["LogicalName"] as string;
            const optRaw = item["OptionSet"] as Record<string, unknown> | null;
            if (logName && optRaw) {
                const optionSet = parseOptionSet(optRaw);
                if (optionSet.Options.length > 0) {
                    optionSetByLogicalName.set(logName, optionSet);
                }
            }
        }
    }

    const attrRawList = (attrResult as { value: Record<string, unknown>[] }).value ?? [];
    const attributes = attrRawList.map((rawAttr) => {
        const attr = parseAttribute(rawAttr);
        const merged = optionSetByLogicalName.get(attr.LogicalName);
        if (merged) attr.OptionSet = merged;
        return attr;
    });

    if (log) {
        const withOptions = attributes.filter((a) => a.OptionSet && a.OptionSet.Options.length > 0).length;
        log(`\t[${logicalName}] attrs=${attributes.length} withOptions=${withOptions}`);
    }

    const oneToMany = parseRelationships((o2mResult as { value: unknown[] }).value);
    const manyToOne = parseRelationships((m2oResult as { value: unknown[] }).value);
    const manyToMany = parseRelationships((m2mResult as { value: unknown[] }).value);

    return {
        LogicalName: (raw["LogicalName"] as string) ?? logicalName,
        SchemaName: (raw["SchemaName"] as string) ?? logicalName,
        DisplayName: raw["DisplayName"] as EntityMetadata["DisplayName"],
        Description: raw["Description"] as EntityMetadata["Description"],
        LogicalCollectionName: raw["LogicalCollectionName"] as string | undefined,
        EntitySetName: raw["EntitySetName"] as string | undefined,
        PrimaryIdAttribute: raw["PrimaryIdAttribute"] as string | undefined,
        PrimaryNameAttribute: raw["PrimaryNameAttribute"] as string | undefined,
        Attributes: attributes,
        OneToManyRelationships: oneToMany,
        ManyToOneRelationships: manyToOne,
        ManyToManyRelationships: manyToMany,
        Keys: ((keysResult as { value: Record<string, unknown>[] }).value ?? []).map(
            (k) =>
                ({
                    MetadataId: k["MetadataId"] as string,
                    KeyAttributes: k["KeyAttributes"] as string[],
                }) satisfies EntityKeyMetadata,
        ),
    };
}

export function parseAttribute(raw: Record<string, unknown>): AttributeMetadata {
    const optionSetRaw = raw["OptionSet"] as Record<string, unknown> | null;
    let optionSet: OptionSetMetadata | undefined;
    if (optionSetRaw) {
        optionSet = parseOptionSet(optionSetRaw);
    }
    return {
        LogicalName: (raw["LogicalName"] as string) ?? "",
        SchemaName: (raw["SchemaName"] as string) ?? "",
        DisplayName: raw["DisplayName"] as AttributeMetadata["DisplayName"],
        Description: raw["Description"] as AttributeMetadata["Description"],
        AttributeType: (raw["AttributeType"] as string) ?? "String",
        AttributeTypeName: raw["AttributeTypeName"] as { Value: string } | undefined,
        AttributeOf: raw["AttributeOf"] as string | undefined,
        IsValidForCreate: raw["IsValidForCreate"] as boolean | undefined,
        IsValidForUpdate: raw["IsValidForUpdate"] as boolean | undefined,
        IsValidForRead: raw["IsValidForRead"] as boolean | undefined,
        IsPrimaryId: raw["IsPrimaryId"] as boolean | undefined,
        IsPrimaryName: raw["IsPrimaryName"] as boolean | undefined,
        IsRenameable: raw["IsRenameable"] as { Value: boolean } | undefined,
        Targets: raw["Targets"] as string[] | undefined,
        OptionSet: optionSet,
        DeprecatedVersion: raw["DeprecatedVersion"] as string | null | undefined,
    };
}

function parseOptionSet(raw: Record<string, unknown>): OptionSetMetadata {
    const optionsRaw = Array.isArray(raw["Options"]) ? (raw["Options"] as Record<string, unknown>[]) : [];
    return {
        MetadataId: (raw["MetadataId"] as string) ?? "",
        Name: (raw["Name"] as string) ?? "",
        DisplayName: raw["DisplayName"] as OptionSetMetadata["DisplayName"],
        Description: raw["Description"] as OptionSetMetadata["Description"],
        OptionSetType: (raw["OptionSetType"] as string) ?? "Picklist",
        IsGlobal: raw["IsGlobal"] as boolean | null,
        Options: optionsRaw.map((o) => ({
            Value: o["Value"] as number | null,
            Label: o["Label"] as OptionSetMetadata["DisplayName"],
            Description: o["Description"] as OptionSetMetadata["DisplayName"] | undefined,
            Color: o["Color"] as string | undefined,
            DisplayOrder: o["DisplayOrder"] as number | undefined,
        })),
    };
}

function parseRelationships(raw: unknown): EntityMetadata["OneToManyRelationships"] {
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[]).map((r) => ({
        SchemaName: (r["SchemaName"] as string) ?? "",
        RelationshipType: r["RelationshipType"] as "OneToManyRelationship" | "ManyToManyRelationship",
        ReferencedEntity: r["ReferencedEntity"] as string | undefined,
        ReferencingEntity: r["ReferencingEntity"] as string | undefined,
        ReferencedEntityNavigationPropertyName: r["ReferencedEntityNavigationPropertyName"] as string | undefined,
        ReferencingEntityNavigationPropertyName: r["ReferencingEntityNavigationPropertyName"] as string | undefined,
        Entity1LogicalName: r["Entity1LogicalName"] as string | undefined,
        Entity2LogicalName: r["Entity2LogicalName"] as string | undefined,
        Entity1NavigationPropertyName: r["Entity1NavigationPropertyName"] as string | undefined,
        Entity2NavigationPropertyName: r["Entity2NavigationPropertyName"] as string | undefined,
    }));
}

async function writeTextWithPermission(path: string, content: string, log: LogFn): Promise<void> {
    const lastSlash = path.lastIndexOf("/");
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash) : "";
    if (dir) {
        await window.toolboxAPI.fileSystem.createDirectory(dir);
    }

    const doWrite = async (): Promise<void> => {
        await window.toolboxAPI.fileSystem.writeText(path, content);
        log(`\tCode written to ${path}.`);
    };

    try {
        await doWrite();
    } catch (err) {
        const msg = String(err);
        if (msg.includes("Access denied") || msg.includes("permission")) {
            log(`\tAccess denied — requesting permission for: ${dir}`);
            const granted = await window.toolboxAPI.fileSystem.selectPath({
                type: "folder",
                title: "Grant access to output folder",
                defaultPath: dir,
            });
            if (!granted) throw new Error(`Access denied to ${dir} and permission request was cancelled.`);
            await window.toolboxAPI.fileSystem.createDirectory(dir);
            await doWrite();
        } else {
            throw err;
        }
    }
}

function resolveFolderAndFile(folderSetting: string, defaultFilename: string): { dir: string; filename: string } {
    const normalised = folderSetting.replace(/\\/g, "/").trim();
    if (normalised.endsWith(".cs")) {
        const lastSlash = normalised.lastIndexOf("/");
        if (lastSlash >= 0) {
            return { dir: normalised.slice(0, lastSlash), filename: normalised.slice(lastSlash + 1) };
        }

        return { dir: "", filename: normalised };
    }
    return { dir: normalised, filename: defaultFilename };
}

export async function captureMetadata(settings: EbgSettings, outputDir: string, log: LogFn): Promise<void> {
    const snapshotDir = joinPath(outputDir, "metadata-snapshot");
    log("Fetching entity list...");
    const allEntitiesList = await window.dataverseAPI.getAllEntitiesMetadata(["LogicalName", "SchemaName", "DisplayName"]);
    await writeTextWithPermission(joinPath(snapshotDir, "entities-list.json"), JSON.stringify(allEntitiesList, null, 2), log);
    log(`\tSaved entities-list.json (${allEntitiesList.value.length} entities)`);

    const filter = new FilterService(settings);
    const toGenerate = allEntitiesList.value
        .map((e) => ({
            logicalName: (e.LogicalName ?? "").toLowerCase(),
            schemaName: (e["SchemaName"] as string) ?? "",
        }))
        .filter((e) =>
            filter.shouldGenerateEntity({
                LogicalName: e.logicalName,
                SchemaName: e.schemaName,
                DisplayName: { LocalizedLabels: [] },
                Attributes: [],
            }),
        );

    log(`Fetching full metadata for ${toGenerate.length} entities...`);
    const BATCH = 5;
    for (let i = 0; i < toGenerate.length; i += BATCH) {
        const batch = toGenerate.slice(i, i + BATCH);
        const results = await Promise.all(batch.map((e) => fetchEntityMetadataFull(e.logicalName, log)));
        for (const entity of results) {
            await writeTextWithPermission(joinPath(snapshotDir, `entity-${entity.LogicalName}.json`), JSON.stringify(entity, null, 2), log);
        }
        log(`\tSaved ${Math.min(i + BATCH, toGenerate.length)} / ${toGenerate.length}`);
    }

    log(`Metadata snapshot written to ${snapshotDir}`);
}

export async function runCodegen(settings: EbgSettings, settingsDir: string, outputDir: string, log: LogFn, appVersion: string, onProgress?: (pct: number) => void): Promise<void> {
    const progress = onProgress ?? (() => {});
    log("=== Early Bound Generator ===");
    progress(0);

    log("Loading dictionary...");
    const sortedOverrides = [...settings.tokenCapitalizationOverrides].sort((a, b) => b.length - a.length);
    const loadBuiltIn = async (): Promise<string> => {
        const resp = await fetch("/DLaB.Dictionary.txt");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.text();
    };
    let caser: CamelCaser;
    try {
        let text: string;
        const customRelPath = settings.camelCaseNamesDictionaryRelativePath?.trim();
        if (customRelPath && window.toolboxAPI) {
            const absPath = joinPath(settingsDir, customRelPath);
            const exists = await window.toolboxAPI.fileSystem.exists(absPath).catch(() => false);
            if (exists) {
                log(`\tLoaded custom dictionary: ${absPath}`);
                text = await window.toolboxAPI.fileSystem.readText(absPath);
            } else {
                log(`\tCustom dictionary not found (${absPath}), using built-in.`);
                text = await loadBuiltIn();
            }
        } else {
            text = await loadBuiltIn();
        }
        caser = new CamelCaser(buildDictionary(text, settings.camelCaseCustomWords), sortedOverrides);
    } catch (err) {
        log(`\tWarning: could not load dictionary (${String(err)}), falling back to title-case only.`);
        caser = new CamelCaser(new Map(), sortedOverrides);
    }

    progress(2);
    const naming = new NamingService(settings, caser);
    const filter = new FilterService(settings);

    log("Fetching entity list...");
    const allEntitiesList = await window.dataverseAPI.getAllEntitiesMetadata(["LogicalName", "SchemaName", "DisplayName"]);
    const allEntitySummaries = allEntitiesList.value.map((e) => ({
        logicalName: (e.LogicalName ?? "").toLowerCase(),
        schemaName: (e["SchemaName"] as string) ?? "",
    }));

    const toGenerate = allEntitySummaries.filter((e) =>
        filter.shouldGenerateEntity({
            LogicalName: e.logicalName,
            SchemaName: e.schemaName,
            DisplayName: { LocalizedLabels: [] },
            Attributes: [],
        }),
    );

    progress(5);
    log(`Fetching metadata for ${toGenerate.length} entities...`);

    const allEntitiesMap = new Map<string, EntityMetadata>();
    const generatedEntities: EntityMetadata[] = [];

    const BATCH = 5;
    for (let i = 0; i < toGenerate.length; i += BATCH) {
        const batch = toGenerate.slice(i, i + BATCH);
        const results = await Promise.all(batch.map((e) => fetchEntityMetadataFull(e.logicalName, log)));
        for (const entity of results) {
            allEntitiesMap.set(entity.LogicalName.toLowerCase(), entity);
            generatedEntities.push(entity);
        }
        log(`\tFetched ${Math.min(i + BATCH, toGenerate.length)} / ${toGenerate.length}`);
        progress(5 + Math.round((Math.min(i + BATCH, toGenerate.length) / Math.max(toGenerate.length, 1)) * 65));
    }

    progress(70);
    const entityFolderAndFile = resolveFolderAndFile(settings.entityTypesFolder, "Entities.cs");
    const entityDir = entityFolderAndFile.dir ? joinPath(outputDir, entityFolderAndFile.dir) : outputDir;

    if (settings.createOneFilePerEntity) {
        log(`--- Entities (${generatedEntities.length}) ---`);
        for (const entity of generatedEntities) {
            const className = naming.getNameForEntity(entity);
            const content = generateEntityFile(entity, allEntitiesMap, {
                settings,
                namingService: naming,
                filterService: filter,
                suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
                appVersion,
            });
            const filePath = joinPath(entityDir, `${className}.cs`);
            await writeTextWithPermission(filePath, content, log);
        }
    } else {
        log("--- Entities (combined) ---");
        const header = codeFileHeader(settings.namespace);
        for (const entity of generatedEntities) {
            const content = generateEntityFile(entity, allEntitiesMap, {
                settings,
                namingService: naming,
                filterService: filter,
                suppressGeneratedCode: settings.suppressGeneratedCodeAttribute,
                appVersion,
            });

            const inner = extractNamespaceBody(content, settings.namespace);
            if (inner) header.verbatim(inner);
        }
        header.verbatim("}", "#pragma warning restore CS1591");
        await writeTextWithPermission(joinPath(entityDir, entityFolderAndFile.filename), header.toString(), log);
    }

    progress(80);
    const optionSetFolderAndFile = resolveFolderAndFile(settings.optionSetsTypesFolder, "OptionSet.cs");
    const optionSetDir = optionSetFolderAndFile.dir ? joinPath(outputDir, optionSetFolderAndFile.dir) : outputDir;

    const allOptionSets = collectOptionSets(generatedEntities, settings, filter);

    if (settings.createOneFilePerOptionSet) {
        log(`--- Option Sets (${allOptionSets.length}) ---`);
        if (settings.groupLocalOptionSetsByEntity) {
            const byEntity = new Map<string, Array<OptionSetMetadata>>();
            for (const { entity, optionSet } of allOptionSets) {
                const key = entity?.LogicalName ?? "__global__";
                if (!byEntity.has(key)) byEntity.set(key, []);
                byEntity.get(key)!.push(optionSet);
            }
            for (const [entityLogical, optionSets] of byEntity) {
                const entity = entityLogical !== "__global__" ? (allEntitiesMap.get(entityLogical.toLowerCase()) ?? null) : null;
                const entityName = entity ? naming.getNameForEntity(entity) : "GlobalOptionSets";
                const content = generateEntityOptionSetsFile(
                    entity ?? { LogicalName: "global", SchemaName: "global", DisplayName: { LocalizedLabels: [] }, Attributes: [] },
                    optionSets,
                    naming,
                    settings,
                );
                await writeTextWithPermission(joinPath(optionSetDir, `${entityName}.cs`), content, log);
            }
        } else {
            for (const { entity, optionSet } of allOptionSets) {
                const enumName = naming.getNameForOptionSet(entity, optionSet);
                const content = generateSingleOptionSetFile(entity, optionSet, naming, settings);
                await writeTextWithPermission(joinPath(optionSetDir, `${enumName}.cs`), content, log);
            }
        }
    } else {
        log("--- Option Sets (combined) ---");
        const content = generateOptionSetsFile(allOptionSets, naming, settings);
        await writeTextWithPermission(joinPath(optionSetDir, optionSetFolderAndFile.filename), content, log);
    }

    progress(88);
    log("--- Service Context ---");
    const contextContent = generateContextFile(generatedEntities, naming, settings);
    await writeTextWithPermission(joinPath(outputDir, `${settings.serviceContextName}.cs`), contextContent, log);

    progress(92);
    if (settings.generateMessages) {
        const messagePairs = await fetchSdkMessages(settings, filter, log);
        const messageFolderAndFile = resolveFolderAndFile(settings.messageTypesFolder, "Messages.cs");
        const messageDir = messageFolderAndFile.dir ? joinPath(outputDir, messageFolderAndFile.dir) : outputDir;

        if (messagePairs.length > 0) {
            if (settings.createOneFilePerMessage) {
                log(`--- Messages (${messagePairs.length}) ---`);
                for (const pair of messagePairs) {
                    const content = generateMessageFile(pair, settings, naming);
                    const messageFileName = naming.camelCase(pair.Request.Name);
                    await writeTextWithPermission(joinPath(messageDir, `${messageFileName}.cs`), content, log);
                }
            } else {
                log("--- Messages (combined) ---");
                const content = generateMessagesFile(messagePairs, settings, naming);
                await writeTextWithPermission(joinPath(messageDir, messageFolderAndFile.filename), content, log);
            }
        } else {
            log("\tNo messages matched the filter.");
        }
    }

    progress(100);
    log("=== Generation Complete ===");
}

async function fetchSdkMessages(settings: EbgSettings, filter: FilterService, log: LogFn): Promise<SdkMessagePair[]> {
    try {
        const msgFilter = buildMessageODataFilter(settings);
        const query = `sdkmessages?$select=name,sdkmessageid&$filter=${encodeURIComponent(msgFilter)}&$top=500`;
        const result = await window.dataverseAPI.queryData(query);
        const messages = result.value;

        const pairs: SdkMessagePair[] = [];
        for (const msg of messages) {
            const name = msg["name"] as string;
            if (!filter.shouldGenerateMessage(name)) continue;

            const pair = await fetchMessagePair(name, msg["sdkmessageid"] as string);
            if (pair) pairs.push(pair);
        }
        return pairs;
    } catch (err) {
        log(`\tWarning: Could not fetch SDK messages: ${getErrorMessage(err)}`);
        return [];
    }
}

function buildMessageODataFilter(settings: EbgSettings): string {
    if (settings.messagesWhitelist.length > 0) {
        const names = settings.messagesWhitelist.map((n) => `name eq '${n.replace(/'/g, "''")}'`).join(" or ");
        return names;
    }
    return "autotransact eq true";
}

async function fetchMessagePair(messageName: string, messageId: string): Promise<SdkMessagePair | null> {
    try {
        const pairResult = await window.dataverseAPI.queryData(`sdkmessagepairs?$select=sdkmessagepairid&$filter=_sdkmessageid_value eq ${messageId}&$top=1`);
        const pairs = pairResult.value;
        if (!pairs.length) return null;

        const pairId = pairs[0]["sdkmessagepairid"] as string;

        const reqResult = await window.dataverseAPI.queryData(`sdkmessagerequests?$select=sdkmessagerequestid&$filter=_sdkmessagepairid_value eq ${pairId}&$top=1`);
        const requests = reqResult.value;
        if (!requests.length) return null;

        const requestId = requests[0]["sdkmessagerequestid"] as string;

        const reqFields = await window.dataverseAPI.queryData(`sdkmessagerequestfields?$select=name,clrparser,optional,position&$filter=_sdkmessagerequestid_value eq ${requestId}&$orderby=position`);

        const respResult = await window.dataverseAPI.queryData(`sdkmessageresponses?$select=sdkmessageresponseid&$filter=_sdkmessagerequestid_value eq ${requestId}&$top=1`);
        const responses = respResult.value;
        let responseFields: Record<string, unknown>[] = [];

        if (responses.length) {
            const responseId = responses[0]["sdkmessageresponseid"] as string;
            const respFields = await window.dataverseAPI.queryData(
                `sdkmessageresponsefields?$select=name,clrformatter,position&$filter=_sdkmessageresponseid_value eq ${responseId}&$orderby=position`,
            );
            responseFields = respFields.value;
        }

        return {
            Request: {
                Name: messageName,
                Fields: reqFields.value.map((f) => ({
                    Name: (f["name"] as string) ?? "",
                    ClrFormatter: f["clrparser"] as string | undefined,
                    IsOptional: (f["optional"] as boolean | undefined) ?? false,
                    Index: f["position"] as number | undefined,
                })),
            },
            Response: {
                Fields: responseFields.map((f) => ({
                    Name: (f["name"] as string) ?? "",
                    ClrFormatter: f["clrformatter"] as string | undefined,
                    Index: f["position"] as number | undefined,
                })),
            },
        };
    } catch {
        return null;
    }
}
