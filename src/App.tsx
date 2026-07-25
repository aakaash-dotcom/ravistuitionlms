import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminTests from '@/pages/admin/AdminTests';
import AdminStudents from '@/pages/admin/AdminStudents';
import AdminAttendance from '@/pages/admin/AdminAttendance';
import AdminDiary from '@/pages/admin/AdminDiary';
import AdminNotices from '@/pages/admin/AdminNotices';
import AdminMaterials from '@/pages/admin/AdminMaterials';
import AdminBanners from '@/pages/admin/AdminBanners';
import AdminFees from '@/pages/admin/AdminFees';
import AdminMcq from '@/pages/admin/AdminMcq';
import ParentLayout from '@/pages/parent/ParentLayout';
import ParentDashboard from '@/pages/parent/ParentDashboard';
import ParentTests from '@/pages/parent/ParentTests';
import ParentAttendance from '@/pages/parent/ParentAttendance';
import ParentDiary from '@/pages/parent/ParentDiary';
import ParentNotices from '@/pages/parent/ParentNotices';
import ParentFees from '@/pages/parent/ParentFees';
import StudentLayout from '@/pages/student/StudentLayout';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentTests from '@/pages/student/StudentTests';
import StudentDiary from '@/pages/student/StudentDiary';
import StudentAttendance from '@/pages/student/StudentAttendance';
import StudentMaterials from '@/pages/student/StudentMaterials';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="tests" element={<AdminTests />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="diary" element={<AdminDiary />} />
          <Route path="notices" element={<AdminNotices />} />
          <Route path="materials" element={<AdminMaterials />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="mcq" element={<AdminMcq />} />
        </Route>
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="tests" element={<ParentTests />} />
          <Route path="attendance" element={<ParentAttendance />} />
          <Route path="diary" element={<ParentDiary />} />
          <Route path="notices" element={<ParentNotices />} />
          <Route path="fees" element={<ParentFees />} />
        </Route>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="diary" element={<StudentDiary />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="materials" element={<StudentMaterials />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
