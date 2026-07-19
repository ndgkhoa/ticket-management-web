// Shared CORS handling for every edge function.
//
// The browser calls these functions cross-origin (the Vite dev server / the deployed
// site talk to the Supabase functions host), so each one must answer the preflight and
// echo the headers supabase-js sends (`authorization`, `apikey`, `content-type`).

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Reply to a CORS preflight. Returns null for non-preflight requests. */
export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/** JSON response with CORS headers applied. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
