'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Star, TrendingUp, UserCheck, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

// Dữ liệu mẫu
const trainer = {
    name: "Kim Trung",
    avatar: "https://images.unsplash.com/photo-1616279969722-d81a5a3944ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxmaXRuZXNzJTIwdHJhaW5lcnxlbnwwfHx8fDE3NjM5ODYxNzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    avatarHint: "fitness trainer",
    email: "kim.trung@trungfit.com",
    specialty: "Strength & Conditioning"
};

const kpiData = [
    { title: "Tổng số khách hàng", value: "25", icon: Users },
    { title: "Tỷ lệ giữ chân", value: "95%", icon: UserCheck },
    { title: "Đánh giá trung bình", value: "4.9/5", icon: Star },
    { title: "Buổi tập đã hoàn thành (tháng)", value: "88", icon: TrendingUp },
]

const clientGrowthData = [
  { month: 'T1', clients: 5 },
  { month: 'T2', clients: 8 },
  { month: 'T3', clients: 12 },
  { month: 'T4', clients: 15 },
  { month: 'T5', clients: 20 },
  { month: 'T6', clients: 22 },
  { month: 'T7', clients: 25 },
];

const satisfactionData = [
  { rating: 1, count: 0 },
  { rating: 2, count: 1 },
  { rating: 3, count: 5 },
  { rating: 4, count: 25 },
  { rating: 5, count: 150 },
]

const clients = [
  { id: 'USR-001', name: 'An Nguyễn', status: 'Active', plan: 'Tăng cơ' },
  { id: 'USR-002', name: 'Trần Bình', status: 'Active', plan: 'Giảm cân' },
  { id: 'USR-003', name: 'Lê Thị Hoa', status: 'Needs Attention', plan: 'Tăng cơ' },
];


export default function TrainerPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.trainerId;

  // Trong ứng dụng thực tế, bạn sẽ fetch dữ liệu của PT dựa trên trainerId

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={trainer.avatar} data-ai-hint={trainer.avatarHint} />
            <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-3xl font-bold font-headline">{trainer.name}</h1>
            <p className="text-muted-foreground">{trainer.specialty}</p>
        </div>
      </div>

       {/* KPIs */}
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {kpiData.map(kpi => (
                <Card key={kpi.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                    </CardContent>
                </Card>
            ))}
       </div>

       {/* Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
               <CardHeader>
                   <CardTitle>Tăng trưởng khách hàng</CardTitle>
                   <CardDescription>Số lượng khách hàng hoạt động theo tháng.</CardDescription>
               </CardHeader>
               <CardContent>
                   <ResponsiveContainer width="100%" height={300}>
                       <LineChart data={clientGrowthData}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis dataKey="month" />
                           <YAxis allowDecimals={false} />
                           <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                           <Legend />
                           <Line type="monotone" dataKey="clients" name="Khách hàng" stroke="hsl(var(--primary))" />
                       </LineChart>
                   </ResponsiveContainer>
               </CardContent>
           </Card>
            <Card>
               <CardHeader>
                   <CardTitle>Mức độ hài lòng của khách hàng</CardTitle>
                   <CardDescription>Phân bổ đánh giá từ khách hàng.</CardDescription>
               </CardHeader>
               <CardContent>
                   <ResponsiveContainer width="100%" height={300}>
                       <BarChart data={satisfactionData}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis dataKey="rating" label={{ value: 'Số sao', position: 'insideBottom', offset: -5 }} />
                           <YAxis label={{ value: 'Lượt đánh giá', angle: -90, position: 'insideLeft' }} />
                           <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                           <Bar dataKey="count" name="Số lượt" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                       </BarChart>
                   </ResponsiveContainer>
               </CardContent>
           </Card>
       </div>

        {/* Client List */}
        <Card>
            <CardHeader>
                <CardTitle>Danh sách khách hàng hiện tại</CardTitle>
                <CardDescription>Tổng cộng {clients.length} khách hàng đang hoạt động.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Tên khách hàng</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Kế hoạch hiện tại</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell className="font-medium">{client.name}</TableCell>
                                <TableCell>
                                     <Badge
                                        variant={client.status === 'Active' ? 'default' : 'destructive'}
                                        className={client.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}
                                    >
                                        {client.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{client.plan}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/trainer/clients/${client.id}`}>Xem chi tiết</Link>
                                    </Button>
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
