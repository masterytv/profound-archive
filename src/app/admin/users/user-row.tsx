"use client";

import { useState } from "react";
import { User, Trash2 } from "lucide-react";
import { toggleBanUser, updateUserRole, deleteUser } from "../actions";

type Profile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    is_banned: boolean | null;
};

export function UserRow({ profile, email }: { profile: Profile; email?: string }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleBanToggle = async () => {
        if (!confirm(profile.is_banned ? "Unban this user?" : "Ban this user?")) return;

        setIsUpdating(true);
        const result = await toggleBanUser(profile.id, !!profile.is_banned);
        setIsUpdating(false);

        if (!result.success) {
            alert("Error: " + result.error);
        }
    };

    const handleRoleChange = async (newRole: "user" | "admin" | "super_admin") => {
        if (newRole === profile.role) return;
        if (!confirm(`Change role to ${newRole}?`)) return;

        setIsUpdating(true);
        const result = await updateUserRole(profile.id, newRole);
        setIsUpdating(false);

        if (!result.success) {
            alert("Error: " + result.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return;

        setIsUpdating(true);
        const result = await deleteUser(profile.id);
        setIsUpdating(false);

        if (!result.success) {
            alert("Error deleting user: " + result.error);
        }
    };

    const getRoleBadgeClass = (role: string | null) => {
        if (role === "super_admin") return "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300";
        if (role === "admin") return "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300";
        return "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300";
    };

    return (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-9 w-9">
                        {profile.avatar_url ? (
                            <img className="h-9 w-9 rounded-xl object-cover" src={profile.avatar_url} alt="" />
                        ) : (
                            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-slate-400" />
                            </div>
                        )}
                    </div>
                    <div className="ml-3.5">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {profile.full_name || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-400">{email || "No Email"}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <select
                    disabled={isUpdating}
                    value={profile.role || "user"}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-0 cursor-pointer ${getRoleBadgeClass(profile.role)}`}
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span
                    className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg ${profile.is_banned
                        ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                        : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        }`}
                >
                    {profile.is_banned ? "Banned" : "Active"}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button
                    onClick={handleBanToggle}
                    disabled={isUpdating}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${profile.is_banned
                        ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30"
                        : "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30"
                        }`}
                >
                    {profile.is_banned ? "Unban" : "Ban"}
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isUpdating}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete User"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
}
