import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { MotionProvider } from "@bespoke/design-system";
import App from "./app/App";
import "./styles/storefront.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

const embeddedPreview = Boolean(
  (
    window as typeof window & {
      __BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__?: boolean;
    }
  ).__BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__,
);

const application = <App />;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionProvider>
      <QueryClientProvider client={queryClient}>
        {embeddedPreview ? (
          <MemoryRouter
            initialEntries={["/"]}
            future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          >
            {application}
          </MemoryRouter>
        ) : (
          <BrowserRouter
            future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          >
            {application}
          </BrowserRouter>
        )}
      </QueryClientProvider>
    </MotionProvider>
  </React.StrictMode>,
);
