import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// role — строка: 'student' или 'teacher'
const ProtectedRoute = ({ children, role }) => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    if (role && user.role?.role !== role) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
