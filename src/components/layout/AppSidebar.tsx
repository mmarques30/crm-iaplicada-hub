import { LayoutDashboard, Kanban, Users, Settings, ChevronDown, Briefcase, GraduationCap, Instagram, BarChart3, Facebook, DollarSign, TrendingUp, ListTodo, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState } from "react";
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

const pipelineItems = [
  { title: "Business", url: "/pipeline/business", icon: Briefcase },
  { title: "Skills", url: "/pipeline/skills", icon: Brain },
  { title: "Academy", url: "/pipeline/academy", icon: GraduationCap },
];

const analyticsItems = [
  { title: "Visão Geral", url: "/painel", icon: BarChart3 },
  { title: "Instagram", url: "/analytics/instagram", icon: Instagram },
  { title: "Facebook Ads", url: "/analytics/facebook-ads", icon: Facebook },
  { title: "Funil de Vendas", url: "/analytics/crm", icon: TrendingUp },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isPipelineActive = location.pathname.startsWith("/pipeline");
  const isAnalyticsActive = location.pathname.startsWith("/painel") || location.pathname.startsWith("/analytics") || location.pathname.startsWith("/financeiro");
  const [pipelineOpen, setPipelineOpen] = useState(isPipelineActive);
  const [analyticsOpen, setAnalyticsOpen] = useState(isAnalyticsActive);

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
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Pipeline with submenu */}
              <SidebarMenuItem>
                <Collapsible open={pipelineOpen || isPipelineActive} onOpenChange={setPipelineOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`w-full ${isPipelineActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : ''}`}>
                      <Kanban className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Pipeline</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${pipelineOpen || isPipelineActive ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                        {pipelineItems.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            end
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/contacts" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <Users className="h-4 w-4" />
                    {!collapsed && <span>Contatos</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Analytics with submenu */}
              <SidebarMenuItem>
                <Collapsible open={analyticsOpen || isAnalyticsActive} onOpenChange={setAnalyticsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`w-full ${isAnalyticsActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : ''}`}>
                      <BarChart3 className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Analytics</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${analyticsOpen || isAnalyticsActive ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                        {analyticsItems.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            end
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/formularios" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <FileText className="h-4 w-4" />
                    {!collapsed && <span>Formulários</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/tarefas" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <ListTodo className="h-4 w-4" />
                    {!collapsed && <span>Tarefas</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/instagram" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <Instagram className="h-4 w-4" />
                    {!collapsed && <span>Automações IG</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
