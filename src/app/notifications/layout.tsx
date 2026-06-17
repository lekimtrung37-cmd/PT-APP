
'use client';
import * as React from 'react';
import { useUser } from '@/firebase';
import AdminLayout from '@/app/admin/layout';
import ClientLayout from '@/app/client/layout';
import TrainerLayout from '@/app/trainer/layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      // In a real app, you'd get the role from Firestore
      // For this example, we'll try to infer it or default
      const email = user.email || '';
      if (email.includes('admin') || user.uid === '3n8bH4Hq3jZ6H6e5E3h4u5j6k7l8m9n0') {
        setRole('admin');
      } else if (email.includes('pt') || email.includes('kimtrung')) {
        setRole('trainer');
      } else {
        setRole('client');
      }
    }
  }, [user]);

  if (isUserLoading || !role) {
    return <div className="p-8"><Skeleton className="h-[calc(100vh-4rem)] w-full" /></div>;
  }

  if (role === 'admin') {
    return <AdminLayout>{children}</AdminLayout>;
  }

  if (role === 'trainer') {
    return <TrainerLayout>{children}</TrainerLayout>;
  }

  return <ClientLayout>{children}</ClientLayout>;
}
