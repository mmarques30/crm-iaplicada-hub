import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function AppLayout() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/contacts?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
          {/* gradient blob removed for clean look */}

          <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-3 sm:px-4 bg-background/80 backdrop-blur-xl border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger />
              <form onSubmit={handleSearch} className="hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contatos, deals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-48 md:w-72 h-9 rounded-full bg-white/[0.06] border-white/[0.06] focus:border-primary/40 focus:bg-white/[0.08] text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
              </form>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                IA
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto relative z-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
