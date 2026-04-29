import type { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

export class UniqueViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UniqueViolationError";
  }
}

export interface UsersRepo {
  insert(slackId: string): Promise<void>;
}

export class PostgresUsersRepo implements UsersRepo {
  constructor(private pool: Pool) {}

  async insert(slackId: string): Promise<void> {
    const conn = await this.pool.connect();
    try {
      await conn.queryObject`INSERT INTO users (slack_id) VALUES (${slackId})`;
    } catch (err) {
      // Postgres unique_violation = 23505
      const code = (err as { fields?: { code?: string } }).fields?.code;
      if (code === "23505") {
        throw new UniqueViolationError(`slack_id ${slackId} already exists`);
      }
      throw err;
    } finally {
      conn.release();
    }
  }
}
