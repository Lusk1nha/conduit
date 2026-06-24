import { createHashRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { ServicesPage } from "./pages/ServicesPage";
import { RelayPage } from "./pages/RelayPage";

// A hash router is used rather than a browser router: in the bundled Tauri
// app the frontend is served over a custom protocol, and hash-based routing
// avoids any dependency on server-side history fallback.
export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/workspaces" replace /> },
      { path: "workspaces", element: <WorkspacesPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "relay", element: <RelayPage /> },
    ],
  },
]);
