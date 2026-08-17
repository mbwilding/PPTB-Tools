import type { Meta, StoryObj } from "@storybook/react-vite";
import App from "./App";

const meta = {
    title: "Views/App",
    component: App,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "The full tool page as it renders outside Power Platform ToolBox — `window.toolboxAPI` is undefined here, so it shows the 'context not detected' banner while still rendering every settings section against `DEFAULT_SETTINGS`.",
            },
        },
    },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
