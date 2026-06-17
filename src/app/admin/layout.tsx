
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
  UserCog,
  BarChart4,
  LogOut,
  Settings,
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  BookOpen,
  BookCopy,
  ClipboardList,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/NotificationBell';

const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/trainers', icon: UserCog, label: 'Huấn luyện viên' },
    { href: '/admin/members', icon: Users, label: 'Thành viên' },
    { href: '/admin/analytics', icon: BarChart4, label: 'Phân tích' },
]

const libraryNavItems = [
    { href: '/admin/library/exercises', icon: BookOpen, label: 'Thư viện bài tập' },
    { href: '/admin/library/programs', icon: BookCopy, label: 'Giáo án mẫu' },
    { href: '/admin/library/assessments', icon: ClipboardList, label: 'Mẫu đánh giá' },
    { href: '/admin/library/forms', icon: FileText, label: 'Biểu mẫu & Câu hỏi' },
    { href: '/admin/library/content', icon: ImageIcon, label: 'Nội dung Coaching' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();

  React.useEffect(() => {
    // If auth check is complete and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  // While loading, show a skeleton UI to prevent rendering children components
  // that might trigger Firestore reads.
  if (isUserLoading || !user) {
      return (
        <div className="flex min-h-screen bg-background">
            <div className="hidden md:flex flex-col gap-2 p-2 border-r" style={{width: '16rem'}}>
                 <div className="flex items-center gap-2 p-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex-1 p-2 space-y-2">
                    {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
                <div className="p-2 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
            <div className="flex-1 p-8">
                 <Skeleton className="h-10 w-64 mb-4" />
                 <Skeleton className="h-full w-full" />
            </div>
        </div>
      )
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
                <Accordion type="single" collapsible defaultValue={pathname.startsWith('/admin/library') ? 'library' : undefined} className="w-full">
                    <AccordionItem value="library" className="border-none">
                        <AccordionTrigger className="hover:no-underline px-3 py-2 text-sm font-medium text-white/70 hover:text-white rounded-md data-[state=open]:bg-white/10">
                           <div className="flex items-center gap-2">
                                <BookOpen />
                                <span className="group-data-[collapsible=icon]:hidden">Thư viện</span>
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
                                    >
                                        <Link href={item.href}>
                                        <item.icon />
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
             <Link href="/admin/settings" className="block p-2 rounded-lg hover:bg-white/5 transition-colors">
                 <div className="flex items-center p-2 gap-2">
                    {isUserLoading ? (
                    <>
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
                        <Skeleton className="h-4 w-20" />
                        </div>
                    </>
                    ) : (
                    <>
                        <Avatar>
                            <AvatarImage src={user?.photoURL ?? "https://picsum.photos/seed/admin/40/40"} data-ai-hint="person face" />
                            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                            <span className="font-semibold text-sm">{user?.displayName || 'Admin'}</span>
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
             <header className="flex h-14 items-center justify-end gap-4 border-b bg-background px-4 md:px-6">
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
