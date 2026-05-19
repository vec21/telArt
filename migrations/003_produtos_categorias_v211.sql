-- Migration: actualizar categorias da tabela produtos
-- Ref: SPEC §5.4 (v2.1.1 — Change Control)
-- Executar no Supabase Dashboard → SQL Editor

alter table public.produtos drop constraint produtos_categoria_check;

alter table public.produtos add constraint produtos_categoria_check
  check (categoria in (
    'kit_bloguerinha',
    'kit_skincare',
    'buque',
    'cesta',
    'caneca',
    'cantil',
    'caixa_explosiva',
    'outro'
  ));
