import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { Upload } from 'lucide-react';
import axios, { AxiosProgressEvent } from 'axios';

interface FileUploaderProps {
  onUploaded?: () => void;
}

const FileUploader = ({ onUploaded }: FileUploaderProps) => {
  const [loading, setLoading] = useState(false);


  const handleFileUpload = async (file: File) => {
    setLoading(true);

    // Token is HttpOnly; upload via proxy route which reads the cookie server-side

    const formData = new FormData();
    formData.append("fileb", file);

    // Create a toast for the upload process with file info
    const uploadToastId = toast.loading(
      `📤 Uploading ${file.name}`,
      {
        description: `Preparing file upload... (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      }
    );

    try {
      const response = await axios.post(
        `/api/files/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              const uploadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(2);
              const totalMB = (progressEvent.total / 1024 / 1024).toFixed(2);
              
              // Update the same toast with progress
              toast.loading(
                `📤 Uploading ${file.name} - ${percentCompleted}%`,
                { 
                  id: uploadToastId,
                  description: `${uploadedMB}MB / ${totalMB}MB uploaded`
                }
              );
            }
          },
        }
      );

      // Processing phase - update the same toast
      toast.loading(
        "🔄 Processing file...",
        { 
          id: uploadToastId,
          description: "Creating chunks and indexing content"
        }
      );

      const data = response.data;
      
      // Success confirmation - dismiss the loading toast and show success
      toast.dismiss(uploadToastId);
      
      toast.success(`✅ File uploaded successfully!`, { duration: 4000 });
      onUploaded?.();

    } catch (error) {
      console.error("Failed to upload file:", error);
      
      // Dismiss the loading toast first
      toast.dismiss(uploadToastId);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        const statusCode = error.response?.status;
        
        toast.error(
          `❌ Upload failed (${statusCode}): ${errorMessage}`,
          { 
            duration: 6000
          }
        );

        // Additional error info based on status
        if (statusCode === 401) {
          toast.warning("⚠️ Session expired. Please login again.", {
            duration: 5000
          });
        } else if (statusCode === 413) {
          toast.warning("⚠️ File too large. Please try a smaller file.", {
            duration: 5000
          });
        }
      } else {
        toast.error(
          `❌ Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { 
            duration: 6000
          }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <label className={`flex items-center gap-2 cursor-pointer w-full px-2 py-1.5 text-sm ${
      loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
    }`}>
      <Upload className="mr-2 h-4 w-4" />
      <span>{loading ? 'Uploading...' : 'Upload File'}</span>
      <input
        type="file"
        className="hidden"
        accept=".pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.type !== "application/pdf") {
              toast.error("❌ Please upload a PDF file only");
              e.target.value = "";
              return;
            }
            
            // Show file selection confirmation
            toast.info(`📁 Selected: ${file.name}`, { duration: 2000 });
            
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