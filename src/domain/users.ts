import { UniqueViolationError, type UsersRepo } from "../repository/users.ts";

export type RegisterResult =
  | { kind: "registered" }
  | { kind: "already_registered" };

export async function registerUser(
  repo: UsersRepo,
  slackId: string,
): Promise<RegisterResult> {
  try {
    await repo.insert(slackId);
    return { kind: "registered" };
  } catch (err) {
    if (err instanceof UniqueViolationError) {
      return { kind: "already_registered" };
    }
    throw err;
  }
}
