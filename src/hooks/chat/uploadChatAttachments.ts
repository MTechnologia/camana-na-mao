import { supabase } from "@/integrations/supabase/client";
import { compressChatPhoto } from "@/lib/chatPhotoCompression";

const MAX_CHAT_PHOTOS = 3;
const MAX_CHAT_PHOTO_BYTES = 50 * 1024 * 1024;

export interface UploadChatAttachmentsResult {
  urls: string[];
  hadFailures: boolean;
}

async function uploadSingleChatPhoto(
  originalFile: File,
  userId: string,
  index: number,
  onOversized: (fileName: string) => void,
  onUploadError: () => void,
): Promise<string | null> {
  if (originalFile.size > MAX_CHAT_PHOTO_BYTES) {
    onOversized(originalFile.name);
    return null;
  }

  let fileToUpload = originalFile;
  try {
    fileToUpload = await compressChatPhoto(originalFile);
  } catch {
    // mantém original
  }

  const ext = fileToUpload.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("urban-reports").upload(fileName, fileToUpload);
  if (error) {
    console.error("[uploadChatAttachments] Upload failed:", error);
    onUploadError();
    return null;
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("urban-reports").getPublicUrl(fileName);
  return publicUrl;
}

/** CHB-015: upload paralelo de até 3 fotos (com compressão prévia). */
export async function uploadChatAttachments(
  files: File[],
  userId: string,
  onOversized: (fileName: string) => void,
  onUploadError: () => void,
): Promise<UploadChatAttachmentsResult> {
  const slice = files.slice(0, MAX_CHAT_PHOTOS);
  const results = await Promise.all(
    slice.map((file, index) =>
      uploadSingleChatPhoto(file, userId, index, onOversized, onUploadError),
    ),
  );

  const urls = results.filter((url): url is string => typeof url === "string");
  return {
    urls,
    hadFailures: urls.length < slice.length,
  };
}
