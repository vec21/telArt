---
applyTo: "**"
---

# Instruções SDD — Spec-Driven Development

> **Fonte de verdade:** [SPEC.md](../SPEC.md)
> Estas instruções obrigam o agente a operar dentro do contrato definido no SPEC.

---

## Regra-zero (não-negociável)

**Antes de qualquer acção que altere ficheiros, o agente DEVE:**

1. Ler [SPEC.md](../SPEC.md) (ou confirmar que já o tem em contexto).
2. Identificar a secção (`§N`) à qual a tarefa pertence.
3. Se a tarefa **não** mapear para nenhuma secção do SPEC → **PARAR** e seguir [§12 Change Control](../SPEC.md#12-change-control). Nunca improvisar.

Se a Regra-zero for violada, a resposta é considerada inválida.

---

## Fluxo obrigatório de cada tarefa

1. **Citar a secção do SPEC** que justifica a alteração (ex.: `Ref: SPEC §6.2`).
2. **Verificar pré-condições** das fases anteriores antes de avançar (ordem do SPEC é obrigatória: §3 → §4 → §5 → §6 → §7 → §8 → §9).
3. **Implementar o mínimo** necessário para satisfazer o critério de aceitação correspondente.
4. **Actualizar o Log** ([SPEC §13](../SPEC.md#13-log-de-execução)) com:
   - comandos executados
   - ficheiros criados/alterados
   - erros e soluções
5. **Validar** contra o Definition of Done ([SPEC §1.1](../SPEC.md#11-critérios-de-aceitação-definition-of-done)).

---

## Restrições explícitas

### Proibido (sem aprovação prévia via Change Control)
- Adicionar dependências fora do escopo (auth, ORMs, UI libs, i18n, testes).
- Refactor de código não relacionado com a tarefa actual.
- Alterar o schema da tabela `formulario` definido em [SPEC §5.2](../SPEC.md#52-schema-da-tabela-formulario).
- Expor `service_role` key ou qualquer secret no cliente.
- Comitar `.env.local` ou ficheiros com credenciais.
- Criar testes, docs extra, ou READMEs sem pedido explícito.
- Alterar ficheiros visuais / CSS / layout do formulário (apenas comportamento).
- Saltar fases (ex.: deploy antes de RLS validado).

### Obrigatório
- `.env.local` no `.gitignore`.
- `.env.example` com chaves vazias comitado.
- Apenas chaves `NEXT_PUBLIC_*` no cliente.
- RLS activo na tabela `formulario` antes de qualquer insert real.
- Validar `npm run dev` localmente antes de cada commit relevante.
- Mensagens de erro ao utilizador **não** podem expor stack traces ou detalhes internos.

---

## Ambiguidade & decisões

- Se faltar informação (ex.: URL do repo, credenciais Supabase, escolha de stack), **PERGUNTAR** ao utilizador. Não inventar valores.
- Se duas interpretações forem possíveis, escolher a **mais conservadora** (menos código, menos dependências, menor superfície de ataque).
- Se o código existente contradisser o SPEC, **parar** e reportar — não silenciar o conflito.

---

## Formato de resposta esperado

Cada resposta de implementação inclui:

1. **Ref SPEC:** secção(ões) cobertas (ex.: `§6.2, §7`).
2. **Fase actual:** número da fase em execução.
3. **Acções tomadas:** lista curta.
4. **Próximo passo:** o que falta para fechar o critério de aceitação.

Exemplo:
```
Ref SPEC: §6.1, §6.2
Fase: 4 — Integração
Acções:
  - Criado lib/supabase.js
  - Adicionado .env.example
Próximo: ligar formulário (§6.3)
```

---

## Checklist anti-deriva (auto-verificação antes de responder)

- [ ] A acção mapeia para uma secção do SPEC?
- [ ] Estou a respeitar a ordem das fases?
- [ ] Não adicionei nada fora do IN SCOPE ([SPEC §2.1](../SPEC.md#21-in-scope))?
- [ ] Não toquei em nada do OUT OF SCOPE ([SPEC §2.2](../SPEC.md#22-out-of-scope-não-fazer-sem-aprovação))?
- [ ] Secrets continuam fora do repositório?
- [ ] Actualizei o Log [§13](../SPEC.md#13-log-de-execução)?

Se algum item falhar → reverter e corrigir antes de devolver controlo ao utilizador.
