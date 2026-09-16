export const buildReceiptZipDownloadPayload = (selectedItems = []) => {
  const billReportIds = selectedItems
    .map((item) => item?.bill_report_id)
    .filter((id) => typeof id === "string" && id.trim() !== "")
    .map((id) => id.trim());

  return { bill_report_ids: billReportIds };
};

export const triggerBlobDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
