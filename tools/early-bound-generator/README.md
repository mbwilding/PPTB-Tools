# Early Bound Generator

> **Alpha:** This tool is under active development so expect some rough edges.

Generate strongly-typed C# early-bound classes for Microsoft Dataverse entities, option sets, and messages directly inside Power Platform ToolBox.

A PPTB port of the popular [EarlyBoundGeneratorV2](https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator) XrmToolBox plugin by Daryl LaBar. Code generation is implemented entirely in TypeScript and runs inside PPTB — no PAC CLI or .NET runtime required. Settings files are fully compatible with EarlyBoundGeneratorV2.

## Getting Started

### Sandbox and Folder Permissions

PPTB tools run in a sandboxed context where filesystem access is only granted to folders explicitly selected through the native folder picker. For the simplest setup, keep your settings file and generated output in the same folder or a sub-folder of it — no extra prompts needed. If the output directory is outside the settings folder, the tool will automatically prompt for a second picker confirmation to grant access.

On subsequent loads, the tool will prompt you to re-confirm the last used folder for the active connection. Each Dataverse connection remembers its own last folder independently.

### Basic Usage

1. Create a folder for your project — it will hold both the settings file and generated `.cs` files
2. Click **Open Settings** and select that folder
3. Optionally configure **Global → Output Relative Directory** to a sub-folder (e.g. `Generated`)
4. Select entities under **Entities → Entities Whitelist**, or leave blank to generate all
5. Click **Generate**

## Settings

Settings are stored in `DLaB.EarlyBoundGeneratorV2.DefaultSettings.xml`, using the same format as XrmToolBox EarlyBoundGeneratorV2. Existing settings files can be opened directly. For full documentation on available settings refer to the [EarlyBoundGeneratorV2 wiki](https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator).

Each setting in the UI has a tooltip describing its effect.

## Compatibility

Generated code targets the same output as XrmToolBox EarlyBoundGeneratorV2 with `DLaB.ModelBuilderExtensions`. Settings files (`.xml`) are fully interchangeable between the two tools.

## Building

```bash
cd tools/early-bound-generator
npm install
npm run build
```

## Reference

- [EarlyBoundGeneratorV2 Wiki](https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator)
- [EarlyBoundGeneratorV2 Source](https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools)
- [Microsoft Dataverse SDK](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/overview)
