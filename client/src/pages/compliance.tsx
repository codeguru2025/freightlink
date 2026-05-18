import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ShieldCheck, Clock, CheckCircle2, XCircle, Upload, AlertTriangle, FileText
} from "lucide-react";
import type { Document } from "@shared/schema";

const REQUIRED_DOCS = [
  { type: "id_document", label: "National ID / Passport", description: "Clear copy of your national ID or passport" },
  { type: "drivers_license", label: "Driver's Licence", description: "Valid driver's licence (must cover the vehicle class)" },
  { type: "vehicle_registration", label: "Vehicle Registration", description: "Vehicle registration book or card" },
  { type: "insurance", label: "Insurance Certificate", description: "Current vehicle insurance certificate" },
] as const;

function DocStatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">Not Uploaded</Badge>;
  if (status === "verified") return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
  return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
}

export default function CompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ documents: Document[]; isVerified: boolean }>({
    queryKey: ["/api/compliance/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const presignRes = await apiRequest("POST", "/api/upload-url", {
        fileName: file.name,
        contentType: file.type,
      });
      const { uploadUrl, fileUrl } = await presignRes.json();

      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const docRes = await apiRequest("POST", "/api/documents", {
        documentType,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
      });
      return docRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/documents"] });
      toast({ title: "Document uploaded", description: "Your document has been submitted for review." });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message || "Failed to upload document", variant: "destructive" });
    },
  });

  const docsMap = Object.fromEntries(
    (data?.documents || []).map((d) => [d.documentType, d])
  );

  const allVerified = REQUIRED_DOCS.every((r) => docsMap[r.type]?.status === "verified");
  const anyRejected = REQUIRED_DOCS.some((r) => docsMap[r.type]?.status === "rejected");
  const pendingCount = REQUIRED_DOCS.filter((r) => docsMap[r.type]?.status === "pending").length;

  return (
    <DashboardLayout title="Transporter Verification">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <p className="text-muted-foreground text-sm">Upload required documents to access available loads</p>
        </div>

        {data?.isVerified ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Account Verified</p>
                <p className="text-sm text-green-700 dark:text-green-400">You can now view and bid on available loads.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">Verification Pending</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {allVerified
                    ? "All documents verified. Admin will approve your account shortly."
                    : pendingCount > 0
                    ? `${pendingCount} document(s) are under review. Admin will verify them shortly.`
                    : anyRejected
                    ? "Some documents were rejected. Please re-upload the correct documents."
                    : "Upload all required documents below to begin the verification process."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Required Documents
            </CardTitle>
            <CardDescription>Upload clear, legible copies of each document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              REQUIRED_DOCS.map((req) => {
                const existing = docsMap[req.type];
                return (
                  <div key={req.type} className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{req.label}</p>
                      <p className="text-xs text-muted-foreground">{req.description}</p>
                      {existing?.rejectionReason && (
                        <p className="text-xs text-destructive mt-1">Reason: {existing.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <DocStatusBadge status={existing?.status} />
                      {(!existing || existing.status === "rejected") && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadMutation.mutate({ file, documentType: req.type });
                            }}
                          />
                          <Button size="sm" variant="outline" asChild>
                            <span><Upload className="h-3 w-3 mr-1" />Upload</span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Documents are reviewed manually by Sage-Route Logistics admin. You will be notified once your account is verified.
        </p>
      </div>
    </DashboardLayout>
  );
}
