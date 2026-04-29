# SPEC — Spec-Driven Development (SDD)

> **Projecto:** adrianaTelArt — Integração de formulário com Supabase + Deploy Vercel
> **Versão:** 1.1.0
> **Estado:** Em execução
> **Owner:** Veríssimo
> **Última actualização:** 2026-04-29

## Changelog
- **1.1.0** — Pós-análise (Fase §4). Stack real é HTML+CSS+JS vanilla (não Next.js). Schema estendido com `assunto` e `telefone`. Estratégia de envs adaptada a site estático. MCPs Supabase e Vercel obrigatórios.
- **1.0.0** — Versão inicial.

---

## 0. Princípio SDD

> Nada é implementado fora desta especificação. Qualquer alteração mapeia para uma secção. Caso contrário → [§12 Change Control](#12-change-control).

---

## 1. Objectivo

Integrar o formulário existente (`#contactForm` em `contacto.html`) com Supabase e publicar na Vercel com persistência funcional.

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

---

## 2. Escopo

### 2.1. IN SCOPE
- Provisionar Supabase + tabela `formulario` via **MCP Supabase**
- Cliente Supabase via CDN em `contacto.html`
- Substituir `setTimeout` fake em `js/app.js` por `INSERT` real
- Manter UX existente (validação, `#formStatus`, reset)
- Deploy estático Vercel via **MCP Vercel**

### 2.2. OUT OF SCOPE
- Migrar para Next.js / qualquer framework com build
- Auth, painel admin, emails, ORM, i18n, testes, uploads
- Refactor visual / CSS / layout
- Alterações fora de `contacto.html`, `js/app.js`, `js/supabase*.js`, `.gitignore`

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

### 5.2. Schema da tabela `formulario`

```sql
create table public.formulario (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null,
  telefone    text,
  assunto     text not null,
  mensagem    text not null,
  created_at  timestamptz not null default now()
);
```

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
