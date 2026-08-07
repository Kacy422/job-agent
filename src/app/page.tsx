"use client";

import { Navbar } from "@/components/Navbar";
import { ApplicationsTracker } from "@/components/ApplicationsTracker";
import { ProfileBuilder } from "@/components/ProfileBuilder";
import { ResumeGenerator } from "@/components/ResumeGenerator";
import { AutoApply } from "@/components/AutoApply";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { tab } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white/40 to-blue-50/30">
      <Navbar />
      <main className="animate-fade-up pb-16">
        {tab === "board" && <ApplicationsTracker />}
        {tab === "profile" && <ProfileBuilder />}
        {tab === "resume" && <ResumeGenerator />}
        {tab === "apply" && <AutoApply />}
      </main>
      <footer className="border-t border-white/50 py-6 text-center text-xs tracking-wide text-slate-500">
        JobAgent · 人物画像 → 专属简历 → 求职进度 · 数据同步至云端 Redis
      </footer>
    </div>
  );
}
