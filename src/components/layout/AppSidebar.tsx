import { LayoutDashboard, Kanban, Users, Settings, ChevronDown, Briefcase, GraduationCap, Brain } from "lucide-react";
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

const pipelineItems = [
  { title: "Business", url: "/pipeline/business", icon: Briefcase },
  { title: "Skills", url: "/pipeline/skills", icon: Brain },
  { title: "Academy", url: "/pipeline/academy", icon: GraduationCap },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isPipelineActive = location.pathname.startsWith("/pipeline");
  const [pipelineOpen, setPipelineOpen] = useState(isPipelineActive);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        {/* Logo */}
        <div className="px-4 pb-4 mb-2 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">IA</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-sidebar-foreground leading-none">CRM IAplicada</h1>
                <p className="text-[10px] text-sidebar-foreground/60">Gestão de Vendas</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
              <span className="text-sidebar-primary-foreground font-bold text-sm">IA</span>
            </div>
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
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
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
