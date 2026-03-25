import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useFiscalAnalysis, FiscalAction } from '@/hooks/useFiscalAnalysis'
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { toast } from 'sonner'

interface FiscalAIButtonProps {
  action: FiscalAction
  data: Record<string, unknown>
  label?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  onResult?: (result: any) => void
  className?: string
}

const SEVERITY_CONFIG = {
  error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  baixo: { color: 'bg-green-500/15 text-green-400', label: 'Baixo' },
  medio: { color: 'bg-amber-500/15 text-amber-400', label: 'Médio' },
  alto: { color: 'bg-orange-500/15 text-orange-400', label: 'Alto' },
  critico: { color: 'bg-red-500/15 text-red-400', label: 'Crítico' },
}

export function FiscalAIButton({
  action,
  data,
  label = 'Analisar com IA',
  variant = 'outline',
  size = 'sm',
  onResult,
  className,
}: FiscalAIButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [result, setResult] = useState<any>(null)
  const mutation = useFiscalAnalysis()

  const handleClick = async () => {
    try {
      const res = await mutation.mutateAsync({ action, data })
      setResult(res)
      setDialogOpen(true)
      onResult?.(res)
    } catch (err: any) {
      toast.error(err.message || 'Erro na análise')
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={mutation.isPending}
        className={className}
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1" />
        )}
        {mutation.isPending ? 'Analisando...' : label}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Resultado da Análise IA
            </DialogTitle>
            <DialogDescription>
              {action === 'generate_nf_data' && 'Dados fiscais gerados automaticamente'}
              {action === 'validate_fiscal' && 'Validação de dados fiscais'}
              {action === 'analyze_installments' && 'Análise de parcelas e recebíveis'}
            </DialogDescription>
          </DialogHeader>

          {result && action === 'generate_nf_data' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição do Serviço</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{result.descricao_servico}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mês de Referência</p>
                <p className="text-sm font-mono">{result.mes_referencia}</p>
              </div>
              {result.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-muted-foreground">{result.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {result && action === 'validate_fiscal' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {result.is_valid ? (
                  <Badge className="bg-green-500/15 text-green-400"><CheckCircle className="h-3 w-3 mr-1" /> Válido</Badge>
                ) : (
                  <Badge className="bg-red-500/15 text-red-400"><AlertTriangle className="h-3 w-3 mr-1" /> Problemas encontrados</Badge>
                )}
              </div>
              {result.issues?.length > 0 && (
                <div className="space-y-2">
                  {result.issues.map((issue: any, i: number) => {
                    const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info
                    const Icon = cfg.icon
                    return (
                      <div key={i} className={`p-2 rounded-lg ${cfg.bg} flex items-start gap-2`}>
                        <Icon className={`h-4 w-4 mt-0.5 ${cfg.color}`} />
                        <div>
                          <p className="text-xs font-medium">{issue.field}</p>
                          <p className="text-xs text-muted-foreground">{issue.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {result.suggestions?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sugestões</p>
                  <ul className="text-sm space-y-1">
                    {result.suggestions.map((s: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && action === 'analyze_installments' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Nível de Risco:</span>
                <Badge className={RISK_CONFIG[result.risk_level]?.color || ''}>
                  {RISK_CONFIG[result.risk_level]?.label || result.risk_level}
                </Badge>
              </div>
              <p className="text-sm">{result.summary}</p>
              {result.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Recomendações</p>
                  {result.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{rec.priority}</Badge>
                        <span className="text-sm font-medium">{rec.action}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
