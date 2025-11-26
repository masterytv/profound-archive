"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        getProfile(session.user);
      }
    };

    checkUserAndFetchProfile();
  }, [router, supabase.auth, getProfile]);

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      <div className="space-y-10">
        {/* Edit Profile Section */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={profile?.full_name || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
            />
          </div>
          <div>
            <Button type="submit">Update Profile</Button>
          </div>
        </form>

        {/* Account Management Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Account Management</h2>
          <div className="space-y-1">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a strong new password"
            />
          </div>
          <div>
            <Button onClick={handleUpdatePassword}>Change Password</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
