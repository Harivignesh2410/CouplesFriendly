import { FormEvent, useState } from "react";
import { Clapperboard, LogIn, UsersRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getErrorMessage } from "../services/api";
import { LoadingButton } from "../components/ui/LoadingButton";

export function LandingPage() {
  const [displayName, setDisplayName] = useState("");
  const { signIn, isSigningIn } = useAuth();
  const { notify } = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await signIn(displayName);
      notify("You are signed in. Create or join a room.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050509] text-white">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-8">
        <div className="cinema-glow" />
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_430px] lg:items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
              <Clapperboard size={16} />
              Movie Sync Watch Party
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight md:text-7xl">
              Stream in sync with your crew.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
              Create a private room, share the invite, chat live, and keep every play, pause, and seek event locked together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="pill">SignalR sync</span>
              <span className="pill">JWT session</span>
              <span className="pill">Invite links</span>
            </div>
          </div>

          <form onSubmit={submit} className="relative z-10 rounded-lg border border-white/10 bg-[#101018]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-[#e50914]">
                <UsersRound size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Enter the party</h2>
                <p className="text-sm text-white/55">Your display name appears in chat and online users.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-medium text-white/70" htmlFor="display-name">
              Display name
            </label>
            <input
              id="display-name"
              className="field mt-2"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Hari"
              autoFocus
            />
            <LoadingButton type="submit" isLoading={isSigningIn} className="primary-button mt-4 w-full">
              <LogIn size={18} />
              Continue
            </LoadingButton>
          </form>
        </div>
      </section>
    </main>
  );
}
