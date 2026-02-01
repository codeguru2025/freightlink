import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, User, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Dispute, Job, UserProfile } from "@shared/schema";

interface DisputeWithDetails extends Dispute {
  job?: Job;
  raisedBy?: UserProfile;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "destructive" },
  under_review: { label: "Under Review", variant: "secondary" },
  resolved: { label: "Resolved", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
};

export default function AdminDisputesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDetails | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [resolution, setResolution] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: disputes, isLoading } = useQuery<DisputeWithDetails[]>({
    queryKey: ["/api/disputes"],
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: string; resolution?: string }) => {
      return apiRequest("PATCH", `/api/admin/disputes/${id}`, { status, resolution });
    },
    onSuccess: () => {
      toast({ title: "Dispute updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
      setDialogOpen(false);
      setSelectedDispute(null);
      setNewStatus("");
      setResolution("");
    },
    onError: () => {
      toast({ title: "Failed to update dispute", variant: "destructive" });
    },
  });

  const handleUpdate = () => {
    if (selectedDispute && newStatus) {
      updateMutation.mutate({
        id: selectedDispute.id,
        status: newStatus,
        resolution: resolution || undefined,
      });
    }
  };

  const openDisputes = disputes?.filter((d) => d.status === "open" || d.status === "under_review") || [];
  const closedDisputes = disputes?.filter((d) => d.status === "resolved" || d.status === "closed") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading disputes...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Dispute Management</h1>
        <p className="text-muted-foreground">Handle and resolve user disputes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Active Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openDisputes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{closedDisputes.length}</div>
          </CardContent>
        </Card>
      </div>

      {!disputes?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">No disputes</h3>
            <p className="text-muted-foreground text-center">All users are happy!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {openDisputes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active Disputes</h2>
              {openDisputes.map((dispute) => (
                <DisputeCard
                  key={dispute.id}
                  dispute={dispute}
                  onManage={() => {
                    setSelectedDispute(dispute);
                    setNewStatus(dispute.status);
                    setResolution(dispute.resolution || "");
                    setDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}

          {closedDisputes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Resolved Disputes</h2>
              {closedDisputes.map((dispute) => (
                <DisputeCard key={dispute.id} dispute={dispute} showResolution />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Dispute</DialogTitle>
            <DialogDescription>Update the status and provide a resolution</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <p className="text-sm text-muted-foreground mt-1">{selectedDispute?.reason}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <p className="text-sm text-muted-foreground mt-1">{selectedDispute?.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea
                placeholder="Enter resolution details..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                data-testid="input-resolution"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!newStatus || updateMutation.isPending} data-testid="button-update-dispute">
              Update Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DisputeCard({
  dispute,
  onManage,
  showResolution,
}: {
  dispute: DisputeWithDetails;
  onManage?: () => void;
  showResolution?: boolean;
}) {
  const statusInfo = statusConfig[dispute.status];

  return (
    <Card data-testid={`card-dispute-${dispute.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                <span className="text-sm text-muted-foreground">
                  {dispute.createdAt && new Date(dispute.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-medium mb-1">{dispute.reason}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{dispute.description}</p>
            </div>
            {onManage && (
              <Button variant="outline" size="sm" onClick={onManage} data-testid={`button-manage-${dispute.id}`}>
                Manage
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Raised by: {dispute.raisedBy?.companyName || "Unknown"}</span>
            </div>
          </div>
          {showResolution && dispute.resolution && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Resolution:</p>
              <p className="text-sm text-muted-foreground">{dispute.resolution}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
