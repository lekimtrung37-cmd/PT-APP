import Link from 'next/link';
import { Dumbbell } from 'lucide-react';

export default function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 group"
      aria-label="Back to homepage"
    >
      <Dumbbell className="h-7 w-7 text-primary transition-transform duration-300 group-hover:rotate-12" />
      <span className="font-headline text-2xl font-bold text-white group-hover:text-primary transition-colors">KIM TRUNG</span>
    </Link>
  );
}
