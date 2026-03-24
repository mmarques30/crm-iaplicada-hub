import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { Users, Eye, Play, Bookmark, Share2, Heart } from 'lucide-react'
import { InsightsTable } from '@/components/dashboard/InsightsTable'
import { useInsights } from '@/hooks/useInsights'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, Cell,
} from 'recharts'

const TOOLTIP_STYLE = { background: '#191D0C', border: '1px solid #2E3A18', borderRadius: 8, fontFamily: 'Sora', fontSize: 12, color: '#E8EDD8' }
const AXIS_TICK = { fontSize: 11, fill: '#7A8460' }
const GRID_STROKE = '#1E2610'

export default function InstagramAnalytics() {
  const { data: snapshot } = useDashboardSnapshot()
  const ig = snapshot?.data?.instagram

  const posts = ig?.posts || []
  const reels = posts.filter(p => p.media_type === 'VIDEO')
  const images = posts.filter(p => p.media_type !== 'VIDEO')

  const avgLikes = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + p.like_count, 0) / posts.length) : 0
  const avgComments = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + p.comments_count, 0) / posts.length) : 0
  const avgReach = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + p.reach, 0) / posts.length) : 0

  const typeComparison = [
    { name: 'Reels', alcance: reels.length > 0 ? Math.round(reels.reduce((s, p) => s + p.reach, 0) / reels.length) : 0, curtidas: reels.length > 0 ? Math.round(reels.reduce((s, p) => s + p.like_count, 0) / reels.length) : 0, count: reels.length },
    { name: 'Posts', alcance: images.length > 0 ? Math.round(images.reduce((s, p) => s + p.reach, 0) / images.length) : 0, curtidas: images.length > 0 ? Math.round(images.reduce((s, p) => s + p.like_count, 0) / images.length) : 0, count: images.length },
  ]

  const scatterData = posts.map(p => ({ x: p.reach, y: p.like_count + p.comments_count, name: (p.caption || '').substring(0, 40) + '...', type: p.media_type }))
  const topPosts = [...posts].sort((a, b) => b.reach - a.reach).slice(0, 5)
  const dailyReach = ig?.dailyReach?.map(d => ({ date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), alcance: d.value })) || []

  const insightsData = ig ? {
    followers: ig.metrics?.followers, totalReach: ig.metrics?.totalReach, totalViews: ig.metrics?.totalViews, totalSaved: ig.metrics?.totalSaved, totalShares: ig.metrics?.totalShares, avgEngagement: ig.metrics?.avgEngagement,
    avgLikes, avgComments, avgReach, totalPosts: posts.length, totalReels: reels.length, totalImages: images.length,
    topPosts: topPosts.slice(0, 3).map(p => ({ caption: (p.caption || '').substring(0, 60), reach: p.reach, likes: p.like_count, comments: p.comments_count, type: p.media_type })),
  } : null

  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useInsights({ context: 'instagram', data: insightsData, enabled: !!ig })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Instagram Analytics</h1>
          {ig?.profile?.username && (
            <Badge className="bg-[#141A04] text-[#AFC040]">@{ig.profile.username}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Análise detalhada do perfil — últimos 28 dias</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KPICard label="Seguidores" value={ig?.metrics?.followers || 0} icon={Users} accentColor="#2CBBA6" />
        <KPICard label="Alcance Total" value={ig?.metrics?.totalReach || 0} icon={Eye} accentColor="#4A9FE0" />
        <KPICard label="Views (Reels)" value={ig?.metrics?.totalViews || 0} icon={Play} accentColor="#AFC040" />
        <KPICard label="Salvos" value={ig?.metrics?.totalSaved || 0} icon={Bookmark} accentColor="#E8A43C" />
        <KPICard label="Compartilhamentos" value={ig?.metrics?.totalShares || 0} icon={Share2} accentColor="#2CBBA6" />
        <KPICard label="Engajamento" value={`${ig?.metrics?.avgEngagement || 0}%`} icon={Heart} accentColor="#AFC040" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card style={{ borderTop: '3px solid #AFC040' }}>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Méd. Curtidas/Post</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">{avgLikes.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card style={{ borderTop: '3px solid #4A9FE0' }}>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Méd. Comentários/Post</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">{avgComments.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card style={{ borderTop: '3px solid #2CBBA6' }}>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Méd. Alcance/Post</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">{avgReach.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto bg-transparent border-b border-[var(--c-border)] rounded-none p-0 gap-1">
          {[{ v: 'overview', l: 'Visão Geral' }, { v: 'growth', l: 'Crescimento' }, { v: 'ranking', l: 'Ranking' }, { v: 'insights', l: 'Insights' }].map(t => (
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
                    <Bar dataKey="alcance" name="Alcance Médio" fill="#AFC040" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="curtidas" name="Curtidas Média" fill="#4A9FE0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Engajamento por Post</CardTitle></CardHeader>
              <CardContent>
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="x" name="Alcance" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis dataKey="y" name="Engajamento" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                        if (!payload?.[0]) return null
                        const d = payload[0].payload
                        return (
                          <div style={{ ...TOOLTIP_STYLE, padding: 8 }}>
                            <p className="font-medium text-xs">{d.name}</p>
                            <p className="text-xs" style={{ color: '#7A8460' }}>Alcance: {d.x?.toLocaleString('pt-BR')}</p>
                            <p className="text-xs" style={{ color: '#7A8460' }}>Engajamento: {d.y}</p>
                          </div>
                        )
                      }} />
                      <Scatter data={scatterData} fill="#AFC040">
                        {scatterData.map((entry, i) => (
                          <Cell key={i} fill={entry.type === 'VIDEO' ? '#4A9FE0' : '#AFC040'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">Sem dados de posts</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Alcance Diário (Últimos 28 dias)</CardTitle></CardHeader>
            <CardContent>
              {dailyReach.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dailyReach}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, ...AXIS_TICK }} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="alcance" stroke="#2CBBA6" fill="#2CBBA6" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de crescimento</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top 5 Posts por Alcance</CardTitle></CardHeader>
            <CardContent>
              {topPosts.length > 0 ? (
                <div className="space-y-4">
                  {topPosts.map((post, i) => (
                    <div key={post.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                      <span className="text-2xl font-bold text-muted-foreground/50 w-8 font-mono">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.caption || 'Sem legenda'}</p>
                        <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Alcance: <strong className="font-mono">{post.reach.toLocaleString('pt-BR')}</strong></span>
                          <span>Curtidas: <strong className="font-mono">{post.like_count}</strong></span>
                          <span>Comentários: <strong className="font-mono">{post.comments_count}</strong></span>
                          <span>Salvos: <strong className="font-mono">{post.saved}</strong></span>
                          {post.plays > 0 && <span>Views: <strong className="font-mono">{post.plays.toLocaleString('pt-BR')}</strong></span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {post.media_type === 'VIDEO' ? 'Reel' : post.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Imagem'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de posts</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsTable insights={insights || []} isLoading={insightsLoading} error={insightsError?.message} onRetry={() => refetchInsights()} title="Insights do Instagram" subtitle="Análise de performance do perfil gerada por IA" context="instagram" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
