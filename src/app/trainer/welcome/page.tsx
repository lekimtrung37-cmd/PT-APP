

'use client';
import * as React from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PartyPopper, UserPlus, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Function to create a sample client for the trainer
const createSampleClient = async (firestore: any, trainerId: string, trainerName: string) => {
    // Generate a somewhat unique ID for the sample client for this trainer
    const sampleClientId = `sample_${trainerId.substring(0, 8)}`;
    const clientDocRef = doc(firestore, 'users', sampleClientId);

    const clientDoc = await getDoc(clientDocRef);
    if (clientDoc.exists()) {
        console.log("Sample client already exists for this trainer.");
        return sampleClientId; // Return existing client ID
    }

    const batch = writeBatch(firestore);

    const sauRiengOnboardingData = {
        biometric: {
            height: '175',
            weight: '85',
            age: '42',
            gender: 'male',
            targetWeight: '75',
            bodyFat: '28'
        },
        training_preferences: {
            goal: 'lose_weight',
            experience: 'intermediate',
        },
        health_notes: {
            medicalHistory: 'Đau lưng dưới do ngồi nhiều, thỉnh thoảng bị mất ngủ do stress.',
            foodAllergies: 'Không',
            dailySchedule: 'CEO công ty công nghệ, thường làm việc từ 9h sáng đến 8h tối. Có các cuộc họp đột xuất.',
        },
        lifestyle_health: {
            activityLevel: 'sedentary',
            sleep: '5-6',
        },
        logistics: {
            frequency: '4',
        }
    };

    // 1. Create the sample client user document
    batch.set(clientDocRef, {
        id: sampleClientId,
        name: 'Sầu Riêng',
        email: `saurieng.sample.${trainerId.substring(0, 5)}@kimtrung.com`,
        role: 'user',
        status: 'Active',
        assignedPtId: trainerId,
        isSample: true,
        onboardingData: sauRiengOnboardingData,
        sessions: {
            remaining: 99,
            total: 99
        }
    });

    // 2. Set the trainer's onboarding data (since they are completing this step)
    const trainerDocRef = doc(firestore, 'users', trainerId);
    batch.update(trainerDocRef, {
        onboardingData: {
            completedAt: serverTimestamp(),
            hasSampleClient: true
        }
    });

    await batch.commit();
    return sampleClientId;
};


export default function WelcomePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user: trainer, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = React.useState(true);
    const [sampleClientId, setSampleClientId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (isUserLoading) return; // Wait for user data

        if (!trainer || !firestore) {
            // Redirect if not logged in or Firebase isn't ready
            redirect('/login');
            return;
        }

        setIsLoading(true);
        createSampleClient(firestore, trainer.uid, trainer.displayName || 'PT')
            .then(clientId => {
                setSampleClientId(clientId);
                toast({
                    title: 'Đã tạo khách hàng mẫu!',
                    description: 'Bạn có một khách hàng tên "Sầu Riêng" để bắt đầu thực hành.',
                });
            })
            .catch(error => {
                console.error("Failed to create sample client:", error);
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: 'Không thể tạo khách hàng mẫu. Vui lòng thử lại.'
                });
            })
            .finally(() => {
                setIsLoading(false);
            });

    }, [trainer, firestore, isUserLoading, router, toast]);

    const handleStart = () => {
        if (sampleClientId) {
            router.replace(`/trainer/clients/${sampleClientId}`);
        } else {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Chưa có khách hàng mẫu để bắt đầu. Vui lòng tải lại trang.'
            });
        }
    };
    
    if (isUserLoading || isLoading) {
        return (
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <Skeleton className="h-10 w-10 rounded-full mx-auto" />
                    <Skeleton className="h-8 w-3/4 mx-auto mt-4" />
                    <Skeleton className="h-4 w-full mx-auto mt-2" />
                    <Skeleton className="h-4 w-2/3 mx-auto mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg text-center animate-fade-in-up">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <PartyPopper className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-headline">Chào mừng đến với KIM TRUNG!</CardTitle>
                <CardDescription>
                    Hệ thống đã sẵn sàng để giúp bạn thay đổi cuộc chơi trong ngành huấn luyện.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="bg-muted p-4 rounded-lg text-left">
                    <div className="flex items-center gap-3 mb-2">
                        <UserPlus className="w-5 h-5 text-muted-foreground" />
                        <h4 className="font-semibold">Khách hàng thực hành đầu tiên</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Chúng tôi đã tạo một khách hàng mẫu tên là **Sầu Riêng** trong danh sách của bạn. Hãy sử dụng hồ sơ này để khám phá và làm quen với tất cả các tính năng mạnh mẽ của hệ thống.
                    </p>
                 </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" size="lg" onClick={handleStart} disabled={!sampleClientId}>
                    Bắt đầu huấn luyện <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </CardFooter>
        </Card>
    );
}

