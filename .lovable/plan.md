

## Substituir verde escuro por #738925

A cor verde escura (`#0E2F1A` / `hsl(145, 60%, 11%)`) é usada como `--primary` e em várias referências hardcoded. Será substituída por `#738925` (`hsl(73, 57%, 34%)`), um verde oliva mais claro.

### Alterações

**1. `src/index.css` — Tokens globais**
- `--primary`: `145 60% 11%` → `73 57% 34%`
- `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground`: `145 60% 10%` → `73 57% 34%`
- `--ring`: `145 60% 11%` → `73 57% 34%`
- `--sidebar-background`: `145 55% 10%` → `73 57% 20%` (versão mais escura para sidebar)
- `--sidebar-primary-foreground`: `145 60% 10%` → `73 57% 34%`
- `--sidebar-accent`: `145 50% 16%` → `73 50% 28%`
- `--sidebar-border`: `145 40% 20%` → `73 40% 28%`
- `--c-text-p`: `#0D2818` → `#738925` (ou manter escuro para legibilidade — ver nota abaixo)

**Nota sobre legibilidade**: `#738925` é uma cor média, não escura. Para texto primário (`--foreground`, `--c-text-p`) manter uma versão mais escura como `hsl(73, 57%, 15%)` (`#2E3710`) garante contraste WCAG AA. O `--primary` (botões, badges) usa `#738925` diretamente.

**2. `src/pages/Index.tsx` — Hardcoded hex**
- `TOOLTIP_STYLE.contentStyle.background`: `#0E2F1A` → `#738925`
- `TOOLTIP_STYLE.contentStyle.border`: `#1A4A2E` → `#8BA030` (versão mais clara)
- `C.textP`: `#0D2818` → `#2E3710` (escuro para legibilidade)
- SVG text fills `#0D2818` → `#2E3710`

**3. Componentes UI** — usam `bg-primary` via Tailwind, atualizam automaticamente via token. Nenhuma edição manual necessária nesses arquivos.

### Decisão necessária

Antes de implementar, preciso confirmar: usar `#738925` **apenas em elementos de destaque** (botões, badges, sidebar bg, rings) mantendo textos com uma versão escura (`#2E3710`) para legibilidade? Ou aplicar `#738925` literalmente em tudo, incluindo texto principal?

