// src/App.jsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Contexts & Components
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';
import { ToastProvider } from './contexts/ToastContext';
import VideoCallPro from './pages/VideoCallPro';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import MoodTracker from './pages/MoodTracker';
import Journal from './pages/Journal';
import Community from './pages/Community';
import Meditation from './pages/Meditation';
import InferPage from './pages/InferPage'; // inference page

/**
 * ErrorBoundary — catches runtime errors gracefully.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Something went wrong</h2>
            <p className="text-gray-600 text-sm mb-4">
              We encountered an unexpected error. Please refresh the page or try again later.
            </p>
            <pre className="bg-gray-100 text-gray-700 text-xs p-3 rounded-md overflow-auto max-h-40">
              {String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ProtectedRoute — ensures user is authenticated
 * Waits while auth is loading to avoid premature redirects.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    // preserve attempted path so login can redirect back if you implement that
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * HomeEntry — route for `/`
 * If logged in, redirect to dashboard; otherwise show Landing.
 */
function HomeEntry() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    // Already signed in — send to dashboard
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <Landing />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<HomeEntry />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Public profile (make community profiles viewable without login) */}
      <Route path="/profile/:id" element={<Profile />} />

      <Route path="/call" element={<VideoCallPro />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mood"
        element={
          <ProtectedRoute>
            <MoodTracker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <Journal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Community />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meditation"
        element={
          <ProtectedRoute>
            <Meditation />
          </ProtectedRoute>
        }
      />

      {/* Inference Page (protected) */}
      <Route
        path="/infer"
        element={
          <ProtectedRoute>
            <InferPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * App — Root Component
 *
 * Important: do NOT wrap this with another <BrowserRouter> if you already mount one in main.jsx.
 * main.jsx (or index.jsx) should render <App /> inside a single <BrowserRouter />.
 */
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
              </div>
            }
          >
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}
