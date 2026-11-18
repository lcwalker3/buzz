import { relativeTime } from "@/shared/lib/relative-time";

const exactFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "3 hours ago", with the exact date and time on hover and for machines. */
export function RelativeTime({ unix }: { unix: number }) {
  const date = new Date(unix * 1000);
  return (
    <time dateTime={date.toISOString()} title={exactFormat.format(date)}>
      {relativeTime(unix)}
    </time>
  );
}
