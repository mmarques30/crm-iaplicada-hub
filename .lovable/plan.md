

## Redesign de Marca - IAplicada CRM

### Contexto (do Brandbook)
- **Paleta**: Verde #738925 a #F6F7E9 (9 tons), Dark #2F302B, White #FFFFFF, Light #F2F2F2, Warm #FFFFF6
- **Tipografia**: Sora (Google Fonts) — substituir Inter atual
- **Território visual**: Executiva-tech, neutra e contemporânea
- **Logo**: Quatro folhas em tons de verde (já fornecida pelo usuário)

### Mudancas

#### 1. Copiar logo e atualizar tipografia
- Copiar `Logo_Colorida_fundo_branco.png` para `src/assets/logo.png`
- Adicionar fonte Sora via Google Fonts no `index.html`
- Atualizar `src/index.css` para usar Sora no body

#### 2. Atualizar paleta de cores (src/index.css)
Ajustar os CSS variables para os hex exatos do brandbook:

| Token | Hex atual (aprox) | Hex brandbook |
|-------|-------------------|---------------|
| brand-900 / primary | ~#738925 | #738925 |
| brand-800 | ~#889C2D | #889C2D |
| brand-700 | ~#9EB038 | #9EB038 |
| brand-600 | ~#AFC040 | #AFC040 |
| brand-500 | ~#BCC95D | #BCC95D |
| brand-400 | ~#C8D27B | #C8D27B |
| brand-300 | ~#D9DFA1 | #D9DFA1 |
| brand-200 | ~#E9EBC6 | #E9EBC6 |
| brand-100 | ~#F6F7E9 | #F6F7E9 |
| sidebar bg | - | #2F302B |
| background | - | #FFFFFF |
| muted/secondary bg | - | #F2F2F2 |

#### 3. Modernizar Sidebar (AppSidebar.tsx)
- Substituir o ícone "IA" pela logo real importada de `src/assets/logo.png`
- Sidebar dark (#2F302B) com texto claro
- Melhorar spacing e hover states

#### 4. Modernizar Header (AppLayout.tsx)
- Fundo branco limpo com sombra sutil em vez de border-b
- Busca com bordas arredondadas mais suaves
- Avatar com iniciais em vez de ícone genérico

#### 5. Modernizar Cards e MetricCards
- Cards com `shadow-sm hover:shadow-md transition-shadow` e borda mais suave
- MetricCard: ícone em círculo com fundo verde-100, borda removida
- Bordas arredondadas maiores (radius de 0.625rem para 0.75rem)

#### 6. Corrigir build errors (edge functions)
- Os erros de build estao em `supabase/functions/hubspot-import/index.ts` e `instagram-comments/index.ts` — tipos incompatíveis com o Supabase client. Corrigir com type assertions.

### Arquivos modificados
| Arquivo | O que muda |
|---------|-----------|
| `index.html` | Link do Google Fonts Sora |
| `src/index.css` | Paleta de cores exata, fonte Sora, radius maior |
| `src/components/layout/AppSidebar.tsx` | Logo real, refinamento visual |
| `src/components/layout/AppLayout.tsx` | Header modernizado |
| `src/components/dashboard/MetricCard.tsx` | Design mais limpo |
| `src/components/ui/card.tsx` | Sombra e hover por padrao |
| `supabase/functions/hubspot-import/index.ts` | Fix type errors |
| `supabase/functions/instagram-comments/index.ts` | Fix .catch error |

