import { buildReceiptZipDownloadPayload } from "./receiptDownload";

describe("receipt download helpers", () => {
  it("builds a payload with only selected bill report ids", () => {
    const payload = buildReceiptZipDownloadPayload([
      { id: 1, bill_report_id: "214513" },
      { id: 2, bill_report_id: "214512" },
      { id: 3 },
    ]);

    expect(payload).toEqual({ bill_report_ids: ["214513", "214512"] });
  });
});
