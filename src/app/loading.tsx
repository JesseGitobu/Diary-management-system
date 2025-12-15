import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* 1. The Icon */}
      <div className="relative w-24 h-24 mb-4 animate-pulse">
        {/* We use /icon.png from public folder */}
        <Image 
          src="/icon.png" 
          alt="DairyTrack Pro Logo"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* 2. Optional: A spinner or small text */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
}