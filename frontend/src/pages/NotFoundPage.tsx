
import { Link } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2336F0]/10">
            <SearchX size={36} className="text-[#2336F0]" />
          </div>

          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#2336F0]">
            Error 404
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#0F1433] sm:text-5xl">
            Page not found
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#5B6180]">
            The page you're looking for doesn't exist or may have been moved.
            Let's get you back on track.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2336F0] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1A2BDB] sm:w-auto"
            >
              <Home size={17} />
              Back to Dashboard
            </Link>

            <button
              onClick={() => window.history.back()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E1E4EF] bg-white px-6 py-3 text-sm font-semibold text-[#0F1433] transition hover:bg-[#F0F1F8] sm:w-auto"
            >
              <ArrowLeft size={17} />
              Go Back
            </button>
          </div>

          <div className="mt-16 border-t border-[#E5E7F0] pt-6">
            <p className="text-sm text-[#8A90A8]">
              JoinFlow · Student & Assignment Management
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
