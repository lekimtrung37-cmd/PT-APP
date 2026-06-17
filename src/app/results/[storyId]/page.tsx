import { redirect } from 'next/navigation';

// This page is no longer used as marketing pages are removed.
export default function StoryDetailPage() {
  redirect('/login');
}
