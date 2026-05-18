import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Briefcase, AlertCircle, Phone, MapPin, CheckCircle2, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Job, Load, UserProfile, LoadStatus } from "@shared/schema";

interface JobWithLoad extends Job {
  load?: (Load & { originAddress?: string; shipperContact?: { phone?: string; name?: string }; pickupDetailsReleased?: boolean });
}

export default function JobsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: jobs, isLoading } = useQuery<JobWithLoad[]>({
    queryKey: ["/api/jobs"],
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: LoadStatus }) => {
      const response = await apiRequest("PATCH", `/api/jobs/${jobId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Status updated",
        description: "The job status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (jobId: string, status: LoadStatus) => {
    updateJobStatusMutation.mutate({ jobId, status });
  };

  const isTransporter = profile?.role === "transporter";
  const isShipper = profile?.role === "shipper";

  const activeJobs = jobs?.filter(j => ["accepted", "in_transit"].includes(j.status));
  const completedJobs = jobs?.filter(j => j.status === "delivered");
  const pendingFeeJobs = isTransporter ? activeJobs?.filter(j => (j as any).feeStatus === "pending") : [];
  const paidFeeJobs = isTransporter ? activeJobs?.filter(j => (j as any).feeStatus === "paid") : [];

  return (
    <DashboardLayout title="My Jobs" breadcrumbs={[{ label: "Jobs" }]}>
      <div className="space-y-6">
        {isTransporter && pendingFeeJobs && pendingFeeJobs.length > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                    Payment Required — {pendingFeeJobs.length} job{pendingFeeJobs.length > 1 ? "s" : ""} awaiting 15% fee
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    You will receive an EcoCash payment request on your phone. Approve it to unlock full pickup details and contact info.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isTransporter && paidFeeJobs && paidFeeJobs.map((job) => (
          job.load?.pickupDetailsReleased && (
            <Card key={`contact-${job.id}`} className="border-green-300 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-green-800 dark:text-green-300 text-sm">
                      Pickup Details Unlocked — {job.load?.originCity} → {job.load?.destinationCity}
                    </p>
                    {job.load?.originAddress && (
                      <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                        <MapPin className="h-3 w-3" />
                        <span>{job.load.originAddress}</span>
                      </div>
                    )}
                    {job.load?.shipperContact?.phone && (
                      <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                        <Phone className="h-3 w-3" />
                        <span>Contact: {job.load.shipperContact.name || "Shipper"} — {job.load.shipperContact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active-jobs">
              Active ({activeJobs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-jobs">
              Completed ({completedJobs?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <JobCardSkeleton key={i} />)}
              </div>
            ) : activeJobs && activeJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isTransporter={isTransporter}
                    isShipper={isShipper}
                    onUpdateStatus={(status) => handleUpdateStatus(job.id, status)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No active jobs</h3>
                <p>Jobs will appear here once bids are accepted</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedJobs && completedJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isTransporter={isTransporter}
                    isShipper={isShipper}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No completed jobs</h3>
                <p>Completed deliveries will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
