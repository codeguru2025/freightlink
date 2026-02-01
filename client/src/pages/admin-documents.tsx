import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle, XCircle, User, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Document, UserProfile } from "@shared/schema";

interface DocumentWithUser extends Document {
  user?: UserProfile;
}

const documentTypeLabels: Record<string, string> = {
  id_document: "ID Document",
  drivers_license: "Driver's License",
  vehicle_registration: "Vehicle Registration",
  insurance: "Insurance",
  proof_of_delivery: "Proof of Delivery",
  invoice: "Invoice",
  other: "Other",
};

export default function AdminDocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const { data: documents, isLoading } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/admin/documents/pending"],
    enabled: !!user,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      return apiRequest("PATCH", `/api/admin/documents/${id}/verify`, { status, rejectionReason });
    },
    onSuccess: () => {
      toast({ title: "Document updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents/pending"] });
      setSelectedDoc(null);
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({ title: "Failed to update document", variant: "destructive" });
    },
  });

  const handleVerify = (id: string) => {
    verifyMutation.mutate({ id, status: "verified" });
  };

  const handleReject = () => {
    if (selectedDoc) {
      verifyMutation.mutate({ id: selectedDoc.id, status: "rejected", rejectionReason });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Document Verification</h1>
        <p className="text-muted-foreground">Review and verify user documents</p>
      </div>

      {!documents?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground text-center">No pending documents to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium" data-testid={`text-document-name-${doc.id}`}>{doc.fileName}</h3>
                      <p className="text-sm text-muted-foreground">{documentTypeLabels[doc.documentType]}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{doc.user?.companyName || "Unknown User"}</span>
                        <Badge variant="secondary" className="text-xs">{doc.user?.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </a>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleVerify(doc.id)}
                      disabled={verifyMutation.isPending}
                      data-testid={`button-verify-${doc.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Dialog open={rejectDialogOpen && selectedDoc?.id === doc.id} onOpenChange={(open) => {
                      setRejectDialogOpen(open);
                      if (open) setSelectedDoc(doc);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" data-testid={`button-reject-${doc.id}`}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Document</DialogTitle>
                          <DialogDescription>Provide a reason for rejecting this document</DialogDescription>
                        </DialogHeader>
                        <Textarea
                          placeholder="Reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          data-testid="input-rejection-reason"
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || verifyMutation.isPending} data-testid="button-confirm-reject">
                            Reject Document
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
