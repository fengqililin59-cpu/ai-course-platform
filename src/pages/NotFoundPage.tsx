import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  React.useEffect(() => {
    document.title = "404 页面不存在 - AIlearn Pro";
  }, []);

  return (
    <main className="mx-auto flex min-w-0 max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-28">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        404 页面不存在
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        您访问的地址可能已失效，或输入有误。
      </p>
      <Button className="mt-8" asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </main>
  );
}
