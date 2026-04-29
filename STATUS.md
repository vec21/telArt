# STATUS — adrianaTelArt

> Última actualização: 2026-04-29
> SPEC: [SPEC.md](SPEC.md) v1.2.0

---

## ✅ Feito

### Fase 1 — Setup local
- `git init` + `remote add origin` + `fetch` + `checkout -t origin/master`
- Stack confirmada: HTML/CSS/JS vanilla (sem build)
- Servidor local: `npx serve .` em `localhost:3000`

### Fase 2 — Análise
- Form de contacto identificado: `#contactForm` em [contacto.html](contacto.html)
- Form de newsletter identificado: `#newsletterForm` em [index.html](index.html)
- Handlers em [js/app.js](js/app.js) (`initContactForm`, `initNewsletterForm`) — antes faziam `setTimeout` fake

### Fase 3 — Supabase
- Projecto dedicado: `ijmrqkwyrrumcdjcvqme.supabase.co`
- Tabela `public.formulario`: id, nome, email, telefone, assunto, mensagem, created_at
- Tabela `public.newsletter`: id, email (unique), created_at
- RLS activo em ambas, policy `INSERT-only` para `anon`
- `GRANT INSERT` explícito a `anon` e `authenticated`

### Fase 4 — Integração
- [js/supabase-config.js](js/supabase-config.js) — credenciais (gitignored)
- [js/supabase-config.example.js](js/supabase-config.example.js) — template comitado
- [js/supabase.js](js/supabase.js) — inicializa `window.supabaseClient`
- Scripts adicionados a [contacto.html](contacto.html) e [index.html](index.html)
- `initContactForm` e `initNewsletterForm` agora fazem `INSERT` real
- Tratamento de erro `23505` (email duplicado na newsletter)

### Fase 5 — UX
- Validação client-side mantida (sem alterações ao layout)
- Mensagens de erro genéricas (sem expor stack)
- `disabled` no botão durante o `await`
- Reset apenas em sucesso

### Fase 6 — Segurança
- `js/supabase-config.js` em [.gitignore](.gitignore)
- Apenas anon key no cliente; service_role nunca usada
- RLS rigorosa: só `INSERT`, sem `SELECT/UPDATE/DELETE` para `anon`
- Sem logs de payload em produção

### Fase 7 — Deploy
- Projecto Vercel: `vec21s-projects/adriana-telart`
- URL: https://adriana-telart.vercel.app
- Inspect: https://vercel.com/vec21s-projects/adriana-telart
- Linked ao GitHub `vec21/telArt` (deploys automáticos em push)

### Validação E2E
- Local: form contacto + newsletter persistem ✅
- Produção: form contacto + newsletter persistem ✅
- Duplicado newsletter: tratado com mensagem amigável ✅

### Estado Supabase (linhas reais)
| Tabela | Linhas |
|---|---|
| `formulario` | 3 |
| `newsletter` | 2 |

---

## 🟡 Falta (pequenas validações pós-deploy)

- [ ] Push do branch `master` para `origin` (commits locais ainda não publicados)
- [ ] Limpar dados de teste das tabelas antes do go-live (3 + 2 linhas dummy)
- [ ] Verificar que `js/supabase-config.js` em produção tem as credenciais correctas (já confirmado por AC9 a passar)
- [ ] Configurar domínio custom na Vercel (se aplicável)

---

## 🔴 Out of Scope — requer Change Control ([SPEC §12](SPEC.md#12-change-control))

Itens **não** implementados por estarem fora do contrato actual:

- **Dashboard admin** ← pedido em conversa, requer bump para v2.0.0 (ver proposta abaixo)
- Autenticação de utilizadores
- Notificações por email ao receber submissão
- Rate limiting / anti-spam (captcha, honeypot)
- Painel de gestão de leads
- Export CSV das submissões
- Dashboard de métricas
- Internacionalização
- Testes automatizados (E2E / unit)

---

## 📋 Proposta de Change Control para Dashboard Admin

> Esta secção é **proposta**, não implementação. Decisão fica contigo.

### Bump sugerido
SPEC `v1.2.0` → `v2.0.0` (mudança major: adiciona auth + UI nova).

### Novo IN SCOPE proposto
- Página `admin.html` protegida por Supabase Auth (email+password ou magic link)
- Listagem de submissões (`formulario` e `newsletter`) com:
  - Tabela paginada
  - Filtros (data, assunto)
  - Marcar como "lido"/"respondido" (nova coluna `status`)
- Logout
- RLS: nova policy de `SELECT` apenas para utilizadores autenticados com role admin

### Schema adicional necessário
```sql
-- Nova coluna em formulario
alter table public.formulario add column status text not null default 'novo'
  check (status in ('novo','lido','respondido','arquivado'));

-- RLS: SELECT apenas para autenticados
create policy "admin select formulario"
  on public.formulario for select
  to authenticated using (true);

-- Mesma lógica para newsletter (opcional)
```

### Novos ficheiros
- `admin.html` — página de login + dashboard
- `js/admin.js` — lógica de listagem
- `js/auth.js` — login/logout/session check

### Riscos novos
- Como definir quem é "admin"? Opções:
  - (a) Tabela `admins` com emails autorizados (simples)
  - (b) Custom claim no JWT (mais complexo)
  - (c) Apenas qualquer authenticated user que tu crieis manualmente no Supabase (pragmático)

### Estimativa de fases
1. SPEC v2.0.0 escrito e aprovado
2. Auth Supabase configurada (email + password)
3. `admin.html` + login funcional
4. Listagem read-only de `formulario`
5. Filtros + status update
6. Listagem `newsletter`
7. Deploy + teste

### Decisão necessária para avançar
1. Aprovas o bump para v2.0.0?
2. Qual mecanismo de "admin"? (a/b/c acima)
3. Auth: email+password, magic link, ou OAuth (Google)?
4. Listar `newsletter` no dashboard ou só `formulario`?

Responde-me com as respostas a essas 4 perguntas e eu actualizo o SPEC e implemento.
