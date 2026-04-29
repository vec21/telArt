# Copilot Instructions — adrianaTelArt

Este projecto opera em **Spec-Driven Development (SDD)**.

## Fonte de verdade
- Especificação: [SPEC.md](../SPEC.md)
- Regras operacionais do agente: [.github/instructions/sdd.instructions.md](instructions/sdd.instructions.md)

## Regra-zero
Antes de qualquer alteração de código:
1. Ler `SPEC.md`.
2. Mapear a tarefa a uma secção `§N`.
3. Se não mapear → parar e abrir Change Control ([SPEC §12](../SPEC.md#12-change-control)).

## Ordem obrigatória das fases
`§3 Setup` → `§4 Análise` → `§5 Supabase` → `§6 Integração` → `§7 UX` → `§8 Segurança` → `§9 Deploy`

Não saltar fases. Não implementar fora de `IN SCOPE` ([SPEC §2.1](../SPEC.md#21-in-scope)).

## Formato de cada resposta de implementação
```
Ref SPEC: §X.Y
Fase: N — <nome>
Acções: <lista curta>
Próximo: <passo seguinte>
```

## Proibições rápidas
- Sem dependências fora do escopo.
- Sem `service_role` no cliente.
- Sem commit de `.env.local`.
- Sem testes/docs/refactors não pedidos.
- Sem alterações visuais ao formulário.

Detalhe completo em [.github/instructions/sdd.instructions.md](instructions/sdd.instructions.md).
