
'use client';
import * as React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, CheckCircle, Dumbbell, Brain, Moon, Smile, Meh, Frown, User, Clock, Zap, Check, Utensils, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { getLocalDateString } from '@/lib/utils';
import { doc, setDoc, serverTimestamp, collection, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isSameDay } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';


type Workout = {
  id: string;
  title: string;
  exercises: { name: string; sets: string; reps: string }[];
}

type HabitTask = {
    id: string;
    title: string;
    isCompleted: boolean;
    date: string;
};

type UserProfile = {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    assignedPtId?: string;
}

type TrainerProfile = {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
}

export default function ClientDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [mood, setMood] = React.useState<string | undefined>();
  const [sleep, setSleep] = React.useState<string | undefined>();
  const [isSubmittingCheckin, setIsSubmittingCheckin] = React.useState(false);

  const todayString = getLocalDateString();
  
  // --- Data Fetching ---
  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const assignedPtId = userProfile?.assignedPtId;

  const ptProfileRef = useMemoFirebase(() =>
    firestore && assignedPtId ? doc(firestore, 'trainerProfiles', assignedPtId) : null
  , [firestore, assignedPtId]);
  const { data: ptProfile, isLoading: isPtProfileLoading } = useDoc<TrainerProfile>(ptProfileRef);


  const checkinDocRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid, 'checkins', todayString) : null
  , [firestore, user, todayString]);
  const { data: todayCheckin, isLoading: isCheckinLoading } = useDoc(checkinDocRef);
  
  const todayWorkoutDocRef = useMemoFirebase(() =>
    firestore && user ? doc(firestore, 'users', user.uid, 'workouts', todayString) : null
  , [firestore, user, todayString]);
  const { data: todayWorkout, isLoading: isWorkoutLoading } = useDoc<Workout>(todayWorkoutDocRef);

  const todayTasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'users', user.uid, 'habitTasks'),
        where('date', '==', todayString)
    );
  }, [firestore, user, todayString]);
  const { data: todayTasks, isLoading: areTasksLoading } = useCollection<HabitTask>(todayTasksQuery);
  // --- End Data Fetching ---

  const handleCheckinSubmit = async () => {
    if (!mood || !sleep || !checkinDocRef) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng chọn tâm trạng và giấc ngủ.'
      });
      return;
    }
    setIsSubmittingCheckin(true);
    try {
      await setDoc(checkinDocRef, {
        date: todayString,
        mood,
        sleep,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Check-in thành công!',
        description: 'Cảm ơn bạn đã cập nhật. PT của bạn sẽ xem xét điều này.'
      })
    } catch (error) {
      console.error("Failed to submit check-in", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể gửi check-in. Vui lòng thử lại.'
      });
    } finally {
      setIsSubmittingCheckin(false);
    }
  }

  const handleTaskToggle = async (task: HabitTask) => {
    if (!firestore || !user) return;
    const taskDocRef = doc(firestore, 'users', user.uid, 'habitTasks', task.id);
    try {
        await updateDoc(taskDocRef, { isCompleted: !task.isCompleted });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật nhiệm vụ.' });
    }
  };
  
  const isLoading = isUserLoading || isCheckinLoading || isWorkoutLoading || isUserProfileLoading || isPtProfileLoading || areTasksLoading;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'PT';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Bảng điều khiển</h1>
            <p className="mt-1 text-muted-foreground">
            Chào mừng trở lại! Đây là tổng quan nhanh về ngày hôm nay của bạn.
            </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary"/>Nhiệm vụ & Thói quen hôm nay</CardTitle>
                    <CardDescription>Hoàn thành các mục tiêu nhỏ PT đã giao cho bạn.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-24 w-full" /> : 
                    todayTasks && todayTasks.length > 0 ? (
                        <div className="space-y-3">
                            {todayTasks.map(task => (
                                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50">
                                    <Checkbox 
                                        id={`task-${task.id}`} 
                                        checked={task.isCompleted}
                                        onCheckedChange={() => handleTaskToggle(task)}
                                    />
                                    <label
                                        htmlFor={`task-${task.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                    >
                                        {task.title}
                                    </label>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground py-8">
                            <p>Bạn không có nhiệm vụ nào hôm nay.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
           <Card>
            <CardHeader>
              <CardTitle>Check-in Hàng ngày</CardTitle>
              <CardDescription>Hãy cho PT biết bạn cảm thấy thế nào hôm nay.</CardDescription>
            </CardHeader>
            {isLoading ? (
              <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            ) : todayCheckin ? (
               <CardContent>
                <Alert variant="default" className="border-green-500 bg-green-500/10 text-green-700">
                  <CheckCircle className="h-4 w-4 !text-green-700" />
                  <AlertTitle className="font-bold">Bạn đã check-in hôm nay!</AlertTitle>
                  <AlertDescription>
                    Tâm trạng: <span className="font-semibold capitalize">{todayCheckin.mood}</span>, Giấc ngủ: <span className="font-semibold">{todayCheckin.sleep} tiếng</span>.
                  </AlertDescription>
                </Alert>
              </CardContent>
            ) : (
            <>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="font-semibold flex items-center gap-2"><Smile className="w-5 h-5 text-primary" />Tâm trạng của bạn?</Label>
                  <RadioGroup value={mood} onValueChange={setMood} className="flex gap-2">
                    <Label htmlFor="mood-great" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                      <RadioGroupItem value="great" id="mood-great" className="sr-only" />
                      <Smile className="w-8 h-8 mx-auto mb-1 text-green-500"/> Tuyệt vời
                    </Label>
                    <Label htmlFor="mood-ok" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                      <RadioGroupItem value="ok" id="mood-ok" className="sr-only" />
                      <Meh className="w-8 h-8 mx-auto mb-1 text-yellow-500"/> Bình thường
                    </Label>
                    <Label htmlFor="mood-sad" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                      <RadioGroupItem value="sad" id="mood-sad" className="sr-only" />
                      <Frown className="w-8 h-8 mx-auto mb-1 text-blue-500"/> Hơi tệ
                    </Label>
                     <Label htmlFor="mood-stressed" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                      <RadioGroupItem value="stressed" id="mood-stressed" className="sr-only" />
                      <Brain className="w-8 h-8 mx-auto mb-1 text-red-500"/> Căng thẳng
                    </Label>
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                   <Label className="font-semibold flex items-center gap-2"><Moon className="w-5 h-5 text-primary" />Giấc ngủ tối qua?</Label>
                   <RadioGroup value={sleep} onValueChange={setSleep} className="flex gap-2">
                      <Label htmlFor="sleep-5" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                        <RadioGroupItem value="< 5" id="sleep-5" className="sr-only"/> &lt; 5 tiếng
                      </Label>
                      <Label htmlFor="sleep-5-6" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                        <RadioGroupItem value="5-6" id="sleep-5-6" className="sr-only"/> 5-6 tiếng
                      </Label>
                      <Label htmlFor="sleep-7-8" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                        <RadioGroupItem value="7-8" id="sleep-7-8" className="sr-only"/> 7-8 tiếng
                      </Label>
                      <Label htmlFor="sleep-8" className="flex-1 text-center cursor-pointer p-3 border rounded-lg hover:bg-accent [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10">
                        <RadioGroupItem value="> 8" id="sleep-8" className="sr-only"/> &gt; 8 tiếng
                      </Label>
                   </RadioGroup>
                </div>
              </CardContent>
              <CardFooter>
                 <Button onClick={handleCheckinSubmit} disabled={isSubmittingCheckin || !mood || !sleep}>
                  {isSubmittingCheckin ? 'Đang gửi...' : 'Gửi Check-in'}
                 </Button>
              </CardFooter>
            </>
            )}
           </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Buổi tập hôm nay
                    </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-24 w-full" /> : 
                   todayWorkout ? (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg">{todayWorkout.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {todayWorkout.exercises.length} bài tập. Bạn đã sẵn sàng chưa?
                        </p>
                      </div>
                   ) : (
                     <p className="text-center text-sm text-muted-foreground py-4">Hôm nay bạn được nghỉ! Hãy tận hưởng và phục hồi nhé.</p>
                   )
                  }
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4">
                  <Button asChild className="w-full" disabled={!todayWorkout}>
                    <Link href="/client/calendar">
                      <Dumbbell className="mr-2 h-4 w-4"/> Vào buổi tập
                    </Link>
                  </Button>
                   <Button asChild variant="outline" className="w-full">
                        <Link href="/client/nutrition">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Thêm bữa ăn
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <User className="w-5 h-5"/>
                        PT của bạn
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex items-center gap-3">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ) : ptProfile ? (
                         <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14">
                                <AvatarImage src={ptProfile.profileImageUrl} />
                                <AvatarFallback>{getInitials(ptProfile.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-lg">{ptProfile.name}</p>
                                <p className="text-sm text-muted-foreground">{ptProfile.email}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Chưa có PT được gán.</p>
                    )}
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
