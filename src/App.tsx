import { Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminRequireAuth } from "@/admin/AdminAuth";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { AdminCourseFormPage } from "@/pages/admin/AdminCourseFormPage";
import { AdminJoinPage } from "@/pages/admin/AdminJoinPage";
import { VisionConsultationsPage } from "@/pages/admin/VisionConsultationsPage";
import { AdminShareLinksPage } from "@/pages/admin/AdminShareLinksPage";
import { AdminCouponsPage } from "@/pages/admin/AdminCouponsPage";
import { AdminSeckillPage } from "@/pages/admin/AdminSeckillPage";
import { AdminWithdrawalsPage } from "@/pages/admin/AdminWithdrawalsPage";
import { AdminDashboardMetricsPage } from "@/pages/admin/AdminDashboardMetricsPage";
import { AdminNotificationSettingsPage } from "@/pages/admin/AdminNotificationSettingsPage";
import { DashboardAnalyticsPage } from "@/pages/admin/DashboardAnalyticsPage";
import { HomePage } from "@/pages/HomePage";
import { CourseListPage } from "@/pages/CourseListPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { VipPage } from "@/pages/VipPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PaySuccessPage } from "@/pages/PaySuccessPage";
import { PayDevSimulatePage } from "@/pages/PayDevSimulatePage";
import { CustomServicePage } from "@/pages/CustomServicePage";
import { ServicesListPage } from "@/pages/ServicesListPage";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import { ServiceConsultPage } from "@/pages/ServiceConsultPage";
import { ServiceWechatQrPage } from "@/pages/ServiceWechatQrPage";
import { AiVisionServicePage } from "@/pages/AiVisionServicePage";
import { SaasSystemServicePage } from "@/pages/SaasSystemServicePage";
import { SaaSCrmServicePage } from "@/pages/SaaSCrmServicePage";
import { JobsRadarPage } from "@/pages/JobsRadarPage";
import { JoinPage } from "@/pages/JoinPage";
import OAuthCallbackPage from "@/pages/OAuthCallbackPage";
import { CreatorRequireAuth } from "@/creator/CreatorAuth";
import { CreatorLoginPage } from "@/pages/creator/CreatorLoginPage";
import {
  CreatorLayout,
  CreatorOverviewPage,
} from "@/pages/creator/CreatorOverviewPage";
import { CreatorCoursesPage } from "@/pages/creator/CreatorCoursesPage";
import { CreatorEarningsPage } from "@/pages/creator/CreatorEarningsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/creator/login" element={<CreatorLoginPage />} />
      <Route path="/creator" element={<CreatorRequireAuth />}>
        <Route element={<CreatorLayout />}>
          <Route index element={<CreatorOverviewPage />} />
          <Route path="courses" element={<CreatorCoursesPage />} />
          <Route path="earnings" element={<CreatorEarningsPage />} />
        </Route>
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminRequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="analytics" element={<DashboardAnalyticsPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/new" element={<AdminCourseFormPage />} />
          <Route path="courses/edit/:courseId" element={<AdminCourseFormPage />} />
          <Route path="join" element={<AdminJoinPage />} />
          <Route path="vision-consultations" element={<VisionConsultationsPage />} />
          <Route path="share-links" element={<AdminShareLinksPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="seckill" element={<AdminSeckillPage />} />
          <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="dashboard-metrics" element={<AdminDashboardMetricsPage />} />
          <Route path="notification-settings" element={<AdminNotificationSettingsPage />} />
        </Route>
      </Route>

      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/jobs" element={<JobsRadarPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/pay/success" element={<PaySuccessPage />} />
        <Route path="/pay/dev-simulate" element={<PayDevSimulatePage />} />
        <Route path="/vip" element={<VipPage />} />
        <Route path="/services" element={<ServicesListPage />} />
        <Route path="/services/consult" element={<ServiceConsultPage />} />
        <Route path="/services/wechat" element={<ServiceWechatQrPage />} />
        <Route path="/services/ai-vision" element={<AiVisionServicePage />} />
        <Route path="/services/saas-system" element={<SaasSystemServicePage />} />
        <Route path="/services/saas-crm" element={<SaaSCrmServicePage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/custom-service" element={<CustomServicePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
