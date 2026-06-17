'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import Logo from '@/components/logo';
import { Loader2 } from 'lucide-react';

export default function DispatchPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userDocRef = useMemoFirebase(() => 
        firestore && user ? doc(firestore, 'users', user.uid) : null
    , [firestore, user]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    useEffect(() => {
        // If auth is still loading, wait.
        if (isUserLoading) {
            return;
        }

        // If user is not logged in after check, send back to login.
        if (!user) {
            router.replace('/login');
            return;
        }
        
        // If we have the user data, perform the redirect.
        if (userData) {
            let destination = '/client/dashboard'; // Default
            switch (userData.role) {
                case 'admin':
                    destination = '/admin/dashboard';
                    break;
                case 'pt':
                    if (!userData.onboardingData) {
                        destination = '/trainer/welcome';
                    } else {
                        destination = '/trainer/clients';
                    }
                    break;
                case 'user':
                     if (userData.status === 'Pending Activation') {
                        destination = '/login/user/pending-activation';
                     } else if (!userData.onboardingData) {
                        destination = '/client/onboarding';
                    } else {
                        destination = '/client/dashboard';
                    }
                    break;
            }
            router.replace(destination);
        } else if (!isUserDataLoading && !userData) {
            // This is a problematic state: user is authenticated but has no firestore doc.
            // This can happen if the doc creation failed during signup.
            // Send them back to login so they don't get stuck.
            console.error("User exists in Auth, but not in Firestore. Redirecting to login.");
            router.replace('/login');
        }
    }, [user, userData, isUserLoading, isUserDataLoading, router]);

    return (
        <div className="flex flex-col min-h-screen bg-background items-center justify-center gap-4">
            <Logo />
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Đang đăng nhập và chuyển hướng...</p>
            </div>
        </div>
    );
}
