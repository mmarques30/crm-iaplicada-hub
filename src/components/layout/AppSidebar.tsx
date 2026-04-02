import { LayoutDashboard, Kanban, Users, Settings, ChevronDown, Briefcase, GraduationCap, Instagram, BarChart3, Facebook, DollarSign, TrendingUp, ListTodo, FileText, Layers, Mail, Send, Workflow, ShoppingCart, Receipt, Wallet, ShieldCheck, PenTool, Calendar, Video, Image, Lightbulb, CalendarDays, MessageSquare, Rocket, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logoImg from "@/assets/logo.png";

const PIPELINE_ICONS: Record<string, typeof Briefcase> = {
  business: Briefcase,
  academy: GraduationCap,
};
const DEFAULT_PIPELINE_ICON = Layers;

const ACTIVE_CLASS = "bg-[#141A04] text-[#AFC040] font-semibold";

const analyticsItems = [
  { title: "Visão Geral", url: "/painel", icon: BarChart3 },
  { title: "Instagram", url: "/analytics/instagram", icon: Instagram },
  { title: "Facebook Ads", url: "/analytics/facebook-ads", icon: Facebook },
  { title: "Funil de Vendas", url: "/analytics/crm", icon: TrendingUp },
];

const conteudoItems = [
  { title: "Calendário", url: "/conteudo/calendario", icon: Calendar },
  { title: "Vídeos", url: "/conteudo/videos", icon: Video },
  { title: "Criativos", url: "/conteudo/criativos", icon: Image },
  { title: "Eventos & Aulas", url: "/conteudo/eventos", icon: CalendarDays },
  { title: "Mensagens", url: "/conteudo/mensagens", icon: MessageSquare },
  { title: "Lançamentos", url: "/conteudo/lancamentos", icon: Rocket },
  { title: "Automações IG", url: "/instagram", icon: Instagram },
];

const comercialItems = [
  { title: "Vendas & Fiscal", url: "/comercial/vendas", icon: ShoppingCart },
];

const financeiroItems = [
  { title: "Painel Geral", url: "/financeiro/painel", icon: BarChart3 },
  { title: "Vendas & Receita", url: "/financeiro/receita", icon: DollarSign },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasAccess, isAdmin } = useAuth();
  const location = useLocation();
  const isPipelineActive = location.pathname.startsWith("/pipeline");
  const isAnalyticsActive = location.pathname.startsWith("/painel") || location.pathname.startsWith("/analytics");
  const isEmailActive = location.pathname.startsWith("/email");
  const isConteudoActive = location.pathname.startsWith("/conteudo") || location.pathname === "/instagram";
  const isComercialActive = location.pathname.startsWith("/comercial");
  const isFinanceiroActive = location.pathname.startsWith("/financeiro");
  const [pipelineOpen, setPipelineOpen] = useState(isPipelineActive);
  const [analyticsOpen, setAnalyticsOpen] = useState(isAnalyticsActive);
  const [emailOpen, setEmailOpen] = useState(isEmailActive);
  const [conteudoOpen, setConteudoOpen] = useState(isConteudoActive);
  const [comercialOpen, setComercialOpen] = useState(isComercialActive);
  const [financeiroOpen, setFinanceiroOpen] = useState(isFinanceiroActive);

  const { data: pipelines } = useQuery({
    queryKey: ["pipelines-sidebar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipelines")
        .select("id, name, product")
        .order("created_at");
      return data || [];
    },
  });

  const pipelineItems = (pipelines || [])
    .filter((p: any) => p.product !== "skills")
    .map((p: any) => ({
      title: p.name,
      url: `/pipeline/${p.product}`,
      icon: PIPELINE_ICONS[p.product] || DEFAULT_PIPELINE_ICON,
    }));

  const renderCollapsible = (
    label: string,
    icon: typeof BarChart3,
    items: Array<{ title: string; url: string; icon: typeof BarChart3 }>,
    isActive: boolean,
    open: boolean,
    setOpen: (v: boolean) => void
  ) => {
    const Icon = icon;
    return (
      <SidebarMenuItem>
        <Collapsible open={open || isActive} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className={`w-full ${isActive ? ACTIVE_CLASS : ''}`}>
              <Icon className="h-4 w-4" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${open || isActive ? 'rotate-180' : ''}`} />
                </>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent>
              <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                {items.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                    activeClassName={ACTIVE_CLASS}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        {/* Logo */}
        <div className="px-4 pb-4 mb-2 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="IAplicada" className="w-9 h-9 rounded-lg object-contain" />
              <div>
                <h1 className="text-sm font-semibold text-sidebar-foreground leading-none tracking-tight">IAplicada</h1>
                <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Gestão de Vendas</p>
              </div>
            </div>
          ) : (
            <img src={logoImg} alt="IAplicada" className="w-8 h-8 rounded-lg object-contain mx-auto" />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasAccess('dashboard') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/" end activeClassName={ACTIVE_CLASS}>
                      <LayoutDashboard className="h-4 w-4" />
                      {!collapsed && <span>Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasAccess('pipeline') && renderCollapsible("Pipeline", Kanban, pipelineItems, isPipelineActive, pipelineOpen, setPipelineOpen)}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/cadencia" activeClassName={ACTIVE_CLASS}>
                    <Bell className="h-4 w-4" />
                    {!collapsed && <span>Cadência</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {hasAccess('contacts') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/contacts" activeClassName={ACTIVE_CLASS}>
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>Contatos</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {renderCollapsible("Conteúdo", PenTool, conteudoItems, isConteudoActive, conteudoOpen, setConteudoOpen)}

              {hasAccess('comercial') && renderCollapsible("Comercial", ShoppingCart, comercialItems, isComercialActive, comercialOpen, setComercialOpen)}

              {hasAccess('financeiro') && renderCollapsible("Financeiro", Wallet, financeiroItems, isFinanceiroActive, financeiroOpen, setFinanceiroOpen)}

              {hasAccess('analytics') && renderCollapsible("Analytics", BarChart3, analyticsItems, isAnalyticsActive, analyticsOpen, setAnalyticsOpen)}

              {hasAccess('email') && (
                <SidebarMenuItem>
                  <Collapsible open={emailOpen || isEmailActive} onOpenChange={setEmailOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={`w-full ${isEmailActive ? ACTIVE_CLASS : ''}`}>
                        <Mail className="h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Email Marketing</span>
                            <ChevronDown className={`h-3 w-3 transition-transform ${emailOpen || isEmailActive ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                          <NavLink to="/email" end className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" activeClassName={ACTIVE_CLASS}>
                            <BarChart3 className="h-3.5 w-3.5" /><span>Visão Geral</span>
                          </NavLink>
                          <NavLink to="/email/templates" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" activeClassName={ACTIVE_CLASS}>
                            <FileText className="h-3.5 w-3.5" /><span>Templates</span>
                          </NavLink>
                          <NavLink to="/email/campaigns" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" activeClassName={ACTIVE_CLASS}>
                            <Send className="h-3.5 w-3.5" /><span>Campanhas</span>
                          </NavLink>
                          <NavLink to="/email/workflows" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" activeClassName={ACTIVE_CLASS}>
                            <Workflow className="h-3.5 w-3.5" /><span>Automações</span>
                          </NavLink>
                          <NavLink to="/email/lists" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" activeClassName={ACTIVE_CLASS}>
                            <Users className="h-3.5 w-3.5" /><span>Listas</span>
                          </NavLink>
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {hasAccess('forms') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/formularios" activeClassName={ACTIVE_CLASS}>
                      <FileText className="h-4 w-4" />
                      {!collapsed && <span>Formulários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasAccess('tasks') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/tarefas" activeClassName={ACTIVE_CLASS}>
                      <ListTodo className="h-4 w-4" />
                      {!collapsed && <span>Tarefas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasAccess('settings') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" activeClassName={ACTIVE_CLASS}>
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Configurações</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" activeClassName={ACTIVE_CLASS}>
                      <ShieldCheck className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
