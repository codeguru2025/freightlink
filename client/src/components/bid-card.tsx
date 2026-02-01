import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BidStatusBadge } from "@/components/status-badge";
import { DollarSign, Clock, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Bid, BidStatus } from "@shared/schema";

interface BidCardProps {
  bid: Bid & { transporter?: { companyName?: string | null; firstName?: string | null; lastName?: string | null } };
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  isOwner?: boolean;
}

export function BidCard({ bid, onAccept, onReject, showActions, isOwner }: BidCardProps) {
  const transporterName = bid.transporter?.companyName 
    || (bid.transporter?.firstName && bid.transporter?.lastName 
      ? `${bid.transporter.firstName} ${bid.transporter.lastName}` 
      : "Unknown Transporter");

  return (
    <Card className="hover-elevate" data-testid={`card-bid-${bid.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {transporterName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold" data-testid={`text-bid-transporter-${bid.id}`}>
                {transporterName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(bid.createdAt!), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <BidStatusBadge status={bid.status as BidStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold">
              {bid.currency} {Number(bid.amount).toLocaleString()}
            </span>
          </div>
          {bid.estimatedDays && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{bid.estimatedDays} day{bid.estimatedDays !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        {bid.notes && (
          <div className="flex gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">{bid.notes}</p>
          </div>
        )}
      </CardContent>
      {showActions && bid.status === "pending" && !isOwner && (
        <CardFooter className="flex gap-2 pt-0">
          <Button 
            variant="outline" 
            onClick={onReject} 
            className="flex-1"
            data-testid={`button-reject-bid-${bid.id}`}
          >
            Decline
          </Button>
          <Button 
            onClick={onAccept} 
            className="flex-1"
            data-testid={`button-accept-bid-${bid.id}`}
          >
            Accept Bid
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function BidCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
