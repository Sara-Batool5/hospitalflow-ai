import { getSupabaseAdmin } from "./supabaseAdmin";
import { getSessionEmail } from "./session";

// Tables whose rows belong to a single workspace.
// owner_email = NULL  -> shared demo workspace
// owner_email = email -> that signed-in user's private workspace
const SCOPED_TABLES = new Set([
  "operational_issues",
  "workflow_actions",
  "audit_logs",
  "upload_batches",
]);

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getScopedSupabase() {
  const owner = await getSessionEmail();
  const client = getSupabaseAdmin();

  const scope = (query: any) =>
    owner ? query.eq("owner_email", owner) : query.is("owner_email", null);

  const withOwner = (rows: any) =>
    Array.isArray(rows)
      ? rows.map((row) => ({ ...row, owner_email: owner }))
      : { ...rows, owner_email: owner };

  return {
    owner,
    from(table: string) {
      const builder = client.from(table);
      if (!SCOPED_TABLES.has(table)) return builder;

      return new Proxy(builder as any, {
        get(target, prop) {
          if (prop === "select" || prop === "update" || prop === "delete") {
            return (...args: any[]) => scope(target[prop](...args));
          }
          if (prop === "insert") {
            return (rows: any, ...rest: any[]) =>
              target.insert(withOwner(rows), ...rest);
          }
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        },
      }) as typeof builder;
    },
  };
}
