import { Badge } from "@/components/ui/badge";
import type { LoadStatus, BidStatus } from "@shared/schema";

const loadStatusConfig: Record<LoadStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  posted: { label: "Posted", variant: "outline" },
  bidding: { label: "Bidding", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const bidStatusConfig: Record<BidStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  withdrawn: { label: "Withdrawn", variant: "secondary" },
};

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  const config = loadStatusConfig[status];
  return (
    <Badge variant={config.variant} data-testid={`badge-load-status-${status}`}>
      {config.label}
    </Badge>
  );
}

export function BidStatusBadge({ status }: { status: BidStatus }) {
  const config = bidStatusConfig[status];
  return (
    <Badge variant={config.variant} data-testid={`badge-bid-status-${status}`}>
      {config.label}
    </Badge>
  );
}
