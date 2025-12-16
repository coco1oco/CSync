// pages/Messaging/MessagingList.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { CreateGroup } from "@/lib/CreateGroup";

type Conversation = {
  id: string;
  name: string;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
};

type ConversationMemberRow = {
  conversation_id: string;
  conversations: Conversation[]; // Supabase join returns array
};

type MessagingListProps = {
  userId: string;
};

export function MessagingList({ userId }: MessagingListProps) {
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();

  async function load() {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("conversation_members")
      .select("conversation_id, conversations(*)")
      .eq("user_id", userId);

    console.log("conversation_members result", { data, error });

    if (error) {
      console.error("load groups error", error);
      setGroups([]);
      setLoading(false);
      return;
    }

    const convs: Conversation[] = (data as ConversationMemberRow[])
      .flatMap((row) => row.conversations)
      .filter(
        (c): c is Conversation =>
          c !== null && c !== undefined && c.is_group
      )
      .sort((a, b) => {
        if (a.name === "Community") return -1;
        if (b.name === "Community") return 1;
        return a.name.localeCompare(b.name);
      });

    setGroups(convs);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !userId) return;

    setCreating(true);
    try {
      const group = await CreateGroup(name, userId);

      const { error: memberError } = await supabase
        .from("conversation_members")
        .insert({
          conversation_id: group.id,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        console.error("add member error", memberError);
      }

      setNewName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Groups</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="flex-1 rounded border px-2 py-1"
          placeholder="New group name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          disabled={creating || !userId}
          className="rounded bg-primary px-3 py-1 text-primary-foreground disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </form>

      {loading ? (
        <div>Loading groups...</div>
      ) : !groups.length ? (
        <div>No groups yet.</div>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li
              key={g.id}
              className="cursor-pointer rounded border px-3 py-2 hover:bg-muted"
              onClick={() => navigate(`/groups/${g.id}`)}
            >
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
