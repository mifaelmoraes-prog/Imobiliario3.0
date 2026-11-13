-- Concierge: feedback sobre o atendimento ("tem algo que eu possa melhorar?").
-- Anônimo (sem nome nem contato). O site (anon) só insere; a equipe lê pelo painel do Supabase.

create table if not exists public.concierge_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  texto text not null check (char_length(texto) between 1 and 1000),
  nota integer check (nota is null or nota between 1 and 5),
  origem text not null default 'concierge'
);

alter table public.concierge_feedback enable row level security;
revoke all on public.concierge_feedback from anon, authenticated;
grant insert (texto, nota) on public.concierge_feedback to anon;
drop policy if exists concierge_feedback_insert on public.concierge_feedback;
create policy concierge_feedback_insert on public.concierge_feedback
  for insert to anon with check (true);
