import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Upload, CheckCircle, XCircle, Clock, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useRef } from "react";
import type { Document } from "@shared/schema";

const documentTypeLabels: Record<string, string> = {
  id_document: "ID Document",
  drivers_license: "Driver's License",
  vehicle_registration: "Vehicle Registration",
  insurance: "Insurance",
  proof_of_delivery: "Proof of Delivery",
  invoice: "Invoice",
  delivery_note: "Delivery Note",
  shipment_note: "Shipment Note",
  waybill: "Waybill",
  signed_pod: "Signed POD",
  other: "Other",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: Clock },
  verified: { label: "Verified", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<string>("id_document");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: !!user,
  });

  const uploadDocument = async () => {
    if (!selectedFile || !documentType) {
      toast({ title: "Please select a file and document type", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const urlResponse = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFile.name,
          size: selectedFile.size,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      });

      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await urlResponse.json();

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      await apiRequest("POST", "/api/documents", {
        documentType,
        fileName: selectedFile.name,
        fileUrl: objectPath,
      });

      toast({ title: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setOpen(false);
      setSelectedFile(null);
      setDocumentType("id_document");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Documents" breadcrumbs={[{ label: "Documents" }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading documents...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Documents" breadcrumbs={[{ label: "Documents" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Upload and manage your verification documents</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>Select a file from your device to upload</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id_document">ID Document</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="vehicle_registration">Vehicle Registration</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Choose File</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      data-testid="input-file-upload"
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {selectedFile ? (
                      <div>
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-sm">Click to select a file</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC (max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={uploadDocument}
                  className="w-full" 
                  disabled={isUploading || !selectedFile}
                  data-testid="button-submit-document"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!documents?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Upload your verification documents to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => {
              const statusInfo = statusConfig[doc.status];
              const StatusIcon = statusInfo.icon;
              return (
                <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium" data-testid={`text-document-name-${doc.id}`}>{doc.fileName}</h3>
                        <p className="text-sm text-muted-foreground">{documentTypeLabels[doc.documentType]}</p>
                        {doc.rejectionReason && (
                          <p className="text-sm text-destructive mt-1">Reason: {doc.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant} data-testid={`badge-status-${doc.id}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
