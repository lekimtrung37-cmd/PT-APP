'use client';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Users,
  UserCog,
  DollarSign,
  Activity,
  ArrowUp,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type User = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'pt' | 'admin';
    assignedPtId?: string;
    profileImageUrl?: string;
};

const revenueData = [
  { name: 'T1', DoanhThu: 4000 },
  { name: 'T2', DoanhThu: 3000 },
  { name: 'T3', DoanhThu: 5000 },
  { name: 'T4', DoanhThu: 4500 },
  { name: 'T5', DoanhThu: 6000 },
  { name: 'T6', DoanhThu: 5500 },
  { name: 'T7', DoanhThu: 7000 },
];

const memberData = [
  { name: 'T1', "Thành viên mới": 20 },
  { name: 'T2', "Thành viên mới": 15 },
  { name: 'T3', "Thành viên mới": 25 },
  { name: 'T4', "Thành viên mới": 30 },
  { name: 'T5', "Thành viên mới": 45 },
  { name: 'T6', "Thành viên mới": 40 },
  { name: 'T7', "Thành viên mới": 50 },
];

const recentActivities = [
    { description: "PT Kim Trung vừa thêm một khách hàng mới: An Nguyễn.", time: "5 phút trước" },
    { description: "Thành viên Lê Thị Hoa vừa hoàn thành một buổi tập.", time: "1 giờ trước" },
    { description: "Doanh thu tháng này đã vượt mục tiêu 5%.", time: "Hôm qua" },
];


export default function AdminDashboardPage() {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'users') : null
    , [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const trainersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), where('role', '==', 'pt')) : null
    , [firestore]);
    const { data: trainers, isLoading: areTrainersLoading } = useCollection<User>(trainersQuery);

    const isLoading = areUsersLoading || areTrainersLoading;

    const summaryCards = React.useMemo(() => [
        {
            title: "Tổng thành viên",
            value: isLoading ? "..." : (users?.filter(u => u.role === 'user').length ?? 0).toString(),
            change: "+150 trong tháng này", // mock data
            icon: Users,
        },
        {
            title: "Tổng PT",
            value: isLoading ? "..." : (trainers?.length ?? 0).toString(),
             change: "+2 PT mới", // mock data
            icon: UserCog,
        },
        {
            title: "Doanh thu tháng",
            value: "$25,000", // mock data
            change: "+5.2% so với tháng trước", // mock data
            icon: DollarSign,
        },
        {
            title: "Tỷ lệ hoạt động",
            value: "85%", // mock data
            change: "Tỷ lệ thành viên check-in", // mock data
            icon: Activity,
        }
    ], [users, trainers, isLoading]);

    const topTrainers = React.useMemo(() => {
        if (!trainers || !users) return [];
        return trainers.map(trainer => {
            const clientCount = users.filter(user => user.assignedPtId === trainer.id).length;
            return {
                ...trainer,
                clients: clientCount,
                rating: 4.9, // Mock data as rating is not available
            };
        }).sort((a, b) => b.clients - a.clients).slice(0, 3);
    }, [trainers, users]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Bảng điều khiển Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Tổng quan về hoạt động kinh doanh của KIM TRUNG.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
            <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {card.title}
                    </CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-muted-foreground">
                        {card.change}
                    </p>
                </CardContent>
            </Card>
        ))}
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                <CardTitle>Tăng trưởng Doanh thu</CardTitle>
                <CardDescription>Biểu đồ doanh thu trong 7 tháng gần nhất.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                        <Bar dataKey="DoanhThu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                <CardTitle>Tăng trưởng Thành viên</CardTitle>
                <CardDescription>Số lượng thành viên mới trong 7 tháng gần nhất.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={memberData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                        <Bar dataKey="Thành viên mới" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                <CardTitle>PT hoạt động tốt nhất</CardTitle>
                <CardDescription>
                    Các PT có hiệu suất cao nhất trong tháng này.
                </CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {topTrainers.map((trainer, index) => (
                            <li key={trainer.name} className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={trainer.profileImageUrl} data-ai-hint="fitness trainer" />
                                    <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{trainer.name}</p>
                                    <p className="text-sm text-muted-foreground">{trainer.clients} khách hàng</p>
                                </div>
                                <div className="flex items-center gap-2">
                                {index === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                                <Badge variant="secondary" className="text-base">{trainer.rating} ★</Badge>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/admin/trainers">Quản lý tất cả PT</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>
                    Các hoạt động mới nhất trên toàn hệ thống.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {recentActivities.map((activity, index) => (
                            <li key={index} className="flex flex-col">
                                <p className="text-sm font-medium">{activity.description}</p>
                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
       </div>
    </div>
  );
}

    