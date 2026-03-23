import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useDashboardSnapshot } from '@/hooks/useDashboardData'
import { Users, Eye, Play, Bookmark, Share2, Heart } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, Cell,
} from 'recharts'

export default function InstagramAnalytics() {
  const { data: snapshot } = useDashboardSnapshot()
  const ig = snapshot?.data?.instagram

  const posts = ig?.posts || []
  const reels = posts.filter(p => p.media_type === 'VIDEO')
  const images = posts.filter(p => p.media_type !== 'VIDEO')

  // Posts por tipo
  const typeComparison = [
    {
      name: 'Reels',
      alcance: reels.length > 0 ? Math.round(reels.reduce((s, p) => s + p.reach, 0) / reels.length) : 0,
      curtidas: reels.length > 0 ? Math.round(reels.reduce((s, p) => s + p.like_count, 0) / reels.length) : 0,
      count: reels.length,
    },
    {
      name: 'Posts',
      alcance: images.length > 0 ? Math.round(images.reduce((s, p) => s + p.reach, 0) / images.length) : 0,
      curtidas: images.length > 0 ? Math.round(images.reduce((s, p) => s + p.like_count, 0) / images.length) : 0,
      count: images.length,
    },
  ]

  // Scatter data
  const scatterData = posts.map(p => ({
    x: p.reach,
    y: p.like_count + p.comments_count,
    name: (p.caption || '').substring(0, 40) + '...',
    type: p.media_type,
  }))

  // Top posts por alcance
  const topPosts = [...posts].sort((a, b) => b.reach - a.reach).slice(0, 5)

  // Daily reach
  const dailyReach = ig?.dailyReach?.map(d => ({
    date: new Date(d.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    alcance: d.value,
  })) || []

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Instagram Analytics</h1>
          {ig?.profile?.username && (
            <Badge className="bg-pink-100 text-pink-800">@{ig.profile.username}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Análise detalhada do perfil Instagram — últimos 28 dias
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Seguidores" value={ig?.metrics?.followers || 0} icon={Users} color="text-pink-600" />
        <MetricCard title="Alcance Total" value={ig?.metrics?.totalReach || 0} icon={Eye} color="text-blue-600" />
        <MetricCard title="Views (Reels)" value={ig?.metrics?.totalViews || 0} icon={Play} color="text-purple-600" />
        <MetricCard title="Salvos" value={ig?.metrics?.totalSaved || 0} icon={Bookmark} color="text-yellow-600" />
        <MetricCard title="Compartilhamentos" value={ig?.metrics?.totalShares || 0} icon={Share2} color="text-green-600" />
        <MetricCard title="Engajamento" value={ig?.metrics?.avgEngagement || 0} suffix="%" decimals={1} icon={Heart} color="text-red-500" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reels vs Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reels vs Posts (Média)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={typeComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="alcance" name="Alcance Médio" fill="#E1306C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="curtidas" name="Curtidas Média" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engajamento por Post */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engajamento por Post</CardTitle>
              </CardHeader>
              <CardContent>
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="x" name="Alcance" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="y" name="Engajamento" tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={scatterData} fill="#E1306C">
                        {scatterData.map((entry, i) => (
                          <Cell key={i} fill={entry.type === 'VIDEO' ? '#8b5cf6' : '#E1306C'} />
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
            <CardHeader>
              <CardTitle className="text-base">Alcance Diário (Últimos 28 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReach.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dailyReach}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="alcance" stroke="#E1306C" fill="#E1306C" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados de crescimento</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 Posts por Alcance</CardTitle>
            </CardHeader>
            <CardContent>
              {topPosts.length > 0 ? (
                <div className="space-y-4">
                  {topPosts.map((post, i) => (
                    <div key={post.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                      <span className="text-2xl font-bold text-muted-foreground/50 w-8">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.caption || 'Sem legenda'}</p>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Alcance: {post.reach.toLocaleString('pt-BR')}</span>
                          <span>Curtidas: {post.like_count}</span>
                          <span>Comentários: {post.comments_count}</span>
                          <span>Salvos: {post.saved}</span>
                          {post.plays > 0 && <span>Views: {post.plays.toLocaleString('pt-BR')}</span>}
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
      </Tabs>
    </div>
  )
}
