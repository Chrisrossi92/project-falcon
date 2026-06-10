import supabase from "@/lib/supabaseClient";

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function edgeFunctionErrorMessage(error, fallback) {
  if (!error?.context?.json) return error?.message || fallback;

  try {
    const response =
      typeof error.context.clone === "function" ? error.context.clone() : error.context;
    const body = await response.json();
    return body?.message || body?.error || error?.message || fallback;
  } catch {
    return error?.message || fallback;
  }
}

async function edgeFunction(name, body, fallbackError) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    console.error("[OrderDocumentDownload] Edge Function request failed", {
      function_name: name,
      message: error?.message || null,
      status: error?.context?.status || null,
      status_text: error?.context?.statusText || null,
      body_keys: body && typeof body === "object" ? Object.keys(body) : [],
    });
    const message = await edgeFunctionErrorMessage(error, fallbackError);
    throw new Error(message, { cause: error });
  }

  return data;
}

export async function listOrderDocuments(orderId) {
  return rpc("rpc_order_documents_list", { p_order_id: orderId });
}

export async function createOrderDocumentDownloadUrl(documentId) {
  const data = await edgeFunction(
    "order-document-download-url",
    { document_id: documentId },
    "Could not open this file.",
  );

  if (!data?.signed_url) throw new Error("Document download URL was not returned.");

  return data;
}

export async function archiveOrderDocument(documentId, reason = null) {
  return rpc("rpc_order_document_archive", {
    p_document_id: documentId,
    p_reason: reason || null,
  });
}

export async function createOrderDocumentUploadUrl({
  orderId,
  category,
  fileName,
  mimeType = null,
  fileSize = null,
  visibilityScope = "internal",
  title = null,
} = {}) {
  const data = await edgeFunction(
    "order-document-upload-url",
    {
      order_id: orderId,
      category,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      visibility_scope: visibilityScope,
      title,
    },
    "Upload failed",
  );

  if (!data?.document?.id || !data?.upload?.bucket || !data?.upload?.path || !data?.upload?.token) {
    throw new Error("Document upload URL was not returned.");
  }

  return data;
}

export async function finalizeOrderDocumentUpload(documentId, { mimeType = null, fileSize = null } = {}) {
  const rows = await rpc("rpc_order_document_finalize_upload", {
    p_document_id: documentId,
    p_mime_type: mimeType,
    p_file_size: fileSize,
  });

  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function uploadOrderDocument({
  orderId,
  file,
  category,
  visibilityScope = "internal",
  title = null,
} = {}) {
  if (!file) throw new Error("Choose a file to upload.");

  const prepared = await createOrderDocumentUploadUrl({
    orderId,
    category,
    fileName: file.name,
    mimeType: file.type || null,
    fileSize: file.size,
    visibilityScope,
    title: title || file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(prepared.upload.bucket)
    .uploadToSignedUrl(prepared.upload.path, prepared.upload.token, file, {
      contentType: file.type || undefined,
    });

  if (uploadError) throw uploadError;

  return finalizeOrderDocumentUpload(prepared.document.id, {
    mimeType: file.type || null,
    fileSize: file.size,
  });
}
