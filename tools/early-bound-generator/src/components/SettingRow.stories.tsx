import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingRow } from "./SettingRow";
import { SearchContext } from "./SearchContext";

const meta = {
    title: "Components/SettingRow",
    component: SettingRow,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        children: { control: false },
    },
} satisfies Meta<typeof SettingRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        label: "Namespace",
        hint: "C# namespace for all generated classes",
        children: <input className="form-input" defaultValue="DataverseModel" />,
    },
};

export const WithoutHint: Story = {
    args: {
        label: "File Prefix Text",
        children: <input className="form-input" placeholder="(none)" />,
    },
};

export const FilteredOutBySearch: Story = {
    args: {
        label: "Namespace",
        hint: "C# namespace for all generated classes",
        children: <input className="form-input" defaultValue="DataverseModel" />,
    },
    decorators: [
        (Story) => (
            <>
                <p className="form-hint" style={{ marginBottom: 8 }}>
                    Renders nothing below — an active search query that does not match the label or hint hides the row.
                </p>
                <SearchContext.Provider value="zzz-no-match">
                    <Story />
                </SearchContext.Provider>
            </>
        ),
    ],
};
