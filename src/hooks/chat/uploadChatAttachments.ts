import { supabase } from "@/integrations/supabase/client";
import { compressChatPhoto } from "@/lib/chatPhotoCompression";

const MAX_CHAT_PHOTOS = 3;
const MAX_CHAT_PHOTO_BYTES = 50 * 1024 * 1024;

export interface UploadChatAttachmentsResult {
  urls: string[];
  hadFailures: boolean;
}

export async function uploadChatAttachments(
  files: File[],
  userId: string,
  onOversized: (fileName: string) => void,
  onUploadError: () => void,
): Promise<UploadChatAttachmentsResult> {
  const attachmentUrls: string[] = [];
  let hadFailures = false;
  const slice = files.slice(0, MAX_CHAT_PHOTOS);

  for (let i = 0; i < slice.length; i++) {
    const originalFile = slice[i];
    if (originalFile.size > MAX_CHAT_PHOTO_BYTES) {
      onOversized(originalFile.name);
      continue;
    }

    let fileToUpload = originalFile;
    try {
      fileToUpload = await compressChatPhoto(originalFile);
    } catch {
      // mantém original
    }

    const ext = fileToUpload.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from("urban-reports").upload(fileName, fileToUpload);
    if (error) {
      console.error("[useUnifiedAIChat] Upload attachment failed:", error);
      hadFailures = true;
      onUploadError();
      continue;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("urban-reports").getPublicUrl(fileName);
    attachmentUrls.push(publicUrl);
  }

  return { urls: attachmentUrls, hadFailures };
}
