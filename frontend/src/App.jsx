import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';

import StudentDashboard from './pages/student/Dashboard';
import StudentProfile from './pages/student/Profile';
import TestDetail from './pages/student/TestDetail';
import TestSession from './pages/student/TestSession';
import TestResults from './pages/student/TestResults';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherProfile from './pages/teacher/Profile';
import CreateTest from './pages/teacher/CreateTest';
import EditTest from './pages/teacher/EditTest';
import Assignments from './pages/teacher/Assignments';
import AttemptReview from './pages/teacher/AttemptReview';

function App() {
    return (
        <Routes>
            {/* публичные */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* студент */}
            <Route path="/student/dashboard" element={
                <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
            } />
            <Route path="/student/profile" element={
                <ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>
            } />
            <Route path="/student/tests/:id" element={
                <ProtectedRoute role="student"><TestDetail /></ProtectedRoute>
            } />
            <Route path="/student/tests/:id/session" element={
                <ProtectedRoute role="student"><TestSession /></ProtectedRoute>
            } />
            <Route path="/student/tests/:id/results/:attemptId" element={
                <ProtectedRoute role="student"><TestResults /></ProtectedRoute>
            } />

            {/* учитель */}
            <Route path="/teacher/dashboard" element={
                <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
            } />
            <Route path="/teacher/tests/create" element={
                <ProtectedRoute role="teacher"><CreateTest /></ProtectedRoute>
            } />
            <Route path="/teacher/tests/:id/edit" element={
                <ProtectedRoute role="teacher"><EditTest /></ProtectedRoute>
            } />
            <Route path="/teacher/assignments" element={
                <ProtectedRoute role="teacher"><Assignments /></ProtectedRoute>
            } />
            <Route path="/teacher/profile" element={
                <ProtectedRoute role="teacher"><TeacherProfile /></ProtectedRoute>
            } />
            <Route path="/teacher/attempts/:attemptId/review" element={
                <ProtectedRoute role="teacher"><AttemptReview /></ProtectedRoute>
            } />

            {/* редирект с корня */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
