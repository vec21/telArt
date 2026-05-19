-- Migration: criar tabela produtos + RLS + trigger
-- Ref: SPEC §5.4, §5.5
-- Executar no Supabase Dashboard → SQL Editor

create table public.produtos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  slug         text not null unique,
  descricao    text,
  preco        numeric(12,2),
  categoria    text not null check (categoria in ('kit_bloguerinha','kit_skincare','buque','cesta','caneca','cantil','caixa_explosiva','outro')),
  imagem_url   text,
  imagem_path  text,
  destaque     boolean not null default false,
  ativo        boolean not null default true,
  ordem        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index produtos_categoria_idx on public.produtos (categoria);
create index produtos_ativo_ordem_idx on public.produtos (ativo, ordem);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger produtos_set_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

-- RLS
alter table public.produtos enable row level security;

create policy "anon select produtos ativos" on public.produtos
  for select to anon using (ativo = true);

create policy "auth select produtos" on public.produtos
  for select to authenticated using (true);

create policy "auth insert produtos" on public.produtos
  for insert to authenticated with check (true);

create policy "auth update produtos" on public.produtos
  for update to authenticated using (true) with check (true);

create policy "auth delete produtos" on public.produtos
  for delete to authenticated using (true);

grant select on public.produtos to anon;
grant select, insert, update, delete on public.produtos to authenticated;
