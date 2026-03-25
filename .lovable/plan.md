

## Ajuste: reduzir tamanho das bolinhas no scatter "Engajamento por Post"

### Problema
A linha 155 define `ZAxis range={[20, 400]}`, ou seja, os pontos variam de 20px a 400px de área. Num gráfico de apenas 280px de altura, bolinhas de até 400px de área ficam enormes e se sobrepõem.

### Solução
Reduzir o range do ZAxis de `[20, 400]` para `[10, 120]`. Isso mantém a proporção visual entre posts com alcance alto e baixo, mas com bolinhas muito menores e proporcionais ao tamanho do gráfico.

### Arquivo
`src/pages/InstagramAnalytics.tsx` — linha 155

### Alteração
```
// De:
<ZAxis dataKey="z" range={[20, 400]} name="Alcance" />

// Para:
<ZAxis dataKey="z" range={[10, 120]} name="Alcance" />
```

