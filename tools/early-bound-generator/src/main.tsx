import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const applyThemeClass = (theme: string) => {
    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
};

const resolveTheme = async () => {
    if (window.toolboxAPI) {
        const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
        applyThemeClass(currentTheme);
    }
};

const themeEventHandler = (_event: ToolBoxAPI.ToolBoxEvent, payload: ToolBoxAPI.ToolBoxEventPayload) => {
    if (payload.event === "settings:updated") {
        const data = payload.data as { theme?: string } | null;
        const theme = data?.theme;
        if (theme) {
            applyThemeClass(theme);
        } else {
            void resolveTheme();
        }
        return;
    }

    if (payload.event === "connection:created" || payload.event === "connection:updated" || payload.event === "connection:deleted") {
        window.dispatchEvent(new CustomEvent("pptb:event", { detail: "connection:changed" }));
    }
};

const registerToolboxEvents = () => {
    if (window.toolboxAPI) {
        window.toolboxAPI.events.on(themeEventHandler);
    }
};

void resolveTheme();
registerToolboxEvents();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
