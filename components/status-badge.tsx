const styles: Record<string, string> = {
  QUEUED: "bg-amber/15 text-amber",
  PROCESSING: "bg-ocean/10 text-ocean",
  COMPLETED: "bg-mint/15 text-ocean",
  FAILED: "bg-red-50 text-red-600"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] ?? styles.QUEUED}`}>{status}</span>;
}
