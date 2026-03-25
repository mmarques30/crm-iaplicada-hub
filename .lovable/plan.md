

## Plano: Corrigir layout "Custo por Contato por Canal"

### Problemas identificados
1. **Backgrounds claros (pastéis)** nos cards de canal — `hsl(0 80% 95%)`, `hsl(210 80% 95%)`, `hsl(270 60% 95%)` — criam contraste quebrado no tema escuro. Os títulos dos canais ficam invisíveis porque usam `text-foreground` (claro) sobre fundo claro.
2. **Roxo (#8b5cf6)** usado no card "Campanhas Meta" viola a regra de branding (roxo proibido).
3. O visual não combina com o restante da página escura.

### Alterações em `src/pages/PainelGeral.tsx` (linhas 588-638)

Substituir os 3 cards de canal por backgrounds escuros semi-transparentes com borda lateral colorida, consistentes com o tema:

- **Instagram Orgânico**: `bg-[#1A0804]` com borda `border-l-3 border-[#E8684A]` (coral)
- **Facebook Ads**: `bg-[#040E1A]` com borda `border-l-3 border-[#4A9FE0]` (blue)
- **Campanhas Meta**: `bg-[#0C1A14]` com borda `border-l-3 border-[#2CBBA6]` (teal, substituindo roxo)

Cada card mantém a mesma estrutura (badge circular + nome + métricas) mas com cores de texto que funcionam no tema escuro (`text-[#E8EDD8]` para títulos).

### Arquivo afetado
- `src/pages/PainelGeral.tsx`

