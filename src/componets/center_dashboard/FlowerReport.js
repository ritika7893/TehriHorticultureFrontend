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
import "../../componets/center_dashboard/FruitReport.css";

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
  previous_year_total_covered_area: "गत वर्ष तक कुल विस्तृत क्षेत्रफल",
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

const createDraft = (key, flower = "") => ({
  key,
  flower,
  previous_year_total_covered_area: "",
  current_month_sown_area: "",
  previous_month_sown_area: "",
  damaged_area: "",
  current_month_spike_or_cut_flower_production: "",
  previous_month_spike_or_cut_flower_production: "",
  current_month_loose_flower_production: "",
  previous_month_loose_flower_production: "",
  remarks: "",
});

const hasDraftValues = (draft) =>
  INPUT_FIELDS.some((field) => String(draft[field] ?? "").trim() !== "") ||
  String(draft.remarks ?? "").trim() !== "";

const FlowerReport = () => {
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
  const [drafts, setDrafts] = useState([]);
  const [entryMonth, setEntryMonth] = useState("");
  const [entryFinancialYear, setEntryFinancialYear] = useState(
    getCurrentFinancialYear
  );
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");
  const [filterFlower, setFilterFlower] = useState("");
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
      setDrafts(
        flowerComponents.map((component) =>
          createDraft(component.id, component.sub_investment_name)
        )
      );
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

  const updateDraft = (key, field, value) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, [field]: value } : draft
      )
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

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    if (!centerName) {
      setMessage({
        type: "danger",
        text: "लॉग-इन केंद्र का नाम उपलब्ध नहीं है। कृपया दोबारा लॉग-इन करें।",
      });
      return;
    }
    if (!entryMonth) {
      setMessage({ type: "danger", text: "कृपया रिपोर्ट का माह चुनें।" });
      return;
    }
    const readyDrafts = drafts.filter(hasDraftValues);
    if (!readyDrafts.length) {
      setMessage({
        type: "danger",
        text: "कम से कम एक पुष्प की जानकारी दर्ज करें।",
      });
      return;
    }

    let payloads;
    try {
      payloads = readyDrafts.map((draft) => ({
        center_name: centerName,
        flower: draft.flower,
        ...validateNumericFields(draft),
        remarks: String(draft.remarks || "").trim(),
        financial_year: entryFinancialYear,
        month: entryMonth,
      }));
    } catch (error) {
      setMessage({ type: "danger", text: error.message });
      return;
    }

    setSubmitting(true);
    const succeededKeys = [];
    const failures = [];
    for (let index = 0; index < readyDrafts.length; index += 1) {
      try {
        const response = await fetch(REPORT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloads[index]),
        });
        const data = await readResponse(response);
        if (!response.ok) {
          throw new Error(getErrorMessage(data, "प्रविष्टि सेव नहीं हो सकी।"));
        }
        succeededKeys.push(readyDrafts[index].key);
      } catch (error) {
        console.error("createFlowerReport:", error);
        failures.push(
          `${readyDrafts[index].flower}: ${error.message || "सेव नहीं हुआ"}`
        );
      }
    }

    setDrafts((current) =>
      current.map((draft) =>
        succeededKeys.includes(draft.key)
          ? createDraft(draft.key, draft.flower)
          : draft
      )
    );
    if (succeededKeys.length) {
      setMessage({
        type: failures.length ? "warning" : "success",
        text: failures.length
          ? `${succeededKeys.length} प्रविष्टि सेव हुई। ${failures.join(" ")}`
          : `${succeededKeys.length} प्रविष्टि सफलतापूर्वक सेव हुई।`,
      });
      await loadRecords();
    } else {
      setMessage({
        type: "danger",
        text: failures.join(" ") || "प्रविष्टि सेव नहीं हो सकी।",
      });
    }
    setSubmitting(false);
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

  const renderDraftInput = (draft, field) => (
    <Form.Control
      aria-label={`${draft.flower || "पुष्प"} - ${INPUT_LABELS[field]}`}
      type="number"
      min="0"
      step="0.01"
      value={draft[field]}
      onChange={(event) => updateDraft(draft.key, field, event.target.value)}
      className="vegetable-report-input"
    />
  );

  const sumDraftField = (field) =>
    drafts.reduce((sum, draft) => sum + (Number(draft[field]) || 0), 0);

  const reportMonthLabel =
    MONTHS.find((month) => month === entryMonth) || "________";
  const financialYearShort = entryFinancialYear
    ? `${entryFinancialYear.slice(0, 4)}-${entryFinancialYear.slice(-2)}`
    : "________";

  return (
    <Container fluid className="px-3" style={{ paddingTop: "60px" }}>
      <div className="mb-3">
        <DemandNavigation />
      </div>

<Card className="border-0 shadow-sm mb-3">
        <Card.Header className="report-clean-card-header">
          <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#2a4682" }}>पुष्प रिपोर्ट</h4>
          <small>केंद्र: {centerName || "केंद्र उपलब्ध नहीं"}</small>
        </Card.Header>
      </Card>

      {message.text && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage({ type: "", text: "" })}
        >
          {message.text}
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-4">
       
        <Card.Body>
          <Form onSubmit={handleCreate}>
            <div className="row g-3 mb-3">
              <Form.Group className="col-12 col-md-4">
                <Form.Label>वित्तीय वर्ष</Form.Label>
                <Form.Select
                  value={entryFinancialYear}
                  onChange={(event) =>
                    setEntryFinancialYear(event.target.value)
                  }
                >
                  {financialYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-12 col-md-4">
                <Form.Label>माह</Form.Label>
                <Form.Select
                  value={entryMonth}
                  onChange={(event) => setEntryMonth(event.target.value)}
                  required
                >
                  <option value="">माह चुनें</option>
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            {loadingComponents ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status" />
              </div>
            ) : components.length === 0 ? (
              <Alert variant="warning" className="mb-0">
                component-list API में कोई पुष्प उपलब्ध नहीं है।
              </Alert>
            ) : (
              <>
                <div className="vegetable-report-sheet-wrap">
                  <div className="vegetable-report-sheet">
                    <div className="vegetable-report-title">
                      <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#2a4682" }}>पुष्पों के माहवार क्षेत्रफल / उत्पादन के आंकड़े</h4>
                      <div>
                        वर्ष <strong>{financialYearShort}</strong>
                      </div>
                      <div>
                        माह —{" "}
                        <strong>
                          {reportMonthLabel}{" "}
                          {entryYearFromMonth(entryFinancialYear, entryMonth)}
                        </strong>
                      </div>
                    </div>

                    <Table
                      bordered
                      size="sm"
                      className="vegetable-report-table"
                      responsive
                    >
                      <thead className="table-light">
                        <tr>
                          <th rowSpan={2} className="text-center align-middle">
                            क्र.सं.
                          </th>
                          <th rowSpan={2} className="text-center align-middle">
                            पुष्प
                          </th>
                          <th rowSpan={2} className="text-center align-middle">
                            गत वर्ष तक कुल क्षेत्रफल
                          </th>
                          <th colSpan={3} className="text-center">
                            क्षेत्रफल (हेक्टेयर)
                          </th>
                          <th colSpan={2} className="text-center">
                            स्पाइक / कट फ्लॉवर उत्पादन (संख्या)
                          </th>
                          <th colSpan={2} className="text-center">
                            लूज फ्लॉवर उत्पादन (कुंटल)
                          </th>
                          <th rowSpan={2} className="text-center align-middle">
                            अभ्युक्ति
                          </th>
                        </tr>
                        <tr>
                          <th className="text-center">वर्तमान माह बुवाई / रोपण</th>
                          <th className="text-center">गत माह तक बुवाई / रोपण<br/></th>
                          <th className="text-center">क्षतिग्रस्त क्षेत्रफल<br/></th>
                          <th className="text-center">वर्तमान माह<br/></th>
                          <th className="text-center">गत माह तक<br/></th>
                          <th className="text-center">वर्तमान माह<br/></th>
                          <th className="text-center">गत माह तक<br/></th>
                        </tr>
                      </thead>
                      <tbody>
                        {drafts.map((draft, index) => {
                          const val4 = Number(draft.current_month_sown_area) || 0;
                          const val5 = Number(draft.previous_month_sown_area) || 0;
                          const val7 = Number(draft.damaged_area) || 0;
                          const val9 = Number(draft.current_month_spike_or_cut_flower_production) || 0;
                          const val10 = Number(draft.previous_month_spike_or_cut_flower_production) || 0;
                          const val12 = Number(draft.current_month_loose_flower_production) || 0;
                          const val13 = Number(draft.previous_month_loose_flower_production) || 0;

                          return (
                            <tr key={draft.key}>
                              <td className="text-center">{index + 1}</td>
                              <td>{draft.flower}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[0])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[1])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[2])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[3])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[4])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[5])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[6])}</td>
                              <td>{renderDraftInput(draft, INPUT_FIELDS[7])}</td>
                              <td>
                                <Form.Control
                                  aria-label={`${draft.flower} - अभ्युक्ति`}
                                  value={draft.remarks}
                                  onChange={(event) =>
                                    updateDraft(draft.key, "remarks", event.target.value)
                                  }
                                  className="vegetable-report-input"
                                />
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="vegetable-report-total">
                          <td colSpan={3} className="text-end">योग—</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[1]).toFixed(2)}</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[2]).toFixed(2)}</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[3]).toFixed(2)}</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[4]).toFixed(2)}</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[5]).toFixed(2)}</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[6]).toFixed(2)}</td>
                          <td className="text-center">{sumDraftField(INPUT_FIELDS[7]).toFixed(2)}</td>
                          <td className="text-center">—</td>
                        </tr>
                      </tbody>
                    </Table>

                    <div className="vegetable-report-notes">
                      <div>
                        नोट— (1) कॉलम संख्या 5 (गत माह तक बुवाई / रोपण क्षेत्रफल) में माह{" "}
                        <strong>
                          {reportMonthLabel}{" "}
                          {entryYearFromMonth(entryFinancialYear, entryMonth)}
                        </strong>{" "}
                        से पूर्व बुवाई / रोपण का क्षेत्रफल अंकित न किया जाए।
                      </div>
                      <div>
                        (2) कॉलम संख्या 10 व 13 (गत माह तक उत्पादन) के अन्तर्गत माह{" "}
                        <strong>
                          {reportMonthLabel}{" "}
                          {entryYearFromMonth(entryFinancialYear, entryMonth)}
                        </strong>{" "}
                        से पूर्व का उत्पादन अंकित न किया जाए।
                      </div>
                    </div>

                    <div className="vegetable-report-signature">
                      हस्ताक्षर
                      <br />
                      प्रभारी, उद्यान सचल दल केंद्र
                      <br />
                      {centerName}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="success"
                  disabled={submitting || !centerName}
                >
                  {submitting ? "सेव हो रहा है..." : "प्रविष्टियां सेव करें"}
                </Button>
              </>
            )}
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <strong>सेव की गई पुष्प प्रविष्टियां</strong>
          <Button
            variant="outline-danger"
            size="sm"
            disabled={!selectedIds.length || submitting}
            onClick={handleDeleteSelected}
            style={{ color: "white" }}
          >
            चयनित हटाएं ({selectedIds.length})
          </Button>
        </Card.Header>
        <Card.Body>
          <div className="row g-3 mb-3">
            <Form.Group className="col-12 col-md-4">
              <Form.Label>वित्तीय वर्ष से छांटें</Form.Label>
              <Form.Select
                value={filterFinancialYear}
                onChange={(event) =>
                  setFilterFinancialYear(event.target.value)
                }
              >
                <option value="">सभी वित्तीय वर्ष</option>
                {financialYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>माह से छांटें</Form.Label>
              <Form.Select
                value={filterMonth}
                onChange={(event) => setFilterMonth(event.target.value)}
              >
                <option value="">सभी माह</option>
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>पुष्प के नाम से छांटें</Form.Label>
              <Form.Select
                value={filterFlower}
                onChange={(event) => setFilterFlower(event.target.value)}
              >
                <option value="">सभी पुष्प</option>
                {components.map((component) => (
                  <option
                    key={component.id}
                    value={component.sub_investment_name}
                  >
                    {component.sub_investment_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

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
                        checked={
                          filteredRecords.length > 0 &&
                          filteredRecords.every((record) =>
                            selectedIds.includes(record.id)
                          )
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>क्र.सं.</th>
                    <th>पुष्प</th>
                    <th>गत वर्ष तक क्षेत्रफल (3)</th>
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
                                updateEditingRecord("remarks", event.target.value)
                              }
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
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FlowerReport;