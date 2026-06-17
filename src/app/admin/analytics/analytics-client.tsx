'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, Activity, UserCheck, TrendingUp, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
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

// Dữ liệu mẫu
const revenueData = [
  { month: 'T1', revenue: 4000 },
  { month: 'T2', revenue: 3000 },
  { month: 'T3', revenue: 5000 },
  { month: 'T4', revenue: 4500 },
  { month: 'T5', revenue: 6000 },
  { month: 'T6', revenue: 5500 },
  { month: 'T7', revenue: 7000 },
];

const packageData = [
  { name: 'Premium', value: 400, fill: 'hsl(var(--chart-1))' },
  { name: 'Standard', value: 300, fill: 'hsl(var(--chart-2))' },
  { name: 'Basic', value: 300, fill: 'hsl(var(--chart-3))' },
  { name: '1-on-1', value: 200, fill: 'hsl(var(--chart-4))' },
];

const packageChartConfig = {
  value: {
    label: "Members",
  },
  Premium: {
    label: "Premium",
    color: "hsl(var(--chart-1))",
  },
  Standard: {
    label: "Standard",
    color: "hsl(var(--chart-2))",
  },
  Basic: {
    label: "Basic",
    color: "hsl(var(--chart-3))",
  },
  "1-on-1": {
    label: "1-on-1",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig


const keyMetrics = [
    { title: "Tổng Doanh thu (tháng)", value: "$25,000", change: "+5.2% so với tháng trước", icon: DollarSign },
    { title: "Tỷ lệ Giữ chân (tháng)", value: "94.8%", change: "+1.2% so với tháng trước", icon: Users },
    { title: "Tỷ lệ Hoàn thành Buổi tập (tuần)", value: "90%", change: "+8% so với tuần trước", icon: Activity },
    { title: "PT Hiệu suất cao nhất", value: "Kim Trung", description: "Tỷ lệ giữ chân 95%", icon: TrendingUp }
]

export default function AnalyticsClient() {
    const firestore = useFirestore();
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(2024, 0, 1),
        to: new Date(2024, 6, 30),
    })

    const usersQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'users') : null
    , [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const trainersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), where('role', '==', 'pt')) : null
    , [firestore]);
    const { data: trainers, isLoading: areTrainersLoading } = useCollection<User>(trainersQuery);

    const isLoading = areUsersLoading || areTrainersLoading;

    const trainerPerformanceData = React.useMemo(() => {
        if (!trainers || !users) return [];
        return trainers.map(trainer => {
            const clientCount = users.filter(user => user.assignedPtId === trainer.id).length;
            return {
                name: trainer.name,
                avatar: trainer.profileImageUrl || `https://picsum.photos/seed/${trainer.id}/40/40`,
                avatarHint: "fitness trainer",
                clientCount: clientCount,
                retentionRate: 95, // Mock data
            };
        }).sort((a, b) => b.clientCount - a.clientCount);
    }, [trainers, users]);


    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Phân tích & Báo cáo</h1>
                    <p className="mt-1 text-muted-foreground">
                        Phân tích sâu về hiệu suất kinh doanh và hoạt động của KIM TRUNG.
                    </p>
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                            <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Chọn ngày</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>

             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 {keyMetrics.map(metric => (
                     <Card key={metric.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                            <metric.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <p className="text-xs text-muted-foreground">{metric.change || metric.description}</p>
                        </CardContent>
                    </Card>
                 ))}
             </div>


            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Tổng quan Doanh thu</CardTitle>
                        <CardDescription>Biểu đồ doanh thu trong 7 tháng gần nhất.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `$${value/1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                <Legend />
                                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Gói Dịch vụ Phổ biến</CardTitle>
                        <CardDescription>Tỷ lệ thành viên theo từng gói dịch vụ.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={packageChartConfig} className="mx-auto aspect-square h-[350px]">
                            <PieChart>
                                <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                                />
                                <Pie
                                data={packageData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                strokeWidth={5}
                                >
                                {packageData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.fill} />
                                ))}
                                </Pie>
                                <Legend content={({ payload }) => {
                                    return (
                                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                                            {payload?.map((entry) => (
                                                <div key={entry.value} className="flex items-center gap-2 text-sm">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                                    <span>{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Bảng xếp hạng PT</CardTitle>
                    <CardDescription>So sánh hiệu suất và tỷ lệ giữ chân khách hàng của các huấn luyện viên.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tên Huấn luyện viên</TableHead>
                                <TableHead>Số lượng khách hàng</TableHead>
                                <TableHead className="text-right">Tỷ lệ giữ chân</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : trainerPerformanceData.map((trainer) => (
                                <TableRow key={trainer.name}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <Avatar>
                                          <AvatarImage src={trainer.avatar} data-ai-hint={trainer.avatarHint}/>
                                          <AvatarFallback>
                                            {trainer.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-semibold">{trainer.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>{trainer.clientCount}</TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        <span>{trainer.retentionRate}%</span>
                                        <Progress value={trainer.retentionRate} className="w-24 h-2" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
