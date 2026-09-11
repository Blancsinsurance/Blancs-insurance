// Supabase Edge Function: monday-quote-sync
// Triggered by Database Webhook on public.quote_requests INSERT
//
// Secrets required:
//   MONDAY_API_TOKEN   – Monday personal/API token (boards:write)
//   MONDAY_BOARD_ID    – 18430710883  (or set as default below)

const MONDAY_API = "https://api.monday.com/v2";
const TOKEN = Deno.env.get("MONDAY_API_TOKEN") ?? "";
const BOARD_ID = Deno.env.get("MONDAY_BOARD_ID") ?? "18430710883";

const COL = {
  description: "text_mm73bvps",
  email: "text_mm73ft1q",
  phone: "text_mm7329kt",
  policyType: "dropdown_mm733q2j",
  source: "color_mm73b843",
  // assigned: "multiple_person_mm73f4v3", // enable later if you map agents
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    const record = payload.record ?? payload; // webhook or direct invoke

    if (!TOKEN) {
      console.error("MONDAY_API_TOKEN missing");
      return json({ error: "server misconfigured" }, 500);
    }

    const first = (record.first_name ?? "").trim();
    const last = (record.last_name ?? "").trim();
    const itemName = [first, last].filter(Boolean).join(" ") || "Website Quote Request";

    // Policy type labels must match the dropdown options exactly
    // (commercial, home, auto, motorcycle, rv, flood, boat)
    const policyLabel = (record.policy_type ?? "").toLowerCase();

    const columnValues: Record<string, unknown> = {
      [COL.email]: record.email ?? "",
      [COL.phone]: record.phone ?? "",
      [COL.description]: record.description ?? "",
      [COL.source]: { label: "Website" },
    };

    if (policyLabel) {
  columnValues[COL.policyType] = { labels: [policyLabel] };
  }

    const mutation = `
      mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const res = await fetch(MONDAY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: TOKEN,
        "API-Version": "2024-10",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          boardId: BOARD_ID,
          itemName,
          columnValues: JSON.stringify(columnValues),
        },
      }),
    });

    const body = await res.json();

    if (body.errors?.length) {
      console.error("Monday API errors:", JSON.stringify(body.errors));
      return json({ error: "monday_failed", detail: body.errors }, 502);
    }

    const itemId = body.data?.create_item?.id;
    console.log("Created Monday item", itemId, "for", itemName);
    return json({ ok: true, monday_item_id: itemId });
  } catch (e) {
    console.error("monday-quote-sync error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
