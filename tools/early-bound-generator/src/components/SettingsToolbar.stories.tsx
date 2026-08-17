import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SettingsToolbar } from "./SettingsToolbar";

const meta = {
    title: "Components/SettingsToolbar",
    component: SettingsToolbar,
    parameters: {
        layout: "padded",
    },
    args: {
        onOpenSettings: fn(),
        onSaveSettings: fn(),
        onResetSettings: fn(),
    },
} satisfies Meta<typeof SettingsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSettingsLoaded: Story = {
    args: {
        isGenerating: false,
        settingsPath: "",
    },
};

export const SettingsLoaded: Story = {
    args: {
        isGenerating: false,
        settingsPath: "C:/repos/my-project/DLaB.EarlyBoundGeneratorV2.DefaultSettings.xml",
    },
};

export const Generating: Story = {
    args: {
        isGenerating: true,
        settingsPath: "C:/repos/my-project/DLaB.EarlyBoundGeneratorV2.DefaultSettings.xml",
    },
};
