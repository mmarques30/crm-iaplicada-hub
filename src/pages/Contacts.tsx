import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { productLabel } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ChevronLeft, ChevronRight, Users, Filter, X, Building2, Share2, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

// Sources classified as social media
const SOCIAL_SOURCES = ["ig", "instagram", "fb", "facebook", "meta", "tiktok", "youtube", "SOCIAL_MEDIA"];
const SOCIAL_MEDIUMS = ["social", "paid", "organic_bio", "comment", "anuncio_pago"];

type LeadOrigin = "all" | "pipeline" | "social";

function getLeadOrigin(contact: any): "pipeline" | "social" {
  if (contact.manychat_id && contact.manychat_id.startsWith("ig_")) return "social";
  if (SOCIAL_SOURCES.includes(contact.utm_source)) return "social";
  if (SOCIAL_MEDIUMS.includes(contact.utm_medium)) return "social";
  if (contact.utm_medium === "comment") return "social";
  return "pipeline";
}

const CARGO_OPTIONS = [
  "CEO / Fundador / Sócio",
  "Diretor / Head",
  "Gerente",
  "Coordenador / Supervisor",
  "Analista",
];

const FATURAMENTO_OPTIONS = [
  "Menos de R$ 1 milhão",
  "Entre 1MM e 5MM",
  "Entre 5MM e 10MM",
  "Entre 10MM e 50MM",
  "Acima de 50MM",
];

const RENDA_OPTIONS = [
  "De R$ 1.000 a R$ 4.000",
  "De R$ 4.001 a R$ 8.000",
  "De R$ 8.001 a R$ 12.000",
  "Acima de R$ 12.000",
];

const PRODUTO_OPTIONS = [
  { value: "business", label: "Business" },
  { value: "skills", label: "Skills" },
  { value: "academy", label: "Academy" },
];

const LIFECYCLE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "mql", label: "MQL" },
  { value: "sql", label: "SQL" },
];

interface Filters {
  produto: string;
  cargo: string;
  faturamento: string;
  renda: string;
  utmSource: string;
  lifecycleStage: string;
  whatsappOptIn: string;
}

const emptyFilters: Filters = {
  produto: "",
  cargo: "",
  faturamento: "",
  renda: "",
  utmSource: "",
  lifecycleStage: "",
  whatsappOptIn: "",
};

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [leadOrigin, setLeadOrigin] = useState<LeadOrigin>("all");

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  // Build Supabase query with origin-based filtering
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contacts", search, page, filters, leadOrigin],
    queryFn: async () => {
      let q = supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        q = q.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Lead origin filter at database level
      if (leadOrigin === "social") {
        q = q.or(
          `utm_source.in.(${SOCIAL_SOURCES.join(",")}),utm_medium.in.(${SOCIAL_MEDIUMS.join(",")}),manychat_id.like.ig_%`
        );
      } else if (leadOrigin === "pipeline") {
        // Pipeline = NOT social. Exclude social sources/mediums and ig_ manychat_id
        q = q.not("utm_source", "in", `(${SOCIAL_SOURCES.join(",")})`)
             .not("utm_medium", "in", `(${SOCIAL_MEDIUMS.join(",")})`)
             .or("manychat_id.is.null,manychat_id.not.like.ig_%");
      }

      if (filters.produto) {
        q = q.contains("produto_interesse", [filters.produto]);
      }
      if (filters.cargo) {
        q = q.eq("cargo", filters.cargo);
      }
      if (filters.faturamento) {
        q = q.eq("faixa_de_faturamento", filters.faturamento);
      }
      if (filters.renda) {
        q = q.eq("renda_mensal", filters.renda);
      }
      if (filters.utmSource) {
        q = q.ilike("utm_source", `%${filters.utmSource}%`);
      }
      if (filters.whatsappOptIn === "true") {
        q = q.eq("whatsapp_opt_in", true);
      } else if (filters.whatsappOptIn === "false") {
        q = q.eq("whatsapp_opt_in", false);
      }

      const { data, count } = await q;
      return { contacts: data || [], total: count || 0 };
    },
  });

  // Fetch deals to compute qualification per contact
  const contactIds = useMemo(
    () => (data?.contacts || []).map((c: any) => c.id),
    [data?.contacts]
  );

  const { data: dealsData } = useQuery({
    queryKey: ["contacts-deals", contactIds],
    enabled: contactIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("contact_id, qualification_status")
        .in("contact_id", contactIds);
      return data || [];
    },
  });

  const qualificationByContact = useMemo(() => {
    const map: Record<string, string> = {};
    const priority: Record<string, number> = { lead: 0, mql: 1, sql: 2 };
    (dealsData || []).forEach((d: any) => {
      if (!d.contact_id) return;
      const current = map[d.contact_id];
      if (!current || (priority[d.qualification_status] || 0) > (priority[current] || 0)) {
        map[d.contact_id] = d.qualification_status;
      }
    });
    return map;
  }, [dealsData]);

  // Client-side filter for lifecycle stage
  const filteredContacts = useMemo(() => {
    if (!filters.lifecycleStage || !data?.contacts) return data?.contacts || [];
    return data.contacts.filter(
      (c: any) => qualificationByContact[c.id] === filters.lifecycleStage
    );
  }, [data?.contacts, filters.lifecycleStage, qualificationByContact]);

  const displayTotal = filters.lifecycleStage ? filteredContacts.length : data?.total || 0;
  const totalPages = filters.lifecycleStage
    ? Math.ceil(filteredContacts.length / PAGE_SIZE)
    : Math.ceil((data?.total || 0) / PAGE_SIZE);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(0);
  };

  const qualificationBadge = (status: string | undefined) => {
    if (!status) return <span className="text-muted-foreground text-xs">—</span>;
    const styles: Record<string, string> = {
      sql: "bg-qualification-sql/15 text-qualification-sql",
      mql: "bg-qualification-mql/15 text-qualification-mql",
      lead: "bg-muted text-muted-foreground",
    };
    return (
      <Badge className={`text-[10px] ${styles[status] || styles.lead}`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const originBadge = (contact: any) => {
    const origin = getLeadOrigin(contact);
    if (origin === "social") {
      const src = (contact.utm_source || "").toLowerCase();
      let label = "Social";
      if (src === "ig" || src === "instagram" || contact.manychat_id?.startsWith("ig_")) label = "Instagram";
      else if (src === "fb" || src === "facebook") label = "Facebook";
      else if (src === "tiktok") label = "TikTok";
      else if (src === "youtube") label = "YouTube";
      else if (src === "meta") label = "Meta Ads";
      return <Badge className="text-[10px] bg-pink-100 text-pink-700">{label}</Badge>;
    }
    return <Badge className="text-[10px] bg-blue-100 text-blue-700">Pipeline</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-sm text-muted-foreground">{displayTotal} contatos</p>
        </div>
      </div>

      {/* Lead Origin Tabs */}
      <Tabs value={leadOrigin} onValueChange={(v) => { setLeadOrigin(v as LeadOrigin); setPage(0); }}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="all" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Pipeline / Formulário
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Redes Sociais
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, empresa ou telefone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Produto Interesse</label>
            <Select value={filters.produto} onValueChange={(v) => updateFilter("produto", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PRODUTO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cargo</label>
            <Select value={filters.cargo} onValueChange={(v) => updateFilter("cargo", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CARGO_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Faixa de Faturamento</label>
            <Select value={filters.faturamento} onValueChange={(v) => updateFilter("faturamento", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {FATURAMENTO_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Renda Mensal</label>
            <Select value={filters.renda} onValueChange={(v) => updateFilter("renda", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {RENDA_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Qualificação</label>
            <Select value={filters.lifecycleStage} onValueChange={(v) => updateFilter("lifecycleStage", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {LIFECYCLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">UTM Source</label>
            <Input
              placeholder="Ex: instagram"
              value={filters.utmSource}
              onChange={(e) => updateFilter("utmSource", e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">WhatsApp Opt-in</label>
            <Select value={filters.whatsappOptIn} onValueChange={(v) => updateFilter("whatsappOptIn", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isError ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-destructive">Erro ao carregar contatos</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Produto Interesse</TableHead>
                <TableHead>Qualificação</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Users className="h-12 w-12 opacity-30" />
                      <p className="text-sm font-medium">Nenhum contato encontrado</p>
                      <p className="text-xs">
                        {search || activeFilterCount > 0
                          ? "Tente ajustar os filtros ou a busca"
                          : "Os contatos aparecerão aqui quando forem cadastrados"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/contacts/${c.id}`)}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {c.first_name} {c.last_name || ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{c.phone || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.company || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{c.cargo || "—"}</TableCell>
                    <TableCell>{originBadge(c)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.produto_interesse?.map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-[10px]">{productLabel[p] || p}</Badge>
                        ))}
                        {(!c.produto_interesse || c.produto_interesse.length === 0) && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{qualificationBadge(qualificationByContact[c.id])}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {c.faixa_de_faturamento || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
