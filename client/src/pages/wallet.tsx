import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle,
  Smartphone,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import type { Wallet, WalletTransaction, TransactionStatus, TransactionType } from "@shared/schema";

const topupSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1 && num <= 10000;
  }, "Amount must be between $1 and $10,000"),
  phone: z.string().optional(),
  method: z.enum(["ecocash", "onemoney", "innbucks", "omari", "visa_mastercard"]),
}).refine((data) => {
  // Phone required for mobile money methods only
  if (["ecocash", "onemoney", "innbucks", "omari"].includes(data.method)) {
    if (!data.phone || data.phone.length < 10) return false;
    return /^(0|263|\+263)?(77|78|71|73|78)[0-9]{7}$/.test(data.phone);
  }
  return true;
}, {
  message: "Enter a valid Zimbabwe mobile number (e.g., 0771234567)",
  path: ["phone"],
});

type TopupFormData = z.infer<typeof topupSchema>;

function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config: Record<TransactionStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    pending: { variant: "secondary", icon: <Clock className="w-3 h-3 mr-1" />, label: "Pending" },
    completed: { variant: "default", icon: <CheckCircle className="w-3 h-3 mr-1" />, label: "Completed" },
    failed: { variant: "destructive", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Failed" },
    cancelled: { variant: "outline", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Cancelled" },
  };

  const { variant, icon, label } = config[status] || config.pending;
  return (
    <Badge variant={variant} className="flex items-center" data-testid={`badge-status-${status}`}>
      {icon}
      {label}
    </Badge>
  );
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const isDeposit = type === "deposit" || type === "refund";
  return (
    <div className={`flex items-center gap-1 ${isDeposit ? "text-green-600" : "text-red-600"}`}>
      {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
      <span className="capitalize text-sm">{type.replace("_", " ")}</span>
    </div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<string | null>(null);

  const { data: profile } = useQuery<{ role: string }>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const form = useForm<TopupFormData>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: "",
      phone: "",
      method: "ecocash",
    },
  });

  const { data: wallet, isLoading: walletLoading } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

  const topupMutation = useMutation({
    mutationFn: async (data: TopupFormData) => {
      const response = await apiRequest("POST", "/api/wallet/topup", {
        amount: parseFloat(data.amount),
        phone: data.phone || undefined,
        method: data.method,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        // If redirect URL is provided (card payment), redirect to payment page
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        
        setPaymentInstructions(data.instructions || data.message);
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
        toast({
          title: "Payment Initiated",
          description: data.message || "Please complete the payment.",
        });
        form.reset();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.errors ? error.errors.join(", ") : error.message;
      toast({
        title: "Top-up Failed",
        description: errorMessage || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TopupFormData) => {
    topupMutation.mutate(data);
  };

  const balance = Number(wallet?.balance || 0);
  const pendingTransactions = transactions?.filter(t => t.status === "pending") || [];
  const completedTransactions = transactions?.filter(t => t.status === "completed") || [];
  const totalDeposits = completedTransactions
    .filter(t => t.type === "deposit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCommissions = completedTransactions
    .filter(t => t.type === "commission_deduction")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (!user || !profile) {
    return (
      <DashboardLayout title="Wallet">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please log in to view your wallet.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Wallet">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <WalletIcon className="h-5 w-5 text-primary" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="text-wallet-balance">
                ${balance.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {wallet?.currency || "USD"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Total Deposits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-deposits">
                ${totalDeposits.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Lifetime deposits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
                Commissions Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-commissions">
                ${totalCommissions.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                10% per job
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold">Commission System</h3>
                  <p className="text-sm text-muted-foreground">
                    A 10% commission is automatically deducted from your wallet when you start transporting a load.
                    You can only view and bid on loads where your wallet balance covers the commission.
                  </p>
                </div>
              </div>
              <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" data-testid="button-topup">
                    <Plus className="w-4 h-4 mr-2" />
                    Top Up Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Top Up Your Wallet</DialogTitle>
                    <DialogDescription>
                      Add funds to your wallet using EcoCash or OneMoney mobile money.
                    </DialogDescription>
                  </DialogHeader>

                  {paymentInstructions ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Payment Instructions
                        </h4>
                        <p className="text-sm">{paymentInstructions}</p>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => {
                          setPaymentInstructions(null);
                          setTopupDialogOpen(false);
                          queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
                        }}
                        data-testid="button-done"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (USD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Enter amount"
                                  min="1"
                                  step="0.01"
                                  {...field}
                                  data-testid="input-amount"
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum top-up: $1.00
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="method"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-method">
                                    <SelectValue placeholder="Select payment method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ecocash">EcoCash</SelectItem>
                                  <SelectItem value="onemoney">OneMoney</SelectItem>
                                  <SelectItem value="innbucks">InnBucks</SelectItem>
                                  <SelectItem value="omari">O'Mari</SelectItem>
                                  <SelectItem value="visa_mastercard">Visa / Mastercard</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {["ecocash", "onemoney", "innbucks", "omari"].includes(form.watch("method")) && (
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input
                                    type="tel"
                                    placeholder="0771234567"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-phone"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Your mobile money registered number
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <DialogFooter>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={topupMutation.isPending}
                            data-testid="button-submit-topup"
                          >
                            {topupMutation.isPending ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                {form.watch("method") === "visa_mastercard" ? (
                                  <DollarSign className="w-4 h-4 mr-2" />
                                ) : (
                                  <Smartphone className="w-4 h-4 mr-2" />
                                )}
                                Pay with {
                                  form.watch("method") === "ecocash" ? "EcoCash" :
                                  form.watch("method") === "onemoney" ? "OneMoney" :
                                  form.watch("method") === "innbucks" ? "InnBucks" :
                                  form.watch("method") === "omari" ? "O'Mari" :
                                  "Visa/Mastercard"
                                }
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {pendingTransactions.length > 0 && (
          <Card className="border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Transactions
              </CardTitle>
              <CardDescription>
                These transactions are waiting for confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg"
                    data-testid={`transaction-pending-${transaction.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <TransactionTypeBadge type={transaction.type as TransactionType} />
                      <div>
                        <p className="font-medium">${Number(transaction.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.description}
                        </p>
                      </div>
                    </div>
                    <TransactionStatusBadge status={transaction.status as TransactionStatus} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Your wallet deposits and commission deductions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === "deposit" || transaction.type === "refund" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {transaction.type === "deposit" || transaction.type === "refund" ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.type.replace("_", " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.createdAt && format(new Date(transaction.createdAt), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === "deposit" || transaction.type === "refund"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {transaction.type === "deposit" || transaction.type === "refund" ? "+" : "-"}
                        ${Number(transaction.amount).toFixed(2)}
                      </p>
                      <TransactionStatusBadge status={transaction.status as TransactionStatus} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Top up your wallet to start bidding on loads
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
