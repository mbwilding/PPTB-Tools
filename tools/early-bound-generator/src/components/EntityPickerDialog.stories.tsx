import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EntityPickerDialog } from "./EntityPickerDialog";

const MOCK_ENTITIES = [
    { LogicalName: "account", DisplayName: { LocalizedLabels: [{ LanguageCode: 1033, Label: "Account" }] } },
    { LogicalName: "contact", DisplayName: { LocalizedLabels: [{ LanguageCode: 1033, Label: "Contact" }] } },
    { LogicalName: "opportunity", DisplayName: { LocalizedLabels: [{ LanguageCode: 1033, Label: "Opportunity" }] } },
    { LogicalName: "systemuser", DisplayName: { LocalizedLabels: [{ LanguageCode: 1033, Label: "User" }] } },
];

const meta = {
    title: "Components/EntityPickerDialog",
    component: EntityPickerDialog,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "Fetches entities via `window.dataverseAPI`, only present inside Power Platform ToolBox with an active connection. The `NoConnection` story shows the fallback state; `Loaded` stubs the API to demonstrate the populated list.",
            },
        },
    },
    args: {
        isOpen: true,
        selectedEntities: [],
        onConfirm: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof EntityPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoConnection: Story = {
    decorators: [
        (Story) => {
            delete (window as { dataverseAPI?: unknown }).dataverseAPI;
            return <Story />;
        },
    ],
};

export const Loaded: Story = {
    args: {
        selectedEntities: ["account"],
    },
    decorators: [
        (Story) => {
            (window as unknown as { dataverseAPI: unknown }).dataverseAPI = {
                getAllEntitiesMetadata: () => Promise.resolve({ value: MOCK_ENTITIES }),
            };
            return <Story />;
        },
    ],
};
