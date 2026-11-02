-- AG-053: let a signed-in user create and bump THEIR OWN daily AI counter row.
-- Before: only SELECT (own rows) + a service_role policy existed, so the browser's
-- INSERT/UPDATE got HTTP 403 and the counter never worked.
-- NOT APPLIED — review, then run with `supabase db push` (or the SQL editor).
--
-- Note: a client-side counter can be edited by the user. For real cost
-- protection, move the check+increment into the hyper-endpoint edge function.

drop policy if exists "Users can insert own AI action limits" on public.ai_action_limits;
create policy "Users can insert own AI action limits"
  on public.ai_action_limits
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own AI action limits" on public.ai_action_limits;
create policy "Users can update own AI action limits"
  on public.ai_action_limits
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
