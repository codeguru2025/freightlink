import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, XCircle, User, ExternalLink, CheckCircle2, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Document, UserProfile } from "@shared/schema";

interface DocumentWithUser extends Document {
  user?: UserProfile;
}

interface TransporterWithDocs extends UserProfile {
  email?: string;
  documents: Document[];
}

const JMZ_COMPLIANCE_DOCS = [
  { type: "application_form", label: "Application Form", required: false },
  { type: "road_transporters_license", label: "Road Transporter's License", required: true },
  { type: "cr14", label: "CR14", required: false },
  { type: "id_document", label: "Owner's Copy of ID", required: true },
  { type: "proof_of_residence", label: "Proof of Residence", required: true },
  { type: "key_personnel", label: "Key Personnel Particulars", required: true },
  { type: "vehicle_registration", label: "Vehicle Registration Books", required: true },
  { type: "drivers_license", label: "Copies of Driver's License", required: true },
  { type: "certificate_of_incorporation", label: "Certificate of Incorporation", required: false },
  { type: "company_profile", label: "Company Profile", required: true },
  { type: "banking_details", label: "Banking Details", required: true },
  { type: "git_insurance", label: "GIT Insurance", required: true },
  { type: "vat_certificate", label: "VAT Registration Certificate", required: false },
  { type: "tax_clearance", label: "Tax Clearance Certificate", required: false },
  { type: "vehicle_tracking", label: "Vehicle Tracking System", required: true },
] as const;

const documentTypeLabels: Record<string, string> = {
  id_document: "Owner's Copy of ID",
  drivers_license: "Copies of Driver's License",
  vehicle_registration: "Vehicle Registration Books",
  insurance: "Insurance",
  proof_of_delivery: "Proof of Delivery",
  invoice: "Invoice",
  delivery_note: "Delivery Note",
  shipment_note: "Shipment Note",
  waybill: "Waybill",
  signed_pod: "Signed POD",
  other: "Other",
  application_form: "Application Form",
  road_transporters_license: "Road Transporter's License",
  cr14: "CR14",
  proof_of_residence: "Proof of Residence",
  key_personnel: "Key Personnel Particulars",
  certificate_of_incorporation: "Certificate of Incorporation",
  company_profile: "Company Profile",
  banking_details: "Banking Details",
  git_insurance: "GIT Insurance",
  vat_certificate: "VAT Registration Certificate",
  tax_clearance: "Tax Clearance Certificate",
  vehicle_tracking: "Vehicle Tracking System",
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

  const { data: transporters, isLoading: transportersLoading } = useQuery<TransporterWithDocs[]>({
    queryKey: ["/api/admin/transporter-compliance"],
    enabled: !!user,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      return apiRequest("PATCH", `/api/admin/documents/${id}/verify`, { status, rejectionReason });
    },
    onSuccess: () => {
      toast({ title: "Document updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporter-compliance"] });
      setSelectedDoc(null);
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({ title: "Failed to update document", variant: "destructive" });
    },
  });

  const verifyTransporterMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/verify`, { verified });
      if (!res.ok) throw new Error("Failed to update verification");
      return res.json();
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporter-compliance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: verified ? "Transporter verified" : "Verification revoked" });
    },
    onError: () => {
      toast({ title: "Failed to update verification", variant: "destructive" });
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

  return (
    <DashboardLayout title="Document Verification" breadcrumbs={[{ label: "Admin" }, { label: "Documents" }]}>
      <div className="space-y-6">
        <p className="text-muted-foreground">Review transporter compliance documents and manage verification</p>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Review
              {documents && documents.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{documents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compliance">Transporter Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-pulse text-muted-foreground">Loading documents...</div>
              </div>
            ) : !documents?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground text-center">No pending documents to review</p>
                </CardContent>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium" data-testid={`text-document-name-${doc.id}`}>{doc.fileName}</h3>
                          <p className="text-sm text-muted-foreground">{documentTypeLabels[doc.documentType] || doc.documentType}</p>
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
              ))
            )}
          </TabsContent>

          <TabsContent value="compliance" className="mt-4 space-y-4">
            {transportersLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-pulse text-muted-foreground">Loading transporter data...</div>
              </div>
            ) : !transporters?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No transporters yet</h3>
                  <p className="text-muted-foreground text-center">Registered transporters will appear here</p>
                </CardContent>
              </Card>
            ) : (
              transporters.map((transporter) => {
                const docsMap = Object.fromEntries(transporter.documents.map((d) => [d.documentType, d]));
                const submittedCount = JMZ_COMPLIANCE_DOCS.filter((r) => docsMap[r.type]).length;
                const verifiedCount = JMZ_COMPLIANCE_DOCS.filter((r) => docsMap[r.type]?.status === "verified").length;
                const requiredDocs = JMZ_COMPLIANCE_DOCS.filter((r) => r.required);
                const allRequiredVerified = requiredDocs.every((r) => docsMap[r.type]?.status === "verified");
                return (
                  <Card key={transporter.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{transporter.companyName || transporter.email || "Unknown Transporter"}</CardTitle>
                            <p className="text-sm text-muted-foreground">{transporter.email} · {transporter.city || "No city"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {submittedCount}/{JMZ_COMPLIANCE_DOCS.length} submitted · {verifiedCount} verified
                          </Badge>
                          {transporter.isVerified ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                              onClick={() => verifyTransporterMutation.mutate({ userId: transporter.userId, verified: false })}
                              disabled={verifyTransporterMutation.isPending}
                            >
                              <ShieldX className="w-3 h-3 mr-1" />Revoke
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => verifyTransporterMutation.mutate({ userId: transporter.userId, verified: true })}
                              disabled={verifyTransporterMutation.isPending || !allRequiredVerified}
                              title={!allRequiredVerified ? "All required documents must be verified first" : ""}
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />Verify Account
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {JMZ_COMPLIANCE_DOCS.map((req) => {
                          const doc = docsMap[req.type];
                          return (
                            <div key={req.type} className="flex items-center justify-between gap-2 p-2 rounded border text-sm">
                              <span className="truncate text-muted-foreground">
                                {req.label}{req.required ? " *" : ""}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {doc ? (
                                  doc.status === "verified" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : doc.status === "rejected" ? (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-amber-500" />
                                  )
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                                {doc && (
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
