import { Link, useNavigate } from "@tanstack/react-router";
import { UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStaffSession } from "@/lib/staff-session";

export function AccountMenu({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { hasSession, isStaff, access, signOut } = useStaffSession();
  const navigate = useNavigate();

  if (!hasSession) {
    return (
      <Link
        to="/auth"
        aria-label="Staff sign in"
        className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          tone === "light" ? "hover:bg-white/10" : "hover:bg-n-700/10"
        }`}
      >
        <UserRound className={`size-5 ${tone === "light" ? "text-white" : "text-n-700"}`} />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          tone === "light" ? "hover:bg-white/10" : "hover:bg-n-700/10"
        }`}
      >
        <UserRound className={`size-5 ${tone === "light" ? "text-white" : "text-n-700"}`} />
        {isStaff ? (
          <span className="absolute right-1 top-1 size-2.5 rounded-full border border-white bg-lime-500" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">
          {access?.displayName || access?.email || "Signed in"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isStaff ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin">Admin dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/account">My account</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onSelect={() => {
            void signOut().then(() => navigate({ to: "/", replace: true }));
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}