import * as React from "react";
import { useLocation } from "react-router-dom";

/** 路由变化时将视口滚回顶部 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
