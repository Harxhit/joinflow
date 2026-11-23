function Splash() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#F6F7FB] px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#2336F0]/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#2336F0]/[0.05] blur-3xl" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2336F0] shadow-lg shadow-[#2336F0]/20">
          <span className="text-3xl font-bold tracking-tight text-white">
            J
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#0F1433]">
          JoinFlow
        </h1>

        <p className="mt-2 text-sm text-[#5B6180]">
          Bringing your teams and assignments together.
        </p>

        {/* Loading indicator */}
        <div className="mt-10 w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7F0]">
            <div className="h-full w-1/3 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-[#2336F0]" />
          </div>

          <p className="mt-4 text-center text-xs font-medium tracking-wide text-[#8A90A8]">
            Preparing your workspace...
          </p>
        </div>
      </div>

      <p className="absolute bottom-7 text-xs text-[#A0A5B8]">
        JoinFlow · Student & Assignment Management
      </p>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(330%); }
        }
      `}</style>
    </div>
  );
}

export default Splash