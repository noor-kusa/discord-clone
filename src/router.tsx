import { Route, Routes, Navigate } from "react-router-dom";
import ServerPage from "./pages/ServerPage";
import HomePage from "./pages/HomePage";
import InvitePage from "./pages/InvitePage";
import DmPage from "./pages/DmPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/servers/:serverId" element={<ServerPage />} />
      <Route path="/servers/:serverId/channels/:channelId" element={<ServerPage />} />
      <Route path="/dm" element={<DmPage />} />
      <Route path="/dm/:threadId" element={<DmPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
