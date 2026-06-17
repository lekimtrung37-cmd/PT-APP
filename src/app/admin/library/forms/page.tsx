
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function AdminFormsPage() {
    return (
        <Card className="min-h-[400px]">
            <CardHeader>
                <CardTitle>Quản lý Biểu mẫu & Câu hỏi</CardTitle>
                <CardDescription>Xây dựng các biểu mẫu onboarding, check-in hoặc khảo sát.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12" />
                    <p className="mt-4 font-semibold">Chức năng đang được xây dựng</p>
                </div>
            </CardContent>
        </Card>
    );
}
