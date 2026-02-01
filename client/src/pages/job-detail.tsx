import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadStatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  User
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { Job, Load, UserProfile, Review, Document as DocumentType, LoadStatus } from "@shared/schema";

const documentUploadSchema = z.object({
  documentType: z.enum(["proof_of_delivery", "invoice", "insurance", "other"]),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Please enter a valid URL"),
});

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
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");

  const documentForm = useForm<z.infer<typeof documentUploadSchema>>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentType: "proof_of_delivery",
      fileName: "",
      fileUrl: "",
    },
  });

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

  const uploadDocMutation = useMutation({
    mutationFn: async (data: z.infer<typeof documentUploadSchema>) => {
      return apiRequest("POST", "/api/documents", {
        jobId,
        documentType: data.documentType,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded" });
      setUploadDialogOpen(false);
      documentForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to upload document", variant: "destructive" });
    },
  });

  const onDocumentSubmit = (data: z.infer<typeof documentUploadSchema>) => {
    uploadDocMutation.mutate(data);
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
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>Add a document for this job</DialogDescription>
                      </DialogHeader>
                      <Form {...documentForm}>
                        <form onSubmit={documentForm.handleSubmit(onDocumentSubmit)} className="space-y-4">
                          <FormField
                            control={documentForm.control}
                            name="documentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Document Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-job-doc-type">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="proof_of_delivery">Proof of Delivery</SelectItem>
                                    <SelectItem value="invoice">Invoice</SelectItem>
                                    <SelectItem value="insurance">Insurance</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={documentForm.control}
                            name="fileName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>File Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., delivery_receipt.pdf"
                                    data-testid="input-job-doc-name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={documentForm.control}
                            name="fileUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>File URL</FormLabel>
                                <FormControl>
                                  <Input
                                    type="url"
                                    placeholder="https://..."
                                    data-testid="input-job-doc-url"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setUploadDialogOpen(false); documentForm.reset(); }} data-testid="button-cancel-job-doc">Cancel</Button>
                            <Button type="submit" disabled={uploadDocMutation.isPending} data-testid="button-submit-job-doc">
                              Upload
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
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
