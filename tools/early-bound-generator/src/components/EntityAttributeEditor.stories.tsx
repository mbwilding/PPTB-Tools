import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EntityAttributeEditor } from "./EntityAttributeEditor";

const meta = {
    title: "Components/EntityAttributeEditor",
    component: EntityAttributeEditor,
    parameters: {
        layout: "padded",
    },
    args: {
        onChange: fn(),
    },
    render: function Render(args) {
        const [entries, setEntries] = useState(args.entries);
        return (
            <EntityAttributeEditor
                entries={entries}
                onChange={(value) => {
                    setEntries(value);
                    args.onChange(value);
                }}
            />
        );
    },
} satisfies Meta<typeof EntityAttributeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        entries: {},
    },
};

export const WithEntries: Story = {
    args: {
        entries: {
            account: ["name", "accountnumber", "revenue"],
            contact: ["fullname", "emailaddress1"],
        },
    },
};
