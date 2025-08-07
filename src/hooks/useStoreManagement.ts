import { useState, useEffect } from 'react';
import { Store, StoresResponse } from "@/types/store";
import { toast } from "sonner";

interface UseStoreManagementReturn {
  stores: Store[];
  storeName: string | null;
  setStoreName: (name: string | null) => void;
  isLoading: boolean;
  error: string | null;
  createStore: (name: string) => Promise<boolean>;
  isCreateStoreOpen: boolean;
  setIsCreateStoreOpen: (open: boolean) => void;
}

export function useStoreManagement(): UseStoreManagementReturn {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);

  // Initialize storeName from localStorage
  const [storeName, setStoreName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedStore");
    }
    return null;
  });

  // Fetch stores
  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const cookies = document.cookie.split(";");
      const accessToken = cookies
        .find((cookie) => cookie.trim().startsWith("jwt="))
        ?.split("=")[1];

      if (!accessToken) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("http://localhost:8000/stores", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please login again.");
        }
        throw new Error("Failed to fetch stores");
      }

      const data: StoresResponse = await response.json();
      setStores(data.stores);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch stores";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create store
  const createStore = async (newStoreName: string): Promise<boolean> => {
    if (!newStoreName?.trim()) {
      toast.error("Store name cannot be empty");
      return false;
    }

    setIsLoading(true);
    try {
      const cookies = document.cookie.split(";");
      const accessToken = cookies
        .find((cookie) => cookie.trim().startsWith("jwt="))
        ?.split("=")[1];

      if (!accessToken) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("http://localhost:8000/create_store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ store_name: newStoreName.trim() }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create store");
      }

      const data = await response.json();
      const newStore = {
        id: data.store_id,
        store_name: data.store_name,
        created_at: new Date().toISOString(),
      };

      setStores(prev => [...prev, newStore]);
      setStoreName(data.store_name);
      toast.success("Store created successfully");
      return true;

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create store";
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle localStorage sync
  useEffect(() => {
    if (storeName === null) {
      localStorage.removeItem("selectedStore");
    } else {
      localStorage.setItem("selectedStore", storeName);
    }
  }, [storeName]);

  // Listen for store changes
  useEffect(() => {
    const handleStoreChange = () => {
      const selectedStore = localStorage.getItem("selectedStore");
      setStoreName(selectedStore);
    };

    window.addEventListener("storeSelected", handleStoreChange);
    return () => window.removeEventListener("storeSelected", handleStoreChange);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStores();
  }, []);

  return {
    stores,
    storeName,
    setStoreName,
    isLoading,
    error,
    createStore,
    isCreateStoreOpen,
    setIsCreateStoreOpen,
  };
}