import supabase from "@/lib/supabaseClient";

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function listOrderDocuments(orderId) {
  return rpc("rpc_order_documents_list", { p_order_id: orderId });
}

export async function createOrderDocumentDownloadUrl(documentId) {
  const { data, error } = await supabase.functions.invoke("order-document-download-url", {
    body: { document_id: documentId },
  });

  if (error) throw error;
  if (!data?.signed_url) throw new Error("Document download URL was not returned.");

  return data;
}

export async function archiveOrderDocument(documentId, reason = null) {
  return rpc("rpc_order_document_archive", {
    p_document_id: documentId,
    p_reason: reason || null,
  });
}
