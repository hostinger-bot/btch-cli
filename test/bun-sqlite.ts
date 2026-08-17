/**
 * Minimal `bun:sqlite`-compatible `Database` backed by Node's builtin
 * `node:sqlite` (Node 22.5+). Vitest runs its workers under Node, which cannot
 * resolve `bun:sqlite`, so we alias the module to this shim in vitest.config.ts.
 *
 * Only the surface used by src/storage/db.ts is implemented.
 */
import { DatabaseSync } from "node:sqlite";

type SQLValue = string | number | bigint | Uint8Array | null | undefined;

function normalizeArgs(params: unknown[]): unknown[] {
  // db.ts passes normalizeBinding(...) which yields either `undefined` (no
  // params) or the raw array of positional params. bun:sqlite binds an array
  // positionally; node:sqlite would treat it as a named-parameter object, so
  // flatten it here. A single `undefined` is dropped entirely.
  if (params.length === 1 && params[0] === undefined) return [];
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as unknown[];
  return params;
}

class Statement {
  constructor(private readonly stmt: ReturnType<DatabaseSync["prepare"]>) {}

  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
    const result = this.stmt.run(...(normalizeArgs(params) as SQLValue[]));
    return {
      changes: Number(result.changes),
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  get(...params: unknown[]): unknown {
    return this.stmt.get(...(normalizeArgs(params) as SQLValue[])) ?? undefined;
  }

  all(...params: unknown[]): unknown[] {
    return this.stmt.all(...(normalizeArgs(params) as SQLValue[]));
  }
}

export class Database {
  private readonly db: DatabaseSync;

  constructor(filename: string, _options?: { create?: boolean; strict?: boolean }) {
    this.db = new DatabaseSync(filename);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
    const result = this.db.prepare(sql).run(...(normalizeArgs(params) as SQLValue[]));
    return {
      changes: Number(result.changes),
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  query(sql: string): {
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  } {
    return {
      get: (...params: unknown[]) => this.db.prepare(sql).get(...(normalizeArgs(params) as SQLValue[])) ?? undefined,
      all: (...params: unknown[]) => this.db.prepare(sql).all(...(normalizeArgs(params) as SQLValue[])),
    };
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      this.db.exec("BEGIN");
      try {
        const result = fn();
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    };
  }

  close(): void {
    this.db.close();
  }

  pragma(_query: string, _options?: { simple?: boolean }): unknown {
    // db.ts routes pragmas through exec/query, so a direct pragma call is
    // never expected from the storage layer.
    return undefined;
  }
}

export default { Database };
