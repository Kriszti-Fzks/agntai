-- Track daily AI action usage for cost protection (20 actions/day limit on free beta)
create table public.ai_action_limits (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  count int not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, date)
);

-- Enable RLS
alter table public.ai_action_limits enable row level security;

-- Users can only see their own records
create policy "Users can view own AI action limits"
  on public.ai_action_limits
  for select
  using (auth.uid() = user_id);

-- Service role can update (from edge functions)
create policy "Service role can manage AI action limits"
  on public.ai_action_limits
  for all
  using (auth.role() = 'service_role');

-- Create index for efficient queries (user_id, date)
create index idx_ai_action_limits_user_date on public.ai_action_limits(user_id, date);
