import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Briefcase } from "lucide-react";
import type { Job, Load, UserProfile, LoadStatus } from "@shared/schema";

interface JobWithLoad extends Job {
  load?: Load;
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

  return (
    <DashboardLayout title="My Jobs" breadcrumbs={[{ label: "Jobs" }]}>
      <div className="space-y-6">
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
