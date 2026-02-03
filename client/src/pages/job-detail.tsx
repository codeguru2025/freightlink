import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadStatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MapPin, 
  ArrowRight, 
  Calendar, 
  DollarSign, 
  ArrowLeft,
  Truck,
  MessageSquare,
  Star,
  AlertTriangle,
  FileText,
  Upload,
  CheckCircle,
  User,
  Send,
  CreditCard,
  Clock,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";
import type { Job, Load, UserProfile, Review, Document as DocumentType, LoadStatus, PaymentStatus } from "@shared/schema";

const documentTypeOptions = [
  { value: "proof_of_delivery", label: "Proof of Delivery" },
  { value: "delivery_note", label: "Delivery Note" },
  { value: "shipment_note", label: "Shipment Note" },
  { value: "waybill", label: "Waybill" },
  { value: "signed_pod", label: "Signed POD" },
  { value: "invoice", label: "Invoice" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variants: Record<PaymentStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    pending: { variant: "secondary", icon: <Clock className="w-3 h-3 mr-1" />, label: "Awaiting POD" },
    pod_submitted: { variant: "outline", icon: <Send className="w-3 h-3 mr-1" />, label: "POD Submitted" },
    pod_confirmed: { variant: "outline", icon: <CheckCircle className="w-3 h-3 mr-1" />, label: "POD Confirmed" },
    payment_requested: { variant: "default", icon: <DollarSign className="w-3 h-3 mr-1" />, label: "Payment Requested" },
    paid: { variant: "default", icon: <CreditCard className="w-3 h-3 mr-1" />, label: "Paid" },
  };

  const { variant, icon, label } = variants[status] || variants.pending;
  
  return (
    <Badge variant={variant} className="flex items-center" data-testid={`badge-payment-status-${status}`}>
      {icon}
      {label}
    </Badge>
  );
}

interface JobWithDetails extends Job {
  load?: Load;
}

interface ReviewWithReviewer extends Review {
  reviewer?: UserProfile;
}

function StarRating({ rating, onSelect, interactive = false }: { rating: number; onSelect?: (r: number) => void; interactive?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-6 h-6 ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""} ${
            star <= rating ? "fill-primary text-primary" : "text-muted-foreground"
          }`}
          onClick={() => interactive && onSelect?.(star)}
          data-testid={`star-rating-${star}`}
        />
      ))}
    </div>
  );
}

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const [, navigate] = useLocation();
  const jobId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [paymentProofDialogOpen, setPaymentProofDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [docType, setDocType] = useState("proof_of_delivery");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isUploadingPaymentProof, setIsUploadingPaymentProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paymentProofInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: job, isLoading } = useQuery<JobWithDetails>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/jobs", jobId, "reviews"],
    enabled: !!jobId,
  });

  const { data: documents } = useQuery<DocumentType[]>({
    queryKey: ["/api/jobs", jobId, "documents"],
    enabled: !!jobId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: LoadStatus) => {
      const response = await apiRequest("PATCH", `/api/jobs/${jobId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const revieweeId = profile?.role === "shipper" ? job?.transporterId : job?.shipperId;
      return apiRequest("POST", `/api/jobs/${jobId}/reviews`, {
        revieweeId,
        rating,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "reviews"] });
      toast({ title: "Review submitted" });
      setReviewDialogOpen(false);
      setRating(5);
      setComment("");
    },
    onError: () => {
      toast({ title: "Failed to submit review", variant: "destructive" });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      const againstId = profile?.role === "shipper" ? job?.transporterId : job?.shipperId;
      return apiRequest("POST", "/api/disputes", {
        jobId,
        againstId,
        reason: disputeReason,
        description: disputeDescription,
      });
    },
    onSuccess: () => {
      toast({ title: "Dispute submitted" });
      setDisputeDialogOpen(false);
      setDisputeReason("");
      setDisputeDescription("");
    },
    onError: () => {
      toast({ title: "Failed to submit dispute", variant: "destructive" });
    },
  });

  const handleDocumentUpload = async () => {
    if (!selectedFile || !docType) {
      toast({ title: "Please select a file and document type", variant: "destructive" });
      return;
    }

    setIsUploadingDoc(true);
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
        jobId,
        documentType: docType,
        fileName: selectedFile.name,
        fileUrl: objectPath,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded successfully" });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocType("proof_of_delivery");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const submitPodMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${jobId}/submit-pod`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "POD submitted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to submit POD", variant: "destructive" });
    },
  });

  const confirmPodMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${jobId}/confirm-pod`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "POD confirmed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to confirm POD", variant: "destructive" });
    },
  });

  const requestPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${jobId}/request-payment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "Payment requested successfully" });
    },
    onError: () => {
      toast({ title: "Failed to request payment", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${jobId}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "documents"] });
      toast({ title: "Payment marked as complete" });
      setPaymentProofDialogOpen(false);
      setPaymentProofFile(null);
    },
    onError: () => {
      toast({ title: "Failed to mark as paid", variant: "destructive" });
    },
  });

  const handleUploadPaymentProofAndMarkPaid = async () => {
    if (!paymentProofFile) {
      toast({ title: "Please select a payment proof file", variant: "destructive" });
      return;
    }

    setIsUploadingPaymentProof(true);
    try {
      // Get presigned upload URL
      const urlResponse = await apiRequest("POST", "/api/uploads/request-url", {
        name: paymentProofFile.name,
        size: paymentProofFile.size,
        contentType: paymentProofFile.type,
      });
      const { uploadURL, objectPath } = await urlResponse.json();

      // Upload file to presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: paymentProofFile,
        headers: { "Content-Type": paymentProofFile.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      // Create document record for payment proof
      await apiRequest("POST", "/api/documents", {
        documentType: "payment_proof",
        fileName: paymentProofFile.name,
        fileUrl: objectPath,
        jobId: jobId,
      });

      // Now mark the job as paid
      await markPaidMutation.mutateAsync();
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast({ title: "Failed to upload payment proof", variant: "destructive" });
    } finally {
      setIsUploadingPaymentProof(false);
    }
  };

  const startConversation = () => {
    const partnerId = profile?.role === "shipper" ? job?.transporterId : job?.shipperId;
    if (partnerId) {
      navigate(`/messages?partner=${partnerId}`);
    }
  };

  const isTransporter = profile?.role === "transporter";
  const isShipper = profile?.role === "shipper";
  const isDelivered = job?.status === "delivered";
  const hasReviewed = reviews?.some(r => r.reviewerId === profile?.userId);

  const podDocCount = documents?.filter(d => 
    ['proof_of_delivery', 'invoice', 'delivery_note', 'shipment_note', 'waybill', 'signed_pod'].includes(d.documentType)
  ).length || 0;
  const canSubmitPod = isTransporter && job?.status === "delivered" && job?.paymentStatus === "pending" && podDocCount > 0;
  const canConfirmPod = isShipper && job?.paymentStatus === "pod_submitted";
  const canRequestPayment = isTransporter && job?.paymentStatus === "pod_confirmed";
  const canMarkPaid = isShipper && job?.paymentStatus === "payment_requested";

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading job details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout title="Job Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This job could not be found.</p>
          <Link href="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={job.load?.title || "Job Details"} breadcrumbs={[{ label: "Jobs", href: "/jobs" }, { label: job.load?.title || "Details" }]}>
      <div className="space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-to-jobs">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl" data-testid="text-job-title">{job.load?.title || "Shipment"}</CardTitle>
                      <CardDescription>Job #{job.id.slice(0, 8)}</CardDescription>
                    </div>
                  </div>
                  <LoadStatusBadge status={job.status as LoadStatus} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {job.load && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{job.load.originCity}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <MapPin className="h-5 w-5 text-destructive" />
                        <span className="font-semibold">{job.load.destinationCity}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Agreed Amount</p>
                      <p className="font-medium">{job.currency} {Number(job.agreedAmount).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">{job.createdAt && format(new Date(job.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isTransporter && job.status === "accepted" && (
                    <Button onClick={() => updateStatusMutation.mutate("in_transit")} data-testid="button-start-transit">
                      Start Transit
                    </Button>
                  )}
                  {isTransporter && job.status === "in_transit" && (
                    <Button onClick={() => updateStatusMutation.mutate("delivered")} data-testid="button-mark-delivered">
                      Mark as Delivered
                    </Button>
                  )}
                  {isShipper && job.status === "in_transit" && (
                    <Button onClick={() => updateStatusMutation.mutate("delivered")} data-testid="button-confirm-delivery">
                      Confirm Delivery
                    </Button>
                  )}
                  <Button variant="outline" onClick={startConversation} data-testid="button-message">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message {isShipper ? "Transporter" : "Shipper"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {isDelivered && (
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Proof of Delivery & Payment
                      </CardTitle>
                      <CardDescription>Manage POD submission and payment workflow</CardDescription>
                    </div>
                    <PaymentStatusBadge status={job.paymentStatus as PaymentStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">POD Documents uploaded</span>
                      <span className="font-medium">{podDocCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {canSubmitPod && (
                      <Button onClick={() => submitPodMutation.mutate()} disabled={submitPodMutation.isPending} data-testid="button-submit-pod">
                        <Send className="w-4 h-4 mr-2" />
                        Submit POD
                      </Button>
                    )}
                    {canConfirmPod && (
                      <Button onClick={() => confirmPodMutation.mutate()} disabled={confirmPodMutation.isPending} data-testid="button-confirm-pod">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm POD
                      </Button>
                    )}
                    {canRequestPayment && (
                      <Button onClick={() => requestPaymentMutation.mutate()} disabled={requestPaymentMutation.isPending} data-testid="button-request-payment">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Request Payment
                      </Button>
                    )}
                    {canMarkPaid && (
                      <Dialog open={paymentProofDialogOpen} onOpenChange={setPaymentProofDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="default" data-testid="button-mark-paid">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark as Paid
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Payment Proof</DialogTitle>
                            <DialogDescription>
                              Upload proof of payment (bank transfer receipt, mobile money confirmation, etc.) before marking as paid
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div 
                              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => paymentProofInputRef.current?.click()}
                              data-testid="container-payment-proof-upload"
                            >
                              <input
                                ref={paymentProofInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setPaymentProofFile(file);
                                }}
                                accept=".pdf,.jpg,.jpeg,.png"
                                data-testid="input-payment-proof-file"
                              />
                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              {paymentProofFile ? (
                                <div>
                                  <p className="font-medium text-sm">{paymentProofFile.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(paymentProofFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium">Click to select payment proof</p>
                                  <p className="text-sm text-muted-foreground">PDF, JPG, or PNG</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setPaymentProofDialogOpen(false);
                                setPaymentProofFile(null);
                              }}
                              data-testid="button-cancel-payment-proof"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleUploadPaymentProofAndMarkPaid}
                              disabled={!paymentProofFile || isUploadingPaymentProof}
                              data-testid="button-submit-payment-proof"
                            >
                              {isUploadingPaymentProof ? "Uploading..." : "Upload & Mark as Paid"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Link href="/pod">
                      <Button variant="outline" data-testid="button-view-pod-page">
                        View POD Dashboard
                      </Button>
                    </Link>
                  </div>

                  {job.paymentStatus === "paid" && job.paidAt && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Payment completed on {format(new Date(job.paidAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isDelivered && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Reviews
                  </CardTitle>
                  <CardDescription>Feedback for this job</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews && reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div key={review.id} className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <StarRating rating={review.rating} />
                          <span className="text-sm text-muted-foreground">
                            {review.createdAt && format(new Date(review.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        {review.comment && <p className="text-muted-foreground">{review.comment}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No reviews yet</p>
                  )}

                  {!hasReviewed && (
                    <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" data-testid="button-leave-review">
                          <Star className="w-4 h-4 mr-2" />
                          Leave a Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Leave a Review</DialogTitle>
                          <DialogDescription>Share your experience with the {isShipper ? "transporter" : "shipper"}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Rating</label>
                            <div className="mt-2">
                              <StarRating rating={rating} onSelect={setRating} interactive />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Comment (optional)</label>
                            <Textarea
                              placeholder="Share your experience..."
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              className="mt-2"
                              data-testid="input-review-comment"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setReviewDialogOpen(false)} data-testid="button-cancel-review">Cancel</Button>
                          <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending} data-testid="button-submit-review">
                            Submit Review
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Job Documents
                    </CardTitle>
                    <CardDescription>Upload proof of delivery and other documents</CardDescription>
                  </div>
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-upload-job-doc">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload POD Document</DialogTitle>
                        <DialogDescription>Select a file from your device to upload as proof of delivery</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Document Type</label>
                          <Select value={docType} onValueChange={setDocType}>
                            <SelectTrigger data-testid="select-job-doc-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Choose File</label>
                          <div 
                            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setSelectedFile(file);
                              }}
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              data-testid="input-job-doc-file"
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

                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => { 
                              setUploadDialogOpen(false); 
                              setSelectedFile(null);
                              setDocType("proof_of_delivery");
                            }} 
                            data-testid="button-cancel-job-doc"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleDocumentUpload}
                            disabled={isUploadingDoc || !selectedFile} 
                            data-testid="button-submit-job-doc"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploadingDoc ? "Uploading..." : "Upload"}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.fileName}</p>
                            <p className="text-sm text-muted-foreground">{doc.documentType.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                        <Badge variant={doc.status === "verified" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"}>
                          {doc.status === "verified" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {isShipper ? "Transporter" : "Shipper"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">Contact via messaging</p>
                <Button variant="outline" className="w-full mt-4" onClick={startConversation} data-testid="button-sidebar-message">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>

            {!isDelivered && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Having Issues?
                  </CardTitle>
                  <CardDescription>Report a problem with this job</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" data-testid="button-raise-dispute">
                        Raise a Dispute
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Raise a Dispute</DialogTitle>
                        <DialogDescription>Report an issue with this job for admin review</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Reason</label>
                          <Select value={disputeReason} onValueChange={setDisputeReason}>
                            <SelectTrigger className="mt-2" data-testid="select-dispute-reason">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Payment Issue">Payment Issue</SelectItem>
                              <SelectItem value="Damage to Goods">Damage to Goods</SelectItem>
                              <SelectItem value="Delivery Delay">Delivery Delay</SelectItem>
                              <SelectItem value="Communication Issue">Communication Issue</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            placeholder="Describe the issue in detail..."
                            value={disputeDescription}
                            onChange={(e) => setDisputeDescription(e.target.value)}
                            className="mt-2"
                            data-testid="input-dispute-description"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDisputeDialogOpen(false)} data-testid="button-cancel-dispute">Cancel</Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => disputeMutation.mutate()} 
                          disabled={!disputeReason || disputeDescription.length < 10 || disputeMutation.isPending}
                          data-testid="button-submit-dispute"
                        >
                          Submit Dispute
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
