interface SettingsToolbarProps {
    isGenerating: boolean;
    settingsPath: string;
    onOpenSettings: () => void;
    onSaveSettings: () => void;
    onResetSettings: () => void;
}

export function SettingsToolbar({ isGenerating, settingsPath, onOpenSettings, onSaveSettings, onResetSettings }: SettingsToolbarProps) {
    return (
        <div className="main-toolbar">
            <button className="toolbar-btn" onClick={onOpenSettings} disabled={isGenerating} title="Select a folder containing EBG settings">
                Open Settings
            </button>
            <button className="toolbar-btn" onClick={onSaveSettings} disabled={isGenerating} title="Save settings to file">
                Save Settings
            </button>
            <button className="toolbar-btn" onClick={onResetSettings} disabled={isGenerating} title="Reset all settings to defaults and clear the loaded folder">
                Reset Settings
            </button>
            {settingsPath && (
                <>
                    <div className="toolbar-separator" />
                    <span className="toolbar-path" title={settingsPath}>
                        <bdi>{settingsPath}</bdi>
                    </span>
                </>
            )}
        </div>
    );
}
