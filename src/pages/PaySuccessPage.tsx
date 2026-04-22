import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCourseUser } from "@/contexts/CourseUserContext";
import { formatCoursePrice } from "@/data/courses";

export function PaySuccessPage() {
  const [searchParams] = useSearchParams();
  const { addPurchase } = useCourseUser();
  const orderId = searchParams.get("orderId") ?? "";
  const courseId = searchParams.get("courseId") ?? "";
  const amount = searchParams.get("amount") ?? "";
  const courseNameRaw = searchParams.get("courseName") ?? "";
  const courseName = React.useMemo(() => {
    try {
      return decodeURIComponent(courseNameRaw);
    } catch {
      return courseNameRaw;
    }
  }, [courseNameRaw]);

  const appliedRef = React.useRef(false);

  React.useEffect(() => {
    document.title = "支付成功 - AIlearn Pro";
  }, []);

  React.useEffect(() => {
    if (!courseId || appliedRef.current) return;
    appliedRef.current = true;
    addPurchase(courseId);
  }, [courseId, addPurchase]);

  const valid = Boolean(courseId && orderId);

  return (
    <main className="mx-auto min-w-0 max-w-lg px-4 py-16 sm:px-6 sm:py-20">
      <Card className="border-border/80 shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <CardTitle className="mt-4 text-2xl">支付成功！开始学习吧</CardTitle>
          <CardDescription>
            {valid
              ? "课程已解锁，可在个人中心或课程页继续学习。"
              : "缺少订单参数，请从课程页重新发起支付。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {valid ? (
            <dl className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">课程</dt>
                <dd className="mt-1 font-medium text-foreground">{courseName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">实付金额</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {amount && !Number.isNaN(Number(amount))
                    ? formatCoursePrice(Number(amount))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">订单号</dt>
                <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {orderId}
                </dd>
              </div>
            </dl>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {valid ? (
              <Button size="lg" className="gap-2" asChild>
                <Link to={`/courses/${courseId}`}>
                  立即开始学习
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            ) : null}
            <Button size="lg" variant="outline" asChild>
              <Link to="/courses">返回课程列表</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
