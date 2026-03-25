import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { Users, Eye, Play, Bookmark, Share2, Heart, ExternalLink } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, Cell, Legend, PieChart, Pie,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ZAxis,
} from 'recharts'

const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'
const CAT_COLORS = ['#AFC040', '#4A9FE0', '#2CBBA6', '#E8A43C', '#E8684A', '#7A8460']

function classifyPost(caption: string): string {
  const c = (caption || '').toLowerCase()
  if (c.includes('algoritmo') || c.includes('cultura pop') || c.includes('netflix') || c.includes('filme') || c.includes('série')) return 'Cultura Pop + IA'
  if (c.includes('prompt') || c.includes('ferramenta') || c.includes('chatgpt') || c.includes('claude') || c.includes('tutorial') || c.includes('dica')) return 'Ferramentas de IA'
  if (c.includes('aula') || c.includes('aprend') || c.includes('dúvida') || c.includes('educac') || c.includes('curso') || c.includes('mentoria')) return 'Educacional'
  if (c.includes('carreira') || c.includes('negócio') || c.includes('empresa') || c.includes('meta') || c.includes('mercado') || c.includes('líder')) return 'Carreira & Negócios'
  if (c.includes('eu ') || c.includes('minha') || c.includes('meu') || c.includes('pessoal') || c.includes('história')) return 'Pessoal'
  return 'Outros'
}

export default function InstagramAnalytics() {
  const { data: snapshot } = useDashboardSnapshot()
  const ig = snapshot?.data?.instagram
  const posts = ig?.posts || []
  const reels = posts.filter(p => p.media_type === 'VIDEO')
  const images = posts.filter(p => p.media_type !== 'VIDEO')
  const hasData = !!ig?.metrics?.followers

  const avgLikes = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.like_count || 0), 0) / posts.length) : 0
  const avgComments = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.comments_count || 0), 0) / posts.length) : 0
  const avgReach = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.reach || 0), 0) / posts.length) : 0

  const engagementRate = useMemo(() => {
    if (!ig?.metrics?.followers || posts.length === 0) return 0
    const totalEng = posts.reduce((s, p) => s + (p.like_count || 0) + (p.comments_count || 0), 0)
    return Math.round((totalEng / posts.length / ig.metrics.followers * 100) * 10) / 10
  }, [ig, posts])

  const typeComparison = [
    { name: 'Reels', alcance: reels.length > 0 ? Math.round(reels.reduce((s, p) => s + (p.reach || 0), 0) / reels.length) : 0, curtidas: reels.length > 0 ? Math.round(reels.reduce((s, p) => s + (p.like_count || 0), 0) / reels.length) : 0, engPercent: reels.length > 0 && ig?.metrics?.followers ? Math.round(reels.reduce((s, p) => s + (p.like_count || 0) + (p.comments_count || 0), 0) / reels.length / ig.metrics.followers * 1000) / 10 : 0, count: reels.length },
    { name: 'Posts', alcance: images.length > 0 ? Math.round(images.reduce((s, p) => s + (p.reach || 0), 0) / images.length) : 0, curtidas: images.length > 0 ? Math.round(images.reduce((s, p) => s + (p.like_count || 0), 0) / images.length) : 0, engPercent: images.length > 0 && ig?.metrics?.followers ? Math.round(images.reduce((s, p) => s + (p.like_count || 0) + (p.comments_count || 0), 0) / images.length / ig.metrics.followers * 1000) / 10 : 0, count: images.length },
  ]

  const postEng = (p: any) => { if (!ig?.metrics?.followers) return 0; return Math.round(((p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0) + (p.shares || 0)) / ig.metrics.followers * 1000) / 10 }

  const scatterData = posts.map(p => ({
    x: new Date(p.timestamp || '').getTime(),
    xLabel: p.timestamp ? new Date(p.timestamp).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
    y: postEng(p),
    z: Math.max(p.reach || 0, 100),
    name: (p.caption || '').substring(0, 40) + '...',
    type: p.media_type,
    reach: p.reach || 0,
  })).sort((a, b) => a.x - b.x)
  const topPosts = [...posts].sort((a, b) => (b.reach || 0) - (a.reach || 0)).slice(0, 5)
  const bottomPosts = [...posts].sort((a, b) => (a.reach || 0) - (b.reach || 0)).slice(0, 3)
  const allPostsSorted = [...posts].sort((a, b) => (b.reach || 0) - (a.reach || 0))
  const dailyReach = ig?.dailyReach?.map(d => ({ date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), alcance: d.value || 0 })) || []
  const dailyFollowers = ig?.dailyFollowers?.map(d => ({ date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), seguidores: d.value || 0 })) || []

  const categoryData = useMemo(() => {
    const cats: Record<string, { posts: number; reach: number; likes: number; comments: number; saved: number; shares: number }> = {}
    for (const p of posts) {
      const cat = classifyPost(p.caption || '')
      if (!cats[cat]) cats[cat] = { posts: 0, reach: 0, likes: 0, comments: 0, saved: 0, shares: 0 }
      cats[cat].posts++; cats[cat].reach += p.reach || 0; cats[cat].likes += p.like_count || 0; cats[cat].comments += p.comments_count || 0; cats[cat].saved += p.saved || 0; cats[cat].shares += p.shares || 0
    }
    const totalEng = Object.values(cats).reduce((s, c) => s + c.likes + c.comments + c.saved + c.shares, 0) || 1
    return Object.entries(cats).map(([name, data]) => {
      const eng = data.likes + data.comments + data.saved + data.shares
      return { name, posts: data.posts, reach: data.reach, engPercent: Math.round((eng / totalEng) * 1000) / 10, avgReach: data.posts > 0 ? Math.round(data.reach / data.posts) : 0, engagement: eng }
    }).sort((a, b) => b.engPercent - a.engPercent)
  }, [posts])

  const insightsData = hasData ? { followers: ig!.metrics!.followers, totalReach: ig!.metrics!.totalReach, totalViews: ig!.metrics!.totalViews, totalSaved: ig!.metrics!.totalSaved, totalShares: ig!.metrics!.totalShares, avgEngagement: engagementRate, avgLikes, avgComments, avgReach, totalPosts: posts.length, totalReels: reels.length, totalImages: images.length, categories: categoryData.slice(0, 5).map(c => ({ name: c.name, engPercent: c.engPercent, posts: c.posts })), topPosts: topPosts.slice(0, 3).map(p => ({ caption: (p.caption || '').substring(0, 60), reach: p.reach || 0, likes: p.like_count || 0, comments: p.comments_count || 0, type: p.media_type })) } : null
  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'instagram', data: insightsData, enabled: hasData })

  const postEng = (p: any) => { if (!ig?.metrics?.followers) return 0; return Math.round(((p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0) + (p.shares || 0)) / ig.metrics.followers * 1000) / 10 }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Instagram Analytics</h1>
          {ig?.profile?.username && <Badge className="bg-[#141A04] text-[#AFC040]">@{ig.profile.username}</Badge>}
          {ig?.profile?.name && <Badge variant="secondary">{ig.profile.name}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise detalhada do perfil — últimos 28 dias · {posts.length} posts analisados</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KPICard label="Seguidores" value={hasData ? ig!.metrics!.followers : '—'} icon={Users} accentColor="#2CBBA6" />
        <KPICard label="Alcance Total" value={hasData ? (ig!.metrics!.totalReach || 0).toLocaleString('pt-BR') : '—'} icon={Eye} accentColor="#4A9FE0" sub="28 dias" />
        <KPICard label="Views (Reels)" value={hasData ? (ig!.metrics!.totalViews || 0).toLocaleString('pt-BR') : '—'} icon={Play} accentColor="#AFC040" />
        <KPICard label="Salvos" value={hasData ? (ig!.metrics!.totalSaved || 0).toLocaleString('pt-BR') : '—'} icon={Bookmark} accentColor="#E8A43C" />
        <KPICard label="Compartilhamentos" value={hasData ? (ig!.metrics!.totalShares || 0).toLocaleString('pt-BR') : '—'} icon={Share2} accentColor="#2CBBA6" />
        <KPICard label="Eng. Médio" value={hasData ? `${engagementRate}%` : '—'} icon={Heart} accentColor="#AFC040" sub={`${posts.length} posts`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card style={{ borderTop: '3px solid #AFC040' }}><CardContent className="p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Méd. Curtidas/Post</p><p className="text-2xl font-bold font-mono tabular-nums mt-1">{avgLikes.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card style={{ borderTop: '3px solid #4A9FE0' }}><CardContent className="p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Méd. Comentários/Post</p><p className="text-2xl font-bold font-mono tabular-nums mt-1">{avgComments.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card style={{ borderTop: '3px solid #2CBBA6' }}><CardContent className="p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Méd. Alcance/Post</p><p className="text-2xl font-bold font-mono tabular-nums mt-1">{avgReach.toLocaleString('pt-BR')}</p></CardContent></Card>
        <Card style={{ borderTop: '3px solid #E8A43C' }}><CardContent className="p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Posts Analisados</p><p className="text-2xl font-bold font-mono tabular-nums mt-1">{posts.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'overview', l: 'Visão Geral' }, { v: 'growth', l: 'Crescimento' }, { v: 'categories', l: 'Categorias' }, { v: 'ranking', l: 'Ranking' }, { v: 'insights', l: 'Insights' }].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-[#AFC040] data-[state=active]:text-[#0D0D0D] data-[state=active]:font-bold rounded-full px-4 py-1.5 text-sm">{t.l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Reels vs Posts (Média)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={typeComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Bar dataKey="alcance" name="Alcance Médio" fill="#AFC040" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="curtidas" name="Curtidas Média" fill="#4A9FE0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex justify-center gap-6 text-xs text-muted-foreground">
                  <span>Reels: <strong style={{ color: '#AFC040' }}>{typeComparison[0].engPercent}% eng.</strong> ({typeComparison[0].count} posts)</span>
                  <span>Posts: <strong style={{ color: '#4A9FE0' }}>{typeComparison[1].engPercent}% eng.</strong> ({typeComparison[1].count} posts)</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Engajamento por Post</CardTitle></CardHeader>
              <CardContent>
                {scatterData.length > 0 ? (
                  <>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="x" name="Data" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => { const d = new Date(v); return d.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }) }} />
                      <YAxis dataKey="y" name="Engajamento" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                      <ZAxis dataKey="z" range={[20, 400]} name="Alcance" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => { if (!payload?.[0]) return null; const d = payload[0].payload; return (<div style={{ ...TOOLTIP_STYLE, padding: 8, maxWidth: 280 }}><p className="font-medium text-xs" style={{ color: '#E8EDD8' }}>{d.name}</p><p className="text-xs mt-1" style={{ color: '#7A8460' }}>Data: {d.xLabel}</p><p className="text-xs" style={{ color: '#7A8460' }}>Engajamento: <strong>{d.y}%</strong></p><p className="text-xs" style={{ color: '#7A8460' }}>Alcance: <strong>{d.reach.toLocaleString('pt-BR')}</strong></p><Badge variant="outline" className="text-[9px] mt-1">{d.type === 'VIDEO' ? 'Reel' : 'Post'}</Badge></div>) }} />
                      <Legend content={() => <div className="flex justify-center gap-4 mt-2 text-xs"><span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#E8684A' }} />Reels</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#4A9FE0' }} />Posts</span></div>} />
                      <Scatter data={scatterData} fill="#AFC040">{scatterData.map((entry, i) => <Cell key={i} fill={entry.type === 'VIDEO' ? '#E8684A' : '#4A9FE0'} fillOpacity={0.7} />)}</Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">Tamanho do ponto = alcance do post. Dados reais via Instagram Graph API.</p>
                  </>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de posts</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyFollowers.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Crescimento Semanal de Seguidores</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyFollowers}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="seguidores" name="Novos Seguidores" fill="#E8684A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 p-3 rounded-lg bg-[var(--c-raised)] text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total (28 dias)</p>
                    <p className="text-xl font-bold font-mono" style={{ color: '#AFC040' }}>+{dailyFollowers.reduce((s, d) => s + d.seguidores, 0).toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">novos seguidores</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">Alcance Diário (28 dias)</CardTitle></CardHeader>
              <CardContent>
                {dailyReach.length > 0 ? (
                  <>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dailyReach}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="alcance" stroke="#2CBBA6" fill="#2CBBA6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-[var(--c-raised)] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                      <p className="text-lg font-bold font-mono">{dailyReach.reduce((s, d) => s + d.alcance, 0).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--c-raised)] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Média/Dia</p>
                      <p className="text-lg font-bold font-mono">{Math.round(dailyReach.reduce((s, d) => s + d.alcance, 0) / dailyReach.length).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--c-raised)] text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pico</p>
                      <p className="text-lg font-bold font-mono">{Math.max(...dailyReach.map(d => d.alcance)).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  </>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Engajamento por Categoria</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="engPercent" name="Engajamento %" radius={[0, 4, 4, 0]}>{categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Radar de Performance</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={categoryData.map(c => ({
                      name: c.name.length > 12 ? c.name.substring(0, 12) + '…' : c.name,
                      engajamento: c.engPercent,
                      volume: Math.round((c.posts / Math.max(posts.length, 1)) * 100),
                    }))}>
                      <PolarGrid stroke={GRID_STROKE} />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, ...AXIS_TICK }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Engajamento" dataKey="engajamento" stroke="#E8684A" fill="#E8684A" fillOpacity={0.3} />
                      <Radar name="Volume" dataKey="volume" stroke="#4A9FE0" fill="#4A9FE0" fillOpacity={0.2} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Category summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categoryData.map((c, i) => (
              <Card key={c.name} className="text-center">
                <CardContent className="p-4">
                  <span className="inline-block w-3 h-3 rounded-full mb-2" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                  <p className="text-xs text-muted-foreground">{c.name}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums mt-1" style={{ color: CAT_COLORS[i % CAT_COLORS.length] }}>{c.engPercent}%</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c.posts} posts · Alcance: {c.reach.toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top 5 Posts por Alcance</CardTitle></CardHeader>
            <CardContent>
              {topPosts.length > 0 ? (
                <div className="space-y-3">
                  {topPosts.map((post, i) => (
                    <div key={post.id} className="flex items-start gap-4 p-3 rounded-lg bg-[var(--c-raised)]">
                      <span className="text-2xl font-bold text-muted-foreground/50 w-8 font-mono">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{post.caption || 'Sem legenda'}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Alcance: <strong className="font-mono text-[#E8EDD8]">{(post.reach || 0).toLocaleString('pt-BR')}</strong></span>
                          <span>Curtidas: <strong className="font-mono text-[#E8EDD8]">{(post.like_count || 0).toLocaleString('pt-BR')}</strong></span>
                          <span>Comentários: <strong className="font-mono text-[#E8EDD8]">{post.comments_count || 0}</strong></span>
                          <span>Salvos: <strong className="font-mono text-[#E8EDD8]">{post.saved != null ? post.saved : '—'}</strong></span>
                          <span>Shares: <strong className="font-mono text-[#E8EDD8]">{post.shares != null ? post.shares : '—'}</strong></span>
                          {(post.plays || 0) > 0 && <span>Views: <strong className="font-mono text-[#E8EDD8]">{(post.plays || 0).toLocaleString('pt-BR')}</strong></span>}
                          <span>Eng: <strong className="font-mono" style={{ color: '#AFC040' }}>{postEng(post)}%</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{post.media_type === 'VIDEO' ? 'Reel' : post.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Imagem'}</Badge>
                        {post.permalink && <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#AFC040]"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
            </CardContent>
          </Card>
          {bottomPosts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">3 Posts com Menor Alcance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bottomPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--c-border)]">
                      <p className="text-sm truncate flex-1 mr-4">{(post.caption || 'Sem legenda').substring(0, 60)}...</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                        <span>Alcance: <strong className="font-mono">{(post.reach || 0).toLocaleString('pt-BR')}</strong></span>
                        <span>Eng: <strong className="font-mono" style={{ color: '#E8684A' }}>{postEng(post)}%</strong></span>
                        <Badge variant="outline" className="text-[10px]">{post.media_type === 'VIDEO' ? 'Reel' : 'Post'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Todos os Posts ({allPostsSorted.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-[var(--c-raised)]"><TableHead className="w-8">#</TableHead><TableHead>Post</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Alcance</TableHead><TableHead className="text-right">Curtidas</TableHead><TableHead className="text-right">Salvos</TableHead><TableHead className="text-right">Shares</TableHead><TableHead className="text-right">Eng. %</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {allPostsSorted.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="max-w-[250px]"><p className="text-sm truncate">{(p.caption || 'Sem legenda').substring(0, 50)}</p></TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Imagem'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{classifyPost(p.caption || '')}</TableCell>
                        <TableCell className="text-right font-mono">{(p.reach || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{(p.like_count || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-mono">{p.saved != null ? p.saved : '—'}</TableCell>
                        <TableCell className="text-right font-mono">{p.shares != null ? p.shares : '—'}</TableCell>
                        <TableCell className="text-right font-mono font-bold" style={{ color: postEng(p) > 10 ? '#AFC040' : postEng(p) > 3 ? '#E8A43C' : '#7A8460' }}>{postEng(p)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights do Instagram" subtitle={`Análise de performance · ${posts.length} posts · Eng. médio ${engagementRate}%`} context="instagram" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
