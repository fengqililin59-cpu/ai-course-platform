import { Navigate } from "react-router-dom";

/** 旧地址重定向至新版服务列表 */
export function CustomServicePage() {
  return <Navigate to="/services" replace />;
}
