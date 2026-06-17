
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function TrainerAssessmentsPage() {
    return (
        <Card className="min-h-[400px]">
            <CardHeader>
                <CardTitle>Quản lý Mẫu đánh giá</CardTitle>
                 <CardDescription>Tạo các bài kiểm tra, đánh giá thể chất hoặc kỹ năng cho riêng bạn.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    <ClipboardList className="w-12 h-12" />
                    <p className="mt-4 font-semibold">Chức năng đang được xây dựng</p>
                </div>
            </CardContent>
        </Card>
    );
}
