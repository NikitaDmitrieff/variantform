"use client";

interface ActivityItem {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface ActivityFeedProps {
  activity: ActivityItem[];
  loading: boolean;
}

export function ActivityFeed({ activity, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="glass-card space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-xs text-muted">
        No variant changes yet.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-white/5">
      {activity.slice(0, 10).map((item) => (
        <div key={item.sha} className="flex items-start gap-3 px-4 py-3">
          <code className="mt-0.5 shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
            {item.sha}
          </code>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-fg">{item.message}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {item.author} &middot;{" "}
              {new Date(item.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
