import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { StudentCentralPage } from './pages/StudentCentralPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/students/:studentId"
        element={(
          <ProtectedRoute>
            <StudentCentralPage />
          </ProtectedRoute>
        )}
      />
      <Route path="/" element={<Navigate to="/students/7" replace />} />
      <Route path="*" element={<Navigate to="/students/7" replace />} />
    </Routes>
  );
}

export default App;
