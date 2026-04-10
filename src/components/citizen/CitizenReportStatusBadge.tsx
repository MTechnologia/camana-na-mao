import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  citizenReportStatusBadgeClassNames,
  citizenReportStatusLabel,
  normalizeCitizenReportStatus,
  type CitizenReportStatus,
} from "@/lib/citizenReportStatus";

type Props = {
  status: string | null | undefined;
  className?: string;
};

export function CitizenReportStatusBadge({ status, className }: Props) {
  const key = normalizeCitizenReportStatus(status);
  const label = citizenReportStatusLabel(key);
  const colors = citizenReportStatusBadgeClassNames(key as CitizenReportStatus);
  return (
    <Badge variant="outline" className={cn("text-xs font-normal", colors, className)}>
      {label}
    </Badge>
  );
}
