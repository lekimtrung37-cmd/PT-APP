
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const signupFormSchema = z.object({
  name: z.string().min(1, { message: "Họ và Tên không được để trống." }),
  email: z.string().email({ message: "Địa chỉ email không hợp lệ." }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function UserSignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const { auth } = useFirebase();
    const firestore = useFirestore();

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupFormSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        }
    });

    const handleSignUp = async (data: SignupFormValues) => {
        setIsLoading(true);
        if (!auth || !firestore) {
            toast({ variant: "destructive", title: "Lỗi", description: "Dịch vụ Firebase không khả dụng." });
            setIsLoading(false);
            return;
        }
        
        try {
            // Step 1: Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            // Step 2: Create user document in Firestore
            const userDocRef = doc(firestore, "users", user.uid);
            
            const isAdmin = data.email.toLowerCase().includes('admin');
            const role = isAdmin ? 'admin' : 'user';
            const status = isAdmin ? 'Active' : 'Pending Activation';

            const newUserProfile = {
                id: user.uid,
                email: data.email,
                name: data.name,
                role: role,
                status: status,
                profileImageUrl: `https://picsum.photos/seed/${data.email}/40/40`,
            };

            await setDoc(userDocRef, newUserProfile);

            toast({
                title: "Đăng ký thành công!",
                description: "Tài khoản của bạn đang chờ kích hoạt. Vui lòng liên hệ Admin.",
            });
            
            // Redirect to a pending page or login page
            router.push('/login/user/pending-activation');

        } catch (error: any) {
            const errorCode = error.code;
            let errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại.";
            if (errorCode === 'auth/email-already-in-use') {
                errorMessage = 'Địa chỉ email này đã được sử dụng.';
            } else if (errorCode === 'auth/weak-password') {
                errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác."
            } else if (errorCode === 'permission-denied') {
                errorMessage = "Lỗi phân quyền. Không thể tạo tài khoản."
            }
            toast({
                variant: "destructive",
                title: "Đăng ký thất bại",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Tạo tài khoản</CardTitle>
        <CardDescription>
          Nhập thông tin của bạn để tạo tài khoản. Mọi tài khoản mới sẽ cần được Admin kích hoạt.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSignUp)}>
            <CardContent className="grid gap-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Họ và Tên</FormLabel>
                            <FormControl>
                                <Input placeholder="Tên của bạn" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="m@example.com" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Xác nhận Mật khẩu</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter className="flex flex-col">
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading ? 'Đang xử lý...' : 'Tạo tài khoản'}
                </Button>
            </CardFooter>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm px-6 pb-6">
          Đã có tài khoản?{' '}
          <Link href="/login" className="underline">
            Đăng nhập
          </Link>
        </div>
    </Card>
  );
}
