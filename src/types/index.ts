/**
 * Response/entity shapes of the legacy .NET API.
 *
 * These are PascalCase because they mirror the C# DTOs verbatim — they are an
 * accurate description of that backend, not a naming mistake to fix in place.
 * Phase 03 replaces the whole data layer with Supabase, where these types are
 * superseded by Zod schemas that transform rows into camelCase domain types
 * (`z.infer`), so they are deleted with the API layer rather than rewritten here.
 *
 * Do not add to this file. New shapes belong in a feature's `schemas/`.
 */

/**
 * Trimmed to the fields every caller actually Picks. `userId`, `filter` and
 * `X_DEVICE_UDID` were never picked by any feature — `X_DEVICE_UDID` in particular
 * is a .NET device header that only ever appears as a hardcoded literal in
 * `auth-api.ts`, never as a search param.
 */
export type BaseSearchParams = {
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
};

/** The .NET envelope every endpoint wraps its payload in. */
export type BaseResponse<T> = {
  Data: T;
  TotalRecord: number;
  StatusCode: number;
  Message: string;
};

/** Audit columns the .NET base entity adds to every table. */
export type BaseEntity = {
  CreatedDate: string;
  CreatedById: string;
  CreatedName: string;
  UpdatedDate: string;
  UpdatedById: string;
  IsDeleted: boolean;
};
