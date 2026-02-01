import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, User } from "lucide-react";
import type { Review, UserProfile } from "@shared/schema";

interface ReviewWithReviewer extends Review {
  reviewer?: UserProfile;
}

interface UserRating {
  average: number;
  count: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery<ReviewWithReviewer[]>({
    queryKey: ["/api/users", profile?.userId, "reviews"],
    enabled: !!profile?.userId,
  });

  const { data: rating, isLoading: loadingRating } = useQuery<UserRating>({
    queryKey: ["/api/users", profile?.userId, "rating"],
    enabled: !!profile?.userId,
  });

  if (loadingReviews || loadingRating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Reviews</h1>
        <p className="text-muted-foreground">See what others are saying about you</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold">{rating?.average.toFixed(1) || "0.0"}</div>
              <div>
                <StarRating rating={Math.round(rating?.average || 0)} />
                <p className="text-sm text-muted-foreground mt-1">
                  Based on {rating?.count || 0} review{rating?.count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!reviews?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
            <p className="text-muted-foreground text-center">
              Complete more jobs to receive reviews from your partners
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} data-testid={`card-review-${review.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="font-medium" data-testid={`text-reviewer-${review.id}`}>
                        {review.reviewer?.companyName || "Anonymous"}
                      </span>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-muted-foreground">
                          {review.createdAt && new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground" data-testid={`text-comment-${review.id}`}>
                        {review.comment}
                      </p>
                    )}
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
