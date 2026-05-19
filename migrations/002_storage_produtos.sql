-- Migration: criar bucket Storage `produtos` + policies
-- Ref: SPEC §5.6
-- Executar no Supabase Dashboard → SQL Editor APÓS 001_produtos.sql

-- 1. Criar bucket público
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

-- 2. Policies em storage.objects para o bucket 'produtos'

-- Leitura pública (anon)
create policy "anon select produtos bucket"
  on storage.objects for select
  to anon
  using (bucket_id = 'produtos');

-- Authenticated pode inserir
create policy "auth insert produtos bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'produtos');

-- Authenticated pode actualizar
create policy "auth update produtos bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'produtos')
  with check (bucket_id = 'produtos');

-- Authenticated pode eliminar
create policy "auth delete produtos bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'produtos');
