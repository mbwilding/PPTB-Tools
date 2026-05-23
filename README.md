# Power Platform ToolBox (PPTB) Tools

Tools for Power Platform ToolBox (PPTB) - a comprehensive toolkit for working with Microsoft Dataverse and Power Platform.

- [Power Platform ToolBox (PPTB) Tools](#power-platform-toolbox-pptb-tools)
    - [Overview](#overview)
    - [Tools](#tools)
        - [Early Bound Generator](#early-bound-generator)
    - [Contributing](#contributing)
    - [License](#license)

## Overview

This is a monorepo containing tools designed for Power Platform ToolBox (PPTB).

## Tools

### [Early Bound Generator](./tools/early-bound-generator)

Tool README: [here](./tools/early-bound-generator/README.md)

Generate strongly-typed C# early-bound classes for Dataverse entities, option sets, and messages directly inside Power Platform ToolBox. Exclusively for PPTB.

**Key Features:**

- **React + TypeScript**: Modern component-based architecture with Vite build system
- **PPTB-Only Integration**: Designed exclusively for Power Platform ToolBox
- **Entity classes**: Strongly-typed C# classes for Dataverse entities with attributes, relationships, and option set enums
- **Option set enums**: C# enums for all local and global option sets, state codes, and status reasons
- **Service context**: A typed `OrganizationServiceContext` subclass for LINQ queries
- **Message classes**: Request/response pairs for SDK messages, custom APIs, and actions
- **DLaB.ModelBuilderExtensions compatible**: Settings file uses the same XML format as XrmToolBox EarlyBoundGeneratorV2
- **CamelCase naming**: Full CamelCaser port including built-in dictionary and custom word support
- **Whitelist/blacklist filtering**: Entity, attribute, prefix, and message filters
- **Dark/Light theme support**: Follows PPTB theme settings automatically

**Use Cases:**

- Generate strongly-typed entity classes for Dataverse plugin and SDK development
- Migrate existing XrmToolBox EarlyBoundGeneratorV2 settings files directly into PPTB
- Maintain consistent early-bound code across environments without needing PAC CLI or a .NET runtime

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GPL-2.0 License - see the [LICENSE](LICENSE) file for details.
