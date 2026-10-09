import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
};

const getCurrentFinancialYear = () => {
  const date = new Date();
  const startYear =
    date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
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
const createDraft = (key) => ({
  key,
  vegetable: "",
  current_month_sown_area: "",
  previous_month_total_sown_area: "",
  total_damaged_area: "",
  current_month_production: "",
  previous_month_total_production: "",
  remarks: "",
});

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
  const [records, setRecords] = useState([]);
  const [drafts, setDrafts] = useState([createDraft(0)]);
  const draftKey = useRef(0);
  const [entryMonth, setEntryMonth] = useState("");
  const [entryFinancialYear, setEntryFinancialYear] = useState(
    getCurrentFinancialYear,
  );
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");
  const [filterVegetable, setFilterVegetable] = useState("");
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
          getErrorMessage(data, "सब्जियों की सूची प्राप्त नहीं हो सकी।"),
        );
      }
      setComponents(
        getItems(data).filter((item) => item.investment_name === "सब्जी"),
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

  const loadRecords = useCallback(async () => {
    if (!centerName) {
      setRecords([]);
      return;
    }
    setLoadingRecords(true);
    try {
      const response = await fetch(
        `${REPORT_URL}?center_name=${encodeURIComponent(centerName)}`,
      );
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "सब्जी रिपोर्ट प्राप्त नहीं हो सकी।"),
        );
      }
      const centerKey = centerName.toLocaleLowerCase();
      setRecords(
        getItems(data).filter(
          (record) =>
            String(record.center_name || "")
              .trim()
              .toLocaleLowerCase() === centerKey,
        ),
      );
    } catch (error) {
      console.error("loadVegetableReports:", error);
      setMessage({
        type: "danger",
        text: error.message || "सब्जी रिपोर्ट प्राप्त नहीं हो सकी।",
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
          (!filterVegetable || record.vegetable === filterVegetable),
      ),
    [filterFinancialYear, filterMonth, filterVegetable, records],
  );

  const updateDraft = (key, field, value) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const addDraft = () => {
    draftKey.current += 1;
    setDrafts((current) => [...current, createDraft(draftKey.current)]);
  };

  const removeDraft = (key) => {
    setDrafts((current) => {
      const remaining = current.filter((draft) => draft.key !== key);
      return remaining.length
        ? remaining
        : [createDraft(++draftKey.current)];
    });
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
    const readyDrafts = drafts.filter((draft) => draft.vegetable);
    if (!readyDrafts.length) {
      setMessage({
        type: "danger",
        text: "कम से कम एक सब्जी चुनकर प्रविष्टि जोड़ें।",
      });
      return;
    }

    let payloads;
    try {
      payloads = readyDrafts.map((draft) => ({
        center_name: centerName,
        vegetable: draft.vegetable,
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
        console.error("createVegetableReport:", error);
        failures.push(
          `${readyDrafts[index].vegetable}: ${error.message || "सेव नहीं हुआ"}`,
        );
      }
    }

    setDrafts((current) => {
      const remaining = current.filter(
        (draft) => !succeededKeys.includes(draft.key),
      );
      return remaining.length
        ? remaining
        : [createDraft(++draftKey.current)];
    });
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
      console.error("updateVegetableReport:", error);
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
        : [...current, id],
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredRecords.map((record) => record.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
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
        throw new Error(
          getErrorMessage(data, "प्रविष्टियां हटाई नहीं जा सकीं।"),
        );
      }
      setSelectedIds([]);
      setMessage({ type: "success", text: "चुनी गई प्रविष्टियां हटा दी गईं।" });
      await loadRecords();
    } catch (error) {
      console.error("deleteVegetableReports:", error);
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
      aria-label={`${draft.vegetable || "सब्जी"} - ${INPUT_LABELS[field]}`}
      type="number"
      min="0"
      step="0.01"
      value={draft[field]}
      onChange={(event) => updateDraft(draft.key, field, event.target.value)}
      style={{ minWidth: "110px" }}
    />
  );

  return (
    <Container fluid className="px-3" style={{ paddingTop: "60px" }}>
      <div className="mb-3">
        <DemandNavigation />
      </div>
      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="text-white" style={{ backgroundColor: "#2a4682" }}>
          <h4 className="mb-1">सब्जी रिपोर्ट</h4>
          <div>औद्योगिक फसलों के माहवार क्षेत्रफल / उत्पादन के आंकड़े</div>
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
          <small className="text-muted">
            समान माह में एक से अधिक सब्जी प्रविष्टियां जोड़ी जा सकती हैं।
          </small>
        </Card.Header>
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
                <div className="table-responsive">
                  <Table bordered hover size="sm" className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>सब्जी</th>
                        <th>{INPUT_LABELS.current_month_sown_area}</th>
                        <th>{INPUT_LABELS.previous_month_total_sown_area}</th>
                        <th>{INPUT_LABELS.total_damaged_area}</th>
                        <th>{INPUT_LABELS.current_month_production}</th>
                        <th>{INPUT_LABELS.previous_month_total_production}</th>
                        <th>टिप्पणी</th>
                        <th>हटाएं</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((draft) => (
                        <tr key={draft.key}>
                          <td style={{ minWidth: "150px" }}>
                            <Form.Select
                              aria-label="सब्जी चुनें"
                              value={draft.vegetable}
                              onChange={(event) =>
                                updateDraft(draft.key, "vegetable", event.target.value)
                              }
                            >
                              <option value="">सब्जी चुनें</option>
                              {components.map((component) => (
                                <option key={component.id} value={component.sub_investment_name}>
                                  {component.sub_investment_name}
                                </option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[0])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[1])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[2])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[3])}</td>
                          <td>{renderDraftInput(draft, INPUT_FIELDS[4])}</td>
                          <td>
                            <Form.Control
                              aria-label="टिप्पणी"
                              value={draft.remarks}
                              onChange={(event) =>
                                updateDraft(draft.key, "remarks", event.target.value)
                              }
                              style={{ minWidth: "140px" }}
                            />
                          </td>
                          <td>
                            <Button
                              type="button"
                              variant="outline-danger"
                              size="sm"
                              disabled={drafts.length === 1}
                              onClick={() => removeDraft(draft.key)}
                            >
                              हटाएं
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Button type="button" variant="outline-primary" onClick={addDraft}>
                    + नई प्रविष्टि जोड़ें
                  </Button>
                  <Button type="submit" variant="success" disabled={submitting || !centerName}>
                    {submitting ? "सेव हो रहा है..." : "प्रविष्टियां सेव करें"}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <strong>सेव की गई सब्जी प्रविष्टियां</strong>
          <Button
            variant="outline-danger"
            size="sm"
            disabled={!selectedIds.length || submitting}
            onClick={handleDeleteSelected}
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
                {financialYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>माह से छांटें</Form.Label>
              <Form.Select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}>
                <option value="">सभी माह</option>
                {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>सब्जी के नाम से छांटें</Form.Label>
              <Form.Select value={filterVegetable} onChange={(event) => setFilterVegetable(event.target.value)}>
                <option value="">सभी सब्जियां</option>
                {components.map((component) => (
                  <option key={component.id} value={component.sub_investment_name}>
                    {component.sub_investment_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          {loadingRecords ? (
            <div className="text-center py-4"><Spinner animation="border" role="status" /></div>
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
                    <th>सब्जी</th>
                    <th>वर्तमान माह क्षेत्रफल</th>
                    <th>गत माह तक क्षेत्रफल</th>
                    <th>क्षतिग्रस्त क्षेत्रफल</th>
                    <th>वर्तमान माह उत्पादन</th>
                    <th>गत माह तक उत्पादन</th>
                    <th>टिप्पणी</th>
                    <th>माह</th>
                    <th>वित्तीय वर्ष</th>
                    <th>कार्यवाही</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => {
                    return (
                      <tr key={record.id}>
                        <td>
                          <Form.Check
                            aria-label={`${record.vegetable} प्रविष्टि चुनें`}
                            checked={selectedIds.includes(record.id)}
                            onChange={() => toggleSelected(record.id)}
                          />
                        </td>
                        <td>{index + 1}</td>
                        <td>{record.vegetable}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[0])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[1])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[2])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[3])}</td>
                        <td>{renderNumericCell(record, INPUT_FIELDS[4])}</td>
                        <td>
                          {editingId === record.id ? (
                            <Form.Control
                              aria-label="टिप्पणी"
                              value={editingRecord?.remarks ?? ""}
                              onChange={(event) => updateEditingRecord("remarks", event.target.value)}
                              style={{ minWidth: "140px" }}
                            />
                          ) : record.remarks || "—"}
                        </td>
                        <td>{record.month}</td>
                        <td>{record.financial_year}</td>
                        <td className="text-nowrap">
                          {editingId === record.id ? (
                            <>
                              <Button size="sm" variant="success" className="me-1" disabled={submitting} onClick={() => handleUpdate(record)}>सेव</Button>
                              <Button size="sm" variant="outline-secondary" disabled={submitting} onClick={() => { setEditingId(null); setEditingRecord(null); }}>रद्द</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline-primary" disabled={submitting} onClick={() => startEditing(record)}>संपादित करें</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredRecords.length && (
                    <tr>
                      <td colSpan={12} className="text-center text-muted py-4">
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

export default VegetableReport;
