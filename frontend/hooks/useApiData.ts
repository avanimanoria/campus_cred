import { useState, useCallback } from "react";
import { auth } from "@/firebase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export function useApiData<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (endpoint: string, options: ApiOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (options.requireAuth !== false && user) {
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
        // For HOD/Faculty/Proctor, use numeric ID (1 for dev), for Student use email prefix as USN
        const role = localStorage.getItem("userRole") || "student";
        if (role.toLowerCase() === "student") {
          headers["x-user-id"] = user.email?.split("@")[0] || user.uid;
        } else {
          headers["x-user-id"] = "1"; // Default numeric ID for staff roles
        }
        headers["x-user-role"] = role;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      const result = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || "Request failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(
    (endpoint: string, options?: ApiOptions) => {
      return fetchData(endpoint, { ...options, method: "GET" });
    },
    [fetchData]
  );

  const post = useCallback(
    (endpoint: string, body?: any, options?: ApiOptions) => {
      return fetchData(endpoint, {
        ...options,
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
        headers: body instanceof FormData ? {} : options?.headers,
      });
    },
    [fetchData]
  );

  const put = useCallback(
    (endpoint: string, body?: any, options?: ApiOptions) => {
      return fetchData(endpoint, {
        ...options,
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    [fetchData]
  );

  const del = useCallback(
    (endpoint: string, options?: ApiOptions) => {
      return fetchData(endpoint, { ...options, method: "DELETE" });
    },
    [fetchData]
  );

  const patch = useCallback(
    (endpoint: string, body?: any, options?: ApiOptions) => {
      return fetchData(endpoint, {
        ...options,
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    get,
    post,
    put,
    patch,
    delete: del,
    setData,
    setError,
  };
}
