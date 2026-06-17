
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Shield, Pencil, Activity, CheckCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import React from 'react';

// Dữ liệu mẫu - trong ứng dụng thực tế, bạn sẽ fetch dữ liệu này
const mockMembers = [
  {
    id: 'USR-001',
    name: 'An Nguyễn',
    email: 'an.nguyen@email.com',
    status: 'Active',
    profileImageUrl: 'https://picsum.photos/seed/user1/80/80',
    assignedPtId: 'PT-001',
    joinDate: '2024-01-15',
    endDate: '2025-01-15',
    plan: 'Tăng cơ 6 tháng',
  },
  {
    id: 'USR-002',
    name: 'Trần Bình',
    email: 'binh.tran@email.com',
    status: 'Active',
    profileImageUrl: 'https://picsum.photos/seed/user2/80/80',
    assignedPtId: 'PT-002',
    joinDate: '2024-03-10',
    endDate: '2025-03-10',
    plan: 'Giảm cân 3 tháng',
  },
  {
    id: 'USR-003',
    name: 'Lê Thị Hoa',
    email: 'hoa.le@email.com',
    status: 'Pending Activation',
    profileImageUrl: 'https://picsum.photos/seed/user3/80/80',
    assignedPtId: undefined,
    joinDate: null,
    endDate: null,
    plan: null,
  },
];
const recentActivities = [
    { description: "Hoàn thành buổi tập 'Thân trên - Sức mạnh'.", time: "Hôm qua", icon: CheckCircle },
    { description: "Cập nhật chỉ số cân nặng: 72.5kg.", time: "2 ngày trước", icon: Activity },
    { description: "Ghi lại bữa trưa: Ức gà nướng.", time: "2 ngày trước", icon: Activity },
];


export default function MemberDetailPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const [member, setMember] = React.useState<typeof mockMembers[0] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    // Simulate fetching data
    setTimeout(() => {
      const foundMember = mockMembers.find(m => m.id === memberId) || null;
      setMember(foundMember as any);
      setIsLoading(false);
    }, 500);
  }, [memberId]);

  if (isLoading) {
    return <div>Đang tải thông tin thành viên...</div>;
  }

  if (!member) {
    return <div>Không tìm thấy thành viên.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
       {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
             <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={member.profileImageUrl} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
                    {member.name}
                </h1>
                 <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" /> {member.email}
                </p>
                 <div className="flex items-center gap-2 mt-2">
                    <Badge variant={member.status === 'Active' ? 'default' : 'secondary'} className={member.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}>
                        {member.status}
                    </Badge>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa</Button>
            <Button variant="destructive">Vô hiệu hóa</Button>
        </div>
      </div>


      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Hoạt động gần đây
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentActivities.length > 0 ? (
                        <ul className="space-y-4">
                            {recentActivities.map((activity, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <div className="bg-secondary p-2 rounded-full">
                                        <activity.icon className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">Không có hoạt động nào gần đây.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Thông tin Quản lý
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Ngày tham gia:</span>
                        <span className="font-semibold">{member.joinDate ? new Date(member.joinDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Ngày kết thúc:</span>
                        <span className="font-semibold">{member.endDate ? new Date(member.endDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">PT Phụ trách:</span>
                        <Button variant="link" className="p-0 h-auto font-semibold">{member.assignedPtId || 'Chưa gán'}</Button>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Gói dịch vụ:</span>
                        <Badge variant={'outline'}>{member.plan || 'N/A'}</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
