'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DayPage() {
  const params = useParams();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const year = parseInt(params.year as string);
    const month = parseInt(params.month as string) - 1; // Month is 0-indexed
    const day = parseInt(params.day as string);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      // Redirect to main page with the selected day
      // The main page will handle displaying the dashboard for that day
      router.push('/');
      setIsReady(true);
    }
  }, [params, router]);

  if (!isReady) {
    return (
      <div id="day-page-loading" className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div id="loading-spinner" className="text-[#222222]">Loading...</div>
      </div>
    );
  }

  return null;
}
