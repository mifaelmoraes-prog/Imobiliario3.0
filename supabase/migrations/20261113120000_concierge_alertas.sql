-- Concierge: alertas de imóveis e contatos de corretor.
--
-- Segurança: o site grava com a chave pública (anon), que só pode INSERIR, e só nas colunas
-- liberadas abaixo. Ninguém lê, altera ou apaga pelo navegador: a equipe consulta pelo painel
-- do Supabase (ou com a service role). Status, token de cancelamento e datas vêm dos defaults.

create table if not exists public.concierge_alertas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'ativo' check (status in ('ativo', 'cancelado', 'atendido')),
  cancel_token uuid not null default gen_random_uuid(), -- usado pelo link de cancelar (fase 2)
  contato_chave text not null,                          -- telefone só com dígitos, ou e-mail em minúsculas
  nome text not null check (char_length(nome) between 1 and 120),
  telefone text check (telefone is null or char_length(telefone) <= 40),
  email text check (email is null or char_length(email) <= 120),
  cidade text check (cidade is null or char_length(cidade) <= 80),
  bairros text[] not null default '{}' check (cardinality(bairros) <= 10),
  tipo text check (tipo is null or tipo in ('Casa', 'Apartamento', 'Cobertura')),
  quartos_min integer check (quartos_min is null or quartos_min between 0 and 20),
  orcamento_max numeric check (orcamento_max is null or orcamento_max > 0),
  comodidades text[] not null default '{}' check (cardinality(comodidades) <= 10),
  observacoes text check (observacoes is null or char_length(observacoes) <= 500),
  consentimento boolean not null check (consentimento),
  consentimento_em timestamptz not null default now(),
  origem text not null default 'concierge',
  check (telefone is not null or email is not null),
  check (cidade is not null or tipo is not null or cardinality(bairros) > 0)
);

create index if not exists concierge_alertas_ativos_idx
  on public.concierge_alertas (cidade, tipo) where status = 'ativo';
create index if not exists concierge_alertas_contato_idx
  on public.concierge_alertas (contato_chave) where status = 'ativo';

-- Normaliza o contato e limita a 5 alertas ativos por pessoa (evita spam e abuso).
-- security definer: a contagem lê a tabela, e o navegador (anon) não tem permissão de leitura.
create or replace function public.concierge_alertas_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.contato_chave := coalesce(nullif(regexp_replace(coalesce(new.telefone, ''), '\D', '', 'g'), ''), lower(new.email));
  if (select count(*) from public.concierge_alertas
        where status = 'ativo' and contato_chave = new.contato_chave) >= 5 then
    raise exception 'limite_de_alertas' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists concierge_alertas_before_insert on public.concierge_alertas;
create trigger concierge_alertas_before_insert
  before insert on public.concierge_alertas
  for each row execute function public.concierge_alertas_before_insert();

alter table public.concierge_alertas enable row level security;
revoke all on public.concierge_alertas from anon, authenticated;
grant insert (nome, telefone, email, cidade, bairros, tipo, quartos_min, orcamento_max,
              comodidades, observacoes, consentimento)
  on public.concierge_alertas to anon;
drop policy if exists concierge_alertas_insert on public.concierge_alertas;
create policy concierge_alertas_insert on public.concierge_alertas
  for insert to anon with check (consentimento is true);

-- Contatos pedidos para um corretor (fechamento do atendimento)
create table if not exists public.concierge_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'encerrado')),
  nome text not null check (char_length(nome) between 1 and 120),
  telefone text check (telefone is null or char_length(telefone) <= 40),
  email text check (email is null or char_length(email) <= 120),
  melhor_horario text check (melhor_horario is null or char_length(melhor_horario) <= 120),
  imoveis_ids text[] not null default '{}' check (cardinality(imoveis_ids) <= 5),
  finalidade text check (finalidade is null or finalidade in ('morar', 'investir')),
  prazo text check (prazo is null or char_length(prazo) <= 120),
  observacoes text check (observacoes is null or char_length(observacoes) <= 500),
  consentimento boolean not null check (consentimento),
  origem text not null default 'concierge',
  check (telefone is not null or email is not null)
);

alter table public.concierge_leads enable row level security;
revoke all on public.concierge_leads from anon, authenticated;
grant insert (nome, telefone, email, melhor_horario, imoveis_ids, finalidade, prazo, observacoes, consentimento)
  on public.concierge_leads to anon;
drop policy if exists concierge_leads_insert on public.concierge_leads;
create policy concierge_leads_insert on public.concierge_leads
  for insert to anon with check (consentimento is true);
