import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Thin top bar that animates quickly — “something is happening” before full skeleton */
export function QuickBusyBar({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none fixed left-0 right-0 top-0 z-[100] h-0.5 overflow-hidden', className)}>
      <div className="h-full w-1/3 animate-skeleton-bar bg-accent" />
    </div>
  );
}

export function AppBootstrapSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col gap-4 border-2 border-foreground/10 p-8">
        <Skeleton className="mx-auto h-10 w-10 rounded-md" />
        <Skeleton className="h-4 w-3/4 self-center" />
        <Skeleton className="h-3 w-1/2 self-center" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function HubMainSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border-2 border-foreground/10 p-5 sm:p-6">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-none border-2 border-foreground/5" />
        ))}
      </div>
    </div>
  );
}

export function GrowthTabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-none border-2 border-foreground/10" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-none border-2 border-foreground/10" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-none border-2 border-foreground/10" />
        <Skeleton className="h-64 rounded-none border-2 border-foreground/10" />
      </div>
      <Skeleton className="h-40 w-full rounded-none border-2 border-foreground/10" />
    </div>
  );
}

export function TeamPulseSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border-2 border-foreground/10 p-5 sm:p-6">
        <Skeleton className="mb-2 h-3 w-28" />
        <Skeleton className="h-6 w-1/2 max-w-xs" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-none border-2 border-foreground/10" />
        <Skeleton className="h-28 rounded-none border-2 border-foreground/10" />
      </div>
      <Skeleton className="h-56 w-full rounded-none border-2 border-foreground/10" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg border border-foreground/10 sm:h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-lg border border-foreground/10 lg:col-span-2" />
        <Skeleton className="h-72 rounded-lg border border-foreground/10" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg border border-foreground/10" />
        <Skeleton className="h-64 rounded-lg border border-foreground/10" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg border border-foreground/10" />
    </div>
  );
}

export function AppraisalAdminSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg border border-foreground/10" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-lg border border-foreground/10" />
      <Skeleton className="h-64 w-full rounded-lg border border-foreground/10" />
    </div>
  );
}

export function ChatAssistantSkeleton() {
  return (
    <div className="space-y-2 py-0.5">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[92%]" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}
