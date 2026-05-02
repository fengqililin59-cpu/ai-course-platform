import { Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminRequireAuth } from "@/admin/AdminAuth";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { AdminCourseFormPage } from "@/pages/admin/AdminCourseFormPage";
import { HomePage } from "@/pages/HomePage";
import { CourseListPage } from "@/pages/CourseListPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { VipPage } from "@/pages/VipPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PaySuccessPage } from "@/pages/PaySuccessPage";
import { CustomServicePage } from "@/pages/CustomServicePage";
import { ServicesListPage } from "@/pages/ServicesListPage";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import { ServiceConsultPage } from "@/pages/ServiceConsultPage";
import { ServiceWechatQrPage } from "@/pages/ServiceWechatQrPage";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminRequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/new" element={<AdminCourseFormPage />} />
          <Route path="courses/edit/:courseId" element={<AdminCourseFormPage />} />
        </Route>
      </Route>

      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/pay/success" element={<PaySuccessPage />} />
        <Route path="/vip" element={<VipPage />} />
        <Route path="/services" element={<ServicesListPage />} />
        <Route path="/services/consult" element={<ServiceConsultPage />} />
        <Route path="/services/wechat" element={<ServiceWechatQrPage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/custom-service" element={<CustomServicePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
