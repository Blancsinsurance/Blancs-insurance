// Supabase Edge Function: monday-message-sync
// Searches Sales 2026 → 2025 → 2024 → Website Quotes
// Posts Update with real @mention of the assigned agent

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MONDAY_API = "https://api.monday.com/v2";
const TOKEN = Deno.env.get("MONDAY_API_TOKEN") ?? "";
const LAST_CHAT_COL = Deno.env.get("MONDAY_LAST_CHAT_COL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";

// ── Boards (search order) ───────────────────────────────────
const BOARDS = [
  {
    name: "Sales 2026",
    id: "18393636190",
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

const FALLBACK_BOARD = BOARDS[3];
const FALLBACK_SOURCE_COL = "color_mm73b843";

// ── Monday user IDs by agent email ──────────────────────────
const MONDAY_USER_ID_BY_EMAIL: Record<string, string> = {
  "jimmy@blancsins.com": "64769369",
  "odessa@blancsins.com": "64813286",
  "sylviac@blancsins.com": "99849937",
  "sergioalvarez@blancsins.com": "66296227",
  "delwin@blancsins.com": "68375265",
  "noahclare@blancsins.com": "95620663",
  "frankyfrancois@blancsins.com": "96230870",
  "emileeiwinski2@gmail.com": "65838267",
  "roseayalamx@gmail.com": "98571990",
  "blancsinsurance@gmail.com": "53177596",
  "bls.insurance0@gmail.com": "53173440",
  "z.growthx@gmail.com": "53177554",
};

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
      return json({ error: "server misconfigured" }, 500);
    }

    const payload = (await req.json()) as WebhookPayload;
    const row = payload.record;
    if (payload.type !== "INSERT") {
      return json({ skipped: true, reason: "not an insert" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("id, agent_id, user_id, monday_item_id")
      .eq("id", row.conversation_id)
      .maybeSingle();

    if (convoErr || !convo) {
      return json({ error: "conversation not found" }, 404);
    }

    let agentName = "Agent";
    let agentEmail = "";
    let mondayUserId: string | null = null;

    if (convo.agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("full_name, name, email")
        .eq("id", convo.agent_id)
        .maybeSingle();

      agentName =
        agent?.full_name?.trim() ||
        agent?.name?.trim() ||
        agent?.email ||
        "Agent";
      agentEmail = (agent?.email ?? "").trim().toLowerCase();
      if (agentEmail && MONDAY_USER_ID_BY_EMAIL[agentEmail]) {
        mondayUserId = MONDAY_USER_ID_BY_EMAIL[agentEmail];
      }
    }

    const { data: user } = await supabase
      .from("users")
      .select("phone, email")
      .eq("id", convo.user_id)
      .maybeSingle();

    const email = (user?.email ?? "").trim().toLowerCase();
    const phone = (user?.phone ?? "").trim();
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);

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
      return json({ error: "no_monday_item" }, 502);
    }

    const who =
      row.sender_type === "user"
        ? `Customer → ${agentName}`
        : agentName;

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

    await mondayCreateUpdate(itemId, updateBody, mondayUserId);

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
        console.warn("Last chat update failed", e);
      }
    }

    console.log("Synced", itemId, "mentioned", mondayUserId || "none");
    return json({
      ok: true,
      monday_item_id: itemId,
      mentioned_user_id: mondayUserId,
    });
  } catch (e) {
    console.error("monday-message-sync error", e);
    return json({ error: String(e) }, 500);
  }
});

async function findAcrossBoards(
  email: string,
  phoneDigits: string
): Promise<{ itemId: string; boardId: string } | null> {
  for (const board of BOARDS) {
    if (
      board.emailCol.startsWith("REPLACE") ||
      board.phoneCol.startsWith("REPLACE")
    ) {
      continue;
    }
    if (email) {
      const id = await searchBoard(board.id, board.emailCol, email, "any_of");
      if (id) return { itemId: id, boardId: board.id };
    }
    if (phoneDigits.length >= 10) {
      const id = await searchBoard(
        board.id,
        board.phoneCol,
        phoneDigits,
        "contains_text"
      );
      if (id) return { itemId: id, boardId: board.id };
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
        ) { items { id } }
      }
    }`,
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
  columnValues[FALLBACK_SOURCE_COL] = { label: "Chat" };

  const data = await mondayGraphql(
    `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
      ) { id }
    }`,
    {
      boardId: FALLBACK_BOARD.id,
      itemName: email || phone || "Chat lead",
      columnValues: JSON.stringify(columnValues),
    }
  );
  return data?.create_item?.id ? String(data.create_item.id) : null;
}

async function mondayGraphql(
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN,
      "API-Version": "2025-07",
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

async function mondayCreateUpdate(
  itemId: string,
  body: string,
  mentionUserId: string | null
) {
  if (mentionUserId) {
    await mondayGraphql(
      `
      mutation ($itemId: ID!, $body: String!, $mentions: [UpdateMention!]) {
        create_update(
          item_id: $itemId
          body: $body
          mentions_list: $mentions
        ) { id }
      }`,
      {
        itemId,
        body,
        mentions: [{ id: mentionUserId, type: "User" }],
      }
    );
  } else {
    await mondayGraphql(
      `
      mutation ($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) { id }
      }`,
      { itemId, body }
    );
  }
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
    }`,
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
