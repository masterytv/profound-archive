"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSharedSession } from '@/lib/supabase/session';
import type { User } from '@supabase/supabase-js';
import { Loader2, ChevronRight, UserIcon, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');

  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const getProfile = useCallback(async (currentUser: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`full_name, avatar_url`)
      .eq('id', currentUser.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      toast({ title: 'Error', description: 'Could not fetch your profile.', variant: 'destructive' });
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    const checkUserAndFetchProfile = async () => {
      // Bounded, single-flight session lookup (8s stall guard) — a wedged
      // auth client redirects to login instead of spinning forever.
      const session = await getSharedSession();
      if (!session) {
        setLoading(false);
        router.push('/login');
      } else {
        setUser(session.user);
        getProfile(session.user);
      }
    };

    checkUserAndFetchProfile();
  }, [router, getProfile]);

  const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !profile) return;

    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    }).eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Could not update your profile.', variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Your profile has been updated.' });
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast({ title: 'Error', description: 'Please enter a new password.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Your password has been updated.' });
      setNewPassword('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="border-b border-slate-200" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)" }}>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-medium">My Profile</span>
          </nav>
          <h1
            className="text-3xl font-bold text-slate-900"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            My Profile
          </h1>
          <p className="text-slate-500 mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Edit Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserIcon className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={profile?.full_name || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                className="rounded-xl border-slate-200 focus:ring-blue-500/40 focus:border-blue-400"
              />
            </div>
            <div>
              <Button type="submit" className="rounded-xl bg-slate-900 hover:bg-slate-800">
                Update Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Account Management Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <KeyRound className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Account Management</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter a strong new password"
                className="rounded-xl border-slate-200 focus:ring-blue-500/40 focus:border-blue-400"
              />
            </div>
            <div>
              <Button onClick={handleUpdatePassword} variant="outline" className="rounded-xl">
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
