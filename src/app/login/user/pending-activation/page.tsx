
'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MailCheck } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function PendingActivationPage() {
  const { auth } = useFirebase();
  const router = useRouter();

  const handleLogoutAndRedirect = () => {
    if (auth) {
      auth.signOut();
    }
    router.push('/login');
  };

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <MailCheck className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline mt-4">Xác nhận tài khoản</CardTitle>
        <CardDescription>
          Tài khoản của bạn đã được tạo thành công và đang chờ quản trị viên kích hoạt. 
          Chúng tôi sẽ liên hệ với bạn qua email khi tài khoản sẵn sàng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
            Quá trình này thường mất từ 1-2 giờ làm việc. Cảm ơn sự kiên nhẫn của bạn!
        </p>
      </CardContent>
      <CardContent>
        <Button onClick={handleLogoutAndRedirect}>Quay về trang chủ</Button>
      </CardContent>
    </Card>
  );
}

    