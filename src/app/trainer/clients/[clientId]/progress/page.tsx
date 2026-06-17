
import { redirect } from 'next/navigation';

export default function ProgressPage({ params }: { params: { clientId: string } }) {
    redirect(`/trainer/clients/${params.clientId}?tab=progress`);
}

    