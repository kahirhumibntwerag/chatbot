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

    // Create a toast for the upload process with file info
    const uploadToastId = toast.loading(
      `📤 Uploading ${file.name}`,
      {
        description: `Preparing file upload... (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      }
    );

    const updateProgressToast = (loaded: number, total: number) => {
      if (!total) return;
      const percentCompleted = Math.round((loaded * 100) / total);
      const uploadedMB = (loaded / 1024 / 1024).toFixed(2);
      const totalMB = (total / 1024 / 1024).toFixed(2);
      toast.loading(
        `📤 Uploading ${file.name} - ${percentCompleted}%`,
        {
          id: uploadToastId,
          description: `${uploadedMB}MB / ${totalMB}MB uploaded`
        }
      );
    };

    try {
      // 1) Ask backend to presign (so we can upload directly to storage on Vercel)
      const presignResp = await fetch('/api/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, type: file.type, size: file.size })
      });

      if (!presignResp.ok) throw new Error(`presign failed: ${presignResp.status}`);
      const presignData: any = await presignResp.json();

      // 2) Perform direct upload. Support common shapes: PUT URL or POST form fields
      let etag: string | undefined;
      if (presignData && presignData.url && presignData.fields) {
        // S3 POST form
        const formData = new FormData();
        Object.entries(presignData.fields as Record<string, string>).forEach(([k, v]) => formData.append(k, v));
        formData.append('file', file);

        await axios.post(presignData.url, formData, {
          onUploadProgress: (e: AxiosProgressEvent) => {
            if (e.total) updateProgressToast(e.loaded, e.total);
          },
        });
      } else if (presignData && presignData.url) {
        // PUT to signed URL
        const putHeaders = presignData.headers || { 'Content-Type': file.type };
        const putResp = await axios.put(presignData.url, file, {
          headers: putHeaders,
          onUploadProgress: (e: AxiosProgressEvent) => {
            if (e.total) updateProgressToast(e.loaded, e.total);
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
        etag = (putResp.headers as any)['etag'] as string | undefined;
      } else {
        throw new Error('Unsupported presign response shape');
      }

      // 3) Processing phase - update the same toast
      toast.loading(
        "🔄 Processing file...",
        { 
          id: uploadToastId,
          description: "Creating chunks and indexing content"
        }
      );

      // 4) Optional finalize call
      try {
        await fetch('/api/files/upload/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            type: file.type,
            size: file.size,
            etag,
            presign: presignData,
          }),
        });
      } catch {}

      // 5) Success confirmation
      toast.dismiss(uploadToastId);
      toast.success(`✅ File uploaded successfully!`, { duration: 4000 });
      onUploaded?.();
      return;
    } catch (presignOrDirectErr) {
      // Fallback to proxy route (works for small files; large files may 413 on Vercel)
      try {
        const formData = new FormData();
        formData.append('fileb', file);

        await axios.post(
          `/api/files/upload`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true,
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
              if (progressEvent.total) {
                updateProgressToast(progressEvent.loaded, progressEvent.total);
              }
            },
          }
        );

        toast.loading(
          "🔄 Processing file...",
          { 
            id: uploadToastId,
            description: "Creating chunks and indexing content"
          }
        );

        toast.dismiss(uploadToastId);
        toast.success(`✅ File uploaded successfully!`, { duration: 4000 });
        onUploaded?.();
        return;
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast.dismiss(uploadToastId);

        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.detail || error.message;
          const statusCode = error.response?.status;
          toast.error(
            `❌ Upload failed (${statusCode}): ${errorMessage}`,
            { duration: 6000 }
          );
          if (statusCode === 401) {
            toast.warning("⚠️ Session expired. Please login again.", { duration: 5000 });
          } else if (statusCode === 413) {
            toast.warning("⚠️ File too large. Please try a smaller file.", { duration: 5000 });
          }
        } else {
          toast.error(
            `❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { duration: 6000 }
          );
        }
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