-- Acessos ao site por estado (UF). Responde "alguém do ES acessou? quando foi a última vez?".
--
-- Privacidade: guarda só país, UF e a hora. Sem IP, sem id de visitante, sem texto. O navegador
-- só INSERE (anon, nas colunas liberadas); ninguém lê pelo site. A equipe consulta pelo painel do
-- Supabase (ou com a service role). Para valer, ligue TRACK_ACCESS_REGION=on no servidor.
--
-- Consulta de exemplo (SQL Editor do Supabase):
--   select uf, count(*) as acessos, max(created_at) as ultimo_acesso
--     from public.concierge_acessos where pais = 'BR' group by uf order by ultimo_acesso desc;

create table if not exists public.concierge_acessos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pais text not null check (pais ~ '^[A-Z]{2}$'),
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  check (uf is null or pais = 'BR')
);

create index if not exists concierge_acessos_uf_data_idx
  on public.concierge_acessos (uf, created_at desc);

alter table public.concierge_acessos enable row level security;
revoke all on public.concierge_acessos from anon, authenticated;
grant insert (pais, uf) on public.concierge_acessos to anon;
drop policy if exists concierge_acessos_insert on public.concierge_acessos;
create policy concierge_acessos_insert on public.concierge_acessos
  for insert to anon with check (true);
