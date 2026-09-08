import React from "react";
import ReactDOM from "react-dom/client";
import { ConversationProvider } from "@elevenlabs/react";
import { App } from "./App.jsx";
import { AssistantRuntimeProvider, useAssistantRuntime } from "./state/AssistantRuntime.jsx";
import "./styles.css";

function ElevenLabsBridge({ children }) {
  const runtime = useAssistantRuntime();
  return (
    <ConversationProvider
      onMessage={runtime.onMessage}
      onConnect={runtime.onConnect}
      onDisconnect={runtime.onDisconnect}
      onError={runtime.onError}
      clientTools={{
        show_products: runtime.showProducts,
        show_comparison: runtime.showComparison
      }}
    >
      {children}
    </ConversationProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AssistantRuntimeProvider>
      <ElevenLabsBridge>
        <App />
      </ElevenLabsBridge>
    </AssistantRuntimeProvider>
  </React.StrictMode>
);
