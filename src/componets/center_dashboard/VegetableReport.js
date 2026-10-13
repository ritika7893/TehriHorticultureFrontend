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

const API_BASE =
  "https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api";
const COMPONENTS_URL = `${API_BASE}/component-list/`;
const REPORT_URL = `${API_BASE}/vegetable-monthly-report/`;
const MONTHS = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];
const INPUT_FIELDS = [
  "current_month_sown_area",
  "previous_month_total_sown_area",
  "total_damaged_area",
  "current_month_production",
  "previous_month_total_production",
];
const INPUT_LABELS = {
  current_month_sown_area: "वर्तमान माह बुवाई / रोपण क्षेत्रफल",
  previous_month_total_sown_area: "गत माह तक बुवाई / रोपण क्षेत्रफल",
  total_damaged_area: "कीट-व्याधि आदि से प्रभावित क्षेत्रफल",
  current_month_production: "वर्तमान माह उत्पादन",
  previous_month_total_production: "गत माह तक उत्पादन",
  remarks: "अभ्युक्ति",
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
const createDraft = (key, vegetable = "") => ({
  key,
  vegetable,
  current_month_sown_area: "",
  previous_month_total_sown_area: "",
  total_damaged_area: "",
  current_month_production: "",
  previous_month_total_production: "",
  remarks: "",
});
const hasDraftValues = (draft) =>
  INPUT_FIELDS.some((field) => String(draft[field] ?? "").trim() !== "") ||
  String(draft.remarks ?? "").trim() !== "";

const VegetableReport = () => {
  const { centerData } = useCenter();
  const centerName = String(centerData?.centerName || "").trim();
  const currentYear = Number(getCurrentFinancialYear().slice(0, 4));
  const financialYearOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const startYear = currentYear - 3 + index;
        return `${startYear}-${startYear + 1}`;
      }),
    [currentYear],
  );

  const [components, setComponents] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [entryMonth, setEntryMonth] = useState("");
  const [entryFinancialYear, setEntryFinancialYear] = useState(
    getCurrentFinancialYear,
  );
  const [prabhariName, setPrabhariName] = useState("");
  const [loadingComponents, setLoadingComponents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadComponents = useCallback(async () => {
    setLoadingComponents(true);
    try {
      const response = await fetch(COMPONENTS_URL);
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "सब्जियों की सूची प्राप्त नहीं हो सकी।"),
        );
      }
      const vegetableComponents = getItems(data)
        .filter((item) => item.investment_name === "सब्जी")
        .sort((first, second) => Number(first.id) - Number(second.id));
      setComponents(vegetableComponents);
      setDrafts(
        vegetableComponents.map((component) =>
          createDraft(component.id, component.sub_investment_name),
        ),
      );
    } catch (error) {
      console.error("loadVegetableComponents:", error);
      setMessage({
        type: "danger",
        text: error.message || "सब्जियों की सूची प्राप्त नहीं हो सकी।",
      });
    } finally {
      setLoadingComponents(false);
    }
  }, []);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const updateDraft = (key, field, value) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const validateNumericFields = (record) => {
    const fields = {};
    INPUT_FIELDS.forEach((field) => {
      const value = String(record[field] ?? "").trim();
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        throw new Error(
          `${INPUT_LABELS[field]} में शून्य या उससे अधिक संख्या दर्ज करें।`,
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
        text: "कम से कम एक सब्जी की जानकारी दर्ज करें।",
      });
      return;
    }

    let payloads;
    try {
      payloads = readyDrafts.map((draft) => ({
        center_name: centerName,
        vegetable: draft.vegetable,
        ...validateNumericFields(draft),
        prabhari_ka_naam: String(prabhariName || "").trim(),
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
        console.error("createVegetableReport:", error);
        failures.push(
          `${readyDrafts[index].vegetable}: ${error.message || "सेव नहीं हुआ"}`,
        );
      }
    }

    setDrafts((current) => {
      return current.map((draft) =>
        succeededKeys.includes(draft.key)
          ? createDraft(draft.key, draft.vegetable)
          : draft,
      );
    });
    if (succeededKeys.length) {
      setMessage({
        type: failures.length ? "warning" : "success",
        text: failures.length
          ? `${succeededKeys.length} प्रविष्टि सेव हुई। ${failures.join(" ")}`
          : `${succeededKeys.length} प्रविष्टि सफलतापूर्वक सेव हुई।`,
      });
    } else {
      setMessage({
        type: "danger",
        text: failures.join(" ") || "प्रविष्टि सेव नहीं हो सकी।",
      });
    }
    setSubmitting(false);
  };

  const renderDraftInput = (draft, field) => (
    <Form.Control
      aria-label={`${draft.vegetable || "सब्जी"} - ${INPUT_LABELS[field]}`}
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
          <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#2a4682" }}>सब्जी रिपोर्ट</h4>
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
                  onChange={(event) => setEntryFinancialYear(event.target.value)}
                >
                  {financialYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
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
                    <option key={month} value={month}>{month}</option>
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
                component-list API में कोई सब्जी उपलब्ध नहीं है।
              </Alert>
            ) : (
              <>
                <div className="vegetable-report-sheet-wrap">
                  <div className="vegetable-report-sheet">
<div className="vegetable-report-title">
                       <strong>अ</strong>
                       <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#2a4682" }}>औद्योगिक फसलों के माहवार क्षेत्रफल / उत्पादन के आंकड़े</h4>
                       <div>वर्ष <strong>{financialYearShort}</strong></div>
                       <div>माह — <strong>{reportMonthLabel} {entryYearFromMonth(entryFinancialYear, entryMonth)}</strong></div>
                     </div>
                  <Table bordered size="sm" className="vegetable-report-table">
                    <thead className="table-light">
                      <tr>
                        <th rowSpan={2}>क्र.सं.</th>
                        <th rowSpan={2}>सब्जी</th>
                        <th colSpan={3}>क्षेत्रफल (हेक्टेयर)</th>
                        <th colSpan={2}>उत्पादन (कुंटल) ({financialYearShort})</th>
                        <th rowSpan={2}>अभ्युक्ति</th>
                      </tr>
                      <tr>
                        <th>वर्तमान माह में बुवाई / रोपण का कुल क्षेत्रफल</th>
                        <th>गत माह तक बुवाई / रोपण के अन्तर्गत क्षेत्रफल</th>
                        <th>माह में कीट-व्याधि, सूखा, अतिवृष्टि आदि से क्षति (5 के सापेक्ष)</th>
                        <th>वर्तमान माह उत्पादन</th>
                        <th>गत माह तक उत्पादन</th>
                      </tr>
                      <tr>
                        {Array.from({ length: 8 }, (_, index) => (
                          <th key={index}>{index + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((draft, index) => (
                        <tr key={draft.key}>
                          <td>{index + 1}</td>
                          <td>{draft.vegetable}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[0])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[1])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[2])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[3])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[4])}</td>
                          <td>
                            <Form.Control
                              aria-label={`${draft.vegetable} - अभ्युक्ति`}
                              value={draft.remarks}
                              onChange={(event) =>
                                updateDraft(draft.key, "remarks", event.target.value)
                              }
                              className="vegetable-report-input"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="vegetable-report-total">
                        <td colSpan={2}>योग—</td>
                        <td>{sumDraftField(INPUT_FIELDS[0]).toFixed(2)}</td>
                        <td>{sumDraftField(INPUT_FIELDS[1]).toFixed(2)}</td>
                        <td>{sumDraftField(INPUT_FIELDS[2]).toFixed(2)}</td>
                        <td>{sumDraftField(INPUT_FIELDS[3]).toFixed(2)}</td>
                        <td>{sumDraftField(INPUT_FIELDS[4]).toFixed(2)}</td>
                        <td>—</td>
                      </tr>
                    </tbody>
                  </Table>
<div className="vegetable-report-notes">
                        <div>
                          नोट— (1) कॉलम संख्या 3 (गत माह तक बुवाई / रोपण के अन्तर्गत क्षेत्रफल) में माह <strong>{reportMonthLabel} {entryYearFromMonth(entryFinancialYear, entryMonth)}</strong> से पूर्व बुवाई / रोपण का क्षेत्रफल अंकित न किया जाए।
                        </div>
                        <div>
                          (2) कॉलम संख्या 6 (गत माह तक उत्पादन) के अन्तर्गत माह <strong>{reportMonthLabel} {entryYearFromMonth(entryFinancialYear, entryMonth)}</strong> से पूर्व का उत्पादन अंकित न किया जाए।
                        </div>
                      </div>
                      <div className="mb-3" style={{ maxWidth: "400px" }}>
                        <Form.Label>प्रभारी का नाम</Form.Label>
                        <Form.Control
                          type="text"
                          value={prabhariName}
                          onChange={(event) => setPrabhariName(event.target.value)}
                          placeholder="प्रभारी का नाम दर्ज करें"
                          className="vegetable-report-input"
                        />
                      </div>
                     <div className="vegetable-report-signature">
                      हस्ताक्षर<br />
                      प्रभारी, उद्यान सचल दल केंद्र<br />
                      {centerName}
                    </div>
                  </div>
                </div>
                <Button type="submit" variant="success" disabled={submitting || !centerName}>
                  {submitting ? "सेव हो रहा है..." : "प्रविष्टियां सेव करें"}
                </Button>
              </>
            )}
          </Form>
        </Card.Body>
      </Card>

    </Container>
  );
};

export default VegetableReport;
