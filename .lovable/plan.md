

## Substituir Logo e Ajustar Backgrounds

### 1. Copiar nova logo
Copiar `user-uploads://Logo_Colorida_fundo_preto.png` para `src/assets/logo.png` (substituindo a atual).

### 2. Ajustar cores de background (`src/index.css`)
Trocar os backgrounds azul-escuro por preto + verde escuro da marca:

| Variável | Valor atual (azul) | Novo valor |
|---|---|---|
| `--background` | `220 60% 8%` (#080F25) | `0 0% 4%` (~#0A0A0A, preto) |
| `--card` | `220 40% 20%` | `80 20% 12%` (verde escuro dark) |
| `--popover` | `220 40% 20%` | `80 20% 12%` |
| `--secondary` | `220 30% 28%` | `80 15% 18%` |
| `--muted` | `220 30% 24%` | `80 12% 15%` |
| `--accent` | `220 30% 28%` | `80 15% 18%` |
| `--border` | `220 20% 22%` | `80 10% 16%` |
| `--input` | `220 20% 22%` | `80 10% 16%` |
| `--sidebar-background` | `220 55% 10%` | `80 15% 7%` (verde muito escuro) |
| `--sidebar-accent` | `220 30% 18%` | `80 12% 14%` |
| `--sidebar-border` | `220 20% 18%` | `80 10% 13%` |

### 3. Atualizar gradient blob (`src/index.css`)
Trocar o gradiente decorativo de tons azuis para verde da marca.

### Arquivos modificados
| Arquivo | Ação |
|---|---|
| `src/assets/logo.png` | Substituir pela nova logo |
| `src/index.css` | Trocar backgrounds azuis por preto/verde escuro |

