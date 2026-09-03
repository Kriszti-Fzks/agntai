-- Create agent_inbound_addresses table for unique lead capture emails
create table if not exists public.agent_inbound_addresses (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.agent_inbound_addresses enable row level security;

-- RLS Policy: Users can only see their own inbound email
create policy "Users can view their own inbound email" on public.agent_inbound_addresses
  for select using (auth.uid() = agent_id);

-- RLS Policy: Users can only update their own inbound email
create policy "Users can update their own inbound email" on public.agent_inbound_addresses
  for update using (auth.uid() = agent_id);

-- RLS Policy: Users can only insert their own inbound email
create policy "Users can insert their own inbound email" on public.agent_inbound_addresses
  for insert with check (auth.uid() = agent_id);

-- Create index for faster lookups by email (used by mailgun webhook)
create index if not exists idx_agent_inbound_addresses_email on public.agent_inbound_addresses(email);

-- Create index for lookups by agent_id
create index if not exists idx_agent_inbound_addresses_agent_id on public.agent_inbound_addresses(agent_id);
