"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  JobUI,
  McpToolMeta,
  PomodoroUI,
  ProfileUI,
  ToastTone,
  ViewName,
} from "@/lib/types";
import { buildDraftCvFromUI } from "@/lib/ui";
import Header from "./Header";
import JobVault from "./JobVault";
import AnchorBridge from "./AnchorBridge";
import KitStudio from "./KitStudio";
import MasterBrain from "./MasterBrain";
import McpPlayground from "./McpPlayground";
import { cn } from "./utils";

type CareerOSAppProps = {
  initialProfile: ProfileUI;
  initialJobs: JobUI[];
  mcpTools: McpToolMeta[];
  initialJobId?: number | null;
};

type Toast = { id: number; message: string; tone: ToastTone };

const POMO_TOTAL = 25 * 60;

export default function CareerOSApp({
  initialProfile,
  initialJobs,
  mcpTools,
  initialJobId,
}: CareerOSAppProps) {
  const requestedJob = initialJobId
    ? initialJobs.find((job) => job.id === initialJobId)
    : undefined;

  const [view, setView] = useState<ViewName>(requestedJob ? "studio" : "vault");
  const [profile, setProfile] = useState<ProfileUI>(initialProfile);
  const [jobs, setJobs] = useState<JobUI[]>(initialJobs);
  const [activeJobId, setActiveJobId] = useState<number | null>(
    requestedJob?.id ?? initialJobs[0]?.id ?? null,
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  const [pomoSeconds, setPomoSeconds] = useState(POMO_TOTAL);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoSessions, setPomoSessions] = useState(1);
  const [pomoKits, setPomoKits] = useState(0);
  const [pomoComplete, setPomoComplete] = useState(false);
  const [pomoSummary, setPomoSummary] = useState("");

  const showToast = useCallback((message: string, tone: ToastTone = "indigo") => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  useEffect(() => {
    if (!pomoRunning) return;
    const interval = window.setInterval(() => {
      setPomoSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pomoRunning]);

  useEffect(() => {
    if (!pomoRunning || pomoSeconds !== 0) return;
    setPomoRunning(false);
    setPomoComplete(true);
    setPomoSummary(
      `Sprint #${pomoSessions} finished with ${pomoKits} tailored application(s) logged. Close your Job Hunt tab and take a clean break!`,
    );
    showToast("25-min Job-Hunt Sprint complete! Wrap up & close the tab.", "amber");
    setPomoSessions((count) => count + 1);
  }, [pomoSeconds, pomoRunning, pomoSessions, pomoKits, showToast]);

  function togglePomodoro() {
    setPomoComplete(false);
    if (pomoRunning) {
      setPomoRunning(false);
      showToast("Pomodoro sprint paused.");
      return;
    }
    if (pomoSeconds === 0) setPomoSeconds(POMO_TOTAL);
    setPomoRunning(true);
    showToast("25:00 Job-Hunt Pomodoro started! Aim for 2–3 tailored kits.");
  }

  function resetPomodoro() {
    setPomoRunning(false);
    setPomoSeconds(POMO_TOTAL);
    setPomoComplete(false);
    setPomoSummary("");
    showToast("Pomodoro reset to 25:00.");
  }

  function completePomodoro() {
    setPomoRunning(false);
    setPomoSeconds(0);
    setPomoComplete(true);
    setPomoSummary(
      `Sprint #${pomoSessions} finished with ${pomoKits} tailored application(s) logged. Close your Job Hunt tab and take a clean break!`,
    );
    showToast("25-min Job-Hunt Sprint complete! Wrap up & close the tab.", "amber");
    setPomoSessions((count) => count + 1);
  }

  function logPomodoroApplication() {
    const next = pomoKits + 1;
    setPomoKits(next);
    showToast(`Logged tailored application #${next} in Sprint #${pomoSessions}!`);
  }

  function handleJobCreated(job: JobUI) {
    setJobs((prev) => [job, ...prev.filter((item) => item.id !== job.id)]);
    setActiveJobId(job.id);
  }

  function handleJobUpdated(job: JobUI) {
    setJobs((prev) => prev.map((item) => (item.id === job.id ? job : item)));
  }

  function handleProfileUpdated(next: ProfileUI) {
    setProfile(next);
    setJobs((prev) =>
      prev.map((job) =>
        job.latestKit ? job : { ...job, draftCv: buildDraftCvFromUI(job, next) },
      ),
    );
  }

  function openJob(id: number) {
    setActiveJobId(id);
    setView("studio");
  }

  const activeJob = jobs.find((job) => job.id === activeJobId) ?? jobs[0];

  const pomo: PomodoroUI = {
    seconds: pomoSeconds,
    running: pomoRunning,
    sessions: pomoSessions,
    kits: pomoKits,
    complete: pomoComplete,
    summary: pomoSummary,
  };

  return (
    <>
      <Header
        view={view}
        onView={setView}
        jobsCount={jobs.length}
        profile={profile}
        pomoSeconds={pomoSeconds}
        pomoRunning={pomoRunning}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {view === "vault" && (
          <JobVault
            jobs={jobs}
            profile={profile}
            showToast={showToast}
            onOpenJob={openJob}
            onJobCreated={handleJobCreated}
            onViewBridge={() => setView("bridge")}
          />
        )}

        {view === "bridge" && (
          <AnchorBridge
            showToast={showToast}
            onJobCreated={handleJobCreated}
            onOpenVault={() => setView("vault")}
            pomo={pomo}
            onTogglePomo={togglePomodoro}
            onResetPomo={resetPomodoro}
            onLogPomo={logPomodoroApplication}
            onCompletePomo={completePomodoro}
          />
        )}

        {view === "studio" && (
          <KitStudio
            key={activeJob?.id ?? "none"}
            job={activeJob}
            profile={profile}
            showToast={showToast}
            onJobUpdated={handleJobUpdated}
            onBack={() => setView("vault")}
            onOpenBrain={() => setView("brain")}
          />
        )}

        {view === "brain" && (
          <MasterBrain
            profile={profile}
            showToast={showToast}
            onProfileUpdated={handleProfileUpdated}
          />
        )}

        {view === "mcp" && (
          <McpPlayground tools={mcpTools} activeJob={activeJob} showToast={showToast} />
        )}
      </main>

      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-elevated/95 backdrop-blur-md border shadow-2xl text-xs font-medium",
              toast.tone === "amber"
                ? "border-amber-500/40 text-amber-200"
                : "border-indigo-500/40 text-zinc-100",
            )}
          >
            <i
              className={cn(
                "ph-bold text-base",
                toast.tone === "amber"
                  ? "ph-warning-circle text-amber-400"
                  : "ph-check-circle text-emerald-400",
              )}
            />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
