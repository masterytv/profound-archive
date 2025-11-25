"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AuthConfirmationToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const isConfirmed = searchParams.get('confirmed');

    if (isConfirmed === 'true') {
      toast({
        title: "Email Confirmed!",
        description: "You have successfully signed in.",
      });

      // Clean up the URL by removing the 'confirmed' query parameter
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('confirmed');
      router.replace(`${pathname}?${newParams.toString()}`);
    }
  }, [searchParams, router, pathname, toast]);

  return null; // This component does not render anything itself
}
