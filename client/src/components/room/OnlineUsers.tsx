import { Crown, UsersRound } from "lucide-react";
import type { Participant } from "../../lib/types";

type OnlineUsersProps = {
  participants: Participant[];
};

export function OnlineUsers({ participants }: OnlineUsersProps) {
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-lg font-bold">
          <UsersRound size={19} />
          Online
        </h2>
        <span className="rounded-full bg-[#1f8b4c]/15 px-3 py-1 text-sm font-semibold text-[#44d17d]">{participants.length}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {participants.length === 0 && <p className="text-sm text-white/45">Waiting for viewers.</p>}
        {participants.map((participant, index) => (
          <div key={participant.userId} className="flex items-center gap-3 rounded-md bg-white/[0.04] px-3 py-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2b2d42] text-sm font-black">
              {participant.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{participant.displayName}</p>
              <p className="text-xs text-white/40">watching now</p>
            </div>
            {index === 0 && <Crown className="text-[#f5c542]" size={16} />}
          </div>
        ))}
      </div>
    </section>
  );
}
