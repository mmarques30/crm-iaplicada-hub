import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Shield, ShieldOff } from "lucide-react";

const ALL_MODULES = [
  'dashboard', 'pipeline', 'contacts', 'comercial', 'financeiro',
  'analytics', 'email', 'forms', 'tasks', 'instagram', 'settings', 'admin'
] as const;

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pipeline: 'Pipeline',
  contacts: 'Contatos',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  analytics: 'Analytics',
  email: 'Email',
  forms: 'Formulários',
  tasks: 'Tarefas',
  instagram: 'Instagram',
  settings: 'Configurações',
  admin: 'Admin',
};

export default function Admin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allPermissions } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: isAdmin })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Permissão de admin atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePermission = useMutation({
    mutationFn: async ({ userId, module, permission }: { userId: string; module: string; permission: string }) => {
      const { error } = await supabase
        .from("user_permissions")
        .upsert(
          { user_id: userId, module: module as any, permission: permission as any },
          { onConflict: "user_id,module" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      toast.success("Permissão atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (profiles || []).filter((p: any) =>
    !search || (p.full_name || p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const getPermission = (userId: string, module: string) => {
    const perm = (allPermissions || []).find(
      (p: any) => p.user_id === userId && p.module === module
    );
    return perm?.permission || "none";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm">Gerencie usuários e permissões por módulo</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((profile: any) => (
            <Card key={profile.id} className="border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                      {(profile.full_name || profile.email || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{profile.full_name || "Sem nome"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                    {profile.is_admin && (
                      <Badge variant="default" className="ml-2">Admin</Badge>
                    )}
                  </div>
                  <Button
                    variant={profile.is_admin ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleAdmin.mutate({ userId: profile.id, isAdmin: !profile.is_admin })}
                    className="gap-1"
                  >
                    {profile.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                    {profile.is_admin ? "Remover Admin" : "Tornar Admin"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="w-[140px]">Permissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ALL_MODULES.map((mod) => (
                      <TableRow key={mod}>
                        <TableCell className="text-sm">{MODULE_LABELS[mod]}</TableCell>
                        <TableCell>
                          <Select
                            value={getPermission(profile.id, mod)}
                            onValueChange={(val) =>
                              updatePermission.mutate({ userId: profile.id, module: mod, permission: val })
                            }
                            disabled={profile.is_admin}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">Visualizar</SelectItem>
                              <SelectItem value="edit">Editar</SelectItem>
                              <SelectItem value="none">Sem acesso</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
