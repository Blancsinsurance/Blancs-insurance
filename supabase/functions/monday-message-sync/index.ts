// Supabase Edge Function: monday-message-sync
// Triggered by Database Webhook on public.messages INSERT
//
// Searches (in order): Sales 2026 → Sales 2025 → Sales 2024 → Website Quotes
// Matches by email, then phone. Posts Update on the matched item.
// Caches monday_item_id on the conversation. If no match → creates item on Website Quotes.
//
// Secrets required:
//   MONDAY_API_TOKEN
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// Optional:
//   MONDAY_LAST_CHAT_COL  (Date column id — only works if that column exists on the matched board)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MONDAY_API = "https://api.monday.com/v2";
const TOKEN = Deno.env.get("MONDAY_API_TOKEN") ?? "";
const LAST_CHAT_COL = Deno.env.get("MONDAY_LAST_CHAT_COL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";

// ─────────────────────────────────────────────────────────────
// Board config — search order is top → bottom
// ─────────────────────────────────────────────────────────────
const BOARDS = [
  {
    name: "Sales 2026",
    id: "18393636190",
    // TODO: replace these two with real column IDs from Sales 2026
    emailCol: "dup__of_email__1",
    phoneCol: "dup__of_phone__1",
  },
  {
    name: "Sales 2025",
    id: "8146739022",
    emailCol: "dup__of_email__1",
    phoneCol: "dup__of_phone__1",
  },
  {
    name: "Sales 2024",
    id: "5687884541",
    emailCol: "dup__of_email__1",
    phoneCol: "dup__of_phone__1",
  },
  {
    name: "Website Quotes",
    id: "18430710883",
    emailCol: "text_mm73ft1q",
    phoneCol: "text_mm7329kt",
  },
];

// When no match is found, create a new item here
const FALLBACK_BOARD = BOARDS[3]; // Website Quotes
const FALLBACK_SOURCE_COL = "color_mm73b843"; // Source column on Website Quotes

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    conversation_id: string;
    sender_type: "user" | "agent";
    sender_id: string | null;
    body: string | null;
    attachment_url: string | null;
    created_at: string;
  };
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!TOKEN || !SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing MONDAY_API_TOKEN / SUPABASE_URL / SERVICE_ROLE");
      return json({ error: "server misconfigured" }, 500);
    }

    const payload = (await req.json()) as WebhookPayload;
    const row = payload.record;

    if (payload.type !== "INSERT") {
      return json({ skipped: true, reason: "not an insert" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Conversation
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("id, agent_id, user_id, monday_item_id")
      .eq("id", row.conversation_id)
      .maybeSingle();

    if (convoErr || !convo) {
      console.error("conversation lookup failed", convoErr);
      return json({ error: "conversation not found" }, 404);
    }

    // 2. Customer contact
    const { data: user } = await supabase
      .from("users")
      .select("phone, email")
      .eq("id", convo.user_id)
      .maybeSingle();

    const email = (user?.email ?? "").trim().toLowerCase();
    const phone = (user?.phone ?? "").trim();
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);

    // 3. Resolve Monday item (cache → search all boards → create)
    let itemId = convo.monday_item_id ?? null;
    let foundBoardId: string | null = null;

    if (!itemId) {
      const found = await findAcrossBoards(email, phoneDigits);
      if (found) {
        itemId = found.itemId;
        foundBoardId = found.boardId;
      } else {
        itemId = await createFallbackItem(email, phone);
        foundBoardId = FALLBACK_BOARD.id;
      }

      if (itemId) {
        await supabase
          .from("conversations")
          .update({ monday_item_id: itemId })
          .eq("id", convo.id);
      }
    }

    if (!itemId) {
      console.error("Could not find or create Monday item");
      return json({ error: "no_monday_item" }, 502);
    }

    // 4. Format update body
    const who = row.sender_type === "user" ? "Customer" : "Agent";
    const when = new Date(row.created_at).toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "short",
      timeStyle: "short",
    });
    const text =
      row.body?.trim() ||
      (row.attachment_url ? "[Attachment]" : "(empty message)");
    const appLink = `https://www.blancsins.com/en/agent/messages/${row.conversation_id}`;

    const updateBody = `
<strong>[${who} · ${when}]</strong><br>
${escapeHtml(text.slice(0, 2000))}
${row.attachment_url ? `<br><a href="${row.attachment_url}">Attachment</a>` : ""}
<br><br>
<a href="${appLink}">Open full conversation in app</a>
`.trim();

    // 5. Post Update
    await mondayCreateUpdate(itemId, updateBody);

    // 6. Optional Last chat date
    if (LAST_CHAT_COL && foundBoardId) {
      const today = new Date().toISOString().slice(0, 10);
      try {
        await mondayChangeColumn(
          itemId,
          foundBoardId,
          LAST_CHAT_COL,
          JSON.stringify({ date: today })
        );
      } catch (e) {
        console.warn(
          "Last chat column update failed (column may not exist on this board)",
          e
        );
      }
    }

    console.log("Synced message to Monday item", itemId, "board", foundBoardId);
    return json({ ok: true, monday_item_id: itemId, board_id: foundBoardId });
  } catch (e) {
    console.error("monday-message-sync error", e);
    return json({ error: String(e) }, 500);
  }
});

// ─── Search boards in order ─────────────────────────────────

async function findAcrossBoards(
  email: string,
  phoneDigits: string
): Promise<{ itemId: string; boardId: string } | null> {
  for (const board of BOARDS) {
    // Skip boards with placeholder column IDs
    if (
      board.emailCol.startsWith("REPLACE") ||
      board.phoneCol.startsWith("REPLACE")
    ) {
      console.log(`Skipping ${board.name} — column IDs not set yet`);
      continue;
    }

    if (email) {
      const id = await searchBoard(board.id, board.emailCol, email, "any_of");
      if (id) {
        console.log(`Matched by email on ${board.name}`);
        return { itemId: id, boardId: board.id };
      }
    }

    if (phoneDigits.length >= 10) {
      const id = await searchBoard(
        board.id,
        board.phoneCol,
        phoneDigits,
        "contains_text"
      );
      if (id) {
        console.log(`Matched by phone on ${board.name}`);
        return { itemId: id, boardId: board.id };
      }
    }
  }
  return null;
}

async function searchBoard(
  boardId: string,
  columnId: string,
  value: string,
  operator: "any_of" | "contains_text"
): Promise<string | null> {
  const compareValue = operator === "any_of" ? [value] : value;

  const data = await mondayGraphql(
    `
    query ($boardId: [ID!], $compare: CompareValue!) {
      boards(ids: $boardId) {
        items_page(
          limit: 1
          query_params: {
            rules: [{
              column_id: "${columnId}",
              compare_value: $compare,
              operator: ${operator}
            }]
          }
        ) {
          items { id }
        }
      }
    }
  `,
    { boardId: [boardId], compare: compareValue }
  );

  const id = data?.boards?.[0]?.items_page?.items?.[0]?.id;
  return id ? String(id) : null;
}

async function createFallbackItem(
  email: string,
  phone: string
): Promise<string | null> {
  const columnValues: Record<string, unknown> = {};
  if (email) columnValues[FALLBACK_BOARD.emailCol] = email;
  if (phone) columnValues[FALLBACK_BOARD.phoneCol] = phone;

  // Source = Chat (label must exist on Website Quotes Source column)
  columnValues[FALLBACK_SOURCE_COL] = { label: "Chat" };

  const data = await mondayGraphql(
    `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
      ) { id }
    }
  `,
    {
      boardId: FALLBACK_BOARD.id,
      itemName: email || phone || "Chat lead",
      columnValues: JSON.stringify(columnValues),
    }
  );

  return data?.create_item?.id ? String(data.create_item.id) : null;
}

// ─── Monday helpers ─────────────────────────────────────────

async function mondayGraphql(
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    console.error("Monday API errors:", JSON.stringify(body.errors));
    throw new Error(JSON.stringify(body.errors));
  }
  return body.data;
}

async function mondayCreateUpdate(itemId: string, body: string) {
  await mondayGraphql(
    `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `,
    { itemId, body }
  );
}

async function mondayChangeColumn(
  itemId: string,
  boardId: string,
  columnId: string,
  value: string
) {
  await mondayGraphql(
    `
    mutation ($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        item_id: $itemId
        board_id: $boardId
        column_id: $columnId
        value: $value
      ) { id }
    }
  `,
    { itemId, boardId, columnId, value }
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
