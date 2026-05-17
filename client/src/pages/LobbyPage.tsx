import { FormEvent, useState } from "react";
import { Link2, LogOut, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { createRoom, getErrorMessage, joinRoom } from "../services/api";
import { LoadingButton } from "../components/ui/LoadingButton";

type LobbyPageProps = {
  navigate: (path: string) => void;
};

export function LobbyPage({ navigate }: LobbyPageProps) {
  const { session, signOut } = useAuth();
  const { notify } = useToast();
  const [roomName, setRoomName] = useState("Friday Movie Night");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setCreating(true);
    try {
      const room = await createRoom(roomName, session.accessToken);
      notify(`Room ${room.inviteCode} created.`, "success");
      navigate(`/room/${room.inviteCode}`);
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setCreating(false);
    }
  }

  async function submitJoin(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setJoining(true);
    try {
      const room = await joinRoom(inviteCode, session.accessToken);
      notify(`Joined ${room.name}.`, "success");
      navigate(`/room/${room.inviteCode}`);
    } catch (error) {
      notify("Invite code not found.", "error");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <header className="border-b border-white/10 bg-[#0d0d13]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#e50914]">Movie Sync</p>
            <h1 className="text-2xl font-black">Watch Party Lobby</h1>
          </div>
          <button className="ghost-button" onClick={signOut}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-2">
        <form onSubmit={submitCreate} className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="icon-tile bg-[#e50914]">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Create Room</h2>
              <p className="text-sm text-white/55">Generate a unique invite and jump into your room.</p>
            </div>
          </div>
          <label className="mt-6 block text-sm font-medium text-white/70" htmlFor="room-name">
            Room name
          </label>
          <input id="room-name" className="field mt-2" value={roomName} onChange={(event) => setRoomName(event.target.value)} />
          <LoadingButton type="submit" isLoading={creating} className="primary-button mt-4 w-full">
            <Plus size={18} />
            Create Room
          </LoadingButton>
        </form>

        <form onSubmit={submitJoin} className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="icon-tile bg-[#5865f2]">
              <Link2 size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Join Room</h2>
              <p className="text-sm text-white/55">Paste an invite code from a friend.</p>
            </div>
          </div>
          <label className="mt-6 block text-sm font-medium text-white/70" htmlFor="invite-code">
            Invite code
          </label>
          <input id="invite-code" className="field mt-2 uppercase" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="ABCD1234" />
          <LoadingButton type="submit" isLoading={joining} className="secondary-button mt-4 w-full" disabled={!inviteCode.trim()}>
            <Link2 size={18} />
            Join Room
          </LoadingButton>
        </form>
      </section>
    </main>
  );
}
