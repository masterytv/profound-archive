"use client";

import { useState } from "react";
import { User, Shield, Ban, CheckCircle } from "lucide-react";
import { toggleBanUser, updateUserRole } from "../actions";

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

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                        {profile.avatar_url ? (
                            <img className="h-10 w-10 rounded-full" src={profile.avatar_url} alt="" />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-500" />
                            </div>
                        )}
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                            {profile.full_name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">{email || "No Email"}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <select
                    disabled={isUpdating}
                    value={profile.role || "user"}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className={`text-xs font-semibold inline-flex px-2 py-1 leading-5 rounded-full ${profile.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                            profile.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                        }`}
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${profile.is_banned
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                >
                    {profile.is_banned ? "Banned" : "Active"}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                    onClick={handleBanToggle}
                    disabled={isUpdating}
                    className={`${profile.is_banned ? "text-green-600 hover:text-green-900" : "text-red-600 hover:text-red-900"
                        } font-bold`}
                >
                    {profile.is_banned ? "Unban" : "Ban"}
                </button>
            </td>
        </tr>
    );
}
