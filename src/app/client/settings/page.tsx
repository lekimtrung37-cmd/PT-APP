
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useFirestore, useDoc, useMemoFirebase, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, Loader2, KeyRound, User, Info, Bell, Upload, Camera } from 'lucide-react';
import { updatePassword, updateProfile } from 'firebase/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { uploadFile } from '@/lib/chatService';

export default function SettingsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const userDocRef = useMemoFirebase(() =>
        firestore && user ? doc(firestore, 'users', user.uid) : null
    , [firestore, user]);

    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const [isEditing, setIsEditing] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isPasswordSubmitting, setIsPasswordSubmitting] = React.useState(false);

    // Form state
    const [name, setName] = React.useState('');
    const [height, setHeight] = React.useState('');
    const [weight, setWeight] = React.useState('');
    const [targetWeight, setTargetWeight] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
    
    // Avatar state
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = React.useState(false);
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
    const [isAvatarSubmitting, setIsAvatarSubmitting] = React.useState(false);


    React.useEffect(() => {
        if (userData) {
            setName(userData.name || '');
            if (userData.onboardingData?.biometric) {
                setHeight(userData.onboardingData.biometric.height || '');
                setWeight(userData.onboardingData.biometric.weight || '');
                setTargetWeight(userData.onboardingData.biometric.targetWeight || '');
            }
        }
    }, [userData]);
    
    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleUpdateAvatar = async () => {
        if (!user || !storage || !userDocRef || !avatarFile) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một file ảnh.' });
            return;
        }
        setIsAvatarSubmitting(true);
        try {
            const storagePath = `avatars/${user.uid}/${avatarFile.name}`;
            const { downloadURL } = await uploadFile(storage, avatarFile, storagePath);
    
            await updateProfile(user, { photoURL: downloadURL });
            await updateDoc(userDocRef, { profileImageUrl: downloadURL });
    
            toast({ title: "Thành công!", description: "Ảnh đại diện đã được cập nhật." });
            setIsAvatarDialogOpen(false);
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (error: any) {
            console.error("Error updating avatar:", error);
            let description = 'Không thể cập nhật ảnh đại diện.';
            if (error.code === 'storage/unauthorized') {
                description = 'Lỗi phân quyền: Bạn không có quyền tải ảnh lên. Hãy kiểm tra lại quy tắc bảo mật của Storage.';
            } else if (error.code === 'auth/requires-recent-login') {
                description = 'Vui lòng đăng nhập lại trước khi thay đổi thông tin nhạy cảm.';
            }
            toast({ variant: 'destructive', title: 'Lỗi Tải Lên', description });
        } finally {
            setIsAvatarSubmitting(false);
        }
    };


    const handleSaveChanges = async () => {
        if (!userDocRef || !userData) return;
        setIsSubmitting(true);
        try {
            await updateDoc(userDocRef, {
                name: name,
                'onboardingData.biometric.height': height,
                'onboardingData.biometric.weight': weight,
                'onboardingData.biometric.targetWeight': targetWeight,
            });
            toast({ title: "Thành công", description: "Hồ sơ của bạn đã được cập nhật." });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile: ", error);
            toast({ variant: 'destructive', title: "Lỗi", description: "Không thể cập nhật hồ sơ." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleChangePassword = async () => {
        if (!user) return;
        if (newPassword !== confirmNewPassword) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Mật khẩu mới không khớp.' });
            return;
        }
        if (newPassword.length < 6) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
            return;
        }

        setIsPasswordSubmitting(true);

        try {
            await updatePassword(user, newPassword);
            toast({ title: 'Thành công', description: 'Mật khẩu đã được thay đổi.' });
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: any) {
            console.error("Password change error: ", error);
            let description = 'Không thể thay đổi mật khẩu. Vui lòng thử lại.';
            if (error.code === 'auth/requires-recent-login') {
                description = 'Vui lòng đăng xuất và đăng nhập lại trước khi đổi mật khẩu.';
            } else if (error.code === 'auth/weak-password') {
                description = 'Mật khẩu quá yếu.';
            }
            toast({ variant: 'destructive', title: 'Lỗi', description });
        } finally {
            setIsPasswordSubmitting(false);
        }
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    const isLoading = isUserLoading || isUserDataLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Cài đặt Tài khoản</h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý thông tin hồ sơ, bảo mật và các cài đặt khác.
                    </p>
                </div>
                 {isEditing ? (
                    <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu thay đổi
                    </Button>
                ) : (
                     <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-primary"/>
                                Hồ sơ Cá nhân
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={user?.photoURL ?? `https://picsum.photos/seed/${user?.uid}/80/80`} />
                                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                                </Avatar>
                                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" disabled={!isEditing}><Camera className="mr-2 h-4 w-4"/> Đổi ảnh</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Cập nhật ảnh đại diện</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="avatar-file">Chọn ảnh mới</Label>
                                                <Input id="avatar-file" type="file" accept="image/*" onChange={handleAvatarFileChange} />
                                            </div>
                                            {avatarPreview && (
                                                <div className="flex justify-center">
                                                    <Image src={avatarPreview} alt="Xem trước" width={200} height={200} className="rounded-full aspect-square object-cover" />
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleUpdateAvatar} disabled={!avatarFile || isAvatarSubmitting}>
                                                {isAvatarSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                                Lưu ảnh mới
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Họ và Tên</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} disabled={!isEditing || isSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" value={user?.email || ''} disabled />
                                    <p className="text-xs text-muted-foreground">Email không thể thay đổi.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary"/>
                                Thông tin Thể chất
                            </CardTitle>
                            <CardDescription>Cập nhật các số đo cơ bản của bạn.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="height">Chiều cao (cm)</Label>
                                <Input id="height" type="number" value={height} onChange={e => setHeight(e.target.value)} disabled={!isEditing || isSubmitting} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight">Cân nặng (kg)</Label>
                                <Input id="weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} disabled={!isEditing || isSubmitting} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="targetWeight">Cân nặng Mục tiêu (kg)</Label>
                                <Input id="targetWeight" type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} disabled={!isEditing || isSubmitting} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-primary"/>
                                Đổi Mật khẩu
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isPasswordSubmitting} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
                                <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} disabled={isPasswordSubmitting} />
                            </div>
                        </CardContent>
                         <CardFooter>
                            <Button onClick={handleChangePassword} disabled={isPasswordSubmitting || !newPassword || !confirmNewPassword}>
                                {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Cập nhật mật khẩu
                            </Button>
                        </CardFooter>
                    </Card>
                     <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-primary"/>
                                Thông báo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <p className="text-sm text-muted-foreground">Chức năng cài đặt thông báo đang được xây dựng.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}

    
