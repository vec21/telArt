# STATUS — adrianaTelArt

> Última actualização: 2026-05-19
> SPEC: [SPEC.md](SPEC.md) v2.1.1 (Fase 2.1 em curso — DB+Storage criados, admin Produtos implementado)

---

## ✅ Feito (v1.0.0 → v2.0.0 em produção)

### v1.x — Formulários públicos
- `git init` + clone de `vec21/telArt` (branch `master`)
- Stack: HTML/CSS/JS vanilla (sem build)
- Servidor local: `npx serve .`
- Tabela `public.formulario` (id, nome, email, telefone, assunto, mensagem, status, created_at)
- Tabela `public.newsletter` (id, email unique, created_at)
- RLS: `INSERT-only` para `anon`
- [js/supabase-config.js](js/supabase-config.js) gitignored, `.example.js` comitado
- [js/supabase.js](js/supabase.js), [js/app.js](js/app.js) — `INSERT` real (substitui `setTimeout` fake)
- Tratamento `23505` para newsletter duplicada
- Deploy Vercel: https://adriana-telart.vercel.app
- Linked a `vec21/telArt` (auto-deploy em push)

### v2.0.0 — Admin Dashboard (Fase 2.0) ✅
- Supabase Auth email+password activado (sem confirmação de email)
- Coluna `status` em `formulario` (`novo|lido|respondido|arquivado`)
- RLS authenticated SELECT/UPDATE em `formulario` + SELECT em `newsletter`
- [admin.html](admin.html) — login + dashboard shell (6 tabs; 4 disabled em "Em breve")
- [css/admin.css](css/admin.css) — tema próprio + responsivo
- [js/admin.js](js/admin.js) — sessão, paginação, filtros, search, update status, export CSV
- Modal de detalhe da mensagem com `mailto:` + `wa.me/`
- Validação E2E local + produção
- Deploy production em https://adriana-telart.vercel.app/admin.html

### Validação produção (último commit `2bf80e0`)
| AC | Estado |
|---|---|
| AC1–AC9 (v1.x) | ✅ |
| AC10–AC17 (v2.0) | ✅ |

### Estado Supabase (linhas reais)
| Tabela | Linhas |
|---|---|
| `formulario` | 3 (1 lido, 2 novo) |
| `newsletter` | 2 |
| `produtos` | — (não criada ainda) |

---

## 🟡 Em curso — Fase 2.1 (Produtos + Storage + Catálogo dinâmico)

> SPEC bumped a **v2.1.1** (Change Control: categorias alinhadas com o catálogo real).

**Trabalho feito:**
- [SPEC.md §1.3, §2.1.ter, §5.4–5.6](SPEC.md) — escopo + schema + bucket
- Categorias finais: `kit_bloguerinha`, `kit_skincare`, `buque`, `cesta`, `caneca`, `cantil`, `caixa_explosiva`, `outro`
- [migrations/001_produtos.sql](migrations/001_produtos.sql) corrida — tabela `produtos` + RLS + trigger `updated_at` ✅
- [migrations/002_storage_produtos.sql](migrations/002_storage_produtos.sql) corrida — bucket `produtos` (public) + policies ✅
- [migrations/003_produtos_categorias_v211.sql](migrations/003_produtos_categorias_v211.sql) corrida — check constraint v2.1.1 ✅
- **AC18, AC19 ✅** validados via `mcp_supabase_list_tables`
- Tab Produtos no [admin.html](admin.html) + [css/admin.css](css/admin.css) + [js/admin.js](js/admin.js): grid de cards, filtros (categoria/ativo), search, paginate, modal CRUD com upload de imagem e toggles `ativo`/`destaque`

**Falta executar:**
1. Teste local manual (login admin → criar/editar/eliminar produto + upload imagem)
2. Refactor [catalogo.html](catalogo.html) → fetch dinâmico de `produtos` ordenados por `ordem` (AC23)
3. Deploy Vercel
4. Validar AC20–AC25 em produção

> Prompt de retoma pronto em [NEXT-SESSION.md](NEXT-SESSION.md).

---

## 🔴 Out of Scope — requer Change Control ([SPEC §12](SPEC.md#12-change-control))

Fases planeadas mas sem escopo detalhado:
- **2.2** Encomendas (`encomendas` + `encomenda_itens`)
- **2.3** Settings (key/value JSONB para WhatsApp/email/banner)
- **2.4** Estatísticas (Chart.js CDN)

Itens explicitamente fora do contrato actual:
- OAuth (Google/GitHub), magic links, 2FA, reset password
- RBAC granular (mecanismo é "qualquer authenticated")
- Rate limiting / captcha / honeypot
- Email automático em nova mensagem
- Push notifications
- i18n / SEO avançado
- Testes automatizados (E2E / unit)
- Migração para framework com build

---

## 🧹 Pendências menores

- [ ] Limpar dados de teste das tabelas antes de go-live (3 mensagens + 2 newsletters dummy)
- [ ] Configurar domínio custom na Vercel (se aplicável)
- [ ] Decidir se quer "Confirm email" activo no Supabase Auth (actualmente desactivado)
