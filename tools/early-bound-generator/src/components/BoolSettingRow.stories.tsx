import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BoolSettingRow } from "./BoolSettingRow";

const meta = {
    title: "Components/BoolSettingRow",
    component: BoolSettingRow,
    parameters: {
        layout: "padded",
    },
    args: {
        onChange: fn(),
    },
    render: function Render(args) {
        const [checked, setChecked] = useState(args.checked);
        return (
            <BoolSettingRow
                {...args}
                checked={checked}
                onChange={(value) => {
                    setChecked(value);
                    args.onChange(value);
                }}
            />
        );
    },
} satisfies Meta<typeof BoolSettingRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
    args: {
        label: "Suppress Generated Code Attribute",
        hint: "Omit [System.CodeDom.Compiler.GeneratedCode] from generated files",
        checked: false,
    },
};

export const Checked: Story = {
    args: {
        label: "Generate Entity Relationships",
        hint: "Generate relationship navigation properties on entity classes",
        checked: true,
    },
};
