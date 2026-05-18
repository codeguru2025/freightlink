import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, LogOut } from "lucide-react";

export default function TermsAcceptancePage() {
  const { logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/accept-terms");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Terms Accepted",
        description: "Welcome to FreightLink ZW!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Terms & Conditions</CardTitle>
          <CardDescription>
            Please review and accept our terms to continue using FreightLink ZW
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 text-sm text-muted-foreground leading-relaxed">
            <div className="text-center mb-4">
              <h2 className="font-bold text-foreground text-base uppercase tracking-wide">Sage-Route Logistics</h2>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">Terms and Conditions</h3>
              <p className="text-xs mt-1">Platform for Consignment Posting and Transporter Matching</p>
              <p className="text-xs">Version: 1.0</p>
            </div>

            <h3 className="font-bold text-foreground mb-2">1. Definitions</h3>
            <p className="mb-2">In these Terms and Conditions, unless the context otherwise requires:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li><span className="font-semibold text-foreground">"Sage-Route" / "Company" / "Platform"</span> means Sage-Route Logistics, a company duly registered under the laws of Zimbabwe, operating a digital consignment matching web application.</li>
              <li><span className="font-semibold text-foreground">"Transporter"</span> means any carrier, haulier, or logistics service provider who registers on the Platform and submits a request to accept a consignment job.</li>
              <li><span className="font-semibold text-foreground">"Consignor"</span> means the party (including but not limited to shippers, manufacturers, wholesalers, or agents) who posts a consignment on the Platform through Sage-Route.</li>
              <li><span className="font-semibold text-foreground">"Consignment"</span> means the goods or cargo described in a posting on the Platform, including details such as origin, destination, nature of goods, estimated weight/volume, and any other relevant information.</li>
              <li><span className="font-semibold text-foreground">"Request"</span> means a transporter's electronic expression of interest to accept a specific consignment job posted on the Platform.</li>
              <li><span className="font-semibold text-foreground">"Acceptance"</span> means Sage-Route's formal approval of a Transporter's Request after verification with the Consignor that the consignment remains available.</li>
              <li><span className="font-semibold text-foreground">"15% Interest Fee"</span> means the fee equivalent to fifteen percent (15%) of the total agreed transport charge, payable by the Transporter upon Acceptance via the PayNow merchant application (EcoCash).</li>
              <li><span className="font-semibold text-foreground">"Pickup Details"</span> means the full address, contact person, and any specific instructions for collecting the consignment, released to the Transporter only after payment of the 15% Interest Fee.</li>
              <li><span className="font-semibold text-foreground">"PayNow Merchant Application (EcoCash)"</span> means the mobile money and payment gateway used to collect the Interest Fee from Transporters.</li>
              <li><span className="font-semibold text-foreground">"Working Day"</span> means any day other than a Saturday, Sunday, or public holiday in Zimbabwe.</li>
            </ul>

            <h3 className="font-bold text-foreground mb-2">2. Nature and Role of Sage-Route Logistics</h3>
            <p className="mb-2">2.1 Sage-Route Logistics is not a carrier, freight forwarder, common carrier, or agent of any Consignor or Transporter.</p>
            <p className="mb-2">2.2 The Platform acts solely as a digital introducer and matching facilitator between Consignors who wish to have goods transported and Transporters who wish to provide transport services.</p>
            <p className="mb-2">2.3 No contract of carriage is created between Sage-Route Logistics and any Consignor, Transporter, or Consignee at any time.</p>
            <p className="mb-4">2.4 Sage-Route does not take physical custody, possession, or control of any consignment at any point.</p>

            <h3 className="font-bold text-foreground mb-2">3. Platform Process</h3>
            <p className="mb-2">The following steps govern all transactions on the Platform:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li><span className="font-semibold text-foreground">3.1</span> Consignor provides consignment details to Sage-Route, which posts them on the Platform.</li>
              <li><span className="font-semibold text-foreground">3.2</span> Transporters view available consignments and submit a Request to accept a job.</li>
              <li><span className="font-semibold text-foreground">3.3</span> Sage-Route verifies with the Consignor whether the consignment is still available.</li>
              <li><span className="font-semibold text-foreground">3.4</span> If available: Sage-Route accepts the Transporter's Request, triggers the 15% Interest Fee via PayNow/EcoCash, and upon payment, releases full Pickup Details to the Transporter.</li>
              <li><span className="font-semibold text-foreground">3.5</span> If not available: Sage-Route declines the Request. No fee is charged.</li>
            </ul>

            <h3 className="font-bold text-foreground mb-2">4. The 15% Interest Fee</h3>
            <p className="mb-2">4.1 The 15% Interest Fee is calculated as fifteen percent (15%) of the total transport charge quoted or estimated for the consignment.</p>
            <p className="mb-2">4.2 The Fee is payable immediately upon Acceptance via the PayNow merchant application (EcoCash).</p>
            <p className="mb-2">4.3 <span className="font-semibold text-foreground">Non-Refundable:</span> The Fee is non-refundable once Pickup Details have been provided to the Transporter, even if the Transporter later fails to collect, delays, or does not complete the delivery.</p>
            <p className="mb-2">4.4 <span className="font-semibold text-foreground">Refund Only:</span> The Fee will be refunded in full only if Sage-Route accepts a Request but is subsequently unable to provide the Pickup Details to the Transporter.</p>
            <p className="mb-4">4.5 Sage-Route is not responsible for any mobile network, EcoCash, or PayNow transaction failures beyond its reasonable control.</p>

            <h3 className="font-bold text-foreground mb-2">5. Release of Pickup Details and Cessation of Liability</h3>
            <p className="mb-2">5.1 Sage-Route's sole obligation to the Transporter is to provide the Pickup Details after Acceptance and payment of the 15% Interest Fee.</p>
            <p className="mb-2">5.2 Liability ceases immediately upon Sage-Route providing the Pickup Details to the Transporter, whether by email, SMS, in-app notification, or any other method.</p>
            <p className="mb-2">5.3 From that moment onward, all matters relating to the consignment are solely between the Transporter and the Consignor, including but not limited to: delivery time and date, proof of delivery (PODs), cargo handling, loading and offloading, insurance of goods in transit, delays, damage, partial or total loss, payment of the balance of the transport charge, and any disputes arising from carriage.</p>
            <p className="mb-4">5.4 Sage-Route has no authority to negotiate, vary, or enforce any terms between the Transporter and Consignor.</p>

            <h3 className="font-bold text-foreground mb-2">6. Transporter's Obligations</h3>
            <p className="mb-2">The Transporter agrees and warrants that:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>6.1 It will, prior to collecting any consignment, enter into a direct agreement with the Consignor governing delivery terms, insurance, liability, proof of delivery, and payment of the balance of the transport charge.</li>
              <li>6.2 It will obtain and maintain all necessary insurance covering the consignment against loss, damage, theft, or delay.</li>
              <li>6.3 It will obtain all permits, licenses, and authorisations required under Zimbabwean law (including the Road Motor Transport Act, Traffic Acts, and any cross-border permits if applicable).</li>
              <li>6.4 It will assign only properly licensed, competent drivers and maintain vehicles in a roadworthy and clean condition.</li>
              <li>6.5 It will not hold Sage-Route liable for any representation made by the Consignor regarding the consignment (including weight, nature, or readiness for collection).</li>
            </ul>

            <h3 className="font-bold text-foreground mb-2">7. Limitation of Liability</h3>
            <p className="mb-2">7.1 <span className="font-semibold text-foreground">No liability for carriage:</span> Sage-Route shall not be liable to any Transporter, Consignor, Consignee, or third party for any loss, damage, delay, claim, or expense arising from or related to the actual carriage, handling, storage, or delivery of any consignment; the condition, quality, quantity, or legality of any goods; any act, omission, or default of the Transporter or Consignor; any failure by the Transporter to insure the goods; or any dispute between Transporter and Consignor.</p>
            <p className="mb-2">7.2 <span className="font-semibold text-foreground">Maximum liability:</span> To the extent permitted by Zimbabwean law, Sage-Route's total aggregate liability shall not exceed the amount of the 15% Interest Fee paid by the Transporter in respect of the specific consignment.</p>
            <p className="mb-4">7.3 Sage-Route is not liable for any indirect, special, incidental, or consequential damages, including loss of profits or revenue.</p>

            <h3 className="font-bold text-foreground mb-2">8. Indemnity</h3>
            <p className="mb-4">The Transporter hereby indemnifies and holds harmless Sage-Route, its directors, employees, and agents against any and all claims, damages, losses, liabilities, costs, or expenses (including legal fees) arising from or in connection with: the Transporter's handling or carriage of any consignment; any breach of these Terms by the Transporter; any claim brought by a Consignor, Consignee, or third party relating to the consignment; or any accident, spill, theft, or damage involving the consignment.</p>

            <h3 className="font-bold text-foreground mb-2">9. No Agency, Partnership, or Joint Venture</h3>
            <p className="mb-4">Nothing in these Terms shall be construed as creating an agency, partnership, joint venture, or employer-employee relationship between Sage-Route and any Transporter or Consignor. Transporters act as independent contractors.</p>

            <h3 className="font-bold text-foreground mb-2">10. Force Majeure</h3>
            <p className="mb-4">Sage-Route shall not be liable for any delay or failure to perform its obligations if such delay or failure results from events beyond its reasonable control, including but not limited to: acts of God, war, civil unrest, strikes, lockouts, fire, flood, drought, pandemic, government action, telecommunications or internet failure, or PayNow/EcoCash system downtime.</p>

            <h3 className="font-bold text-foreground mb-2">11. Dispute Resolution</h3>
            <p className="mb-2">11.1 The parties shall first attempt to resolve any dispute amicably through direct negotiations within 14 days of written notice of the dispute.</p>
            <p className="mb-2">11.2 If amicable resolution fails, the dispute shall be referred to arbitration in terms of the Arbitration Act of Zimbabwe (Chapter 7:15).</p>
            <p className="mb-2">11.3 The arbitration shall be conducted by a single arbitrator agreed upon by the parties, or failing agreement within 10 days, appointed by the President of the Commercial Arbitration Centre of Zimbabwe.</p>
            <p className="mb-4">11.4 The arbitrator's award shall be final and binding. Each party bears its own costs unless the arbitrator orders otherwise.</p>

            <h3 className="font-bold text-foreground mb-2">12. Governing Law</h3>
            <p className="mb-4">These Terms and Conditions and any dispute arising from them shall be governed by and construed in accordance with the laws of the Republic of Zimbabwe.</p>

            <h3 className="font-bold text-foreground mb-2">13. Entire Agreement</h3>
            <p className="mb-2">13.1 These Terms constitute the entire agreement between Sage-Route and the Transporter regarding the use of the Platform for consignment matching.</p>
            <p className="mb-4">13.2 No representation, warranty, or term not expressly set out in these Terms shall be binding.</p>

            <h3 className="font-bold text-foreground mb-2">14. Variation</h3>
            <p className="mb-4">No variation, amendment, or agreed cancellation of these Terms shall be effective unless recorded in writing and signed by a duly authorised representative of Sage-Route Logistics.</p>

            <h3 className="font-bold text-foreground mb-2">15. Waiver</h3>
            <p className="mb-4">No failure or delay by Sage-Route in exercising any right or remedy under these Terms shall operate as a waiver thereof, nor shall any single or partial exercise preclude any further exercise of that or any other right.</p>

            <h3 className="font-bold text-foreground mb-2">16. Severability</h3>
            <p className="mb-4">If any clause or part of these Terms is found by a court or arbitrator to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.</p>

            <h3 className="font-bold text-foreground mb-2">17. Notices and Domicilium</h3>
            <p className="mb-2">17.1 Sage-Route's domicilium citandi et executandi for all purposes under these Terms is: 353 9th St Mzilikazi, Bulawayo, Zimbabwe. Email: sageroutelogistics@gmail.com</p>
            <p className="mb-2">17.2 The Transporter's domicilium shall be the address provided during registration. Notices may be sent by email or to the registered physical address.</p>
            <p className="mb-4">17.3 Notices sent by email shall be deemed received on the same working day if sent during working hours, otherwise on the next working day.</p>

            <h3 className="font-bold text-foreground mb-2">18. Acceptance of Terms</h3>
            <p className="mb-2">By registering on the Platform and/or submitting a Request for any consignment, the Transporter acknowledges that:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>It has read, understood, and agrees to be bound by these Terms and Conditions.</li>
              <li>It accepts that Sage-Route's liability ceases entirely upon provision of Pickup Details.</li>
              <li>It agrees to the 15% Interest Fee mechanism as described.</li>
            </ul>
          </ScrollArea>

          <div className="flex items-center space-x-2 mt-6">
            <Checkbox 
              id="terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)} 
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the terms and conditions and privacy policy
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Decline & Logout
          </Button>
          <Button 
            className="flex-1" 
            disabled={!accepted || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? "Processing..." : "Accept & Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
