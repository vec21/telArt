# NEXT-SESSION — Prompt de retoma

> Cola este conteúdo (ou abre este ficheiro) no início da próxima sessão do agente.

---

## Contexto

Projecto **adrianaTelArt** em modo SDD (Spec-Driven Development). Fonte de verdade: [SPEC.md](SPEC.md) v2.1.0.

- ✅ v1.x e v2.0.0 entregues e em produção (https://adriana-telart.vercel.app).
- 🟡 **Fase 2.1 pausada** antes de qualquer alteração de DB. Escopo, schema e DoD já escritos no SPEC ([§1.3](SPEC.md), [§2.1.ter](SPEC.md), [§5.4–5.6](SPEC.md)).
- Branch activa: `master`. Commits sincronizados com `origin` no fim da sessão anterior.

---

## Pré-condições antes de continuar

1. **Reactivar tools MCP Supabase** (foram desactivadas na sessão anterior):
   - `mcp_supabase_apply_migration`
   - (recomendado) `mcp_supabase_execute_sql`
2. Confirmar que o projecto Supabase activo é `ijmrqkwyrrumcdjcvqme` (ver `.vscode/mcp.json` ou `mcp_supabase_get_project_url`).
3. Ler [SPEC.md](SPEC.md) e [STATUS.md](STATUS.md).

---

## Prompt para colar ao agente

```
Lê SPEC.md e STATUS.md. Vamos retomar a Fase 2.1 (Produtos + Storage + Catálogo dinâmico)
exactamente onde parámos. As tools mcp_supabase_apply_migration e execute_sql já estão
reactivadas — confirma com mcp_supabase_list_tables.

Plano (ordem obrigatória, respeitando DoD AC18–AC25):

1. Migration `v21_produtos_table_and_rls`: criar tabela `public.produtos` + índices +
   RLS + trigger updated_at, exactamente como em SPEC §5.4 e §5.5.

2. Migration `v21_produtos_storage`: criar bucket Storage `produtos` (public=true) e
   policies em storage.objects:
   - anon SELECT no bucket
   - authenticated INSERT/UPDATE/DELETE no bucket
   Path padrão: produtos/<uuid>-<slug>.<ext>

3. Adicionar tab "Produtos" funcional em admin.html (remover atributo disabled e
   título "Em breve"). Implementar em js/admin.js:
   - listProdutos() com filtro por categoria + toggle "ver inactivos" + search por nome
   - openProdutoModal(id|null) — formulário com campos: nome, slug (auto a partir de
     nome), descricao, preco, categoria (select fixo: tapecaria/decoracao/tradicional/
     arte/outro), destaque, ativo, ordem, imagem (input file)
   - saveProduto() — INSERT ou UPDATE; se for upload nova imagem: supabase.storage
     .from('produtos').upload(...) e gravar imagem_url + imagem_path; se substituir,
     apagar imagem_path antigo
   - deleteProduto(id) — apagar storage object via imagem_path + DELETE da row
   - toggleAtivo(id), toggleDestaque(id)

4. Refactor catalogo.html → fetch dinâmico:
   - Remover cards hardcoded
   - js/app.js novo handler initCatalogo() que faz client.from('produtos').select()
     .eq('ativo', true).order('ordem').order('created_at', desc) e renderiza
   - Manter classes CSS existentes (cards mantêm visual)
   - Filtros por categoria (botões existentes) operacionais

5. Validação local (npx serve -l 3000 .):
   - Login admin → criar 1 produto com imagem → ver no /catalogo.html
   - Editar produto → mudar ordem → recarregar catálogo
   - Toggle ativo=false → produto desaparece do catálogo público
   - Apagar produto → ficheiro de storage também sai

6. Deploy: git add -A && git commit -m "feat: produtos + storage + catalogo dinamico
   (SDD §2.1)" && git push && vercel deploy --prod --yes.

7. Validar AC18–AC25 em produção. Actualizar STATUS.md.

Restrições:
- Não mexer em formulários públicos existentes nem em layout do site.
- Não criar policies extra além das definidas em SPEC §5.5/§5.6.
- Categorias são FIXAS no código (não criar tabela à parte).
- Preço pode ser null = "Sob consulta".
```

---

## Estado de ficheiros à data desta nota

| Ficheiro | Estado |
|---|---|
| `SPEC.md` | v2.1.0 com Fase 2.1 totalmente especificada |
| `STATUS.md` | v2.0 marcado como ✅ produção; v2.1 marcado 🟡 em pausa |
| `admin.html` | Tab "Produtos" existe mas com `disabled` |
| `js/admin.js` | Sem código de produtos ainda |
| `catalogo.html` | Ainda com produtos hardcoded |
| `js/app.js` | Sem `initCatalogo()` |
| Supabase | Tabelas `formulario`, `newsletter` apenas. Sem `produtos`. Sem bucket. |

---

## Notas de segurança a manter

- `js/supabase-config.js` continua gitignored.
- Apenas `anon`/`publishable` key no cliente.
- RLS em todas as tabelas novas, sempre.
- Bucket `produtos` é público apenas para **leitura** (SELECT).
