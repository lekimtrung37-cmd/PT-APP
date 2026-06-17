
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export default function ObsoleteTrainerFoodJournalPage({ params }: { params: { clientId: string } }) {
    redirect(`/trainer/clients/${params.clientId}?tab=nutrition`);
}

    