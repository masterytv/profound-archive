"use client";

/**
 * UAP Admin Contactee Editor
 * CRUD for contactee profiles with inline editing, create dialog, and delete confirmation.
 * Pattern: mirrors admin/uap/classifier/page.tsx
 */

import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, Plus, Edit3, Trash2, Check, X, AlertTriangle,
  ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";

interface Contactee {
  id: string;
  slug: string;
  display_name: string;
  is_anonymous: boolean;
  summary: string | null;
  bio: string | null;
  video_ids: string[];
  experience_type: string | null;
  entity_types: string[] | null;
  core_themes: string[] | null;
  avg_evidence_score: number | null;
  avg_contact_depth: number | null;
  avg_transformation_score: number | null;
  contribution_label: string | null;
  created_at: string | null;
}

const PAGE_SIZE = 25;

export default function AdminContacteesPage() {
  const [contactees, setContactees] = useState<Contactee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editExpType, setEditExpType] = useState("");
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newBio, setNewBio] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchContactees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/uap-contactees?${params}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setContactees(data.contactees);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchContactees(); }, [fetchContactees]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/uap-contactees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", display_name: newName, slug: newSlug || undefined, bio: newBio || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowCreate(false);
      setNewName(""); setNewSlug(""); setNewBio("");
      await fetchContactees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/uap-contactees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update", id,
          display_name: editName, slug: editSlug,
          bio: editBio || null, experience_type: editExpType || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEditingId(null);
      await fetchContactees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/uap-contactees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDeleteId(null);
      await fetchContactees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const startEdit = (c: Contactee) => {
    setEditingId(c.id);
    setEditName(c.display_name);
    setEditSlug(c.slug);
    setEditBio(c.bio || "");
    setEditExpType(c.experience_type || "");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Contactee Profiles</h1>
            <p className="text-sm text-muted-foreground">Manage UAP contactee profiles</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Contactee
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="mb-6 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Create New Contactee</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Display Name *" value={newName} onChange={e => setNewName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground placeholder:text-muted-foreground dark:[color-scheme:dark]" />
            <input placeholder="Slug (auto-generated)" value={newSlug} onChange={e => setNewSlug(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground placeholder:text-muted-foreground dark:[color-scheme:dark]" />
          </div>
          <textarea placeholder="Bio" value={newBio} onChange={e => setNewBio(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground placeholder:text-muted-foreground mb-3 dark:[color-scheme:dark]" />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {creating ? "Creating..." : "Create"}
            </button>
            <button onClick={() => { setShowCreate(false); setNewName(""); setNewSlug(""); setNewBio(""); }}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <p className="text-sm text-foreground mb-3">
            Delete <strong>{deleteName}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button onClick={() => setDeleteId(null)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search by name..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:[color-scheme:dark]" />
      </div>

      {/* Count */}
      <div className="text-sm text-muted-foreground mb-4">
        {loading ? "Loading..." : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount.toLocaleString()} contactees`}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-36">Slug</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-20">Videos</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-28">Type</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-20">ESS</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-20">CDS</th>
                <th className="text-left p-3 text-muted-foreground font-medium w-20">CTI</th>
                <th className="text-center p-3 text-muted-foreground font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contactees.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    {editingId === c.id ? (
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-sm text-foreground dark:[color-scheme:dark]" />
                    ) : (
                      <a href={`/uap/experiencer/${c.slug}`} target="_blank" rel="noopener noreferrer"
                        className="text-foreground hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        {c.display_name}
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === c.id ? (
                      <input value={editSlug} onChange={e => setEditSlug(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-foreground dark:[color-scheme:dark]" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">{c.slug}</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400">
                      {c.video_ids?.length || 0}
                    </span>
                  </td>
                  <td className="p-3">
                    {editingId === c.id ? (
                      <input value={editExpType} onChange={e => setEditExpType(e.target.value)} placeholder="e.g. abduction"
                        className="w-full px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-foreground dark:[color-scheme:dark]" />
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{c.experience_type || "—"}</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{c.avg_evidence_score?.toFixed(1) || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.avg_contact_depth?.toFixed(1) || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.avg_transformation_score?.toFixed(1) || "—"}</td>
                  <td className="p-3">
                    {editingId === c.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleUpdate(c.id)} disabled={saving}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50" title="Save">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Cancel">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(c)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteId(c.id); setDeleteName(c.display_name); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && contactees.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No contactees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bio edit row (shown below table when editing) */}
      {editingId && (
        <div className="mb-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Bio (editing: {editName})</label>
          <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-foreground dark:[color-scheme:dark]" />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:pointer-events-none">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:pointer-events-none">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
