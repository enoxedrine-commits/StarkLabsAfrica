export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import CachedLogo from "@/components/CachedLogo";
import RegisterClient from "./RegisterClient";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#255cdc] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-6xl flex flex-col">
        {/* Desktop: Logo + tagline above, then image and form on same row */}
        <div className="hidden md:flex items-center gap-3 mb-6">
          <CachedLogo variant="default" className="h-10 w-auto" />
          <p className="text-white/90 text-lg">Home of Innovator Electronics</p>
        </div>

        <div className="w-full flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8">
          {/* Left: Image (same row as form on desktop) */}
          <div className="hidden md:block md:w-1/2 relative rounded-2xl overflow-hidden shadow-lg min-h-[420px]">
            <Image
              src="/loginpage.jpg"
              alt="StarkLabs – electronics and hardware"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 0, 50vw"
              priority
            />
          </div>

          {/* Right: Register form card */}
          <div className="w-full md:w-1/2 flex items-center justify-center md:justify-end">
            <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col items-center md:min-h-[420px] md:justify-center">
            <div className="flex flex-col items-center mb-6">
              <CachedLogo variant="register" className="h-10 w-auto" />
              <p className="text-sm text-gray-500 text-center mt-3">
                Home of Innovator Electronics
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Continue with Google to sign in or shop
              </p>
            </div>

            <RegisterClient />

            <Link
              href="/"
              className="mt-6 w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              ← Return to Shop
            </Link>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
