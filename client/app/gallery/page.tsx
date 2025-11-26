import Link from 'next/link';

export default function GalleryPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="text-center space-y-8 max-w-4xl">
        <h1 className="text-5xl font-bold text-white">🏆 NFT Gallery</h1>
        <p className="text-xl text-purple-200">
          Your prize collection will be displayed here
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-white/30 aspect-square flex items-center justify-center"
            >
              <p className="text-white/50">NFT #{i}</p>
            </div>
          ))}
        </div>

        <p className="text-purple-200 text-sm mt-8">
          Phase 3: Display user's NFT prizes with metadata and replay functionality
        </p>

        <Link
          href="/"
          className="inline-block bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border-2 border-white/30 mt-8"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
