
'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { useUser, useDoc, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building, Calendar, Check, Globe, Goal, User, Users, Edit, Save, Loader2, Upload, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { updateProfile } from 'firebase/auth';
import Image from 'next/image';
import { uploadFile } from '@/lib/chatService';


const workModelItems = [
    { id: 'gym', label: 'Gym PT', icon: Building },
    { id: 'online', label: 'Online PT', icon: Users },
    { id: 'hybrid', label: 'Hybrid', icon: Briefcase },
    { id: 'freelance', label: 'Freelance', icon: User },
];

const nicheItems = [
    { id: 'weight_loss', label: 'Giảm cân / Giảm mỡ' },
    { id: 'muscle_gain', label: 'Tăng cơ / Thể hình' },
    { id: 'strength_performance', label: 'Sức mạnh & Hiệu suất' },
    { id: 'sports_nutrition', label: 'Dinh dưỡng Thể thao' },
    { id: 'mobility_rehab', label: 'Phục hồi & Tăng linh hoạt' },
    { id: 'seniors', label: 'Luyện tập cho người lớn tuổi' },
    { id: 'women_fitness', label: 'Luyện tập cho phụ nữ (trước & sau sinh)' },
    { id: 'online_coaching', label: 'Coaching online' },
    { id: 'other', label: 'Khác' },
];

const mainGoalMap: { [key: string]: string } = {
    save_time: "Tiết kiệm thời gian soạn giáo án",
    manage_clients: "Quản lý nhiều khách hàng",
    track_progress: "Theo dõi tiến độ khoa học",
    retain_clients: "Giữ khách lâu hơn",
    ai_coaching: "Coaching bằng AI",
    build_brand: "Xây dựng thương hiệu cá nhân",
};

export default function SettingsPage() {
    const { user: trainer, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const [isEditing, setIsEditing] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Form state
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [country, setCountry] = React.useState('');
    const [dateOfBirth, setDateOfBirth] = React.useState('');
    const [experience, setExperience] = React.useState('');
    const [workModel, setWorkModel] = React.useState<string[]>([]);
    const [niches, setNiches] = React.useState<string[]>([]);
    const [mainGoal, setMainGoal] = React.useState('');
    const [goalNext6Months, setGoalNext6Months] = React.useState('');
    
    // Avatar State
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = React.useState(false);
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
    const [isAvatarSubmitting, setIsAvatarSubmitting] = React.useState(false);

    const trainerDocRef = useMemoFirebase(() => {
        if (!firestore || !trainer) return null;
        return doc(firestore, 'users', trainer.uid);
    }, [firestore, trainer]);

    const { data: trainerData, isLoading: isTrainerDataLoading } = useDoc(trainerDocRef);

    React.useEffect(() => {
        if (trainerData) {
            setName(trainerData.name || '');
            setEmail(trainerData.email || '');
            if (trainerData.onboardingData) {
                const ob = trainerData.onboardingData;
                setCountry(ob.basicInfo?.country || '');
                setDateOfBirth(ob.basicInfo?.dateOfBirth ? new Date(ob.basicInfo.dateOfBirth).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '');
                setExperience(ob.professionalIdentity?.experience || '');
                setWorkModel(ob.professionalIdentity?.workModel || []);
                setNiches(ob.professionalIdentity?.niches || []);
                setMainGoal(ob.goals?.mainGoal || '');
                setGoalNext6Months(ob.goals?.goalNext6Months || '');
            }
        }
    }, [trainerData]);

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
        if (!trainer || !storage || !trainerDocRef || !avatarFile || !firestore) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một file ảnh.' });
            return;
        }
        setIsAvatarSubmitting(true);
        try {
            const storagePath = `avatars/${trainer.uid}/${avatarFile.name}`;
            const { downloadURL } = await uploadFile(storage, avatarFile, storagePath);

            const batch = writeBatch(firestore);
            
            // 1. Update Auth profile
            await updateProfile(trainer, { photoURL: downloadURL });
            
            // 2. Update user doc
            batch.update(trainerDocRef, { profileImageUrl: downloadURL });

            // 3. Update trainer profile doc
            const trainerProfileRef = doc(firestore, 'trainerProfiles', trainer.uid);
            batch.update(trainerProfileRef, { profileImageUrl: downloadURL });

            await batch.commit();

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

    const handleSave = async () => {
        if (!trainer || !firestore || !trainerDocRef) return;
        setIsSubmitting(true);
        
        try {
            const [day, month, year] = dateOfBirth.split('/').map(Number);
            const dateOfBirthISO = new Date(year, month - 1, day).toISOString();

            const batch = writeBatch(firestore);

            // 1. Update the /users/{userId} document
            const userDocData = {
                name,
                'onboardingData.basicInfo.country': country,
                'onboardingData.basicInfo.dateOfBirth': dateOfBirthISO,
                'onboardingData.professionalIdentity.experience': experience,
                'onboardingData.professionalIdentity.workModel': workModel,
                'onboardingData.professionalIdentity.niches': niches,
                'onboardingData.goals.mainGoal': mainGoal,
                'onboardingData.goals.goalNext6Months': goalNext6Months,
            };
            batch.update(trainerDocRef, userDocData);

            // 2. Update the /trainerProfiles/{trainerId} document
            const trainerProfileDocRef = doc(firestore, 'trainerProfiles', trainer.uid);
            const trainerProfileData = {
                name: name,
                specialty: niches[0] || 'Chưa xác định', // Use the first niche as the main specialty
            };
            batch.update(trainerProfileDocRef, trainerProfileData);

            await batch.commit();

            toast({ title: 'Thành công!', description: 'Hồ sơ của bạn đã được cập nhật.' });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile: ", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật hồ sơ.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'PT';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    const isLoading = isUserLoading || isTrainerDataLoading;

    if (isLoading) {
        return (
             <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }
    
    if (!trainerData?.onboardingData) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Hồ sơ & Cài đặt</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Không tìm thấy dữ liệu onboarding. Vui lòng hoàn thành quy trình onboarding.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={trainer?.photoURL ?? "https://images.unsplash.com/photo-1616279969722-d81a5a3944ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxmaXRuZXNzJTIwdHJhaW5lcnxlbnwwfHx8fDE3NjM5ODYxNzF8MA&ixlib=rb-4.1.0&q=80&w=1080"} data-ai-hint="fitness trainer" />
                            <AvatarFallback>{getInitials(trainer?.displayName)}</AvatarFallback>
                        </Avatar>
                        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md group-hover:bg-primary group-hover:text-primary-foreground">
                                    <Camera className="w-4 h-4"/>
                                </Button>
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
                    <div className="space-y-1">
                        {isEditing ? (
                            <Input className="text-4xl font-bold font-headline h-auto p-0 border-0" value={name} onChange={e => setName(e.target.value)} />
                        ) : (
                            <h1 className="text-4xl font-bold font-headline">{name}</h1>
                        )}
                         <p className="text-xl text-muted-foreground">{email}</p>
                    </div>
                </div>
                {isEditing ? (
                    <Button onClick={handleSave} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu thay đổi
                    </Button>
                ) : (
                     <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Chỉnh sửa Hồ sơ
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5"/>Thông tin cơ bản</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                     <div className="flex items-center gap-3">
                         <Globe className="w-5 h-5 text-muted-foreground" />
                         <div>
                            <p className="text-muted-foreground">Quốc gia</p>
                            {isEditing ? (
                                <Input value={country} onChange={e => setCountry(e.target.value)} className="h-8" />
                            ) : (
                                <p className="font-semibold">{country}</p>
                            )}
                         </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <Calendar className="w-5 h-5 text-muted-foreground" />
                         <div>
                            <p className="text-muted-foreground">Ngày sinh</p>
                            {isEditing ? (
                                <Input value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} placeholder="DD/MM/YYYY" className="h-8"/>
                            ) : (
                                <p className="font-semibold">{dateOfBirth}</p>
                            )}
                         </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5"/>Hồ sơ chuyên môn</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Số năm kinh nghiệm</h3>
                        {isEditing ? (
                             <RadioGroup value={experience} onValueChange={setExperience} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {['<1', '1-3', '3-5', '5-10', '>10'].map(val => (
                                    <Label key={val} htmlFor={`exp-${val}`} className="flex h-12 items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <RadioGroupItem value={val} id={`exp-${val}`} className="sr-only peer" />
                                        {val} năm
                                    </Label>
                                ))}
                            </RadioGroup>
                        ) : (
                           <Badge variant="secondary" className="text-base">{experience} năm</Badge>
                        )}
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">Mô hình làm việc</h3>
                        {isEditing ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {workModelItems.map((item) => (
                                <Label key={item.id} htmlFor={`work-${item.id}`} className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 p-4 font-normal transition-colors hover:bg-accent hover:text-accent-foreground ${workModel.includes(item.id) ? 'border-primary bg-primary/10' : 'border-muted'}`}>
                                    <Checkbox
                                        id={`work-${item.id}`}
                                        className="sr-only"
                                        checked={workModel.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            setWorkModel(prev => checked ? [...prev, item.id] : prev.filter(v => v !== item.id))
                                        }}
                                    />
                                    <item.icon className="w-8 h-8" />
                                    {item.label}
                                </Label>
                            ))}
                            </div>
                        ) : (
                             <div className="flex flex-wrap gap-2">
                                {workModel.map(modelId => {
                                    const model = workModelItems.find(item => item.id === modelId);
                                    return model ? <Badge key={modelId} variant="outline">{model.label}</Badge> : null;
                                })}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Chuyên môn</h3>
                         {isEditing ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {nicheItems.map((item) => (
                                    <Label key={item.id} htmlFor={`niche-${item.id}`} className="flex flex-row items-center space-x-3 space-y-0 font-normal">
                                    <Checkbox
                                        id={`niche-${item.id}`}
                                        checked={niches.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            setNiches(prev => checked ? [...prev, item.id] : prev.filter(v => v !== item.id))
                                        }}
                                    />
                                   <span>{item.label}</span>
                                   </Label>
                                ))}
                            </div>
                         ) : (
                            <div className="flex flex-wrap gap-2">
                                {niches.map(nicheId => {
                                    const niche = nicheItems.find(item => item.id === nicheId);
                                    return niche ? <Badge key={nicheId}>{niche.label}</Badge> : null;
                                })}
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Goal className="w-5 h-5"/>Mục tiêu & Định hướng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Mục tiêu chính khi dùng app</h3>
                        {isEditing ? (
                             <RadioGroup value={mainGoal} onValueChange={setMainGoal} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(mainGoalMap).map(([key, label]) => (
                                    <Label key={key} htmlFor={`goal-${key}`} className="flex items-center justify-center text-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-24">
                                        <RadioGroupItem value={key} id={`goal-${key}`} className="sr-only peer" />
                                        {label}
                                    </Label>
                                ))}
                            </RadioGroup>
                        ) : (
                            <p className="text-muted-foreground">{mainGoalMap[mainGoal] || 'Chưa xác định'}</p>
                        )}
                    </div>
                     <div className="space-y-2">
                        <h3 className="font-semibold">Mục tiêu 3-6 tháng tới</h3>
                        {isEditing ? (
                            <Textarea value={goalNext6Months} onChange={e => setGoalNext6Months(e.target.value)} placeholder="Ví dụ: 'Tăng số khách online lên 15 người'..." />
                        ) : (
                            <p className="text-muted-foreground italic">{goalNext6Months ? `"${goalNext6Months}"` : "Chưa đặt mục tiêu."}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
