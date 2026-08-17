import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { StudentCentralPage } from './pages/StudentCentralPage';
import { StudentsPage } from './pages/StudentsPage';
import { NewStudentPage } from './pages/NewStudentPage';
import { AttendancePage } from './pages/AttendancePage';
import { AdminHomePage } from './pages/AdminHomePage';
import { AdminPlansPage } from './pages/AdminPlansPage';
import { AdminModalitiesPage } from './pages/AdminModalitiesPage';
import { AdminClassesPage } from './pages/AdminClassesPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTION']}><DashboardPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminHomePage /></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminPlansPage /></ProtectedRoute>} />
      <Route path="/admin/modalities" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminModalitiesPage /></ProtectedRoute>} />
      <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminClassesPage /></ProtectedRoute>} />
      <Route
        path="/students"
        element={(
          <ProtectedRoute>
            <StudentsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/students/new"
        element={(
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTION']}>
            <NewStudentPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/attendance"
        element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTION', 'TEACHER']}><AttendancePage /></ProtectedRoute>}
      />
      <Route
        path="/students/:studentId"
        element={(
          <ProtectedRoute>
            <StudentCentralPage />
          </ProtectedRoute>
        )}
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/students" replace />} />
    </Routes>
  );
}

export default App;
