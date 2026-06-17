
import { redirect } from 'next/navigation';

export default function ObsoleteNutritionPage({ params }: { params: { clientId: string } }) {
    redirect(`/trainer/clients/${params.clientId}?tab=nutrition`);
}

    