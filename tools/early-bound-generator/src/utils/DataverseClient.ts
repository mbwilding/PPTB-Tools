export class DataverseClient {
    async fetchAllEntities(): Promise<Array<{ logicalName: string; displayName: string }>> {
        try {
            const response = await window.dataverseAPI.getAllEntitiesMetadata(["LogicalName", "DisplayName"]);
            return response.value.map((e) => {
                const label = e.DisplayName?.LocalizedLabels.find((l) => l.LanguageCode === 1033)?.Label ?? e.DisplayName?.LocalizedLabels[0]?.Label ?? "";
                return {
                    logicalName: e.LogicalName.toLowerCase(),
                    displayName: label,
                };
            });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch entities: ${msg}`);
        }
    }
}
