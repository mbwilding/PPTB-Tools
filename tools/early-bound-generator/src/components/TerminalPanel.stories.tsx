import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TerminalPanel } from "./TerminalPanel";

const meta = {
    title: "Components/TerminalPanel",
    component: TerminalPanel,
    parameters: {
        layout: "padded",
    },
    args: {
        onClear: fn(),
        onCopy: fn(),
    },
} satisfies Meta<typeof TerminalPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        output: "",
    },
};

export const WithOutput: Story = {
    args: {
        output: [
            "Reading metadata from Dataverse...",
            "Generating entities: account, contact, opportunity",
            "Generating option sets: account_rating",
            "Generating messages: WhoAmI",
            "Done. Output written to Model/Entities",
        ].join("\n"),
    },
};
