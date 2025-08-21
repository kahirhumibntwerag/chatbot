import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface UserFileMeta {
  id: number;
  file_name: string;
  size: number | null;
  content_type: string | null;
  uploaded_at: string | null;
}

export function useFileManagement() {
  const [files, setFiles] = useState<UserFileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to fetch files (${res.status})`);
      }
      const data = (await res.json()) as UserFileMeta[];
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch files";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const toggleFileSelection = useCallback((name: string) => {
    setSelectedFileNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedFileNames([]), []);

  return useMemo(
    () => ({
      files,
      loading,
      error,
      refresh: fetchFiles,
      selectedFileNames,
      setSelectedFileNames,
      toggleFileSelection,
      clearSelection,
    }),
    [files, loading, error, fetchFiles, selectedFileNames, toggleFileSelection, clearSelection]
  );
}


