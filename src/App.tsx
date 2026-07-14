import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AppRoutes from "./router";
import PresenceHeartbeat from "./components/layout/PresenceHeartbeat";

export default function App() {
  return (
    <BrowserRouter>
      <AuthLoading>
        <div className="flex h-screen items-center justify-center bg-discord-bg text-gray-400">
          Loading…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
      <Authenticated>
        <PresenceHeartbeat />
        <AppRoutes />
      </Authenticated>
    </BrowserRouter>
  );
}
