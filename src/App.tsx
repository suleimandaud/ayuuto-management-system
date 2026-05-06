import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Loading } from './components/Loading';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { GroupsPage } from './pages/GroupsPage';
import { CreateGroupPage } from './pages/CreateGroupPage';
import { GroupDetailsPage } from './pages/GroupDetailsPage';
import { RoundDetailsPage } from './pages/RoundDetailsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { ReportsPage } from './pages/ReportsPage';
import { MemberDashboard } from './pages/MemberDashboard';

function RequireAuth({ role, children }: { role?: 'admin' | 'member'; children: ReactElement }) {
  const { profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/member'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/groups" element={<RequireAuth role="admin"><GroupsPage /></RequireAuth>} />
        <Route path="/admin/groups/new" element={<RequireAuth role="admin"><CreateGroupPage /></RequireAuth>} />
        <Route path="/admin/groups/:groupId" element={<RequireAuth role="admin"><GroupDetailsPage /></RequireAuth>} />
        <Route path="/admin/rounds/:roundId" element={<RequireAuth role="admin"><RoundDetailsPage /></RequireAuth>} />
        <Route path="/admin/payments" element={<RequireAuth role="admin"><PaymentsPage /></RequireAuth>} />
        <Route path="/admin/payouts" element={<RequireAuth role="admin"><PayoutsPage /></RequireAuth>} />
        <Route path="/admin/reports" element={<RequireAuth role="admin"><ReportsPage /></RequireAuth>} />
        <Route path="/member" element={<RequireAuth role="member"><MemberDashboard /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RootRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/member'} replace />;
}
