import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { buyersQuery, type BuyerRow } from "@/lib/buyers";
import { clientsFullQuery, type ClientRow } from "@/lib/clients";
import { useStaffSession } from "@/lib/staff-session";
import { PROPOSAL_INCOTERMS } from "@/lib/proposals";
import type { Incoterm } from "@/lib/pricing-types";

export function NewProposalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clients = useQuery({ ...clientsFullQuery, enabled: open });
  const buyers = useQuery({ ...buyersQuery, enabled: open });
  const { access } = useStaffSession();

  const [clientId, setClientId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [project, setProject] = useState("");
  const [incoterm, setIncoterm] = useState<Incoterm>("CIF");
  const [buyerId, setBuyerId] = useState<string>("");

  const options = useMemo(
    () => [...(clients.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [clients.data],
  );
  const selected = options.find((client) => client.id === clientId) ?? null;
  const clientBuyers = useMemo<BuyerRow[]>(
    () => (buyers.data ?? []).filter((buyer) => buyer.client_id === clientId),
    [buyers.data, clientId],
  );

  function chooseClient(client: ClientRow) {
    setClientId(client.id);
    setPickerOpen(false);
    setBuyerId("");
    if (client.incoterm) setIncoterm(client.incoterm);
    else setIncoterm("CIF");
  }

  const createClient = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ name })
        .select("id, name, created_at")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setClientId(row.id);
      setBuyerId("");
      setNewClient("");
      setShowNewClient(false);
      toast.success(`Client "${row.name}" added.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          client_id: clientId,
          project_name: project.trim(),
          incoterm,
          buyer_id: buyerId || null,
          status: "draft",
          created_by: access?.userId ?? null,
          created_by_name: access?.displayName || access?.email || "Staff",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      onOpenChange(false);
      setProject("");
      setBuyerId("");
      await navigate({ to: "/sales/proposals/$id", params: { id: row.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canCreate = clientId !== "" && project.trim().length > 0 && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-n-600">
              Client
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    className="h-10 flex-1 justify-between font-normal"
                  >
                    <span className={selected ? "truncate" : "truncate text-muted-foreground"}>
                      {selected ? selected.name : "Choose a client"}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients…" />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        {options.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => chooseClient(client)}
                          >
                            <Check
                              className={`mr-2 size-4 ${
                                client.id === clientId ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="truncate">{client.name}</span>
                            {client.incoterm ? (
                              <span className="ml-auto rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                                {client.incoterm}
                              </span>
                            ) : null}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-xs font-semibold text-navy-700 hover:bg-navy-50"
                onClick={() => setShowNewClient((value) => !value)}
              >
                + New client
              </Button>
            </div>
            {showNewClient ? (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={newClient}
                  onChange={(event) => setNewClient(event.target.value)}
                  placeholder="Client name"
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={!newClient.trim() || createClient.isPending}
                  onClick={() => createClient.mutate(newClient.trim())}
                >
                  {createClient.isPending ? "Adding…" : "Add"}
                </Button>
              </div>
            ) : null}
          </div>

          <div>
            <Label htmlFor="proposal-project" className="text-xs font-semibold uppercase tracking-wide text-n-600">
              Project
            </Label>
            <Input
              id="proposal-project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
              placeholder="e.g. Annual conference gifts"
              className="mt-1.5 h-10"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-n-600">
              Incoterm
            </Label>
            <Select value={incoterm} onValueChange={(value) => setIncoterm(value as Incoterm)}>
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_INCOTERMS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected ? (
              selected.incoterm ? (
                <p className="mt-1.5 text-[11px] text-n-600">
                  Default for {selected.name}: <strong>{selected.incoterm}</strong> — change it here
                  if this project differs.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  No default incoterm on file for this client.
                </p>
              )
            ) : null}
          </div>

          {selected ? (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-n-600">
                Attention <span className="font-normal normal-case">(optional)</span>
              </Label>
              <Select
                value={buyerId || "__none__"}
                onValueChange={(value) => setBuyerId(value === "__none__" ? "" : value)}
              >
                <SelectTrigger className="mt-1.5 h-10" disabled={clientBuyers.length === 0}>
                  <SelectValue placeholder="No one in particular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">No one in particular</span>
                  </SelectItem>
                  {clientBuyers.map((buyer) => (
                    <SelectItem key={buyer.id} value={buyer.id}>
                      {buyer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {clientBuyers.length === 0
                  ? `No buyers on file for ${selected.name} — add them on the Clients tab.`
                  : "Names this proposal for one buyer at the client."}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            className="bg-navy-900 text-white hover:bg-navy-800"
            disabled={!canCreate}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}