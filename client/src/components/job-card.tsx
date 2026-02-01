import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadStatusBadge } from "@/components/status-badge";
import { MapPin, ArrowRight, DollarSign, Calendar, Truck, Package } from "lucide-react";
import { format } from "date-fns";
import type { Job, Load, LoadStatus } from "@shared/schema";
import { Link } from "wouter";

interface JobCardProps {
  job: Job & { load?: Load };
  onUpdateStatus?: (status: LoadStatus) => void;
  isTransporter?: boolean;
  isShipper?: boolean;
}

export function JobCard({ job, onUpdateStatus, isTransporter, isShipper }: JobCardProps) {
  const load = job.load;

  return (
    <Card className="hover-elevate" data-testid={`card-job-${job.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight" data-testid={`text-job-title-${job.id}`}>
                {load?.title || "Shipment"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Job #{job.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <LoadStatusBadge status={job.status as LoadStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {load && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 flex-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{load.originCity}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5 flex-1">
              <MapPin className="h-4 w-4 text-destructive" />
              <span className="font-medium">{load.destinationCity}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {job.currency} {Number(job.agreedAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(job.createdAt!), "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-0">
        <Link href={`/jobs/${job.id}`} className="flex-1 min-w-[120px]">
          <Button variant="outline" className="w-full" data-testid={`button-view-job-${job.id}`}>
            View Details
          </Button>
        </Link>
        {isTransporter && job.status === "accepted" && (
          <Button 
            onClick={() => onUpdateStatus?.("in_transit")} 
            className="flex-1"
            data-testid={`button-start-transit-${job.id}`}
          >
            Start Transit
          </Button>
        )}
        {isTransporter && job.status === "in_transit" && (
          <Button 
            onClick={() => onUpdateStatus?.("delivered")} 
            className="flex-1"
            data-testid={`button-mark-delivered-${job.id}`}
          >
            Mark Delivered
          </Button>
        )}
        {isShipper && job.status === "in_transit" && (
          <Button 
            onClick={() => onUpdateStatus?.("delivered")} 
            className="flex-1"
            data-testid={`button-confirm-delivery-${job.id}`}
          >
            Confirm Delivery
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function JobCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="h-9 w-full bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}
