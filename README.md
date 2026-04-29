# adrianaTelArt

Site institucional **Tel'Art** (tapeçaria e decoração de Adriana) com formulários ligados a Supabase e dashboard administrativo protegido por autenticação.

🌍 **Produção:** https://adriana-telart.vercel.app
🔐 **Admin:** https://adriana-telart.vercel.app/admin.html

---

## Stack

- **Frontend:** HTML5 + CSS3 + JavaScript vanilla (sem build)
- **Backend:** [Supabase](https://supabase.com) — Postgres + Auth + Storage
- **Hosting:** [Vercel](https://vercel.com) (estático, deploy automático em push)
- **Metodologia:** Spec-Driven Development ([SPEC.md](SPEC.md))

## Funcionalidades

### Site público
- Páginas: `index.html`, `catalogo.html`, `sobre.html`, `contacto.html`
- Formulário de contacto → tabela `formulario`
- Subscrição newsletter (homepage) → tabela `newsletter`
- Validação client-side + feedback inline

### Dashboard admin (`/admin.html`)
- Login Supabase Auth (email+password)
- **Mensagens:** lista paginada de contactos, filtro por estado (`novo|lido|respondido|arquivado`), pesquisa por nome/email, modal de detalhe com `mailto:` + `wa.me/`, export CSV
- **Newsletter:** lista de subscritores, pesquisa, export CSV
- Tabs em desenvolvimento: Produtos, Encomendas, Configurações, Estatísticas

---

## Estrutura

```
adrianaTelArt/
├── index.html, catalogo.html, sobre.html, contacto.html, admin.html
├── css/
│   ├── style.css     # site público
│   └── admin.css     # dashboard
├── js/
│   ├── app.js                   # comportamento público (forms, menu, etc.)
│   ├── admin.js                 # dashboard
│   ├── supabase.js              # inicializa client
│   ├── supabase-config.js       # credenciais (gitignored)
│   └── supabase-config.example.js
├── images/
├── SPEC.md           # contrato SDD
├── STATUS.md         # estado do projecto
└── NEXT-SESSION.md   # prompt para retomar trabalho
```

---

## Setup local

```powershell
git clone https://github.com/vec21/telArt.git
cd telArt

# 1. Configurar credenciais
cp js/supabase-config.example.js js/supabase-config.js
# Editar js/supabase-config.js com URL + anonKey do projecto Supabase

# 2. Servir staticamente
npx serve -l 3000 .
# Abrir http://localhost:3000
```

### Variáveis necessárias

`js/supabase-config.js` (ficheiro NÃO comitado):
```js
window.SUPABASE_CONFIG = {
  url: 'https://<project-ref>.supabase.co',
  anonKey: '<publishable-anon-key>'
};
```

> ⚠️ **Nunca** comitar este ficheiro nem usar `service_role` no cliente.

---

## Base de dados

Tabelas em `public`:

| Tabela | Acesso anon | Acesso authenticated |
|---|---|---|
| `formulario` | INSERT only | SELECT + UPDATE |
| `newsletter` | INSERT only | SELECT |
| `produtos` (planeado v2.1) | SELECT só `ativo=true` | CRUD completo |

RLS activo em todas. Schema completo em [SPEC.md §5](SPEC.md#5-fase-3--supabase).

### Criar utilizador admin

Via Supabase Dashboard → Authentication → Users → "Add user" (com "Auto Confirm User" activo).

---

## Deploy

Deploy automático em cada `git push` para `master` (Vercel ↔ GitHub).

Deploy manual:
```powershell
vercel deploy --prod --yes
```

---

## Documentação

- [SPEC.md](SPEC.md) — especificação completa, escopo, schema, RLS, DoD
- [STATUS.md](STATUS.md) — o que está feito / pendente
- [NEXT-SESSION.md](NEXT-SESSION.md) — prompt para retomar a Fase 2.1
- [.github/instructions/sdd.instructions.md](.github/instructions/sdd.instructions.md) — regras do agente

---

## Licença

Privado / proprietário. Todos os direitos reservados.
