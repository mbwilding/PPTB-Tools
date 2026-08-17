import type { Meta, StoryObj } from "@storybook/react-vite";
import { PropertySection } from "./PropertySection";
import { SettingRow } from "./SettingRow";
import { BoolSettingRow } from "./BoolSettingRow";

const meta = {
    title: "Components/PropertySection",
    component: PropertySection,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        children: { control: false },
    },
} satisfies Meta<typeof PropertySection>;

export default meta;
type Story = StoryObj<typeof meta>;

const exampleRows = (
    <>
        <SettingRow label="Namespace" hint="C# namespace for all generated classes">
            <input className="form-input" defaultValue="DataverseModel" />
        </SettingRow>
        <BoolSettingRow label="Suppress Generated Code Attribute" hint="Omit [System.CodeDom.Compiler.GeneratedCode] from generated files" checked={false} onChange={() => {}} />
    </>
);

export const Expanded: Story = {
    args: {
        title: "Global",
        defaultExpanded: true,
        children: exampleRows,
    },
};

export const Collapsed: Story = {
    args: {
        title: "Debug",
        defaultExpanded: false,
        children: exampleRows,
    },
};
