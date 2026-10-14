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
const REPORT_URL = `${API_BASE}/fruit-monthly-report/`;

const MONTHS = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

const INPUT_FIELDS = [
  "previous_month_total_area",
  "current_month_planted_area",
  "damaged_area",
  "current_month_production",
  "previous_month_production",
];

const INPUT_LABELS = {
  previous_month_total_area: "गत माह तक का कुल क्षेत्रफल",
  current_month_planted_area: "वर्तमान माह में नवरोपित क्षेत्रफल",
  damaged_area: "वर्तमान माह में कीट-व्याधि, पातन, सूखा, बाढ़, निर्माण आदि कारणों से कुल क्षेत्रफल में क्षति",
  current_month_production: "वर्तमान माह में उत्पादन",
  previous_month_production: "गत माह तक उत्पादन",
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

const createDraft = (key, fruit = "", investmentName = "") => ({
  key,
  fruit,
  investmentName,
  previous_month_total_area: "",
  current_month_planted_area: "",
  damaged_area: "",
  current_month_production: "",
  previous_month_production: "",
  remarks: "",
});

const hasDraftValues = (draft) =>
  INPUT_FIELDS.some((field) => String(draft[field] ?? "").trim() !== "") ||
  String(draft.remarks ?? "").trim() !== "";

const FruitReport = () => {
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
const [prabhariName, setPrabhariName] = useState("");
const [fieldErrors, setFieldErrors] = useState({});
const [draftFieldErrors, setDraftFieldErrors] = useState({});
const [editingFieldErrors, setEditingFieldErrors] = useState({});
const [filterMonth, setFilterMonth] = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");
  const [filterFruit, setFilterFruit] = useState("");
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
          getErrorMessage(data, "फलों की सूची प्राप्त नहीं हो सकी।")
        );
      }
      // Properly filter both "फल" and "फल-नींबू प्रजाति" to include citrus fruits
      const fruitComponents = getItems(data)
        .filter(
          (item) =>
            item.investment_name === "फल" ||
            item.investment_name === "फल-नींबू प्रजाति"
        )
        .sort((first, second) => Number(first.id) - Number(second.id));
      setComponents(fruitComponents);
      setDrafts(
        fruitComponents.map((component) =>
          createDraft(
            component.id,
            component.sub_investment_name,
            component.investment_name
          )
        )
      );
    } catch (error) {
      console.error("loadFruitComponents:", error);
      setMessage({
        type: "danger",
        text: error.message || "फलों की सूची प्राप्त नहीं हो सकी।",
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
          getErrorMessage(data, "फल रिपोर्ट प्राप्त नहीं हो सकी।")
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
      console.error("loadFruitReports:", error);
      setMessage({
        type: "danger",
        text: error.message || "फल रिपोर्ट प्राप्त नहीं हो सकी।",
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
          (!filterFruit || record.fruit === filterFruit)
      ),
    [filterFinancialYear, filterMonth, filterFruit, records]
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
   
    const validateDraftFields = (draft) => {
      const errors = {};
      const validatedFields = {};
      
      INPUT_FIELDS.forEach((field) => {
        const fieldKey = `${draft.key}-${field}`;
        const value = String(draft[field] ?? "").trim();
        
        // Check if field is empty (required)
        if (!value) {
          errors[fieldKey] = "यह फील्ड आवश्यक है";
        } 
        // Check if value is a valid number
        else if (!Number.isFinite(Number(value)) || Number(value) < 0) {
          errors[fieldKey] = `${INPUT_LABELS[field]} में शून्य या उससे अधिक संख्या दर्ज करें।`;
        } else {
          validatedFields[field] = Number(value).toFixed(2);
        }
      });
      
      return { errors, validatedFields };
    };

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    setFieldErrors({});
    let hasErrors = false;

     if (!centerName) {
       setMessage({
         type: "danger",
         text: "लॉग-इन केंद्र का नाम उपलब्ध नहीं है। कृपया दोबारा लॉग-इन करें।",
       });
       window.scrollTo(0, 0);
       return;
     }
     if (!entryMonth) {
       setFieldErrors((prev) => ({ ...prev, entryMonth: "यह फील्ड आवश्यक है" }));
       hasErrors = true;
     }
     if (!String(prabhariName || "").trim()) {
       setFieldErrors((prev) => ({ ...prev, prabhariName: "यह फील्ड आवश्यक है" }));
       hasErrors = true;
     }
     if (hasErrors) {
       setMessage({
         type: "danger",
         text: "कृपया सभी आवश्यक फील्ड भरें।",
       });
       window.scrollTo(0, 0);
       return;
     }
      const readyDrafts = drafts.filter(hasDraftValues);
      if (readyDrafts.length !== drafts.length) {
        setMessage({
          type: "danger",
          text: "सभी फल की जानकारी दर्ज करें।",
        });
        window.scrollTo(0, 0);
        alert("सभी फल की जानकारी दर्ज करें।");
        return;
      }

     // Validate all draft fields and collect errors
     let allValid = true;
     const draftErrors = {};
     const validatedPayloads = [];
     
     readyDrafts.forEach((draft) => {
       const { errors, validatedFields } = validateDraftFields(draft);
       if (Object.keys(errors).length > 0) {
         allValid = false;
         Object.assign(draftErrors, errors);
       }
       validatedPayloads.push({
         center_name: centerName,
         fruit: draft.fruit,
         ...validatedFields,
         prabhari_ka_naam: String(prabhariName || "").trim(),
         remarks: String(draft.remarks || "").trim(),
         financial_year: entryFinancialYear,
         month: entryMonth,
       });
     });
     
      // Set draft field errors
      setDraftFieldErrors(draftErrors);
      
      if (!allValid) {
        setMessage({
          type: "danger",
          text: "कृपया सभी संख्या फील्ड में सही मान दर्ज करें।",
        });
        window.scrollTo(0, 0);
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
           body: JSON.stringify(validatedPayloads[index]),
         });
         const data = await readResponse(response);
         if (!response.ok) {
           throw new Error(getErrorMessage(data, "प्रविष्टि सेव नहीं हो सकी।"));
         }
         succeededKeys.push(readyDrafts[index].key);
       } catch (error) {
         console.error("createFruitReport:", error);
         failures.push(
           `${readyDrafts[index].fruit}: ${error.message || "सेव नहीं हुआ"}`
         );
       }
     }

    setDrafts((current) =>
      current.map((draft) =>
        succeededKeys.includes(draft.key)
          ? createDraft(draft.key, draft.fruit)
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
      if (!failures.length) {
        alert(`${succeededKeys.length} प्रविष्टि सफलतापूर्वक सेव हुई।`);
      }
      await loadRecords();
     } else {
       setMessage({
         type: "danger",
         text: failures.join(" ") || "प्रविष्टि सेव नहीं हो सकी।",
       });
       window.scrollTo(0, 0);
     }
    setSubmitting(false);
  };

   const startEditing = (record) => {
     setEditingId(record.id);
     setEditingRecord({ ...record });
     setEditingFieldErrors({}); // Clear editing errors when starting new edit
   };

  const updateEditingRecord = (field, value) => {
    setEditingRecord((current) => ({ ...current, [field]: value }));
  };

   const handleUpdate = async (record) => {
     if (!record?.id || !editingRecord) return;
     setSubmitting(true);
     setMessage({ type: "", text: "" });
     
     // Validate editing record fields
     const { errors, validatedFields } = validateDraftFields(editingRecord);
     if (Object.keys(errors).length > 0) {
       // Set field-specific errors for editing
       setEditingFieldErrors(errors);
       window.scrollTo(0, 0);
       setSubmitting(false);
       return;
     }
     
     try {
       const payload = {
         id: record.id,
         ...validatedFields,
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
       setEditingFieldErrors({}); // Clear editing errors on success
       setMessage({ type: "success", text: "प्रविष्टि सफलतापूर्वक अपडेट हुई।" });
       await loadRecords();
     } catch (error) {
       console.error("updateFruitReport:", error);
       setMessage({
         type: "danger",
         text: error.message || "प्रविष्टि अपडेट नहीं हो सकी।",
       });
       window.scrollTo(0, 0);
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
       console.error("deleteFruitReports:", error);
       setMessage({
         type: "danger",
         text: error.message || "प्रविष्टियां हटाई नहीं जा सकीं।",
       });
       window.scrollTo(0, 0);
     } finally {
       setSubmitting(false);
     }
  };

   const renderNumericCell = (record, field) =>
     editingId === record.id ? (
       <div className="d-flex flex-column">
         <Form.Control
           aria-label={INPUT_LABELS[field]}
           type="number"
           min="0"
           step="0.01"
           value={editingRecord?.[field] ?? ""}
           onChange={(event) => {
             updateEditingRecord(field, event.target.value);
             // Clear error for this specific field when user starts typing
             const fieldKey = `${record.id}-${field}`;
             if (editingFieldErrors[fieldKey]) {
               setEditingFieldErrors(prev => {
                 const newErrors = { ...prev };
                 delete newErrors[fieldKey];
                 return newErrors;
               });
             }
           }}
           isInvalid={!!editingFieldErrors[`${record.id}-${field}`]}
           className="vegetable-report-input"
           style={{ minWidth: "105px" }}
         />
         {editingFieldErrors[`${record.id}-${field}`] && (
           <div className="invalid-feedback d-block" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
             {editingFieldErrors[`${record.id}-${field}`]}
           </div>
         )}
       </div>
     ) : (
       formatNumber(record[field])
     );

   const renderDraftInput = (draft, field) => {
     const fieldKey = `${draft.key}-${field}`;
     const hasError = !!draftFieldErrors[fieldKey];
     
     return (
       <div className="d-flex flex-column">
         <Form.Control
           aria-label={`${draft.fruit || "फल"} - ${INPUT_LABELS[field]}`}
           type="number"
           min="0"
           step="0.01"
           value={draft[field]}
           onChange={(event) => {
             updateDraft(draft.key, field, event.target.value);
             // Clear error for this specific field when user starts typing
             if (hasError) {
               setDraftFieldErrors(prev => {
                 const newErrors = { ...prev };
                 delete newErrors[fieldKey];
                 return newErrors;
               });
             }
           }}
           isInvalid={hasError}
           className="vegetable-report-input"
         />
         {hasError && (
           <div className="invalid-feedback d-block" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
             {draftFieldErrors[fieldKey]}
           </div>
         )}
       </div>
     );
   };

  const sumDraftField = (field) =>
    drafts.reduce((sum, draft) => sum + (Number(draft[field]) || 0), 0);

  const sumDraftListField = (draftList, field) =>
    draftList.reduce((sum, draft) => sum + (Number(draft[field]) || 0), 0);

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
          <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#2a4682" }}>फल रिपोर्ट</h4>
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
        <Card.Header className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <strong>नई मासिक प्रविष्टि</strong>
          <Button
            type="button"
            variant="outline-primary"
            onClick={() => window.print()}
          >
            प्रिंट करें
          </Button>
        </Card.Header>
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
                <Form.Label>माह <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={entryMonth}
                  onChange={(event) => {
                    setEntryMonth(event.target.value);
                    if (fieldErrors.entryMonth) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.entryMonth;
                        return next;
                      });
                    }
                  }}
                  isInvalid={!!fieldErrors.entryMonth}
                  className={fieldErrors.entryMonth ? "is-invalid" : ""}
               
                >
                  <option value="">माह चुनें</option>
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </Form.Select>
                {fieldErrors.entryMonth && (
                  <div
                    className="invalid-feedback d-block"
                    style={{ fontSize: "0.75rem", marginTop: "2px" }}
                  >
                    {fieldErrors.entryMonth}
                  </div>
                )}
              </Form.Group>
            </div>

            {loadingComponents ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status" />
              </div>
            ) : components.length === 0 ? (
              <Alert variant="warning" className="mb-0">
                component-list API में कोई फल उपलब्ध नहीं है।
              </Alert>
            ) : (
              <>
                <div className="vegetable-report-sheet-wrap">
                  <div className="vegetable-report-sheet">
                    <div className="vegetable-report-title">
                      <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#2a4682" }}>औद्योगिक फसलों के माहवार क्षेत्रफल / उत्पादन के आंकड़े</h4>
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
  माह क्र.सं.<br/>(1)
</th>
                          <th rowSpan={2} className="text-center align-middle">
                            फल<br/>(2)
                          </th>
                          <th colSpan={3} className="text-center">
                            क्षेत्रफल (हेक्टेयर)
                          </th>
<th colSpan={2} className="text-center">
  उत्पादन (कुंटल) (2026-27)
</th>
                          <th rowSpan={2} className="text-center align-middle">
                            अभ्युक्ति<br/>(12)
                          </th>
                        </tr>
                        <tr>
                          <th className="text-center">गत माह तक का कुल क्षेत्रफल<br/>(3)</th>
                          <th className="text-center">वर्तमान माह में नर्सरी क्षेत्रफल<br/>(4)</th>
                          <th className="text-center">वर्तमान माह में कीट-व्याधि, इल्मी, सूखा, बाढ़, भूस्खलन आदि कारणों से कुल क्षेत्रफल में क्षति (कॉलम संख्या-5 के सापेक्ष)<br/>(6)</th>
                          <th className="text-center">वर्तमान माह में उत्पादन<br/>(9)</th>
                          <th className="text-center">गत माह तक उत्पादन<br/>(10)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const fruitDrafts = drafts.filter(
                            (draft) => draft.investmentName === "फल"
                          );
                          const citrusDrafts = drafts.filter(
                            (draft) => draft.investmentName === "फल-नींबू प्रजाति"
                          );
                          const renderDraftRow = (draft, index) => {
                            const val3 = Number(draft.previous_month_total_area) || 0;
                            const val4 = Number(draft.current_month_planted_area) || 0;
                            const val6 = Number(draft.damaged_area) || 0;
                            const val9 = Number(draft.current_month_production) || 0;
                            const val10 = Number(draft.previous_month_production) || 0;
                            return (
                              <tr key={draft.key}>
                                <td className="text-center">{index + 1}</td>
                                <td>{draft.fruit}</td>
                                <td>{renderDraftInput(draft, INPUT_FIELDS[0])}</td>
                                <td>{renderDraftInput(draft, INPUT_FIELDS[1])}</td>
                                <td>{renderDraftInput(draft, INPUT_FIELDS[2])}</td>
                                <td>{renderDraftInput(draft, INPUT_FIELDS[3])}</td>
                                <td>{renderDraftInput(draft, INPUT_FIELDS[4])}</td>
                                <td>
                                  <Form.Control
                                    aria-label={`${draft.fruit} - अभ्युक्ति`}
                                    value={draft.remarks}
                                    onChange={(event) =>
                                      updateDraft(draft.key, "remarks", event.target.value)
                                    }
                                    className="vegetable-report-input"
                                  />
                                </td>
                              </tr>
                            );
                          };
                          const groupTotalRow = (groupDrafts, label) => (
                            <tr className="vegetable-report-total" key={label}>
                              <td colSpan={2} className="text-end">{label}—</td>
                              <td className="text-center">{sumDraftListField(groupDrafts, INPUT_FIELDS[0]).toFixed(2)}</td>
                              <td className="text-center">{sumDraftListField(groupDrafts, INPUT_FIELDS[1]).toFixed(2)}</td>
                              <td className="text-center">{sumDraftListField(groupDrafts, INPUT_FIELDS[2]).toFixed(2)}</td>
                              <td className="text-center">{sumDraftListField(groupDrafts, INPUT_FIELDS[3]).toFixed(2)}</td>
                              <td className="text-center">{sumDraftListField(groupDrafts, INPUT_FIELDS[4]).toFixed(2)}</td>
                              <td className="text-center">—</td>
                            </tr>
                          );
                          return (
                            <>
                              {fruitDrafts.map(renderDraftRow)}
                              {citrusDrafts.length > 0 && (
                                <tr className="vegetable-report-group-heading" key="citrus-heading">
                                  <td className="text-start">
                                    <strong>फल-नींबू प्रजाति</strong>
                                  </td>
                                  <td colSpan={7} />
                                </tr>
                              )}
                              {citrusDrafts.map(renderDraftRow)}
                              {citrusDrafts.length > 0 && groupTotalRow(citrusDrafts, "फल-नींबू प्रजाति योग")}
                              <tr className="vegetable-report-total" key="overall-total">
                                <td colSpan={2} className="text-end">कुल योग—</td>
                                <td className="text-center">{sumDraftField(INPUT_FIELDS[0]).toFixed(2)}</td>
                                <td className="text-center">{sumDraftField(INPUT_FIELDS[1]).toFixed(2)}</td>
                                <td className="text-center">{sumDraftField(INPUT_FIELDS[2]).toFixed(2)}</td>
                                <td className="text-center">{sumDraftField(INPUT_FIELDS[3]).toFixed(2)}</td>
                                <td className="text-center">{sumDraftField(INPUT_FIELDS[4]).toFixed(2)}</td>
                                <td className="text-center">—</td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </Table>

                    <div className="vegetable-report-notes">
                      <div>
                        नोट— (1) कॉलम संख्या 10 (गत माह तक उत्पादन) के अन्तर्गत माह{" "}
                        <strong>
                          {reportMonthLabel}{" "}
                          {entryYearFromMonth(entryFinancialYear, entryMonth)}
                        </strong>{" "}
                        से पूर्व का उत्पादन अंकित न किया जाए।
                      </div>
                    </div>

                    <div className="mb-3" style={{ maxWidth: "400px" }}>
                      <Form.Label>
                        प्रभारी का नाम <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={prabhariName}
                        onChange={(event) => {
                          setPrabhariName(event.target.value);
                          if (fieldErrors.prabhariName) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.prabhariName;
                              return next;
                            });
                          }
                        }}
                        placeholder="प्रभारी का नाम दर्ज करें"
                        className="vegetable-report-input"
                        isInvalid={!!fieldErrors.prabhariName}
                      />
                      {fieldErrors.prabhariName && (
                        <div
                          className="invalid-feedback d-block"
                          style={{ fontSize: "0.75rem", marginTop: "2px" }}
                        >
                          {fieldErrors.prabhariName}
                        </div>
                      )}
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
    </Container>
  );
};

export default FruitReport;