"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { FullNameInput } from "@/components/auth/full-name-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  ADMIN_MODULE_LABELS,
  ALL_ADMIN_MODULES,
  type AdminModule,
} from "@/lib/admin/modules";
import {
  FULL_NAME_MAX_LENGTH,
  isLettersAndSpacesOnly,
  normalizePersonName,
  PERSON_NAME_LETTERS_MESSAGE,
} from "@/lib/person-name";

type StaffRow = {
  uid: string;
  fullName: string;
  email: string;
  permissions: AdminModule[];
  active: boolean;
};

async function staffFetch(
  getIdToken: () => Promise<string | null>,
  path: string,
  init?: RequestInit,
) {
  const token = await getIdToken();
  if (!token) throw new Error("Not signed in.");
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const fromJson =
      (typeof data.error === "string" && data.error) ||
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.message === "string" && data.message) ||
      "";
    const fromBody = text && text.length < 400 && !text.trimStart().startsWith("<") ? text.trim() : "";
    throw new Error(fromJson || fromBody || `Request failed (${res.status}).`);
  }
  return data;
}

function PermissionChecklist({
  value,
  onChange,
}: {
  value: AdminModule[];
  onChange: (next: AdminModule[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ALL_ADMIN_MODULES.map((module) => {
        const checked = value.includes(module);
        return (
          <label
            key={module}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-forest/10 bg-white px-3 py-2 text-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(state) => {
                const on = state === true;
                onChange(on ? [...value, module] : value.filter((m) => m !== module));
              }}
            />
            <span>{ADMIN_MODULE_LABELS[module]}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function AdminStaffPage() {
  const { getIdToken, isSuperAdmin } = useAdminAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<AdminModule[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await staffFetch(getIdToken, "/api/admin/staff");
      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setPermissions([]);
  }

  async function handleCreate() {
    const name = normalizePersonName(fullName);
    if (!isLettersAndSpacesOnly(name) || name.length < 2) {
      toast.error(PERSON_NAME_LETTERS_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      await staffFetch(getIdToken, "/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ fullName: name, email, password, permissions }),
      });
      toast.success("Staff member created.");
      setCreateOpen(false);
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create staff.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const name = normalizePersonName(fullName);
    if (!isLettersAndSpacesOnly(name) || name.length < 2) {
      toast.error(PERSON_NAME_LETTERS_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      await staffFetch(getIdToken, `/api/admin/staff/${editing.uid}`, {
        method: "PATCH",
        body: JSON.stringify({ fullName: name, permissions }),
      });
      toast.success("Permissions updated. Staff should refresh or sign in again to see changes.");
      setEditOpen(false);
      setEditing(null);
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update staff.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: StaffRow) {
    try {
      await staffFetch(getIdToken, `/api/admin/staff/${row.uid}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !row.active }),
      });
      toast.success(row.active ? "Staff deactivated." : "Staff reactivated.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  async function handleDelete(row: StaffRow) {
    if (!window.confirm(`Permanently delete ${row.fullName} (${row.email})? This cannot be undone.`)) {
      return;
    }
    try {
      await staffFetch(getIdToken, `/api/admin/staff/${row.uid}`, { method: "DELETE" });
      toast.success("Staff member deleted.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete staff.");
    }
  }

  const sorted = useMemo(
    () => [...staff].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [staff],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="type-eyebrow">Access</p>
          <h1 className="font-serif text-3xl text-forest">Staff</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create login accounts with module permissions. Staff cannot manage other staff. After you
            change permissions, ask them to refresh or sign in again.
          </p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
        </p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-forest/15 bg-cream/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No staff members yet. Add someone with limited module access.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-forest/10 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-forest/10 bg-cream/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Permissions</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.uid} className="border-b border-forest/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-forest">{row.fullName}</td>
                  <td className="px-4 py-3 text-forest/80">{row.email}</td>
                  <td className="px-4 py-3 text-forest/70">
                    {row.permissions.map((p) => ADMIN_MODULE_LABELS[p]).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.active ? "text-forest" : "text-destructive"}>
                      {row.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => {
                          setEditing(row);
                          setFullName(row.fullName);
                          setPermissions(row.permissions);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => void toggleActive(row)}
                      >
                        {row.active ? (
                          <>
                            <UserX className="h-3.5 w-3.5" /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" /> Reactivate
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-destructive"
                        onClick={() => void handleDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
            <DialogDescription>
              Creates a separate login. They will only see modules you select.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Full name</Label>
              <FullNameInput
                id="staff-name"
                value={fullName}
                maxLength={FULL_NAME_MAX_LENGTH}
                onChange={setFullName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modules</Label>
              <PermissionChecklist value={permissions} onChange={setPermissions} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit staff</DialogTitle>
            <DialogDescription>
              {editing?.email}. Staff must refresh or re-login after permission changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <FullNameInput
                id="edit-name"
                value={fullName}
                maxLength={FULL_NAME_MAX_LENGTH}
                onChange={setFullName}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modules</Label>
              <PermissionChecklist value={permissions} onChange={setPermissions} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
