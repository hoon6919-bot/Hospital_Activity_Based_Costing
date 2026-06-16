import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SetupPage from './pages/SetupPage';
import EmployeePage from './pages/EmployeePage';
import RevenueInputPage from './pages/RevenueInputPage';
import CostPage from './pages/CostPage';
import PatientStatsPage from './pages/PatientStatsPage';
import AllocationValuePage from './pages/AllocationValuePage';
import LogicPage from './pages/LogicPage';
import ExecutionPage from './pages/ExecutionPage';
import ResultPage from './pages/ResultPage';
import InsightPage from './pages/InsightPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FindAccountPage from './pages/FindAccountPage';
import MyPage from './pages/MyPage';
import AdminUsersPage from './pages/AdminUsersPage';
import './styles/global.css';

import { PeriodProvider } from './contexts/PeriodContext';

// 보호된 라우터 컴포넌트
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/find-account" element={<FindAccountPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <PeriodProvider>
              <DashboardLayout />
            </PeriodProvider>
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="employee" element={<EmployeePage />} />
          <Route path="revenue" element={<RevenueInputPage />} />
          <Route path="cost" element={<CostPage />} />
          <Route path="patient-stats" element={<PatientStatsPage />} />
          <Route path="allocation-value" element={<AllocationValuePage />} />
          <Route path="logic" element={<LogicPage />} />
          <Route path="run" element={<ExecutionPage />} />
          <Route path="result" element={<ResultPage />} />
          <Route path="insight" element={<InsightPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="admin" element={<AdminUsersPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
