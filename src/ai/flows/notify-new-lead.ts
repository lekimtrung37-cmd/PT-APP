
'use server';
/**
 * @fileOverview A flow to notify about new leads.
 *
 * - notifyNewLead - A function that handles the new lead notification process.
 * - NewLeadSchema - The input type for the notifyNewLead function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';

export const NewLeadSchema = z.object({
  name: z.string().describe('The name of the lead.'),
  email: z.string().email().describe('The email address of the lead.'),
  phone: z.string().describe('The phone number of the lead.'),
  socialLink: z.string().optional().describe('A social media link for contact.'),
  service: z.string().describe('The service the lead is interested in.'),
  preferredTime: z.string().describe('The preferred contact time.'),
  source: z.string().describe('How the lead heard about the service.'),
  fitnessGoal: z.string().optional(),
  challenge: z.string().optional(),
  whyCoach: z.string().optional(),
  investmentLevel: z.string().optional(),
  startTimeframe: z.string().optional(),
});

export type NewLead = z.infer<typeof NewLeadSchema>;

export async function notifyNewLead(input: NewLead): Promise<void> {
  return notifyNewLeadFlow(input);
}

// Hardcoded admin/trainer IDs to notify. In a real app, you'd fetch these dynamically.
const ADMIN_USER_IDS = ['3n8bH4Hq3jZ6H6e5E3h4u5j6k7l8m9n0', 'replace-with-actual-admin-id-2'];


const notifyNewLeadFlow = ai.defineFlow(
  {
    name: 'notifyNewLeadFlow',
    inputSchema: NewLeadSchema,
    outputSchema: z.void(),
  },
  async (lead) => {
    console.log('New lead received, creating notifications:', JSON.stringify(lead, null, 2));

    try {
        initializeAdminApp();
        const firestore = getFirestore();
        
        // Create a notification for each admin
        const notificationPromises = ADMIN_USER_IDS.map(adminId => {
            const notificationsColRef = firestore.collection(`users/${adminId}/notifications`);
            return notificationsColRef.add({
                title: '🔥 Lead mới từ Website!',
                description: `Bạn có khách hàng tiềm năng mới: ${lead.name} (${lead.email}). Dịch vụ: ${lead.service}.`,
                link: '/admin/members', // Direct link to the members page
                isRead: false,
                createdAt: Timestamp.now(),
            });
        });

        await Promise.all(notificationPromises);
        
        console.log(`Successfully created ${ADMIN_USER_IDS.length} notifications.`);

    } catch (error) {
        console.error("Failed to create notifications for new lead:", error);
        // We don't re-throw the error to not fail the client-side operation,
        // but we log it for debugging. In a real production app, you might want to
        // add more robust error handling or retry logic here.
    }
  }
);
