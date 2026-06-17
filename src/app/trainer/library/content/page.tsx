
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { FileVideo } from "lucide-react";

export default function TrainerContentPage() {
    return (
        <Card className="min-h-[400px]">
            <CardHeader>
                <CardTitle>Quản lý Nội dung Coaching</CardTitle>
                <CardDescription>Tải lên và quản lý các video, tài liệu của riêng bạn.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    <FileVideo className="w-12 h-12" />
                    <p className="mt-4 font-semibold">Chức năng đang được xây dựng</p>
                </div>
            </CardContent>
        </Card>
    );
}
