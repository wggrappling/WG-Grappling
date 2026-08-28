import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks';
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
import { ReportsPage } from './pages/ReportsPage';
import { StoreOperationsPage } from './pages/StoreOperationsPage';
import { StudentShell } from './components/self-service/StudentShell';
import { ThemeToggle } from './components/ThemeToggle';
import {
  StudentAttendancePage,
  StudentFinancePage,
  StudentGraduationsPage,
  StudentHomePage,
  StudentModalitiesPage,
  StudentProfilePage,
} from './pages/StudentSelfServicePages';
import {
  StudentCartPage,
  StudentOrderPage,
  StudentOrdersPage,
  StudentProductPage,
  StudentStorePage,
} from './pages/StudentStorePages';
import { StudentNoticePage, StudentNoticesPage } from './pages/StudentNoticesPages';
import { StudentDocumentPage, StudentDocumentsPage } from './pages/StudentDocumentsPages';
import { StudentSchedulePage } from './pages/StudentSchedulePage';

const internalRoles = ['OWNER', 'ADMIN', 'RECEPTION', 'TEACHER'] as const;

function HomeRedirect() {
  const { authenticated, initializing, user } = useAuth();
  if (initializing) return <main className="auth-loading" aria-live="polite">Validando sessão...</main>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'ALUNO' ? '/app' : '/dashboard'} replace />;
}

function App() {
  return (
    <><ThemeToggle /><Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<ProtectedRoute allowedRoles={['ALUNO']}><StudentShell /></ProtectedRoute>}>
        <Route index element={<StudentHomePage />} />
        <Route path="graduation" element={<StudentGraduationsPage />} />
        <Route path="modalities" element={<StudentModalitiesPage />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="finance" element={<StudentFinancePage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="shop" element={<StudentStorePage />} />
        <Route path="shop/products/:productId" element={<StudentProductPage />} />
        <Route path="shop/cart" element={<StudentCartPage />} />
        <Route path="shop/orders" element={<StudentOrdersPage />} />
        <Route path="shop/orders/:orderId" element={<StudentOrderPage />} />
        <Route path="notices" element={<StudentNoticesPage />} />
        <Route path="notices/:noticeId" element={<StudentNoticePage />} />
        <Route path="documents" element={<StudentDocumentsPage />} />
        <Route path="documents/:documentId" element={<StudentDocumentPage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
      </Route>
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTION']}><DashboardPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTION']}><ReportsPage /></ProtectedRoute>} />
      <Route path="/store-operations" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTION']}><StoreOperationsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminHomePage /></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminPlansPage /></ProtectedRoute>} />
      <Route path="/admin/modalities" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminModalitiesPage /></ProtectedRoute>} />
      <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}><AdminClassesPage /></ProtectedRoute>} />
      <Route
        path="/students"
        element={(
          <ProtectedRoute allowedRoles={internalRoles}>
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
          <ProtectedRoute allowedRoles={internalRoles}>
            <StudentCentralPage />
          </ProtectedRoute>
        )}
      />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes></>
  );
}

export default App;
