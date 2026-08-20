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
  const { access } = useStaffSession();

  const [clientId, setClientId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [project, setProject] = useState("");
  const [incoterm, setIncoterm] = useState<Incoterm>("CIF");

  const options = useMemo(
    () => [...(clients.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [clients.data],
  );
  const selected = options.find((client) => client.id === clientId) ?? null;

  function chooseClient(client: ClientRow) {
    setClientId(client.id);
    setPickerOpen(false);
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
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {(clients.data ?? []).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
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