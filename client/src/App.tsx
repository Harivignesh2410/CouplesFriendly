import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LobbyPage } from "./pages/LobbyPage";
import { RoomPage } from "./pages/RoomPage";

export default function App() {
  const { session } = useAuth();
  const [route, setRoute] = useState(() => window.location.pathname);

  const inviteCode = useMemo(() => {
    const match = route.match(/\/room\/([^/]+)/i);
    return match?.[1] ?? null;
  }, [route]);

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  function navigate(path: string) {
    window.history.pushState(null, "", path);
    setRoute(path);
  }

  if (!session) {
    return <LandingPage />;
  }

  if (inviteCode) {
    return <RoomPage inviteCode={inviteCode} navigate={navigate} />;
  }

  return <LobbyPage navigate={navigate} />;
}
