import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { NAME } from "../../../src/config.ts";
import { PostgresUsersRepo } from "../../../src/repository/users.ts";
import { registerUser } from "../../../src/domain/users.ts";
import { verifySlackSignature } from "./verify.ts";

const SLACK_SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET") ?? "";
const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN") ?? "";
const DATABASE_URL = Deno.env.get("SUPABASE_DB_URL") ??
  Deno.env.get("DATABASE_URL") ?? "";

const pool = new Pool(DATABASE_URL, 3, true);
const usersRepo = new PostgresUsersRepo(pool);

interface SlackEvent {
  type: string;
  user?: string;
  text?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
}

interface SlackEnvelope {
  type: string;
  challenge?: string;
  event?: SlackEvent;
}

async function postMessage(
  channel: string,
  text: string,
  threadTs: string,
): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel, text, thread_ts: threadTs }),
  });
  if (!res.ok) {
    console.error("chat.postMessage failed", res.status, await res.text());
  }
}

// Strip the leading bot mention from the event text and return the trimmed
// remainder (the subcommand portion).
function parseSubcommand(text: string): string {
  return text.replace(/^\s*<@[^>]+>\s*/, "").trim().toLowerCase();
}

async function handleAppMention(event: SlackEvent): Promise<void> {
  const channel = event.channel;
  const slackId = event.user;
  const text = event.text ?? "";
  const threadTs = event.thread_ts ?? event.ts;
  if (!channel || !slackId || !threadTs) return;

  const sub = parseSubcommand(text);

  if (sub === "register") {
    const result = await registerUser(usersRepo, slackId);
    const reply = result.kind === "registered"
      ? `Welcome <@${slackId}>!`
      : `<@${slackId}> you're already registered.`;
    await postMessage(channel, reply, threadTs);
    return;
  }

  if (sub === "list") {
    await postMessage(
      channel,
      `Available commands: \`register\`, \`list\``,
      threadTs,
    );
    return;
  }

  await postMessage(
    channel,
    `whoops I don't recognise this command, use @${NAME} list`,
    threadTs,
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const body = await req.text();
  const timestamp = req.headers.get("X-Slack-Request-Timestamp") ?? "";
  const signature = req.headers.get("X-Slack-Signature") ?? "";

  const ok = await verifySlackSignature(
    SLACK_SIGNING_SECRET,
    timestamp,
    body,
    signature,
  );
  if (!ok) return new Response("invalid signature", { status: 401 });

  let envelope: SlackEnvelope;
  try {
    envelope = JSON.parse(body) as SlackEnvelope;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (envelope.type === "url_verification" && envelope.challenge) {
    return new Response(envelope.challenge, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (envelope.type === "event_callback" && envelope.event) {
    if (envelope.event.type === "app_mention") {
      // Ack quickly; do work after responding.
      queueMicrotask(() => {
        handleAppMention(envelope.event!).catch((err) =>
          console.error("handleAppMention error", err)
        );
      });
    }
  }

  return new Response("", { status: 200 });
});
