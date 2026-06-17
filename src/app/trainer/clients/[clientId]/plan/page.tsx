
import { redirect } from 'next/navigation';

export default function ObsoletePlanPage({ params }: { params: { clientId: string } }) {
    redirect(`/trainer/clients/${params.clientId}?tab=plan`);
}

    