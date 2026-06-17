

'use client';
import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Dumbbell, HeartPulse, ShieldCheck, TrendingDown, Briefcase, Bed, Repeat, FileText, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

const onboardingSchema = z.object({
  biometric: z.object({
    height: z.string()
      .min(1, 'Vui lòng nhập chiều cao')
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 100 && parseFloat(val) <= 250, {
        message: "Chiều cao phải trong khoảng 100 - 250 cm"
      }),
    weight: z.string()
      .min(1, 'Vui lòng nhập cân nặng')
       .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Cân nặng phải là số dương"
      }),
    age: z.string()
      .min(1, 'Vui lòng nhập tuổi')
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Tuổi phải là số dương"
      }),
    gender: z.enum(['male', 'female'], {
      required_error: 'Vui lòng chọn giới tính',
    }),
    targetWeight: z.string()
        .min(1, 'Vui lòng nhập cân nặng mục tiêu')
        .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: "Cân nặng phải là số dương"
        }),
    bodyFat: z.string().optional(),
  }),
  training_preferences: z.object({
    goal: z.enum(['lose_weight', 'build_muscle', 'improve_endurance', 'improve_health'], {
      required_error: 'Vui lòng chọn mục tiêu chính'
    }),
    experience: z.enum(['beginner', 'intermediate', 'advanced'], {
      required_error: 'Vui lòng chọn kinh nghiệm tập luyện'
    }),
  }),
  health_notes: z.object({
      medicalHistory: z.string().optional(),
      foodAllergies: z.string().optional(),
      dailySchedule: z.string().optional(),
  }),
  lifestyle_health: z.object({
    activityLevel: z.enum(['sedentary', 'moderately_active', 'highly_active'], {
        required_error: 'Vui lòng chọn mức độ hoạt động'
    }),
    sleep: z.enum(['less_than_5', '5-6', '7-8', 'more_than_8'], {
        required_error: 'Vui lòng chọn thời lượng giấc ngủ'
    }),
  }),
  logistics: z.object({
      frequency: z.enum(['3', '4', '5', '6+'], {
          required_error: 'Vui lòng chọn số buổi tập'
      }),
  })
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const steps = [
  { id: 'step-01', title: 'Thông tin Cơ bản', fields: ['biometric'] },
  { id: 'step-02', title: 'Mục tiêu & Kinh nghiệm', fields: ['training_preferences'] },
  { id: 'step-03', title: 'Sức khỏe & Ghi chú', fields: ['health_notes'] },
  { id: 'step-04', title: 'Lối sống & Lịch tập', fields: ['lifestyle_health', 'logistics'] },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      biometric: {
        height: '',
        weight: '',
        age: '',
        gender: undefined,
        targetWeight: '',
        bodyFat: '',
      },
      training_preferences: {
        goal: undefined,
        experience: 'beginner',
      },
      health_notes: {
        medicalHistory: '',
        foodAllergies: '',
        dailySchedule: '',
      },
      lifestyle_health: {
        activityLevel: undefined,
        sleep: undefined,
      },
      logistics: {
          frequency: undefined,
      }
    },
  });

  const processForm = (values: OnboardingFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không tìm thấy người dùng hoặc dịch vụ cơ sở dữ liệu.",
      });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const dataToSave = {
      onboardingData: values,
      status: 'Active', // Update status to Active after onboarding
    };

    updateDocumentNonBlocking(userDocRef, dataToSave);
    
    toast({
        title: 'Hoàn tất Onboarding!',
        description: 'Cảm ơn bạn đã cung cấp thông tin. Chúng tôi đang tạo kế hoạch cho bạn...',
    });
    router.push('/client/dashboard');
  };

  const nextStep = async () => {
    const fields = steps[currentStep].fields as (keyof OnboardingFormValues)[];
    const output = await form.trigger(fields, { shouldFocus: true });

    if (!output) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1);
    } else {
      await form.handleSubmit(processForm)();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full max-w-4xl">
        <Progress value={progress} className="mb-4" />
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
            <Card>
                <CardHeader>
                <CardTitle>{steps[currentStep].title}</CardTitle>
                <CardDescription>
                    Bước {currentStep + 1} trên {steps.length}. Hãy cho chúng tôi biết thêm về bạn để có thể xây dựng một kế hoạch được cá nhân hóa tốt nhất.
                </CardDescription>
                </CardHeader>
                <CardContent>
                
                 {currentStep === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <FormField name="biometric.height" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chiều cao (cm)</FormLabel>
                                    <FormControl><Input placeholder="Ví dụ: 175" {...field} type="number" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="biometric.weight" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cân nặng hiện tại (kg)</FormLabel>
                                    <FormControl><Input placeholder="Ví dụ: 70" {...field} type="number" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField name="biometric.targetWeight" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cân nặng mục tiêu (kg)</FormLabel>
                                    <FormControl><Input placeholder="Ví dụ: 65" {...field} type="number" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="biometric.age" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tuổi</FormLabel>
                                    <FormControl><Input placeholder="Ví dụ: 25" {...field} type="number" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                           
                        </div>
                        <div className="space-y-6">
                             <FormField name="biometric.gender" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Giới tính</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                            <FormItem>
                                                <FormControl><RadioGroupItem value="male" id="male" className="peer sr-only" /></FormControl>
                                                <Label htmlFor="male" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Nam</Label>
                                            </FormItem>
                                            <FormItem>
                                                <FormControl><RadioGroupItem value="female" id="female" className="peer sr-only" /></FormControl>
                                                <Label htmlFor="female" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Nữ</Label>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField name="biometric.bodyFat" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>% Body Fat (Tùy chọn)</FormLabel>
                                    <FormControl><Input placeholder="Ví dụ: 15" {...field} type="number" /></FormControl>
                                    <FormDescription>Nếu bạn biết, hãy nhập để có kết quả chính xác hơn.</FormDescription>
                                </FormItem>
                            )} />
                        </div>
                    </div>
                )}


                 {currentStep === 1 && (
                    <div className="space-y-8">
                        <FormField name="training_preferences.goal" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Mục tiêu chính của bạn là gì?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="lose_weight" id="lose_weight" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="lose_weight" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <TrendingDown className="w-8 h-8 mb-2" />
                                                Giảm cân
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="build_muscle" id="build_muscle" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="build_muscle" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <Dumbbell className="w-8 h-8 mb-2" />
                                                Tăng cơ
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="improve_endurance" id="improve_endurance" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="improve_endurance" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <HeartPulse className="w-8 h-8 mb-2" />
                                                Tăng sức bền
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="improve_health" id="improve_health" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="improve_health" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <ShieldCheck className="w-8 h-8 mb-2" />
                                                Cải thiện sức khỏe
                                            </Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="training_preferences.experience" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Kinh nghiệm tập luyện của bạn?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="beginner" id="beginner" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="beginner" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Người mới bắt đầu (chưa tập hoặc &lt; 1 năm)</Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="intermediate" id="intermediate" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="intermediate" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Trung cấp (1-3 năm)</Label>
                                        </FormItem>
                                         <FormItem>
                                            <FormControl><RadioGroupItem value="advanced" id="advanced" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="advanced" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Nâng cao (&gt; 3 năm)</Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                 {currentStep === 2 && (
                    <div className="space-y-6">
                        <FormField name="health_notes.medicalHistory" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Tiền sử y tế (Tùy chọn)
                                </FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Bạn có chấn thương cũ, bệnh mãn tính (tim mạch, tiểu đường), hay vấn đề sức khỏe nào khác mà PT cần biết không?" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField name="health_notes.foodAllergies" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Utensils className="w-5 h-5" />
                                    Dị ứng thực phẩm (Tùy chọn)
                                </FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Bạn có dị ứng hoặc không ăn được loại thực phẩm nào không?" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="health_notes.dailySchedule" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Bed className="w-5 h-5" />
                                    Lịch trình sinh hoạt (Tùy chọn)
                                </FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Mô tả ngắn về công việc và thời gian biểu hàng ngày của bạn (ví dụ: nhân viên văn phòng, thường thức dậy lúc 6h, ngủ lúc 11h)." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                {currentStep === 3 && (
                   <div className="space-y-8">
                       <FormField name="lifestyle_health.activityLevel" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Tính chất công việc của bạn?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="sedentary" id="sedentary" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="sedentary" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <Briefcase className="w-8 h-8 mb-2" />
                                                Ít vận động
                                                <span className="text-xs text-muted-foreground text-center">(Ngồi văn phòng, ít đi lại)</span>
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="moderately_active" id="moderately_active" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="moderately_active" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <Dumbbell className="w-8 h-8 mb-2" />
                                                Vận động vừa
                                                <span className="text-xs text-muted-foreground text-center">(Đi lại, đứng nhiều)</span>
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="highly_active" id="highly_active" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="highly_active" className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-28">
                                                <HeartPulse className="w-8 h-8 mb-2" />
                                                Vận động cao
                                                <span className="text-xs text-muted-foreground text-center">(Lao động, di chuyển liên tục)</span>
                                            </Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="lifestyle_health.sleep" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Thời lượng giấc ngủ trung bình?</FormLabel>
                                <FormControl>
                                     <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="less_than_5" id="less_than_5" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="less_than_5" className="flex h-12 items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">&lt; 5 tiếng</Label>
                                        </FormItem>
                                         <FormItem>
                                            <FormControl><RadioGroupItem value="5-6" id="5-6" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="5-6" className="flex h-12 items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">5-6 tiếng</Label>
                                        </FormItem>
                                         <FormItem>
                                            <FormControl><RadioGroupItem value="7-8" id="7-8" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="7-8" className="flex h-12 items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">7-8 tiếng</Label>
                                        </FormItem>
                                         <FormItem>
                                            <FormControl><RadioGroupItem value="more_than_8" id="more_than_8" className="peer sr-only" /></FormControl>
                                            <Label htmlFor="more_than_8" className="flex h-12 items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">&gt; 8 tiếng</Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                 {form.watch('lifestyle_health.sleep') === 'less_than_5' && (
                                    <FormDescription className="text-orange-600">Chúng ta sẽ cần ưu tiên phục hồi hơn tập nặng đấy!</FormDescription>
                                 )}
                            </FormItem>
                        )} />
                        <FormField name="logistics.frequency" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Số buổi tập cam kết/tuần?</FormLabel>
                                <FormControl>
                                     <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['3', '4', '5', '6+'].map(num => (
                                             <FormItem key={num}>
                                                <FormControl><RadioGroupItem value={num} id={`freq-${num}`} className="peer sr-only" /></FormControl>
                                                <Label htmlFor={`freq-${num}`} className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted bg-popover p-4 text-xl font-bold hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground [&:has([data-state=checked])]:border-primary">{num}</Label>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                   </div>
                )}
                </CardContent>
                <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={handlePrevStep} disabled={currentStep === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
                <Button type="button" onClick={nextStep}>
                    {currentStep === steps.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                </CardFooter>
            </Card>
            </form>
        </Form>
    </div>
  );
}
