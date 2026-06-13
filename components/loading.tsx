export function LoadingIndicator({ label = "Processing" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
      {label}
    </div>
  );
}
