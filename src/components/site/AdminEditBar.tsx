import { Link } from "@tanstack/react-router";
import { PencilRuler, X, ExternalLink } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useStaffSession } from "@/lib/staff-session";

export function AdminEditBar() {
  const { isStaff, editMode, setEditMode, barDismissed, dismissBar } = useStaffSession();

  if (!isStaff || barDismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-n-700 bg-n-900/95 px-4 py-2 text-white shadow-lift backdrop-blur">
        <PencilRuler className="size-4 text-lime-500" />
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          Edit mode
          <Switch checked={editMode} onCheckedChange={setEditMode} aria-label="Toggle edit mode" />
        </label>
        <span className="h-5 w-px bg-white/20" />
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-lime-500"
        >
          Open Admin <ExternalLink className="size-3.5" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss admin toolbar"
          onClick={dismissBar}
          className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
