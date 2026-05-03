import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminRequireAuth } from "@/admin/AdminAuth";
import { CreatorRequireAuth } from "@/creator/CreatorAuth";

const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage").then(m=>({default:m.AdminLoginPage})));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage").then(m=>({default:m.AdminDashboardPage})));
const AdminCoursesPage = lazy(() => import("@/pages/admin/AdminCoursesPage").then(m=>({default:m.AdminCoursesPage})));
const AdminCourseFormPage = lazy(() => import("@/pages/admin/AdminCourseFormPage").then(m=>({default:m.AdminCourseFormPage})));
const AdminJoinPage = lazy(() => import("@/pages/admin/AdminJoinPage").then(m=>({default:m.AdminJoinPage})));
const VisionConsultationsPage = lazy(() => import("@/pages/admin/VisionConsultationsPage").then(m=>({default:m.VisionConsultationsPage})));
const AdminShareLinksPage = lazy(() => import("@/pages/admin/AdminShareLinksPage").then(m=>({default:m.AdminShareLinksPage})));
const AdminCouponsPage = lazy(() => import("@/pages/admin/AdminCouponsPage").then(m=>({default:m.AdminCouponsPage})));
const AdminSeckillPage = lazy(() => import("@/pages/admin/AdminSeckillPage").then(m=>({default:m.AdminSeckillPage})));
const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/AdminWithdrawalsPage").then(m=>({default:m.AdminWithdrawalsPage})));
const AdminDashboardMetricsPage = lazy(() => import("@/pages/admin/AdminDashboardMetricsPage").then(m=>({default:m.AdminDashboardMetricsPage})));
const AdminNotificationSettingsPage = lazy(() => import("@/pages/admin/AdminNotificationSettingsPage").then(m=>({default:m.AdminNotificationSettingsPage})));
const DashboardAnalyticsPage = lazy(() => import("@/pages/admin/DashboardAnalyticsPage").then(m=>({default:m.DashboardAnalyticsPage})));
const HomePage = lazy(() => import("@/pages/HomePage").then(m=>({default:m.HomePage})));
const CourseListPage = lazy(() => import("@/pages/CourseListPage").then(m=>({default:m.CourseListPage})));
const CourseDetailPage = lazy(() => import("@/pages/CourseDetailPage").then(m=>({default:m.CourseDetailPage})));
const VipPage = lazy(() => import("@/pages/VipPage").then(m=>({default:m.VipPage})));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(m=>({default:m.ProfilePage})));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(m=>({default:m.NotFoundPage})));
const PaySuccessPage = lazy(() => import("@/pages/PaySuccessPage").then(m=>({default:m.PaySuccessPage})));
const PayDevSimulatePage = lazy(() => import("@/pages/PayDevSimulatePage").then(m=>({default:m.PayDevSimulatePage})));
const CustomServicePage = lazy(() => import("@/pages/CustomServicePage").then(m=>({default:m.CustomServicePage})));
const ServicesListPage = lazy(() => import("@/pages/ServicesListPage").then(m=>({default:m.ServicesListPage})));
const ServiceDetailPage = lazy(() => import("@/pages/ServiceDetailPage").then(m=>({default:m.ServiceDetailPage})));
const ServiceConsultPage = lazy(() => import("@/pages/ServiceConsultPage").then(m=>({default:m.ServiceConsultPage})));
const ServiceWechatQrPage = lazy(() => import("@/pages/ServiceWechatQrPage").then(m=>({default:m.ServiceWechatQrPage})));
const AiVisionServicePage = lazy(() => import("@/pages/AiVisionServicePage").then(m=>({default:m.AiVisionServicePage})));
const SaasSystemServicePage = lazy(() => import("@/pages/SaasSystemServicePage").then(m=>({default:m.SaasSystemServicePage})));
const SaaSCrmServicePage = lazy(() => import("@/pages/SaaSCrmServicePage").then(m=>({default:m.SaaSCrmServicePage})));
const JobsRadarPage = lazy(() => import("@/pages/JobsRadarPage").then(m=>({default:m.JobsRadarPage})));
const JoinPage = lazy(() => import("@/pages/JoinPage").then(m=>({default:m.JoinPage})));
const OAuthCallbackPage = lazy(() => import("@/pages/OAuthCallbackPage"));
const CreatorLoginPage = lazy(() => import("@/pages/creator/CreatorLoginPage").then(m=>({default:m.CreatorLoginPage})));
const CreatorLayout = lazy(() => import("@/pages/creator/CreatorOverviewPage").then(m=>({default:m.CreatorLayout})));
const CreatorOverviewPage = lazy(() => import("@/pages/creator/CreatorOverviewPage").then(m=>({default:m.CreatorOverviewPage})));
const CreatorCoursesPage = lazy(() => import("@/pages/creator/CreatorCoursesPage").then(m=>({default:m.CreatorCoursesPage})));
const CreatorEarningsPage = lazy(() => import("@/pages/creator/CreatorEarningsPage").then(m=>({default:m.CreatorEarningsPage})));

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">加载中…</div>}>
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
    </Suspense>
  );
}
