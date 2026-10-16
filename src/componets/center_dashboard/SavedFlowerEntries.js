import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Form,
  Spinner,
  Table,
} from "react-bootstrap";
import DemandNavigation from "../DemandNavigation";
import { useCenter } from "../all_login/CenterContext";
import "../../componets/center_dashboard/FlowerReport.css";

const API_BASE =
  "https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api";
const COMPONENTS_URL = `${API_BASE}/component-list/`;
const REPORT_URL = `${API_BASE}/flower-monthly-report/`;

const MONTHS = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

const INPUT_FIELDS = [
  "previous_year_total_covered_area",
  "current_month_sown_area",
  "previous_month_sown_area",
  "damaged_area",
  "current_month_spike_or_cut_flower_production",
  "previous_month_spike_or_cut_flower_production",
  "current_month_loose_flower_production",
  "previous_month_loose_flower_production",
];

const INPUT_LABELS = {
  previous_year_total_covered_area: "पिछले वर्ष तक कुल आच्छादित क्षेत्रफल",
  current_month_sown_area: "वर्तमान माह बुवाई / रोपण क्षेत्रफल",
  previous_month_sown_area: "गत माह तक बुवाई / रोपण क्षेत्रफल",
  damaged_area: "कीट-व्याधि आदि से प्रभावित क्षेत्रफल",
  current_month_spike_or_cut_flower_production: "वर्तमान माह स्पाइक/कट फ्लॉवर उत्पादन",
  previous_month_spike_or_cut_flower_production: "गत माह तक स्पाइक/कट फ्लॉवर उत्पादन",
  current_month_loose_flower_production: "वर्तमान माह लूज फ्लॉवर उत्पादन",
  previous_month_loose_flower_production: "गत माह तक लूज फ्लॉवर उत्पादन",
};

const getCurrentFinancialYear = () => {
  const date = new Date();
  const startYear =
    date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};

const entryYearFromMonth = (financialYear, month) => {
  if (!financialYear || !month) return "";
  const [startYear, endYear] = financialYear.split("-").map(Number);
  const monthIndex = MONTHS.indexOf(month);
  return monthIndex >= 0 && monthIndex < 3 ? endYear : startYear;
};

const readResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getErrorMessage = (data, fallback) => {
  if (typeof data === "string" && data.trim()) return data;
  if (data?.detail || data?.error || data?.message) {
    return data.detail || data.error || data.message;
  }
  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flat()
      .filter((value) => typeof value === "string" && value.trim());
    if (messages.length) return messages.join(" ");
  }
  return fallback;
};

const getItems = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

const formatNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
};

const SavedFlowerEntries = () => {
  const { centerData } = useCenter();
  const centerName = String(centerData?.centerName || "").trim();
  const currentYear = Number(getCurrentFinancialYear().slice(0, 4));
  const financialYearOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const startYear = currentYear - 3 + index;
        return `${startYear}-${startYear + 1}`;
      }),
    [currentYear]
  );

  const [components, setComponents] = useState([]);
  const [records, setRecords] = useState([]);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");
  const [filterFlower, setFilterFlower] = useState("");
  const [entryMonth, setEntryMonth] = useState("");
  const [entryFinancialYear, setEntryFinancialYear] = useState(
    getCurrentFinancialYear
  );
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loadingComponents, setLoadingComponents] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadComponents = useCallback(async () => {
    setLoadingComponents(true);
    try {
      const response = await fetch(COMPONENTS_URL);
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "पुष्पों की सूची प्राप्त नहीं हो सकी।")
        );
      }
      const flowerComponents = getItems(data)
        .filter((item) => item.investment_name === "पुष्प")
        .sort((first, second) => Number(first.id) - Number(second.id));
      setComponents(flowerComponents);
    } catch (error) {
      console.error("loadFlowerComponents:", error);
      setMessage({
        type: "danger",
        text: error.message || "पुष्पों की सूची प्राप्त नहीं हो सकी।",
      });
    } finally {
      setLoadingComponents(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    if (!centerName) {
      setRecords([]);
      return;
    }
    setLoadingRecords(true);
    try {
      const response = await fetch(
        `${REPORT_URL}?center_name=${encodeURIComponent(centerName)}`
      );
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "पुष्प रिपोर्ट प्राप्त नहीं हो सकी।")
        );
      }
      const centerKey = centerName.toLocaleLowerCase();
      setRecords(
        getItems(data).filter(
          (record) =>
            String(record.center_name || "")
              .trim()
              .toLocaleLowerCase() === centerKey
        )
      );
    } catch (error) {
      console.error("loadFlowerReports:", error);
      setMessage({
        type: "danger",
        text: error.message || "पुष्प रिपोर्ट प्राप्त नहीं हो सकी।",
      });
    } finally {
      setLoadingRecords(false);
    }
  }, [centerName]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (!filterFinancialYear ||
            record.financial_year === filterFinancialYear) &&
          (!filterMonth || record.month === filterMonth) &&
          (!filterFlower || record.flower === filterFlower)
      ),
    [filterFinancialYear, filterMonth, filterFlower, records]
  );

  const uniqueFinancialYears = useMemo(
    () => [...new Set(records.map((r) => r.financial_year).filter(Boolean))].sort(),
    [records]
  );
  const uniqueMonths = useMemo(
    () => [...new Set(records.map((r) => r.month).filter(Boolean))].sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)),
    [records]
  );
  const uniqueFlowers = useMemo(
    () => [...new Set(records.map((r) => r.flower).filter(Boolean))].sort(),
    [records]
  );

  // Calculate financial year shorts for display
  const financialYearShort = entryFinancialYear
    ? `${entryFinancialYear.slice(0, 4)}-${entryFinancialYear.slice(-2)}`
    : "________";
  const previousFinancialYearShort = entryFinancialYear
    ? `${Number(entryFinancialYear.slice(0, 4)) - 1}-${String(
        Number(entryFinancialYear.slice(-2)) - 1
      ).padStart(2, "0")}`
    : "________";
  const reportMonthLabel =
    MONTHS.find((month) => month === entryMonth) || "________";

  const toggleSelected = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredRecords.map((record) => record.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  };

  const validateNumericFields = (record) => {
    const fields = {};
    INPUT_FIELDS.forEach((field) => {
      const value = String(record[field] ?? "").trim();
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        throw new Error(
          `${INPUT_LABELS[field]} में शून्य या उससे अधिक संख्या दर्ज करें।`
        );
      }
      fields[field] = value ? Number(value).toFixed(2) : "0.00";
    });
    return fields;
  };

  const startEditing = (record) => {
    setEditingId(record.id);
    setEditingRecord({ ...record });
  };

  const updateEditingRecord = (field, value) => {
    setEditingRecord((current) => ({ ...current, [field]: value }));
  };

  const handleUpdate = async (record) => {
    if (!record?.id || !editingRecord) return;
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        id: record.id,
        ...validateNumericFields(editingRecord),
        prabhari_ka_naam: String(editingRecord.prabhari_ka_naam || "").trim(),
        remarks: String(editingRecord.remarks || "").trim(),
      };
      const response = await fetch(REPORT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(data, "प्रविष्टि अपडेट नहीं हो सकी।"));
      }
      setEditingId(null);
      setEditingRecord(null);
      setMessage({ type: "success", text: "प्रविष्टि सफलतापूर्वक अपडेट हुई।" });
      await loadRecords();
    } catch (error) {
      console.error("updateFlowerReport:", error);
      setMessage({
        type: "danger",
        text: error.message || "प्रविष्टि अपडेट नहीं हो सकी।",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`चुनी गई ${selectedIds.length} प्रविष्टि हटाएं?`)) return;
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch(REPORT_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(data, "प्रविष्टियां हटाई नहीं जा सकीं।"));
      }
      setSelectedIds([]);
      setMessage({ type: "success", text: "चुनी गई प्रविष्टियां हटा दी गईं।" });
      await loadRecords();
    } catch (error) {
      console.error("deleteFlowerReports:", error);
      setMessage({
        type: "danger",
        text: error.message || "प्रविष्टियां हटाई नहीं जा सकीं।",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderNumericCell = (record, field) =>
    editingId === record.id ? (
      <Form.Control
        aria-label={INPUT_LABELS[field]}
        type="number"
        min="0"
        step="0.01"
        value={editingRecord?.[field] ?? ""}
        onChange={(event) => updateEditingRecord(field, event.target.value)}
        style={{ minWidth: "105px" }}
      />
    ) : (
      formatNumber(record[field])
    );

  return (
    <Container fluid className="px-3" style={{ paddingTop: "60px" }}>
      <div className="mb-3">
        <DemandNavigation />
      </div>
      {message.text && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage({ type: "", text: "" })}
        >
          {message.text}
        </Alert>
      )}
      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <Button
            variant="outline-danger"
            size="sm"
            disabled={!selectedIds.length || submitting}
            onClick={handleDeleteSelected}
            style={{ color: 'white' }}
          >
            चयनित हटाएं ({selectedIds.length})
          </Button>
        </Card.Header>
        <Card.Body>
          <div className="row g-3 mb-3">
            <Form.Group className="col-12 col-md-4">
              <Form.Label>वित्तीय वर्ष से छांटें</Form.Label>
              <Form.Select value={filterFinancialYear} onChange={(event) => setFilterFinancialYear(event.target.value)}>
                <option value="">सभी वित्तीय वर्ष</option>
                {uniqueFinancialYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>माह से छांटें</Form.Label>
              <Form.Select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}>
                <option value="">सभी माह</option>
                {uniqueMonths.map((month) => <option key={month} value={month}>{month}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>पुष्प के नाम से छांटें</Form.Label>
              <Form.Select value={filterFlower} onChange={(event) => setFilterFlower(event.target.value)}>
                <option value="">सभी पुष्प</option>
                {uniqueFlowers.map((flower) => <option key={flower} value={flower}>{flower}</option>)}
              </Form.Select>
            </Form.Group>
          </div>

          {/* Display financial year and month information */}
          {filteredRecords.length > 0 && (
            <div className="mb-3 p-3 border rounded bg-light">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <div>
                  <strong>वर्ष:</strong> {financialYearShort}
                </div>
                <div>
                  <strong>माह:</strong> {" "}
                  <strong>
                    {reportMonthLabel}{" "}
                    {entryYearFromMonth(entryFinancialYear, entryMonth)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {loadingRecords ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            <div className="table-responsive">
              <Table bordered hover size="sm" className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>
                      <Form.Check
                        aria-label="दिख रही सभी प्रविष्टियां चुनें"
                        checked={filteredRecords.length > 0 && filteredRecords.every((record) => selectedIds.includes(record.id))}
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>क्र.सं.</th>
                    <th>पुष्प</th>
                    <th>वर्ष {previousFinancialYearShort} तक कुल आच्छादित क्षेत्रफल (3)</th>
                    <th>वर्तमान माह बुवाई (4)</th>
                    <th>गत माह तक बुवाई (5)</th>
                    <th>क्षतिग्रस्त क्षेत्रफल (7)</th>
                    <th>वर्तमान स्पाइक (9)</th>
                    <th>गत माह स्पाइक (10)</th>
                    <th>वर्तमान लूज (12)</th>
                    <th>गत माह लूज (13)</th>
<th>टिप्पणी (15)</th>
                     <th>माह</th>
                    <th>वित्तीय वर्ष</th>
                    <th>कार्यवाही</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => {
                    const val4 = Number(record.current_month_sown_area) || 0;
                    const val5 = Number(record.previous_month_sown_area) || 0;
                    const val7 = Number(record.damaged_area) || 0;
                    const val9 = Number(record.current_month_spike_or_cut_flower_production) || 0;
                    const val10 = Number(record.previous_month_spike_or_cut_flower_production) || 0;
                    const val12 = Number(record.current_month_loose_flower_production) || 0;
                    const val13 = Number(record.previous_month_loose_flower_production) || 0;

                    return (
                      <tr key={record.id}>
                        <td>
                          <Form.Check
                            aria-label={`${record.flower} प्रविष्टि चुनें`}
                            checked={selectedIds.includes(record.id)}
                            onChange={() => toggleSelected(record.id)}
                          />
                        </td>
                        <td>{index + 1}</td>
                        <td>{record.flower}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[0])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[1])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[2])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[3])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[4])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[5])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[6])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[7])}</td>
<td>
                           {editingId === record.id ? (
                             <Form.Control
                               aria-label="टिप्पणी"
                               value={editingRecord?.remarks ?? ""}
                               onChange={(event) =>
                                 updateEditingRecord("remarks", event.target.value)}
                               style={{ minWidth: "140px" }}
                             />
                           ) : (
                             record.remarks || "—"
                           )}
                         </td>
                         <td>{record.month}</td>
                        <td>{record.financial_year}</td>
                        <td className="text-nowrap">
                          {editingId === record.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                className="me-1"
                                disabled={submitting}
                                onClick={() => handleUpdate(record)}
                              >
                                सेव
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                disabled={submitting}
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingRecord(null);
                                }}
                              >
                                रद्द
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              disabled={submitting}
                              onClick={() => startEditing(record)}
                            >
                              संपादित करें
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredRecords.length && (
                    <tr>
                      <td
                        colSpan={15}
                        className="text-center text-muted py-4"
                      >
                        इस चयन के लिए कोई प्रविष्टि उपलब्ध नहीं है।
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
          {filteredRecords.length > 0 && (
            <div className="mt-3 p-3 border rounded bg-light">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <strong style={{ color: "#2a4682", minWidth: "120px" }}>प्रभारी का नाम:</strong>
                <div className="d-flex flex-wrap gap-3">
                  <span className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                    {filteredRecords[0]?.prabhari_ka_naam || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SavedFlowerEntries;