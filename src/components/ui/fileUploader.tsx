import React, { useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  storeName: string | null;
}

const FileUploader = ({ storeName }: FileUploaderProps) => {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!storeName) {
      toast.error("Please select a store first");
      return;
    }

    const toastId = toast.loading("Preparing to upload file...");

    // Get JWT token from cookies
    const cookies = document.cookie.split(";");
    const accessToken = cookies
      .find((cookie) => cookie.trim().startsWith("jwt="))
      ?.split("=")[1];

    if (!accessToken) {
      toast.error("No authentication token found. Please login again.", {
        id: toastId,
      });
      return;
    }

    const formData = new FormData();
    formData.append("fileb", file);
    formData.append("store_name", storeName);

    try {
      toast.loading("Uploading file...", { id: toastId });

      const response = await fetch("http://localhost:8000/add_to_store", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      toast.success(
        `File uploaded successfully! Created ${data.chunks_created} chunks.`,
        { id: toastId }
      );
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file",
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <label className="flex items-center gap-2 cursor-pointer w-full px-2 py-1.5 text-sm">
      <Upload className="mr-2 h-4 w-4" />
      <span>Upload File</span>
      <input
        type="file"
        className="hidden"
        accept=".pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.type !== "application/pdf") {
              toast.error("Please upload a PDF file");
              e.target.value = "";
              return;
            }
            await handleFileUpload(file);
            e.target.value = "";
          }
        }}
        disabled={loading}
      />
    </label>
  );
};

export default FileUploader;