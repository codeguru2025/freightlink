import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { LoadCard, LoadCardSkeleton } from "@/components/load-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, MapPin, Filter } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Load } from "@shared/schema";

const zimbabweCities = [
  "All Cities",
  "Harare",
  "Bulawayo",
  "Chitungwiza",
  "Mutare",
  "Gweru",
  "Masvingo",
  "Victoria Falls",
  "Marondera",
  "Hwange",
  "Kariba",
];

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState("All Cities");
  const [destinationFilter, setDestinationFilter] = useState("All Cities");
  const [, navigate] = useLocation();

  const { data: loads, isLoading } = useQuery<Load[]>({
    queryKey: ["/api/marketplace"],
  });

  const filteredLoads = loads?.filter((load) => {
    const matchesSearch = !searchQuery || 
      load.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.destinationCity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrigin = originFilter === "All Cities" || load.originCity === originFilter;
    const matchesDestination = destinationFilter === "All Cities" || load.destinationCity === destinationFilter;
    return matchesSearch && matchesOrigin && matchesDestination;
  });

  const handleBid = (loadId: string) => {
    navigate(`/loads/${loadId}/bid`);
  };

  return (
    <DashboardLayout title="Available Loads" breadcrumbs={[{ label: "Marketplace" }]}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search loads by title, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-marketplace"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="w-36" data-testid="select-origin-filter">
                      <SelectValue placeholder="Origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {zimbabweCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-destructive flex-shrink-0" />
                  <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                    <SelectTrigger className="w-36" data-testid="select-destination-filter">
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {zimbabweCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredLoads?.length || 0} loads available
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <LoadCardSkeleton key={i} />)}
          </div>
        ) : filteredLoads && filteredLoads.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLoads.map((load) => (
              <LoadCard 
                key={load.id} 
                load={load} 
                showBidButton 
                onBid={() => handleBid(load.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No loads available</h3>
            <p>Check back later for new opportunities</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
