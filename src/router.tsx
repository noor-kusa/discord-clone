import { Route, Routes, Navigate } from "react-router-dom";
import ServerPage from "./pages/ServerPage";
import HomePage from "./pages/HomePage";
import InvitePage from "./pages/InvitePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/servers/:serverId" element={<ServerPage />} />
      <Route path="/servers/:serverId/channels/:channelId" element={<ServerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
