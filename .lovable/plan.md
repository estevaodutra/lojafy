

## Fix: One-Time Access Link Error Handling

### Problem
When the edge function `verify-onetime-link` returns a non-2xx status (e.g., "Este link ja foi utilizado"), the Supabase JS client sets `data` to `null` and wraps the HTTP error generically. The frontend then shows the unhelpful message "Edge Function returned a non-2xx status code" instead of the actual Portuguese error message from the function.

### Root Cause
`supabase.functions.invoke()` behavior on non-2xx responses:
- `data` = `null`
- `error` = `FunctionsHttpError` with generic message
- The actual JSON body is accessible via `error.context` (a `Response` object)

The current code at line 38 tries `data?.error` first (which is `null`), then falls back to `error?.message` (which is the generic SDK message).

### Solution
Modify `src/pages/AuthOneTime.tsx` to extract the real error message from the edge function response when `supabase.functions.invoke()` returns an error:

```typescript
const { data, error } = await supabase.functions.invoke('verify-onetime-link', {
  body: { token },
});

if (error || !data?.success) {
  console.error('Verification error:', error, data);
  
  // Extract the actual error message from the edge function response
  let actualError = data?.error;
  if (!actualError && error) {
    try {
      const errorBody = await error.context?.json();
      actualError = errorBody?.error;
    } catch {}
  }
  
  setStatus('error');
  setErrorMessage(actualError || error?.message || 'Erro ao validar o link de acesso.');
  return;
}
```

### Technical Details
- **File changed**: `src/pages/AuthOneTime.tsx` (lines 35-39)
- When the SDK reports an error, attempt to parse `error.context` as JSON to get the original `{ error: "..." }` body from the edge function
- Falls back gracefully if context parsing fails
- No changes needed to the edge function itself

