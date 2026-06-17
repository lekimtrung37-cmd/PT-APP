

'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// This page is now obsolete, as the logic is handled by the new welcome page
// This component serves as a fallback.
export default function ObsoleteOnboardingPage() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Onboarding</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Trang này không còn được sử dụng. Quy trình onboarding mới sẽ bắt đầu tại trang chào mừng.</p>
                <Button asChild className="mt-4">
                    <Link href="/trainer/welcome">Bắt đầu</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
