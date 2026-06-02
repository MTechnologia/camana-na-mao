import { Skeleton } from "@/components/ui/skeleton";

export const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-fade-in">
      {/* Content skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3 mt-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
};

export const ListPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Stats cards */}
      <div className="flex gap-3">
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
      </div>

      {/* List items */}
      <div className="space-y-3 mt-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Completion card */}
      <Skeleton className="h-24 w-full rounded-xl" />

      {/* Profile cards */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export const NotificationsSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header stats */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Notification items */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AudienciasSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Search */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Stats */}
      <div className="flex gap-3">
        <Skeleton className="h-16 flex-1 rounded-xl" />
        <Skeleton className="h-16 flex-1 rounded-xl" />
      </div>

      {/* Cards */}
      <div className="space-y-4 mt-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export const ServicesSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Map placeholder */}
      <Skeleton className="h-[40vh] w-full" />

      {/* Service cards */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export const AnalyticsSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Charts */}
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
};
