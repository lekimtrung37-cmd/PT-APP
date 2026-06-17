
import { redirect } from 'next/navigation';

// Redirect to the exercises sub-page by default
export default function LibraryPage() {
  redirect('/trainer/library/exercises');
}
