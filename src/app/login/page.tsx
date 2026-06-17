'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function UnifiedLoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();

  // If user is already logged in, redirect them immediately to the dispatch page
  React.useEffect(() => {
    if (user && !isUserLoading) {
      router.replace('/dispatch');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
        // The useEffect above will handle the redirect for subsequent loads.
        // For this initial login, we redirect manually.
        toast({ title: 'Đăng nhập thành công!' });
        router.replace('/dispatch');
    })
    .catch((error) => {
        toast({
            variant: 'destructive',
            title: 'Đăng nhập thất bại',
            description: 'Email hoặc mật khẩu không đúng.',
        });
        setIsLoading(false);
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Đăng nhập</CardTitle>
        <CardDescription>
          Truy cập tài khoản của bạn để bắt đầu hành trình fitness.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}/>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Button className="w-full" onClick={handleSignIn} disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
        
        <div className="mt-2 text-center text-sm">
          Chưa có tài khoản?{' '}
          <Link href="/login/user/signup" className="underline">
            Đăng ký
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
