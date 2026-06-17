
'use client';
import Logo from '@/components/logo';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Home,
  Calendar,
  Utensils,
  LineChart,
  LogOut,
  Settings,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { NotificationBell } from '@/components/NotificationBell';

const navItems = [
    { href: '/client/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/client/calendar', icon: Calendar, label: 'Lịch tập' },
    { href: '/client/nutrition', icon: Utensils, label: 'Dinh dưỡng' },
    { href: '/client/progress', icon: LineChart, label: 'Tiến độ' },
    { href: '/client/messages', icon: MessageSquare, label: 'Tin nhắn' },
]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  React.useEffect(() => {
    // If auth check is complete and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  // While loading, or if no user, show a skeleton UI and prevent rendering children.
  if (isUserLoading || !user || isProfileLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Skeleton Sidebar */}
        <div className="hidden md:flex flex-col gap-2 p-2 border-r" style={{width: '16rem'}}>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 p-2 space-y-2">
            {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
          <div className="p-2 space-y-2 mt-auto">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
                <Logo />
                <div className="flex-grow" />
                <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             <Link href="/client/settings" className="block p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                    {isProfileLoading ? (
                        <>
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </>
                    ) : (
                        <>
                            <Avatar>
                                <AvatarImage src={userProfile?.profileImageUrl ?? `https://picsum.photos/seed/${user?.uid}/40/40`} data-ai-hint="smiling person" />
                                <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                                <span className="font-semibold text-sm">{userProfile?.name || 'Client'}</span>
                            </div>
                        </>
                    )}
                </div>
             </Link>
             <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                        <LogOut /> <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
             <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-2 md:hidden">
                    <SidebarTrigger />
                    <Logo />
                </div>
                 <div className="flex-1" />
                <NotificationBell />
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                {children}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
