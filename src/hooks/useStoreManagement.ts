import { useState, useEffect } from 'react';
import { Store, StoresResponse } from "@/types/store";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/apiConfig"; // added

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
    // Stores API removed; keep empty list
    setStores([]);
    setIsLoading(false);
  };

  // Create store
  const createStore = async (_newStoreName: string): Promise<boolean> => {
    toast.message("Stores are deprecated. Use file uploads instead.");
    return false;
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

  // Initial fetch (no-op, keeps empty list for compatibility)
  useEffect(() => {
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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