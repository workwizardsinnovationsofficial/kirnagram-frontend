import { cn } from "@/lib/utils";

export const SkeletonLoader = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded",
        className
      )}
    />
  );
};

export const PostGridSkeleton = () => {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square rounded overflow-hidden">
          <SkeletonLoader className="w-full h-full" />
        </div>
      ))}
    </div>
  );
};

export const CreatorCardSkeleton = () => {
  return (
    <div className="flex flex-col items-center gap-3">
      <SkeletonLoader className="w-20 h-20 sm:w-28 sm:h-28 rounded-full" />
      <SkeletonLoader className="h-4 w-20 rounded" />
      <SkeletonLoader className="h-3 w-16 rounded" />
    </div>
  );
};

export const TrendingPostSkeleton = () => {
  return (
    <div className="w-40 sm:w-48 flex-shrink-0">
      <SkeletonLoader className="w-full h-40 sm:h-48 rounded-2xl" />
      <div className="mt-2 space-y-2">
        <SkeletonLoader className="h-3 w-3/4 rounded" />
        <SkeletonLoader className="h-3 w-1/2 rounded" />
      </div>
    </div>
  );
};

export const UserSearchCardSkeleton = () => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl">
      <SkeletonLoader className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonLoader className="h-4 w-32 rounded" />
        <SkeletonLoader className="h-3 w-24 rounded" />
      </div>
      <SkeletonLoader className="w-20 h-9 rounded-lg flex-shrink-0" />
    </div>
  );
};

export const SpotlightSkeleton = () => {
  return (
    <div className="relative mb-8 rounded-3xl overflow-hidden">
      <SkeletonLoader className="w-full h-56 sm:h-64 md:h-80 rounded-3xl" />
    </div>
  );
};

export const TopCreatorsSkeleton = () => {
  return (
    <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4 items-end">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="mb-3">
            <SkeletonLoader className={`rounded-full ${i === 1 ? 'w-28 h-28 sm:w-36 sm:h-36' : 'w-20 h-20 sm:w-28 sm:h-28'}`} />
          </div>
          <div className="space-y-2 text-center w-full">
            <SkeletonLoader className="h-3 w-24 rounded mx-auto" />
            <SkeletonLoader className="h-2 w-20 rounded mx-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};
