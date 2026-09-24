/** Extract the JSON body from a supabase.functions.invoke error (FunctionsHttpError). */
export async function readEdgeError(error: any): Promise<{ message: string; body: any }> {
  let body: any = null;
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') body = await ctx.clone?.().json?.() ?? await ctx.json();
  } catch { /* ignore */ }
  const message = body?.error || body?.message || error?.message || 'Something went wrong';
  return { message, body };
}
