

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Dumbbell, TrendingDown, HeartPulse, ShieldCheck, Briefcase, Bed, Repeat, Notebook } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type BiometricData = {
  height: string;
  weight: string;
  age: string;
  gender: 'male' | 'female';
  targetWeight: string;
};

type TrainingPreferences = {
  goal: 'lose_weight' | 'build_muscle' | 'improve_endurance' | 'improve_health';
  experience: 'beginner' | 'intermediate' | 'advanced';
};

type HealthNotes = {
    medicalHistory?: string;
    foodAllergies?: string;
    dailySchedule?: string;
}

type LifestyleHealth = {
    activityLevel: 'sedentary' | 'moderately_active' | 'highly_active';
    sleep: 'less_than_5' | '5-6' | '7-8' | 'more_than_8';
}

type Logistics = {
    frequency: '3' | '4' | '5' | '6+';
}

type OnboardingData = {
  biometric: BiometricData;
  training_preferences: TrainingPreferences;
  health_notes: HealthNotes;
  lifestyle_health: LifestyleHealth;
  logistics: Logistics;
};

type ClientData = {
  id: string;
  onboardingData?: OnboardingData;
  ptNote?: string;
};

const goalMap = {
    lose_weight: { icon: TrendingDown, text: "Giảm cân" },
    build_muscle: { icon: Dumbbell, text: "Tăng cơ" },
    improve_endurance: { icon: HeartPulse, text: "Tăng sức bền" },
    improve_health: { icon: ShieldCheck, text: "Cải thiện sức khỏe" },
};

const experienceMap = {
    beginner: "Người mới bắt đầu (< 1 năm)",
    intermediate: "Trung cấp (1-3 năm)",
    advanced: "Nâng cao (> 3 năm)",
};

const activityMap = {
    sedentary: { icon: Briefcase, text: "Ít vận động" },
    moderately_active: { icon: Dumbbell, text: "Vận động vừa" },
    highly_active: { icon: HeartPulse, text: "Vận động cao" },
};

const sleepMap = {
    less_than_5: "< 5 tiếng",
    '5-6': "5-6 tiếng",
    '7-8': "7-8 tiếng",
    more_than_8: "> 8 tiếng",
};

interface ProfileTabProps {
    client: ClientData;
}

export default function ProfileTab({ client }: ProfileTabProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [ptNote, setPtNote] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const clientDocRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'users', client.id) : null
    , [firestore, client.id]);

    React.useEffect(() => {
        if(client.ptNote) setPtNote(client.ptNote);
    }, [client.ptNote]);

    const handleSaveNote = async () => {
        if (!firestore || !client || !clientDocRef) return;
        setIsSubmitting(true);
        try {
            await updateDoc(clientDocRef, { ptNote: ptNote });
            toast({ title: "Thành công!", description: "Ghi chú của bạn đã được lưu." });
        } catch (error) {
             const permissionError = new FirestorePermissionError({ path: clientDocRef!.path, operation: 'update', requestResourceData: { ptNote } });
             errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const onboardingData = client.onboardingData;

    if (!onboardingData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin Onboarding</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Khách hàng chưa hoàn thành quá trình onboarding.</p>
                </CardContent>
            </Card>
        )
    }

    const GoalIcon = onboardingData.training_preferences?.goal ? goalMap[onboardingData.training_preferences.goal].icon : null;
    const ActivityIcon = onboardingData.lifestyle_health?.activityLevel ? activityMap[onboardingData.lifestyle_health.activityLevel].icon : null;
    const goalText = onboardingData.training_preferences?.goal ? goalMap[onboardingData.training_preferences.goal].text : 'N/A';
    const experienceText = onboardingData.training_preferences?.experience ? experienceMap[onboardingData.training_preferences.experience] : 'N/A';
    const activityText = onboardingData.lifestyle_health?.activityLevel ? activityMap[onboardingData.lifestyle_health.activityLevel].text : 'N/A';
    const sleepText = onboardingData.lifestyle_health?.sleep ? sleepMap[onboardingData.lifestyle_health.sleep] : 'N/A';
    const frequencyText = onboardingData.logistics?.frequency ? `${onboardingData.logistics.frequency} buổi` : 'N/A';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Thông tin Onboarding</CardTitle>
                <CardDescription>Dữ liệu khách hàng đã cung cấp ban đầu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div>
                    <h4 className="font-semibold text-lg mb-3">1. Thông tin Cơ bản</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground">Chiều cao</p>
                            <p className="font-bold text-lg">{onboardingData.biometric?.height || 'N/A'} cm</p>
                        </div>
                        <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground">Cân nặng</p>
                            <p className="font-bold text-lg">{onboardingData.biometric?.weight || 'N/A'} kg</p>
                        </div>
                        <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground">Mục tiêu</p>
                            <p className="font-bold text-lg">{onboardingData.biometric?.targetWeight || 'N/A'} kg</p>
                        </div>
                        <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground">Tuổi</p>
                            <p className="font-bold text-lg">{onboardingData.biometric?.age || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground">Giới tính</p>
                            <p className="font-bold text-lg capitalize">{onboardingData.biometric?.gender === 'male' ? 'Nam' : 'Nữ'}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-3">2. Mục tiêu & Kinh nghiệm</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                            {GoalIcon && <GoalIcon className="w-8 h-8 text-primary" />}
                            <div>
                                <p className="text-muted-foreground">Mục tiêu chính</p>
                                <p className="font-bold text-base">{goalText}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                             <div>
                                <p className="text-muted-foreground">Kinh nghiệm</p>
                                <p className="font-bold text-base">{experienceText}</p>
                            </div>
                        </div>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-3">3. Ghi chú Sức khỏe</h4>
                    <div className="space-y-4 text-sm">
                        <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground font-medium">Tiền sử y tế</p>
                            <p>{onboardingData.health_notes?.medicalHistory || 'Không có'}</p>
                        </div>
                         <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground font-medium">Dị ứng thực phẩm</p>
                            <p>{onboardingData.health_notes?.foodAllergies || 'Không có'}</p>
                        </div>
                         <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-muted-foreground font-medium">Lịch trình sinh hoạt</p>
                            <p>{onboardingData.health_notes?.dailySchedule || 'Không có'}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-3">4. Lối sống & Lịch tập</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                         <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                             {ActivityIcon && <ActivityIcon className="w-8 h-8 text-primary" />}
                            <div>
                                <p className="text-muted-foreground">Mức độ hoạt động</p>
                                <p className="font-bold text-base">{activityText}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                             <Bed className="w-8 h-8 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Giấc ngủ trung bình</p>
                                <p className="font-bold text-base">{sleepText}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                             <Repeat className="w-8 h-8 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Số buổi/tuần</p>
                                <p className="font-bold text-base">{frequencyText}</p>
                            </div>
                        </div>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Notebook className="w-5 h-5" />
                        Ghi chú của PT
                    </h4>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Ghi lại những quan sát, lưu ý quan trọng hoặc các điều chỉnh cần thiết cho kế hoạch của khách hàng tại đây..."
                            rows={5}
                            value={ptNote}
                            onChange={(e) => setPtNote(e.target.value)}
                            disabled={isSubmitting}
                        />
                        <Button onClick={handleSaveNote} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang lưu...' : 'Lưu ghi chú'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
