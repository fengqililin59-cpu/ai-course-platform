import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingStarsProps {
  rating: number;
  size?: number;
  className?: string;
}

export function RatingStars({ rating, size = 16, className }: RatingStarsProps) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));
  const fullStars = Math.floor(r);
  const hasHalf = r - fullStars >= 0.5;
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(
            star <= fullStars && "fill-amber-400 text-amber-400",
            star === fullStars + 1 && hasHalf && "fill-amber-400/50 text-amber-400",
            star > fullStars + (hasHalf ? 1 : 0) && "fill-transparent text-muted-foreground/35",
          )}
        />
      ))}
    </div>
  );
}
