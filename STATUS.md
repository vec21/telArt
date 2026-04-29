# STATUS — adrianaTelArt

> Última actualização: 2026-04-29
> SPEC: [SPEC.md](SPEC.md) v2.1.0 (Fase 2.1 pausada — produção em v2.0.0)

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

## 🟡 Em pausa — Fase 2.1 (Produtos + Storage + Catálogo dinâmico)

> SPEC bumped a v2.1.0 (escopo, schema, RLS e DoD AC18-AC25 escritos), **mas implementação parada antes de criar tabela**.

**Bloqueador:** ferramentas MCP `apply_migration` e `execute_sql` desactivadas pelo utilizador. Necessário reactivar antes de continuar.

**Trabalho já feito nesta fase:**
- [SPEC.md §1.3, §2.1.ter, §5.4–5.6](SPEC.md) — escopo + schema `produtos` + bucket Storage definidos
- Categorias acordadas: `tapecaria`, `decoracao`, `tradicional`, `arte`, `outro`

**Falta executar (ordem):**
1. Reactivar `mcp_supabase_apply_migration`
2. Migration: tabela `produtos` + RLS + trigger `updated_at`
3. Bucket Storage `produtos` (public read; auth write) + policies em `storage.objects`
4. Tab Produtos no [admin.html](admin.html): list/filter/search, criar, editar, eliminar, upload imagem, toggle `ativo`/`destaque`
5. Refactor [catalogo.html](catalogo.html) → fetch dinâmico de `produtos` ordenados por `ordem`
6. Test local + deploy Vercel
7. Validar AC18–AC25

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
