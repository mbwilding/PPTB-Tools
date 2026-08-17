import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { KeyValueEditor } from "./KeyValueEditor";

const meta = {
    title: "Components/KeyValueEditor",
    component: KeyValueEditor,
    parameters: {
        layout: "padded",
    },
    args: {
        onChange: fn(),
    },
    render: function Render(args) {
        const [entries, setEntries] = useState(args.entries);
        return (
            <KeyValueEditor
                {...args}
                entries={entries}
                onChange={(value) => {
                    setEntries(value);
                    args.onChange(value);
                }}
            />
        );
    },
} satisfies Meta<typeof KeyValueEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        entries: {},
        keyHeader: "Logical Name",
        valueHeader: "Class Name",
        keyPlaceholder: "e.g. account",
        valuePlaceholder: "e.g. MyAccount",
    },
};

export const WithEntries: Story = {
    args: {
        entries: { account: "MyAccount", contact: "MyContact" },
        keyHeader: "Logical Name",
        valueHeader: "Class Name",
        keyPlaceholder: "e.g. account",
        valuePlaceholder: "e.g. MyAccount",
    },
};
