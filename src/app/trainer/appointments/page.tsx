
'use client';
import * as React from 'react';
import { PlanTab } from '../clients/[clientId]/_components/PlanTab';

export default function TrainerAppointmentsPage() {

  return (
    <div className="flex flex-col gap-8">
       {/* The PlanTab component is now the main view for this page. */}
       {/* It will fetch all appointments for the logged-in trainer by default */}
       <PlanTab />
    </div>
  );
}

    