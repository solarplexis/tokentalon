'use client';

import dynamic from 'next/dynamic';

const HomeContent = dynamic(() => import('./HomeContent').then(mod => ({ default: mod.HomeContent })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  ),
});

export default function Home() {
  return <HomeContent />;
}
