import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "./store";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import { Toaster } from "react-hot-toast";

import apiClient from "./api/client";
import { setAuth, setLoading } from "./store/slices/authSlice";

const ProtectedRoute = ({ children }: { children: any }) => {
  const { isAuthenticated, user, loading } = useSelector(
    (state: RootState) => state.auth,
  );

  if (loading && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const fetchProfile = async () => {
      if (token && !user) {
        dispatch(setLoading(true));
        try {
          const response = await apiClient.get("/auth/me");
          dispatch(setAuth({ user: response.data, token }));
        } catch (err) {
          console.error("Failed to fetch profile", err);
        } finally {
          dispatch(setLoading(false));
        }
      }
    };
    fetchProfile();
  }, [dispatch, token, user]);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
