import { useEffect } from "react";
import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/styles.css";

const withTheme: Decorator = (Story, context) => {
    const theme = context.globals.theme as string;

    useEffect(() => {
        document.body.classList.toggle("dark-theme", theme === "dark");
    }, [theme]);

    return <Story />;
};

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },

        a11y: {
            // 'todo' - show a11y violations in the test UI only
            // 'error' - fail CI on a11y violations
            // 'off' - skip a11y checks entirely
            test: "todo",
        },
    },

    globalTypes: {
        theme: {
            description: "PPTB theme",
            toolbar: {
                title: "Theme",
                icon: "circlehollow",
                items: [
                    { value: "light", icon: "sun", title: "Light" },
                    { value: "dark", icon: "moon", title: "Dark" },
                ],
                dynamicTitle: true,
            },
        },
    },

    initialGlobals: {
        theme: "light",
    },

    decorators: [withTheme],
};

export default preview;
