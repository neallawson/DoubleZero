import { db } from '../db/index.js';
import { sandbox } from '../db/schema/sandbox.js';
import { eq, or, isNull } from 'drizzle-orm';
import type { SQL, Column } from 'drizzle-orm';

/**
 * Get the sandbox ID for a team.
 * Each team owns exactly one sandbox.
 */
export async function getTeamSandboxId(teamId: number): Promise<number | null> {
  const [found] = await db
    .select({ id: sandbox.id })
    .from(sandbox)
    .where(eq(sandbox.teamId, teamId))
    .limit(1);

  return found?.id ?? null;
}

/**
 * Get or create a sandbox for a team.
 * Used when creating entities that should be sandboxed.
 */
export async function getOrCreateTeamSandbox(teamId: number): Promise<number> {
  const existing = await getTeamSandboxId(teamId);
  if (existing) return existing;

  const [created] = await db
    .insert(sandbox)
    .values({
      teamId,
      name: 'Default Sandbox',
    })
    .returning({ id: sandbox.id });

  return created!.id;
}

/**
 * Build a sandbox filter condition for queries.
 * Returns a condition that matches:
 * - Public entities (sandboxId IS NULL)
 * - Entities in the user's active team's sandbox (if activeTeamId is set)
 * 
 * @param sandboxIdColumn - The sandboxId column from the table being queried
 * @param activeSandboxId - The sandbox ID for the user's active team (null if no team)
 */
export function sandboxFilter(
  sandboxIdColumn: Column,
  activeSandboxId: number | null
): SQL {
  if (activeSandboxId === null) {
    // No active team - only see public entities
    return isNull(sandboxIdColumn);
  }
  // Active team - see public + team's sandbox
  return or(
    isNull(sandboxIdColumn),
    eq(sandboxIdColumn, activeSandboxId)
  )!;
}

/**
 * Helper to get the active sandbox ID from req.user.activeTeamId
 * Returns null if user has no active team.
 */
export async function getActiveSandboxId(activeTeamId: number | null): Promise<number | null> {
  if (!activeTeamId) return null;
  return getTeamSandboxId(activeTeamId);
}
