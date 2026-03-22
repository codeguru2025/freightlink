import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads with DigitalOcean Spaces presigned URLs.
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Request a presigned URL from the backend.
   */
  const requestUploadUrl = useCallback(
    async (file: File): Promise<UploadResponse> => {
      const response = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get upload URL");
      }

      return response.json();
    },
    []
  );

  /**
   * Upload a file directly to the presigned URL.
   */
  const uploadToPresignedUrl = useCallback(
    async (file: File, uploadUrl: string): Promise<void> => {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-amz-acl": "public-read", // Match the server-side ACL
        },
      });

      if (!response.ok) {
        throw new Error("Failed to upload file to storage");
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const { uploadUrl, publicUrl, key } = await requestUploadUrl(file);
        await uploadToPresignedUrl(file, uploadUrl);

        const response: UploadResponse = {
          uploadUrl,
          publicUrl,
          key,
          metadata: {
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          },
        };

        options.onSuccess?.(response);
        return response;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(err.message || "Upload failed");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [options, requestUploadUrl, uploadToPresignedUrl]
  );

  return {
    uploadFile,
    isUploading,
    error,
    progress,
  };
}

