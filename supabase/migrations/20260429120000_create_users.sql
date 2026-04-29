CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_id    TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
