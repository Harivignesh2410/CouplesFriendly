import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import type { ChatMessage } from "../../lib/types";
import { LoadingButton } from "../ui/LoadingButton";

type ChatSidebarProps = {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
};

export function ChatSidebar({ messages, onSend, disabled }: ChatSidebarProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    setSending(true);
    try {
      await onSend(message);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel flex min-h-[430px] flex-col p-4 lg:min-h-0">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold">
        <MessageCircle size={19} />
        Chat
      </h2>
      <div ref={scrollRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="rounded-md bg-white/[0.04] p-3 text-sm text-white/45">No messages yet.</p>}
        {messages.map((item) => (
          <article key={item.id} className="rounded-md bg-[#1a1a24] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-white">{item.displayName}</p>
              <time className="text-xs text-white/35">{new Date(item.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <p className="mt-1 break-words text-sm leading-6 text-white/72">{item.message}</p>
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input className="field min-w-0 flex-1" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message the room" disabled={disabled} />
        <LoadingButton type="submit" isLoading={sending} className="primary-icon-button" disabled={disabled || !message.trim()}>
          <Send size={18} />
        </LoadingButton>
      </form>
    </section>
  );
}
