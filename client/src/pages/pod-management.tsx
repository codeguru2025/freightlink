import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Send,
  Eye,
  Truck,
  MapPin,
  ArrowRight,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import type { Job, Load, UserProfile, Document as DocumentType, PaymentStatus } from "@shared/schema";

const podUploadSchema = z.object({
  documentType: z.enum(["proof_of_delivery", "invoice", "delivery_note", "shipment_note", "waybill", "signed_pod"]),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Please enter a valid URL"),
});

interface JobWithDetails extends Job {
  load?: Load;
  podDocuments?: DocumentType[];
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variants: Record<PaymentStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    pending: { variant: "secondary", icon: <Clock className="w-3 h-3 mr-1" />, label: "Pending" },
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

function JobPodCard({ job, profile, onRefresh }: { job: JobWithDetails; profile: UserProfile; onRefresh: () => void }) {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [submitPodDialogOpen, setSubmitPodDialogOpen] = useState(false);
  const [podNotes, setPodNotes] = useState("");

  const isTransporter = profile.role === "transporter";
  const isShipper = profile.role === "shipper";

  const documentForm = useForm<z.infer<typeof podUploadSchema>>({
    resolver: zodResolver(podUploadSchema),
    defaultValues: {
      documentType: "proof_of_delivery",
      fileName: "",
      fileUrl: "",
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (data: z.infer<typeof podUploadSchema>) => {
      return apiRequest("POST", "/api/documents", {
        jobId: job.id,
        documentType: data.documentType,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "Document uploaded successfully" });
      setUploadDialogOpen(false);
      documentForm.reset();
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to upload document", variant: "destructive" });
    },
  });

  const submitPodMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${job.id}/submit-pod`, { notes: podNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "POD submitted successfully" });
      setSubmitPodDialogOpen(false);
      setPodNotes("");
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to submit POD", variant: "destructive" });
    },
  });

  const confirmPodMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${job.id}/confirm-pod`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "POD confirmed successfully" });
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to confirm POD", variant: "destructive" });
    },
  });

  const requestPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${job.id}/request-payment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "Payment requested successfully" });
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to request payment", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${job.id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pod-jobs"] });
      toast({ title: "Job marked as paid" });
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to mark as paid", variant: "destructive" });
    },
  });

  const onDocumentSubmit = (data: z.infer<typeof podUploadSchema>) => {
    uploadDocMutation.mutate(data);
  };

  const podDocCount = job.podDocuments?.length || 0;
  const canSubmitPod = isTransporter && job.status === "delivered" && job.paymentStatus === "pending" && podDocCount > 0;
  const canConfirmPod = isShipper && job.paymentStatus === "pod_submitted";
  const canRequestPayment = isTransporter && job.paymentStatus === "pod_confirmed";
  const canMarkPaid = isShipper && job.paymentStatus === "payment_requested";

  return (
    <Card className="mb-4" data-testid={`card-pod-job-${job.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg" data-testid="text-pod-job-title">{job.load?.title || "Shipment"}</CardTitle>
              <CardDescription>Job #{job.id.slice(0, 8)}</CardDescription>
            </div>
          </div>
          <PaymentStatusBadge status={job.paymentStatus as PaymentStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.load && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.load.originCity}</span>
            <ArrowRight className="h-4 w-4" />
            <span>{job.load.destinationCity}</span>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{job.currency} {Number(job.agreedAmount).toLocaleString()}</span>
          </div>
          {job.deliveryConfirmedAt && (
            <span className="text-sm text-muted-foreground">
              Delivered: {format(new Date(job.deliveryConfirmedAt), "MMM d, yyyy")}
            </span>
          )}
        </div>

        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              POD Documents ({podDocCount})
            </h4>
            {isTransporter && job.paymentStatus === "pending" && (
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-upload-pod-doc">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload POD Document</DialogTitle>
                    <DialogDescription>Add proof of delivery documents for this job</DialogDescription>
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
                                <SelectTrigger data-testid="select-pod-doc-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="proof_of_delivery">Proof of Delivery</SelectItem>
                                <SelectItem value="signed_pod">Signed POD</SelectItem>
                                <SelectItem value="delivery_note">Delivery Note</SelectItem>
                                <SelectItem value="shipment_note">Shipment Note</SelectItem>
                                <SelectItem value="waybill">Waybill</SelectItem>
                                <SelectItem value="invoice">Invoice</SelectItem>
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
                                data-testid="input-pod-doc-name"
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
                                data-testid="input-pod-doc-url"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setUploadDialogOpen(false); documentForm.reset(); }} data-testid="button-cancel-pod-doc">Cancel</Button>
                        <Button type="submit" disabled={uploadDocMutation.isPending} data-testid="button-submit-pod-doc">
                          Upload
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {job.podDocuments && job.podDocuments.length > 0 ? (
            <div className="space-y-2">
              {job.podDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.fileName}</span>
                    <Badge variant="outline" className="text-xs">
                      {doc.documentType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" data-testid={`button-view-doc-${doc.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No POD documents uploaded yet</p>
          )}
        </div>

        {job.podNotes && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Notes:</strong> {job.podNotes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canSubmitPod && (
            <Dialog open={submitPodDialogOpen} onOpenChange={setSubmitPodDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-submit-pod">
                  <Send className="w-4 h-4 mr-2" />
                  Submit POD
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Proof of Delivery</DialogTitle>
                  <DialogDescription>
                    Submit your POD documents for shipper confirmation. This will trigger the payment process.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">
                      <strong>{podDocCount} document(s)</strong> will be submitted for review
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      placeholder="Add any notes for the shipper..."
                      value={podNotes}
                      onChange={(e) => setPodNotes(e.target.value)}
                      className="mt-2"
                      data-testid="input-pod-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSubmitPodDialogOpen(false)} data-testid="button-cancel-submit-pod">Cancel</Button>
                  <Button onClick={() => submitPodMutation.mutate()} disabled={submitPodMutation.isPending} data-testid="button-confirm-submit-pod">
                    Submit POD
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            <Button onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending} variant="default" data-testid="button-mark-paid">
              <CreditCard className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}

          <Link href={`/jobs/${job.id}`}>
            <Button variant="outline" data-testid={`button-view-job-${job.id}`}>
              View Job Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PodManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: podJobs, isLoading, refetch } = useQuery<JobWithDetails[]>({
    queryKey: ["/api/pod-jobs"],
    enabled: !!profile,
  });

  if (!profile) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const isTransporter = profile.role === "transporter";
  const isShipper = profile.role === "shipper";

  const deliveredJobs = podJobs?.filter(j => j.status === "delivered") || [];
  const pendingPodJobs = deliveredJobs.filter(j => j.paymentStatus === "pending");
  const submittedPodJobs = deliveredJobs.filter(j => j.paymentStatus === "pod_submitted");
  const confirmedPodJobs = deliveredJobs.filter(j => j.paymentStatus === "pod_confirmed");
  const paymentRequestedJobs = deliveredJobs.filter(j => j.paymentStatus === "payment_requested");
  const paidJobs = deliveredJobs.filter(j => j.paymentStatus === "paid");

  return (
    <DashboardLayout title="Proof of Delivery">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{pendingPodJobs.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting POD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{submittedPodJobs.length}</div>
              <p className="text-xs text-muted-foreground">POD Submitted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{confirmedPodJobs.length}</div>
              <p className="text-xs text-muted-foreground">POD Confirmed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{paymentRequestedJobs.length}</div>
              <p className="text-xs text-muted-foreground">Payment Requested</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{paidJobs.length}</div>
              <p className="text-xs text-muted-foreground">Paid</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-5" data-testid="tabs-pod-status">
            <TabsTrigger value="pending" data-testid="tab-pending">Pending ({pendingPodJobs.length})</TabsTrigger>
            <TabsTrigger value="submitted" data-testid="tab-submitted">Submitted ({submittedPodJobs.length})</TabsTrigger>
            <TabsTrigger value="confirmed" data-testid="tab-confirmed">Confirmed ({confirmedPodJobs.length})</TabsTrigger>
            <TabsTrigger value="requested" data-testid="tab-requested">Requested ({paymentRequestedJobs.length})</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">Paid ({paidJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isLoading ? (
              <div className="animate-pulse text-muted-foreground">Loading jobs...</div>
            ) : pendingPodJobs.length > 0 ? (
              pendingPodJobs.map(job => (
                <JobPodCard key={job.id} job={job} profile={profile} onRefresh={refetch} />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No jobs awaiting POD submission</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="submitted" className="mt-6">
            {submittedPodJobs.length > 0 ? (
              submittedPodJobs.map(job => (
                <JobPodCard key={job.id} job={job} profile={profile} onRefresh={refetch} />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Send className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No POD submissions pending review</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6">
            {confirmedPodJobs.length > 0 ? (
              confirmedPodJobs.map(job => (
                <JobPodCard key={job.id} job={job} profile={profile} onRefresh={refetch} />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No confirmed PODs awaiting payment request</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requested" className="mt-6">
            {paymentRequestedJobs.length > 0 ? (
              paymentRequestedJobs.map(job => (
                <JobPodCard key={job.id} job={job} profile={profile} onRefresh={refetch} />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payment requests pending</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-6">
            {paidJobs.length > 0 ? (
              paidJobs.map(job => (
                <JobPodCard key={job.id} job={job} profile={profile} onRefresh={refetch} />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed payments yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
