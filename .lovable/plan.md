

## Substituir Grid de 3 Cards na Aba Pipeline de Vendas

### Escopo
Alterar APENAS as linhas 390-480 de `src/pages/Index.tsx` — o `div` com `grid gap-4 md:grid-cols-2 lg:grid-cols-3` que contém os 3 cards (Velocidade, Ticket Médio, Deals em Risco). Nenhuma outra parte do arquivo será tocada.

### O que muda

O grid atual (3 cards com shadcn Card + Recharts) será substituído por 3 cards custom com layout pixel-perfect conforme especificação:

| Card | Título | Conteúdo principal | Alert (rodapé) |
|---|---|---|---|
| 1 - Velocidade do Pipeline | Sub: "4 estágios com deals ativos" | 4 rows com dot colorido, nome, barra proporcional, count. Agrupados por zonas (Entrada/Atividade/Conversão) | Gargalo: "86% dos deals parados em Contato Iniciado" (verde) |
| 2 - Receita em Aberto | Sub: "Potencial dos 4 deals ativos" | Bloco central "R$ 210k" grande amber + 2 linhas de fase com barras | Prioridade: "1 deal concentra 57% da receita" (amber) |
| 3 - Status dos Deals | Sub: "122 deals no total" | Donut SVG manual (4 segmentos: Perdidos/Em progresso/Em risco/Ganhos) + legenda 4 linhas | Atenção: "66% dos deals foram perdidos" (coral) |

### Grid
- `grid-template-columns: 1.35fr 1fr 0.9fr` (substituindo `lg:grid-cols-3`)
- `gap: 12px`
- Cards com `bg-[#131608]`, border `#1E2610`, radius 12px, padding 18px, flex column

### Implementação
- Um único bloco JSX inline substituindo linhas 390-480
- Sem novos componentes ou arquivos
- Sem Recharts para o donut — SVG manual com `stroke-dasharray`/`stroke-dashoffset`
- Valores hardcoded conforme spec (dados estáticos de design)
- Todas as cores, tamanhos e espaçamentos exatamente como especificado

### Arquivo
| Arquivo | Linhas | Alteração |
|---|---|---|
| `src/pages/Index.tsx` | 390-480 | Substituir grid de 3 cards por novo layout custom |

