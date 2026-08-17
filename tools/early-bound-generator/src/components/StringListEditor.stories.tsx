import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { StringListEditor } from "./StringListEditor";

const meta = {
    title: "Components/StringListEditor",
    component: StringListEditor,
    parameters: {
        layout: "padded",
    },
    args: {
        onChange: fn(),
    },
    render: function Render(args) {
        const [items, setItems] = useState(args.items);
        return (
            <StringListEditor
                {...args}
                items={items}
                onChange={(value) => {
                    setItems(value);
                    args.onChange(value);
                }}
            />
        );
    },
} satisfies Meta<typeof StringListEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        items: [],
        placeholder: "Add entity logical name...",
    },
};

export const WithItems: Story = {
    args: {
        items: ["account", "contact", "opportunity"],
        placeholder: "Add entity logical name...",
    },
};
