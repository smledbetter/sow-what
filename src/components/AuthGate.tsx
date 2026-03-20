import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../utils/pin.ts";

export interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * Wraps protected routes. Redirects to /pin if user is not authenticated.
 */
export function AuthGate({ children }: AuthGateProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/pin" replace />;
  }
  return <>{children}</>;
}
