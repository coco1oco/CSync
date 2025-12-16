// pages/Messaging/GroupChatPage.tsx
import { type FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { UseGroupChat } from "@/lib/UseGroupChat";

type GroupPageProps = {
  userId: string;
};

export function GroupPage({ userId }: GroupPageProps) {
  const { id: groupId } = useParams<{ id: string }>();
  const { messages, loading, sendMessage } = UseGroupChat(groupId ?? "");
  const [input, setInput] = useState("");

  if (!groupId) return <div>Missing group id.</div>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(userId, input);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto border p-3">
        {loading && <div>Loading messages…</div>}
        {!loading && !messages.length && <div>No messages yet.</div>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold">
              {m.sender_id.slice(0, 6)}:{" "}
            </span>
            <span>{m.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded border px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button
          type="submit"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
        >
          Send
        </button>
      </form>
    </div>
  );
}
