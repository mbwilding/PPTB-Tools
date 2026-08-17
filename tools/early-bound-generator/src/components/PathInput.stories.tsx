import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PathInput } from "./PathInput";

const meta = {
    title: "Components/PathInput",
    component: PathInput,
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component: "The Browse button calls `window.toolboxAPI.fileSystem.selectPath`, which is only available inside Power Platform ToolBox — it is a no-op here in Storybook.",
            },
        },
    },
    args: {
        onChange: fn(),
        settingsDir: "C:/repos/my-project",
    },
    render: function Render(args) {
        const [value, setValue] = useState(args.value);
        return (
            <PathInput
                {...args}
                value={value}
                onChange={(v) => {
                    setValue(v);
                    args.onChange(v);
                }}
            />
        );
    },
} satisfies Meta<typeof PathInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FolderEmpty: Story = {
    args: {
        value: "",
        type: "folder",
        placeholder: "(same folder as settings file)",
        title: "Select output directory",
    },
};

export const FolderWithValue: Story = {
    args: {
        value: "Model/Entities",
        type: "folder",
        title: "Select output directory",
    },
};

export const File: Story = {
    args: {
        value: "builderSettings.json",
        type: "file",
        filters: [{ name: "JSON files", extensions: ["json"] }],
        title: "Select builder settings JSON file",
    },
};
