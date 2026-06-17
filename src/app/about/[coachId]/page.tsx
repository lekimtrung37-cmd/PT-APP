import { redirect } from 'next/navigation';

// This page is no longer used as marketing pages are removed.
export default function CoachDetailPage() {
    redirect('/login');
}

// Remove generateMetadata and generateStaticParams to avoid trying to build static pages from deleted data.
