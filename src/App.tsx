import { Routes, Route } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { HomePage } from "@/pages/HomePage";
import { CourseListPage } from "@/pages/CourseListPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { VipPage } from "@/pages/VipPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PaySuccessPage } from "@/pages/PaySuccessPage";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/pay/success" element={<PaySuccessPage />} />
        <Route path="/vip" element={<VipPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
