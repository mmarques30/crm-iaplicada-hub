import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Users, List, Filter, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

const FIELD_OPTIONS = [
  { value: "produto_interesse", label: "Produto de Interesse" },
  { value: "cargo", label: "Cargo" },
  { value: "utm_source", label: "UTM Source" },
  { value: "faixa_de_faturamento", label: "Faixa de Faturamento" },
];

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Igual a" },
  { value: "contains", label: "Contém" },
  { value: "is_not_null", label: "Não é vazio" },
];

function ContactLists() {
  const queryClient = useQueryClient();
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New list form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"static" | "active">("static");
  const [newDescription, setNewDescription] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Add member dialog state
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [addMemberListId, setAddMemberListId] = useState<string | null>(null);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  // Fetch all contact lists
  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ["contact_lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all contacts (for static list creation and adding members)
  const { data: allContacts } = useQuery({
    queryKey: ["contacts_for_lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch members of expanded list
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["contact_list_members", expandedList],
    queryFn: async () => {
      if (!expandedList) return [];
      const { data, error } = await supabase
        .from("contact_list_memberships")
        .select("*, contact:contacts(id, first_name, last_name, email)")
        .eq("list_id", expandedList);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedList,
  });

  // Create list mutation
  const createList = useMutation({
    mutationFn: async () => {
      const filters =
        newType === "active" && filterField && filterOperator
          ? { field: filterField, operator: filterOperator, value: filterValue }
          : null;

      const { data, error } = await supabase
        .from("contact_lists")
        .insert({
          name: newName,
          type: newType,
          description: newDescription || null,
          filters: filters ? [filters] : null,
        })
        .select()
        .single();
      if (error) throw error;

      // If static and contacts selected, add memberships
      if (newType === "static" && selectedContacts.length > 0) {
        const memberships = selectedContacts.map((contactId) => ({
          list_id: data.id,
          contact_id: contactId,
        }));
        const { error: memberError } = await supabase
          .from("contact_list_memberships")
          .insert(memberships);
        if (memberError) throw memberError;

        // Update contact_count
        await supabase
          .from("contact_lists")
          .update({ contact_count: selectedContacts.length })
          .eq("id", data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_lists"] });
      toast.success("Lista criada com sucesso!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar lista: " + error.message);
    },
  });

  // Delete list mutation
  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      // Delete memberships first
      await supabase
        .from("contact_list_memberships")
        .delete()
        .eq("list_id", listId);
      const { error } = await supabase
        .from("contact_lists")
        .delete()
        .eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_lists"] });
      if (expandedList) setExpandedList(null);
      toast.success("Lista removida com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover lista: " + error.message);
    },
  });

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async ({ listId, contactId }: { listId: string; contactId: string }) => {
      const { error } = await supabase
        .from("contact_list_memberships")
        .insert({ list_id: listId, contact_id: contactId });
      if (error) throw error;

      // Increment contact_count
      const list = lists?.find((l) => l.id === listId);
      if (list) {
        await supabase
          .from("contact_lists")
          .update({ contact_count: (list.contact_count ?? 0) + 1 })
          .eq("id", listId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_lists"] });
      queryClient.invalidateQueries({ queryKey: ["contact_list_members", expandedList] });
      toast.success("Contato adicionado à lista!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar contato: " + error.message);
    },
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async ({ membershipId, listId }: { membershipId: string; listId: string }) => {
      const { error } = await (supabase as any)
        .from("contact_list_memberships")
        .delete()
        .eq("id", membershipId);
      if (error) throw error;

      // Decrement contact_count
      const list = lists?.find((l) => l.id === listId);
      if (list && (list.contact_count ?? 0) > 0) {
        await supabase
          .from("contact_lists")
          .update({ contact_count: (list.contact_count ?? 0) - 1 })
          .eq("id", listId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_lists"] });
      queryClient.invalidateQueries({ queryKey: ["contact_list_members", expandedList] });
      toast.success("Contato removido da lista!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover contato: " + error.message);
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewType("static");
    setNewDescription("");
    setFilterField("");
    setFilterOperator("");
    setFilterValue("");
    setSelectedContacts([]);
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const expandedListData = lists?.find((l) => l.id === expandedList);

  // Filter contacts not already in the list for the add member dialog
  const memberContactIds = new Set(members?.map((m: any) => m.contact_id) ?? []);
  const availableContacts = allContacts?.filter(
    (c) =>
      !memberContactIds.has(c.id) &&
      (addMemberSearch === "" ||
        `${c.first_name} ${c.last_name} ${c.email}`
          .toLowerCase()
          .includes(addMemberSearch.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <List className="h-6 w-6" />
            Listas de Contatos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas listas e segmentações de contatos
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Lista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Lista</DialogTitle>
              <DialogDescription>
                Crie uma lista estática ou dinâmica de contatos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="list-name">Nome</Label>
                <Input
                  id="list-name"
                  placeholder="Nome da lista"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newType}
                  onValueChange={(val: "static" | "active") => setNewType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Estática</SelectItem>
                    <SelectItem value="active">Dinâmica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="list-desc">Descrição (opcional)</Label>
                <Textarea
                  id="list-desc"
                  placeholder="Descrição da lista"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Active list filters */}
              {newType === "active" && (
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </div>

                  <div className="space-y-2">
                    <Label>Campo</Label>
                    <Select value={filterField} onValueChange={setFilterField}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Operador</Label>
                    <Select value={filterOperator} onValueChange={setFilterOperator}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATOR_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filterOperator !== "is_not_null" && (
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input
                        placeholder="Valor do filtro"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Static list contact selection */}
              {newType === "static" && (
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4" />
                      Contatos
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedContacts.length} selecionado(s)
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {allContacts?.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="rounded"
                        />
                        <span>
                          {contact.first_name} {contact.last_name}
                        </span>
                        <span className="text-muted-foreground text-xs ml-auto">
                          {contact.email}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); resetForm(); }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createList.mutate()}
                disabled={!newName || createList.isPending}
              >
                {createList.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Criar Lista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lists */}
      {listsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !lists || lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <List className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma lista criada ainda.</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Nova Lista" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list: any) => (
            <Card key={list.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedList(expandedList === list.id ? null : list.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    <Badge
                      className={
                        list.type === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {list.type === "active" ? "Dinâmica" : "Estática"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {list.contact_count ?? 0} contatos
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(list.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteList.mutate(list.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {list.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {list.description}
                  </p>
                )}
              </CardHeader>

              {/* Expanded members view */}
              {expandedList === list.id && (
                <CardContent className="border-t pt-4">
                  {list.type === "static" && (
                    <div className="flex justify-end mb-4">
                      <Dialog
                        open={addMemberDialogOpen && addMemberListId === list.id}
                        onOpenChange={(open) => {
                          setAddMemberDialogOpen(open);
                          setAddMemberListId(open ? list.id : null);
                          if (!open) setAddMemberSearch("");
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar Contato
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Adicionar Contato à Lista</DialogTitle>
                            <DialogDescription>
                              Selecione contatos para adicionar a "{list.name}".
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <Input
                              placeholder="Buscar contato..."
                              value={addMemberSearch}
                              onChange={(e) => setAddMemberSearch(e.target.value)}
                            />
                            <div className="max-h-64 overflow-y-auto space-y-1">
                              {availableContacts?.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nenhum contato disponível.
                                </p>
                              )}
                              {availableContacts?.map((contact) => (
                                <button
                                  key={contact.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted w-full text-left text-sm"
                                  onClick={() => {
                                    addMember.mutate({
                                      listId: list.id,
                                      contactId: contact.id,
                                    });
                                  }}
                                  disabled={addMember.isPending}
                                >
                                  <UserPlus className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    {contact.first_name} {contact.last_name}
                                  </span>
                                  <span className="text-muted-foreground text-xs ml-auto">
                                    {contact.email}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {membersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : !members || members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum membro nesta lista.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          {list.type === "static" && (
                            <TableHead className="w-12" />
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((membership: any) => (
                          <TableRow key={membership.id}>
                            <TableCell>
                              {membership.contact?.first_name}{" "}
                              {membership.contact?.last_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {membership.contact?.email}
                            </TableCell>
                            {list.type === "static" && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive h-8 w-8"
                                  onClick={() =>
                                    removeMember.mutate({
                                      membershipId: membership.id,
                                      listId: list.id,
                                    })
                                  }
                                  disabled={removeMember.isPending}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContactLists;
