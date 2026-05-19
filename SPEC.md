# SPEC — Spec-Driven Development (SDD)

> **Projecto:** adrianaTelArt — Integração de formulário com Supabase + Deploy Vercel
> **Versão:** 2.1.2
> **Estado:** Fase 2.1 em curso (DB criada). v2.0.0 em produção.
> **Owner:** Veríssimo
> **Última actualização:** 2026-05-19

## Changelog
- **2.1.2** — Change Control: `js/supabase-config.js` passa a ser **comitado** (anon key é pública por design; segurança vem das RLS policies). Necessário porque o auto-deploy Vercel via git não tem acesso a ficheiros gitignored e o site é estático (sem env vars no client). `.example.js` mantido como referência histórica.
- **2.1.1** — Change Control: categorias da tabela `produtos` alinhadas com o catálogo real da Tel'Art (`kit_bloguerinha`, `kit_skincare`, `buque`, `cesta`, `caneca`, `cantil`, `caixa_explosiva`, `outro`). Substitui o conjunto genérico inicial que não correspondia ao negócio.
- **2.1.0** — Fase 2.1: catálogo dinâmico. Tabela `produtos` + Supabase Storage bucket `produtos` (public read, authenticated write). Tab Produtos no admin com CRUD + upload de imagem. `catalogo.html` passa a renderizar dinamicamente a partir do Supabase. Categorias fixas (`tapecaria`, `decoracao`, `tradicional`, `arte`, `outro`).
- **2.0.0** — Major: introduz dashboard administrativo (`admin.html`) com Supabase Auth (email+password). Adiciona gestão de Mensagens e Newsletter. Sub-fases planeadas: 2.1 Produtos+Catálogo dinâmico, 2.2 Encomendas, 2.3 Settings, 2.4 Estatísticas. Mecanismo admin: pragmático (qualquer authenticated user). Storage Supabase activado (Fase 2.1).
- **1.2.0** — Adicionado segundo formulário (newsletter em `index.html`). Nova tabela `newsletter`. Scripts Supabase incluídos também em `index.html`.
- **1.1.0** — Pós-análise (Fase §4). Stack real é HTML+CSS+JS vanilla (não Next.js). Schema estendido com `assunto` e `telefone`. Estratégia de envs adaptada a site estático. MCPs Supabase e Vercel obrigatórios.
- **1.0.0** — Versão inicial.

---

## 0. Princípio SDD

> Nada é implementado fora desta especificação. Qualquer alteração mapeia para uma secção. Caso contrário → [§12 Change Control](#12-change-control).

---

## 1. Objectivo

**v1.x (entregue):** Integrar formulários `#contactForm` e `#newsletterForm` com Supabase + deploy Vercel.

**v2.x (em curso):** Construir dashboard administrativo (`admin.html`) protegido por Supabase Auth, permitindo gerir todo o negócio (mensagens, newsletter, catálogo de produtos, encomendas, configurações do site, estatísticas).

### 1.1. Definition of Done

| # | Critério | Verificação |
|---|----------|-------------|
| AC1 | Repo clonado e site abre localmente | Servidor estático em `localhost` |
| AC2 | Tabela `formulario` com schema [§5.2](#52-schema-da-tabela-formulario) | `mcp_supabase_list_tables` |
| AC3 | Submit insere registo | `mcp_supabase_execute_sql` SELECT |
| AC4 | Validação client-side mantida | Submit bloqueado com campo vazio |
| AC5 | Feedback em `#formStatus` | Mensagem visível no DOM |
| AC6 | Reset pós-sucesso | Inputs vazios |
| AC7 | Sem secrets no repo | `.gitignore` cobre `js/supabase-config.js` |
| AC8 | Deploy Vercel público (200) | `mcp_vercel_deploy_to_vercel` |
| AC9 | Submit em produção persiste | `mcp_supabase_execute_sql` confirma linha |

### 1.2. Definition of Done — Fase 2.0 (admin shell + mensagens + newsletter)

| # | Critério | Verificação |
|---|----------|-------------|
| AC10 | `admin.html` exige login | Acesso sem sessão redirecciona para `/admin` login form |
| AC11 | Login email+password funciona | Sessão persiste em `localStorage` (Supabase) |
| AC12 | Logout limpa sessão | Botão logout devolve ao login form |
| AC13 | Lista mensagens de `formulario` | Tabela renderizada com paginação |
| AC14 | Marcar status (novo/lido/respondido/arquivado) | UPDATE persiste no Supabase |
| AC15 | Lista subscritores `newsletter` | Tabela renderizada |
| AC16 | Export CSV (mensagens e newsletter) | Download de `.csv` válido |
| AC17 | RLS só permite leitura/UPDATE a authenticated | `anon` continua bloqueado de SELECT |

### 1.3. Definition of Done — Fase 2.1 (produtos + storage + catálogo dinâmico)

| # | Critério | Verificação |
|---|----------|-------------|
| AC18 | Tabela `produtos` com schema [§5.4](#54-schema-produtos-v21) criada | `mcp_supabase_list_tables` |
| AC19 | Bucket Storage `produtos` público para leitura | `select * from storage.buckets where id='produtos'` |
| AC20 | Tab Produtos no admin lista, cria, edita, elimina | UI funcional + linhas persistidas |
| AC21 | Upload de imagem funciona | Ficheiro em `storage/produtos/...` + `imagem_url` gravado |
| AC22 | Toggle `ativo`/`destaque` persiste | UPDATE no Supabase |
| AC23 | `catalogo.html` renderiza produtos `ativo=true` ordenados por `ordem` | Filtro por categoria operacional |
| AC24 | RLS produtos: anon SELECT (`ativo=true`), authenticated CRUD | Policies aplicadas |
| AC25 | Storage RLS: anon read bucket, authenticated upload/delete | Policies aplicadas |

---

## 2. Escopo

### 2.1. IN SCOPE (v1.x — entregue)
- Provisionar Supabase + tabelas `formulario` e `newsletter` via **MCP Supabase**
- Cliente Supabase via CDN em `contacto.html` e `index.html`
- Substituir `setTimeout` fake em `js/app.js` por `INSERT` real
- Manter UX existente
- Deploy estático Vercel via **MCP Vercel**

### 2.1.bis IN SCOPE — Fase 2.0 (em curso)
- Activar Supabase Auth (email+password, sem email confirm)
- Adicionar coluna `status` em `formulario` (`novo|lido|respondido|arquivado`)
- Policies RLS de SELECT/UPDATE em `formulario` e SELECT em `newsletter` para `authenticated`
- Criar `admin.html` com login + dashboard shell (tabs: Mensagens, Newsletter, futuro: Produtos/Encomendas/Settings/Stats)
- Criar `js/admin.js` com: gestão de sessão, listagem com paginação, filtros, update de status, export CSV
- Não alterar formulários públicos existentes

### 2.1.ter IN SCOPE — Fase 2.1 (em curso)
- Tabela `produtos` + RLS (anon SELECT só `ativo=true`; authenticated CRUD completo)
- Bucket Storage `produtos` (public read; authenticated insert/update/delete)
- Tab Produtos no admin: list (com filtro categoria/ativo), criar, editar, eliminar, toggle `ativo`/`destaque`, upload de imagem (substitui imagem anterior se houver)
- `catalogo.html` dinâmico: fetch produtos `ativo=true` ordenados por `ordem`, com filtro por categoria; manter visual existente (cards reutilizam classes actuais)
- Categorias fixas no código (v2.1.1): `kit_bloguerinha`, `kit_skincare`, `buque`, `cesta`, `caneca`, `cantil`, `caixa_explosiva`, `outro`

### 2.1.quater IN SCOPE — Fases futuras (planeadas)
- **2.2** Encomendas: `encomendas` + `encomenda_itens`
- **2.3** Settings: tabela `settings` (key/value JSONB) editando WhatsApp/email/banner
- **2.4** Estatísticas: dashboard com gráficos via Chart.js CDN

### 2.2. OUT OF SCOPE (v2.x)
- Migrar para framework com build (Next/Vite/etc.)
- OAuth (Google/GitHub) — só email+password
- Magic links
- Multi-tenancy / roles granulares (RBAC) — mecanismo é "qualquer authenticated"
- Reset password por email (futuro)
- 2FA
- Notificações push / email automático de novas mensagens
- i18n / SEO avançado
- Testes automatizados
- Refactor visual do site público

### 2.3. Ferramentas obrigatórias do agente
- **MCP Supabase** (`mcp_supabase_*`): schema, RLS, queries, advisors
- **MCP Vercel** (`mcp_vercel_*`): deploy, logs, projecto
- **Git** via terminal: commits e push

---

## 3. Fase 1 — Setup Local ✅

Executado:
```
git init
git remote add origin https://github.com/vec21/telArt.git
git fetch origin
git checkout -t origin/master
```
Branch padrão: `master`.

Validação: abrir `contacto.html` via Live Server / `npx serve .`.

---

## 4. Fase 2 — Análise ✅

- **Stack:** HTML/CSS/JS vanilla, multi-página estática. Sem `package.json`.
- **Form:** `#contactForm` em [contacto.html](contacto.html) (linhas 110-160).
- **Handler:** `initContactForm()` em [js/app.js](js/app.js#L120-L178). Faz `setTimeout` fake (linhas 169-176).

Campos:
| Campo | Tipo HTML | Required |
|---|---|---|
| `name` | text minlength=2 | ✅ |
| `email` | email | ✅ |
| `phone` | tel | ❌ |
| `subject` | select | ✅ |
| `message` | textarea ≥10 chars | ✅ |

---

## 5. Fase 3 — Supabase

### 5.1. Provisionamento (via MCP)
- Confirmar projecto activo: `mcp_supabase_get_project_url`, `mcp_supabase_get_publishable_keys`.
- Guardar URL e anon key.

### 5.2. Schema das tabelas

```sql
-- v1.x
create table public.formulario (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null,
  telefone    text,
  assunto     text not null,
  mensagem    text not null,
  created_at  timestamptz not null default now()
);

create table public.newsletter (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  created_at  timestamptz not null default now()
);

-- v2.0 add
alter table public.formulario add column status text not null default 'novo'
  check (status in ('novo','lido','respondido','arquivado'));
```

### 5.4. Schema produtos (v2.1)

```sql
create table public.produtos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  slug         text not null unique,
  descricao    text,
  preco        numeric(12,2),                  -- null = "Sob consulta"
  categoria    text not null check (categoria in ('kit_bloguerinha','kit_skincare','buque','cesta','caneca','cantil','caixa_explosiva','outro')),
  imagem_url   text,                            -- public URL do bucket
  imagem_path  text,                            -- path interno (storage key) para apagar/substituir
  destaque     boolean not null default false,
  ativo        boolean not null default true,
  ordem        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index produtos_categoria_idx on public.produtos (categoria);
create index produtos_ativo_ordem_idx on public.produtos (ativo, ordem);
```

### 5.5. RLS produtos (v2.1)

```sql
alter table public.produtos enable row level security;

-- público lê só produtos activos
create policy "anon select produtos ativos" on public.produtos
  for select to anon using (ativo = true);

-- authenticated CRUD completo
create policy "auth select produtos" on public.produtos for select to authenticated using (true);
create policy "auth insert produtos" on public.produtos for insert to authenticated with check (true);
create policy "auth update produtos" on public.produtos for update to authenticated using (true) with check (true);
create policy "auth delete produtos" on public.produtos for delete to authenticated using (true);

grant select on public.produtos to anon;
grant select, insert, update, delete on public.produtos to authenticated;
```

### 5.6. Storage bucket produtos (v2.1)

- Bucket `produtos`, public = true (URLs públicas para leitura).
- Policies em `storage.objects`:
  - `anon select produtos bucket` — leitura pública.
  - `auth insert produtos bucket`, `auth update produtos bucket`, `auth delete produtos bucket` — gestão pelo admin.
- Path padrão: `produtos/<uuid>-<slug>.<ext>`.

### 5.3. RLS — v2.0

```sql
-- formulario: anon insert (mantido), authenticated select/update
create policy "auth select formulario"  on public.formulario for select to authenticated using (true);
create policy "auth update formulario"  on public.formulario for update to authenticated using (true) with check (true);

-- newsletter: anon insert (mantido), authenticated select
create policy "auth select newsletter"  on public.newsletter for select to authenticated using (true);

grant select, update on public.formulario to authenticated;
grant select on public.newsletter to authenticated;
```

> Sem policy de DELETE — admin apenas arquiva (status='arquivado').

### 5.3. RLS

```sql
alter table public.formulario enable row level security;

create policy "anon insert formulario"
on public.formulario
for insert
to anon
with check (true);
```
Sem policies de SELECT/UPDATE/DELETE para `anon`.

### 5.4. Validação
- `mcp_supabase_list_tables` → `formulario` listada
- `mcp_supabase_get_advisors type=security` → sem alertas críticos

---

## 6. Fase 4 — Integração

### 6.1. Credenciais

`js/supabase-config.js` (gitignored):
```js
window.SUPABASE_CONFIG = {
  url: 'https://<ref>.supabase.co',
  anonKey: '<anon-key>'
};
```

`js/supabase-config.example.js` (commitado):
```js
window.SUPABASE_CONFIG = { url: '', anonKey: '' };
```

`.gitignore` adiciona:
```
js/supabase-config.js
```

### 6.2. Cliente

`js/supabase.js`:
```js
(function(){
  const cfg = window.SUPABASE_CONFIG || {};
  if(!cfg.url || !cfg.anonKey){
    console.error('Supabase config em falta.');
    return;
  }
  window.supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
})();
```

### 6.3. `contacto.html`

Antes de `<script src="js/app.js">`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
<script src="js/supabase.js"></script>
```

### 6.4. `js/app.js` — substituir `setTimeout` por insert real

Trocar bloco linhas ~169-176 por chamada `async` a `client.from('formulario').insert({...})` mapeando `name→nome`, `subject→assunto`, `message→mensagem`. Mensagens de erro genéricas. Reset apenas em sucesso.

---

## 7. Fase 5 — UX
Mantém-se. Apenas:
- Mensagens genéricas em erro (sem stack/raw error).
- `disabled` durante `await`.

---

## 8. Fase 6 — Segurança
- [ ] `js/supabase-config.js` em `.gitignore`
- [ ] Só anon key no cliente; service_role nunca usada
- [ ] RLS com policy apenas INSERT para `anon`
- [ ] Sem `console.log` de payload em produção
- [ ] `mcp_supabase_get_advisors` limpo antes do deploy

---

## 9. Fase 7 — Deploy Vercel (via MCP)

Estratégia: site estático (preset "Other"). Como `anonKey` é pública por design e gitignorada localmente, será **incluída no upload** do `mcp_vercel_deploy_to_vercel` (que faz upload do directório local, não do git remoto).

Passos:
1. Garantir que `js/supabase-config.js` existe localmente preenchido.
2. `mcp_vercel_deploy_to_vercel`.
3. Testar submit real no URL retornado.
4. `mcp_supabase_execute_sql` para confirmar persistência.
5. `mcp_vercel_get_runtime_logs` se houver erro.

---

## 10. Stack & Decisões

| Item | Escolha |
|---|---|
| Frontend | HTML/CSS/JS vanilla (existente) |
| DB | Supabase Postgres |
| SDK | `@supabase/supabase-js@2` via CDN |
| Hosting | Vercel estático |
| Env | `js/supabase-config.js` gitignored |
| Provisionamento | MCP Supabase |
| Deploy | MCP Vercel |

---

## 11. Riscos
| Risco | Mitigação |
|---|---|
| Anon key exposta | RLS rigorosa, só INSERT |
| Spam | OUT OF SCOPE (follow-up) |
| Config ausente em produção | Validar AC9 pós-deploy |

---

## 12. Change Control
1. Pausar implementação
2. Editar SPEC
3. Bump semver (patch/minor/major)
4. Confirmar com owner
5. Retomar

---

## 13. Log de execução

### 13.1. Comandos
```
git init
git remote add origin https://github.com/vec21/telArt.git
git fetch origin
git checkout -t origin/master
```

### 13.2. Ficheiros
- `SPEC.md` (1.0.0 → 1.1.0)
- `.github/copilot-instructions.md`
- `.github/instructions/sdd.instructions.md`

### 13.3. Stack
HTML/CSS/JS vanilla. Form `#contactForm` em `contacto.html`. Handler em `js/app.js:120-178`.

### 13.4. Erros & soluções
- `git clone .` falhou (dir não vazio). Solução: `git init` + `remote add` + `fetch` + `checkout -t origin/master`.
- Branch padrão é `master`, não `main`.

### 13.5. URLs
- Vercel: _(pendente)_
- Supabase ref: _(pendente)_
