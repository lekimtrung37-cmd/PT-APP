
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Send, CheckCircle, Smartphone, Mail, User, Clock, HelpCircle, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { notifyNewLead } from '@/ai/flows/notify-new-lead';

const bookingSchema = z.object({
  name: z.string().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự.' }),
  email: z.string().email({ message: 'Địa chỉ email không hợp lệ.' }),
  phone: z.string().min(10, { message: 'Số điện thoại không hợp lệ.' }),
  socialLink: z.string().optional().or(z.literal('')),
  service: z.enum(['1-on-1', 'general'], {
    required_error: 'Vui lòng chọn dịch vụ bạn quan tâm.',
  }),
  preferredTime: z.enum(['sang', 'chieu', 'toi'], {
      required_error: 'Vui lòng chọn khung giờ mong muốn.',
  }),
  source: z.enum(['facebook', 'youtube', 'friend', 'google', 'other'], {
      required_error: 'Vui lòng cho biết bạn biết đến chúng tôi từ đâu.',
  }),
  fitnessGoal: z.string({ required_error: "Vui lòng chọn mục tiêu của bạn." }),
  challenge: z.string({ required_error: "Vui lòng chọn rào cản của bạn." }),
  whyCoach: z.string().min(10, { message: "Vui lòng chia sẻ thêm một chút." }),
  investmentLevel: z.string({ required_error: "Vui lòng chọn mức đầu tư." }),
  startTimeframe: z.string({ required_error: "Vui lòng chọn thời gian bắt đầu." }),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function BookingClient() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      socialLink: '',
      whyCoach: '',
    },
  });

  const onSubmit = async (data: BookingFormValues) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const leadsCollection = collection(firestore, 'leads');
      await addDoc(leadsCollection, {
        ...data,
        submittedAt: serverTimestamp(),
      });
      
      // Call the backend flow to send notification, but don't wait for it
      notifyNewLead(data).catch(console.error);

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting booking form: ', error);
      toast({
        variant: 'destructive',
        title: 'Đã có lỗi xảy ra',
        description: 'Không thể gửi thông tin của bạn. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center py-24 px-6">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="mt-4 text-2xl">Đăng ký thành công!</CardTitle>
            <CardDescription>
              Cảm ơn bạn đã quan tâm. Đội ngũ KIM TRUNG sẽ liên hệ với bạn trong thời gian sớm nhất để tư vấn chi tiết.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'}>Quay về trang chủ</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-background">
      <div className="container relative z-10 mx-auto flex flex-col items-center justify-center min-h-screen px-6 py-16 md:py-24">
        {/* Centered content */}
        <div className="flex w-full flex-col items-center text-center">
          <h1 className="text-4xl font-bold font-headline tracking-tighter sm:text-5xl">
            Đặt Lịch Tư Vấn
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
            Huấn luyện cá nhân 1 kèm 1 là một khoản đầu tư vào CHÍNH BẠN. Nếu bạn đang tìm kiếm giải pháp rẻ nhất thay vì giải pháp hiệu quả nhất, thì đây không phải là lựa chọn phù hợp. Nhưng nếu bạn mệt mỏi vì cảm thấy bế tắc và thiếu tự tin, hoặc không muốn lãng phí thêm thời gian mà không đạt được kết quả mong muốn, thì hãy đăng ký bên dưới và chúng ta cùng trò chuyện nhé :)
          </p>
          <Card className="mt-8 w-full max-w-2xl">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                   <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="flex items-center justify-start gap-2 font-semibold"><User className="w-4 h-4" />Họ và Tên</FormLabel>
                        <FormControl>
                          <Input placeholder="Tên của bạn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="flex items-center justify-start gap-2 font-semibold"><Mail className="w-4 h-4" />Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="flex items-center justify-start gap-2 font-semibold"><Smartphone className="w-4 h-4" />Số điện thoại</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Số điện thoại của bạn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="socialLink"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="flex items-center justify-start gap-2 font-semibold"><LinkIcon className="w-4 h-4" />Kênh liên lạc tiện nhất? (SĐT cho Zalo/WhatsApp, hoặc link Facebook)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập SĐT Zalo hoặc link Facebook..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="service"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="font-semibold">Dịch vụ quan tâm</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn một dịch vụ..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-on-1">PT Online 1-1 cho Lãnh đạo</SelectItem>
                            <SelectItem value="general">Tư vấn chung</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fitnessGoal"
                    render={({ field }) => (
                      <FormItem className="space-y-3 text-left">
                        <FormLabel className="font-semibold">Mục tiêu fitness của bạn trong 90 ngày tới là gì?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="burn-fat" /></FormControl>
                              <FormLabel className="font-normal">Đốt mỡ và giảm cân</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="build-muscle" /></FormControl>
                              <FormLabel className="font-normal">Xây dựng sức mạnh và cơ bắp</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="improve-lifestyle" /></FormControl>
                              <FormLabel className="font-normal">Cải thiện năng lượng, sự tập trung và lối sống</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="all-of-the-above" /></FormControl>
                              <FormLabel className="font-normal">Tất cả những điều trên</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="challenge"
                    render={({ field }) => (
                      <FormItem className="space-y-3 text-left">
                        <FormLabel className="font-semibold">Điều gì đang cản trở bạn đạt được mục tiêu?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="no-strategy" /></FormControl>
                              <FormLabel className="font-normal">Thiếu kiến thức hoặc chiến lược</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="no-coach" /></FormControl>
                              <FormLabel className="font-normal">Chưa tìm được HLV phù hợp</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="no-discipline" /></FormControl>
                              <FormLabel className="font-normal">Khó khăn trong việc duy trì sự nhất quán hoặc kỷ luật</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="all-of-the-above" /></FormControl>
                              <FormLabel className="font-normal">Tất cả những điều trên</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whyCoach"
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="font-semibold">Tại sao bạn tin rằng tôi là HLV phù hợp để giúp bạn chuyển đổi?</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Chia sẻ thêm về kỳ vọng của bạn..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="investmentLevel"
                    render={({ field }) => (
                      <FormItem className="space-y-3 text-left">
                        <FormLabel className="font-semibold">Nếu chúng ta phù hợp, bạn sẵn sàng đầu tư ở mức nào cho sự chuyển đổi của mình?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="2500+" /></FormControl>
                              <FormLabel className="font-normal">$2,500+ — Tôi hoàn toàn sẵn sàng đầu tư vào bản thân</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="1200-2500" /></FormControl>
                              <FormLabel className="font-normal">$1,200 – $2,500 — Tôi nghiêm túc và đang tìm kiếm hệ thống phù hợp</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="500-1200" /></FormControl>
                              <FormLabel className="font-normal">$500 – $1,200 — Tôi quan tâm nhưng ngân sách có hạn</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="200-500" /></FormControl>
                              <FormLabel className="font-normal">$200 – $500 — Tôi chỉ mới bắt đầu tìm hiểu</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="exploring" /></FormControl>
                              <FormLabel className="font-normal">Chỉ đang tìm hiểu — chưa sẵn sàng, nhưng tò mò</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="startTimeframe"
                    render={({ field }) => (
                      <FormItem className="space-y-3 text-left">
                        <FormLabel className="font-semibold">Nếu cả hai chúng ta đều cảm thấy phù hợp — bạn muốn bắt đầu khi nào?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="asap" /></FormControl>
                              <FormLabel className="font-normal">Càng sớm càng tốt — Tôi sẵn sàng cam kết ngay bây giờ</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="2-weeks" /></FormControl>
                              <FormLabel className="font-normal">Trong vòng 2 tuần tới</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="1-2-months" /></FormControl>
                              <FormLabel className="font-normal">Trong 1-2 tháng tới</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="exploring-now" /></FormControl>
                              <FormLabel className="font-normal">Tôi chỉ đang tìm hiểu</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Gửi thông tin</>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    