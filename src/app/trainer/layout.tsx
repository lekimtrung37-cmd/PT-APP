
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
  Users,
  LogOut,
  Settings,
  Calendar,
  MessageSquare,
  BookOpen,
  BookCopy,
  ClipboardList,
  FileText,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { doc } from 'firebase/firestore';
import { NotificationBell } from '@/components/NotificationBell';

const navItems = [
    { href: '/trainer/clients', icon: Users, label: 'Khách hàng' },
    { href: '/trainer/appointments', icon: Calendar, label: 'Lịch làm việc' },
    { href: '/trainer/messages', icon: MessageSquare, label: 'Tin nhắn' },
]

const libraryNavItems = [
    { href: '/trainer/library/exercises', icon: BookOpen, label: 'Thư viện bài tập' },
    { href: '/trainer/library/programs', icon: BookCopy, label: 'Giáo án mẫu' },
    { href: '/trainer/library/assessments', icon: ClipboardList, label: 'Mẫu đánh giá' },
    { href: '/trainer/library/forms', icon: FileText, label: 'Biểu mẫu & Câu hỏi' },
    { href: '/trainer/library/content', icon: ImageIcon, label: 'Nội dung Coaching' },
];


export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const router = useRouter();

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
    if (!name) return 'PT';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  if (pathname === '/trainer/onboarding') {
    return (
        <div className="flex flex-col min-h-screen bg-background items-center justify-center p-4">
            <main>{children}</main>
        </div>
    );
  }

  // While loading, or if no user, show a skeleton UI and prevent rendering children.
  if (isUserLoading || !user || isProfileLoading) {
    return (
      <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
        {/* Skeleton Sidebar */}
        <div className="hidden md:flex flex-col gap-2 p-2 border-r bg-slate-900" style={{width: '16rem'}}>
          <div className="flex items-center gap-2 p-4">
            <Skeleton className="h-8 w-8 bg-slate-700" />
            <Skeleton className="h-6 w-24 bg-slate-700" />
          </div>
          <div className="flex-1 p-2 space-y-1">
            {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-slate-700" />)}
          </div>
          <div className="p-2 space-y-2 mt-auto">
            <Skeleton className="h-12 w-full bg-slate-700" />
            <Skeleton className="h-8 w-full bg-slate-700" />
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="flex-1 p-8 bg-slate-50">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="bg-slate-900 text-slate-200 border-r-0">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
                <Logo />
                <div className="flex-grow" />
                <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href} className="px-2">
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    className={cn(
                        "py-3 justify-start text-slate-300 hover:bg-white/5 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white rounded-lg",
                    )}
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
               <Accordion type="single" collapsible defaultValue={pathname.startsWith('/trainer/library') ? 'library' : undefined} className="w-full px-2">
                    <AccordionItem value="library" className="border-none">
                        <AccordionTrigger className={cn("py-3 justify-start text-slate-300 hover:bg-white/5 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white rounded-lg hover:no-underline")}>
                           <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                <span className="font-medium group-data-[collapsible=icon]:hidden">Thư viện</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 pl-7">
                             <SidebarMenu>
                                {libraryNavItems.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.label}
                                        size="sm"
                                        isActive={pathname.startsWith(item.href)}
                                        className="text-slate-300 hover:text-white"
                                    >
                                        <Link href={item.href}>
                                        <item.icon className="h-4 w-4"/>
                                        <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             <Link href="/trainer/settings" className="block p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={userProfile?.profileImageUrl ?? "https://images.unsplash.com/photo-1616279969722-d81a5a3944ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxmaXRuZXNzJTIwdHJhaW5lcnxlbnwwfHx8fDE3NjM5ODYxNzF8MA&ixlib=rb-4.1.0&q=80&w=1080"} data-ai-hint="fitness trainer" />
                        <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                        <span className="font-semibold text-sm text-white">{userProfile?.name || "Trainer"}</span>
                    </div>
                </div>
            </Link>
             <SidebarMenu>
                 <SidebarMenuItem className="px-2">
                    <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="text-slate-400 hover:bg-white/5 hover:text-white rounded-lg">
                        <LogOut className="h-5 w-5"/> <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-slate-100 dark:bg-slate-950">
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
