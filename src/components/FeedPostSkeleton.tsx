import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export function FeedPostSkeleton() {
  return (
    <Card className="mb-4 w-full bg-white shadow-sm border-gray-100 overflow-hidden">
      {/* Header: Avatar + Name + Time */}
      <CardHeader className="flex flex-row items-center gap-3 p-4 pb-2">
        <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32 bg-gray-200" />
          <Skeleton className="h-3 w-20 bg-gray-100" />
        </div>
      </CardHeader>

      {/* Body: Text + Image */}
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-gray-100" />
          <Skeleton className="h-4 w-[90%] bg-gray-100" />
        </div>
        {/* Large image placeholder */}
        <Skeleton className="h-[250px] w-full rounded-xl bg-gray-200 mt-3" />
      </CardContent>

      {/* Footer: Action Buttons */}
      <CardFooter className="p-3 bg-gray-50/50 flex justify-between border-t border-gray-100">
        <div className="flex gap-4">
          <Skeleton className="h-8 w-16 rounded-lg bg-gray-200" />
          <Skeleton className="h-8 w-16 rounded-lg bg-gray-200" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
      </CardFooter>
    </Card>
  );
}
