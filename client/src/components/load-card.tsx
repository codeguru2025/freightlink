import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadStatusBadge } from "@/components/status-badge";
import { CargoIcon, getCargoLabel } from "@/components/cargo-icon";
import { MapPin, ArrowRight, Calendar, Package, Scale, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Load, CargoType, LoadStatus } from "@shared/schema";
import { Link } from "wouter";

interface LoadCardProps {
  load: Load;
  onBid?: () => void;
  showBidButton?: boolean;
  showViewButton?: boolean;
  bidCount?: number;
}

export function LoadCard({ load, onBid, showBidButton, showViewButton = true, bidCount }: LoadCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-load-${load.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CargoIcon type={load.cargoType as CargoType} className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight" data-testid={`text-load-title-${load.id}`}>
                {load.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {getCargoLabel(load.cargoType as CargoType)}
              </p>
            </div>
          </div>
          <LoadStatusBadge status={load.status as LoadStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span>{load.weight} {load.weightUnit}</span>
          </div>
          {load.budget && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {load.currency} {Number(load.budget).toLocaleString()}
              </span>
            </div>
          )}
          {load.pickupDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(load.pickupDate), "MMM d, yyyy")}</span>
            </div>
          )}
          {bidCount !== undefined && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {load.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{load.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        {showViewButton && (
          <Link href={`/loads/${load.id}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-load-${load.id}`}>
              View Details
            </Button>
          </Link>
        )}
        {showBidButton && load.status === "posted" && (
          <Button onClick={onBid} className="flex-1" data-testid={`button-bid-load-${load.id}`}>
            Place Bid
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function LoadCardSkeleton() {
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
