import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Modal,
  Alert,
  Spinner,
} from "react-bootstrap";
import {
  FaClipboardList,
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaSave,
  FaTimes,
  FaFileAlt,
} from "react-icons/fa";
import "../../assets/css/dashboard.css";

const API_URL =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/month-attendance-reports/";

const MONTH_OPTIONS = [
  { value: "1", label: "1 (जनवरी)" },
  { value: "2", label: "2 (फरवरी)" },
  { value: "3", label: "3 (मार्च)" },
  { value: "4", label: "4 (अप्रैल)" },
  { value: "5", label: "5 (मई)" },
  { value: "6", label: "6 (जून)" },
  { value: "7", label: "7 (जुलाई)" },
  { value: "8", label: "8 (अगस्त)" },
  { value: "9", label: "9 (सितम्बर)" },
  { value: "10", label: "10 (अक्टूबर)" },
  { value: "11", label: "11 (नवम्बर)" },
  { value: "12", label: "12 (दिसम्बर)" },
];

const FINANCIAL_YEAR_OPTIONS = ["2024-25", "2025-26", "2026-27", "2027-28"];

const getCenterNameFromUser = (authUser) => {
  if (!authUser) return "";
  const candidates = [
    authUser.center_name,
    authUser.centerName,
    authUser.username,
    authUser.name,
    authUser.center?.center_name,
    authUser.center?.name,
    authUser.profile?.center_name,
  ];
  const direct = candidates.find(
    (v) => v !== null && v !== undefined && String(v).trim() !== "",
  );
  return direct ? String(direct).trim() : "";
};

function MonthAttendance() {
  const { user } = useAuth();
  const centerName = getCenterNameFromUser(user);

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const initialFormData = {
    center_name: centerName || "",
    month: "",
    financial_year: "2026-27",
    month_attendance: null,
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setSidebarOpen(width >= 1024);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (centerName) {
      setFormData((prev) =>
        prev.center_name === centerName
          ? prev
          : { ...prev, center_name: centerName },
      );
    }
  }, [centerName]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const url = centerName
        ? `${API_URL}?center_name=${encodeURIComponent(centerName)}`
        : API_URL;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const result = await response.json();

      if (Array.isArray(result)) {
        setReports(result);
      } else if (Array.isArray(result.data)) {
        setReports(result.data);
      } else if (result.data && Array.isArray(result.data.results)) {
        setReports(result.data.results);
      } else if (result.results) {
        setReports(result.results);
      } else if (result.data) {
        setReports([result.data]);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setMessage({ text: "रिपोर्ट लाने में त्रुटि हुई।", type: "danger" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, month_attendance: file || null }));
  };

  const openAddModal = () => {
    setEditingReport(null);
    setFormData({ ...initialFormData, center_name: centerName || "" });
    setShowFormModal(true);
    setMessage({ text: "", type: "" });
  };

  const openEditModal = (report) => {
    setEditingReport(report);
    setFormData({
      center_name: report.center_name || "",
      month: report.month ? String(report.month) : "",
      financial_year: report.financial_year || "2026-27",
      month_attendance: null,
    });
    setShowFormModal(true);
    setMessage({ text: "", type: "" });
  };

  const closeModal = () => {
    setShowFormModal(false);
    setEditingReport(null);
  };

  // Helper: parse response (handles JSON & non-JSON)
  const parseResponse = async (response) => {
    const rawText = await response.text();
    let result = null;
    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch (parseErr) {
      console.error("Non-JSON response:", rawText);
    }
    return { rawText, result };
  };

  // Helper: check success based on backend's actual response shape
  const checkSuccess = (response, result) => {
    if (!response.ok) return false;
    if (!result) return false;
    // Backend returns the created/updated object directly with `id`
    if (result.id !== undefined) return true;
    if (result.month_attendance !== undefined) return true;
    if (result.success === true) return true;
    return false;
  };

  // Helper: build human-readable error message
  const buildErrMsg = (response, result) => {
    let errMsg = `HTTP ${response.status}: Submission failed`;
    if (result && typeof result === "object") {
      const parts = [];
      Object.keys(result).forEach((key) => {
        const val = result[key];
        if (Array.isArray(val)) parts.push(`${key}: ${val.join(", ")}`);
        else if (typeof val === "string") parts.push(`${key}: ${val}`);
        else parts.push(`${key}: ${JSON.stringify(val)}`);
      });
      if (parts.length) errMsg = parts.join(" | ");
    } else if (typeof result === "string") {
      errMsg = result;
    }
    return errMsg;
  };

  // ============= CORRECTED SUBMIT =============
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    const method = editingReport ? "PUT" : "POST";
    const url = editingReport ? `${API_URL}${editingReport.id}/` : API_URL;

    try {
      let response;

      if (formData.month_attendance) {
        // ---- File upload: use FormData ----
        const fd = new FormData();
        fd.append("center_name", formData.center_name);
        fd.append("month", String(Number(formData.month)));
        fd.append("financial_year", formData.financial_year);
        fd.append("month_attendance", formData.month_attendance);

        response = await fetch(url, {
          method: method,
          headers: { Accept: "application/json" }, // NO Content-Type — browser sets boundary
          body: fd,
        });
      } else {
        // ---- No file: use JSON (your desired format) ----
        const payload = {
          center_name: formData.center_name,
          month: Number(formData.month),
          financial_year: formData.financial_year,
          month_attendance: null,
        };

        console.log("Posting JSON payload:", payload);

        response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      // Parse response (handles both JSON & non-JSON safely)
      const { result } = await parseResponse(response);

      // Unified success check — works for BOTH branches
      if (checkSuccess(response, result)) {
        setMessage({
          text: editingReport
            ? "रिपोर्ट सफलतापूर्वक अपडेट की गई।"
            : "मासिक उपस्थिति रिपोर्ट सफलतापूर्वक सहेजा गया।",
          type: "success",
        });
        closeModal();
        fetchReports();
      } else {
        const errMsg = buildErrMsg(response, result);
        console.error("Submission error detail:", errMsg, result);
        setMessage({ text: `सबमिशन विफल: ${errMsg}`, type: "danger" });
      }
    } catch (error) {
      console.error("Error posting report:", error);
      setMessage({
        text: `त्रुटि: ${error.message || "सबमिशन में त्रुटि हुई। कृपया पुनः प्रयास करें।"}`,
        type: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("क्या आप वाकई इस रिपोर्ट को हटाना चाहते हैं?")) return;
    try {
      const response = await fetch(`${API_URL}${id}/`, { method: "DELETE" });
      if (!response.ok && response.status !== 204)
        throw new Error("Failed to delete");
      setMessage({ text: "रिपोर्ट सफलतापूर्वक हटा दी गई।", type: "success" });
      fetchReports();
    } catch (error) {
      setMessage({ text: "डिलीट करने में त्रुटि हुई।", type: "danger" });
    }
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return "#";
    if (filePath.startsWith("http")) return filePath;
    return `https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/${filePath}`;
  };

  return (
    <>
      <div className="dashboard-container professional-dashboard">
        <div className="main-content professional-main-content">
          <Container fluid className="demand-center-report-page">
            <div className="demand-center-header">
              <div>
                <h4>मासिक उपस्थिति रिपोर्ट (Month Attendance)</h4>
                <small className="text-muted">
                  {centerName || "DHO कोटद्वार उद्यान विभाग"}
                </small>
              </div>
              <Button variant="primary" size="sm" onClick={openAddModal}>
                <FaPlus className="me-1" /> नई रिपोर्ट जोड़ें
              </Button>
            </div>

            {message.text && !showFormModal && (
              <Alert
                variant={message.type === "success" ? "success" : "danger"}
                className="demand-center-alert"
              >
                {message.text}
              </Alert>
            )}

            {isLoading && !showFormModal ? (
              <div className="demand-center-loading">
                <Spinner animation="border" variant="primary" />
                <div>डेटा लोड हो रहा है...</div>
              </div>
            ) : reports.length === 0 ? (
              <Alert variant="info" className="demand-center-empty">
                <strong>कोई रिपोर्ट उपलब्ध नहीं है।</strong> कृपया "नई रिपोर्ट
                जोड़ें" पर क्लिक करें।
              </Alert>
            ) : (
              <section
                className="dynamic-report-section"
                style={{ marginTop: "0", paddingTop: "0" }}
              >
                <div className="dynamic-report-content professional-report-content">
                  <div className="dynamic-report-panel">
                    <div
                      className="dynamic-report-table-scroll"
                      style={{ width: "100%", overflowX: "auto" }}
                    >
                      <table
                        className="dynamic-report-table"
                        style={{
                          width: "100%",
                          minWidth: "800px",
                          tableLayout: "auto",
                        }}
                      >
                        <thead>
                          <tr>
                            <th>क्रम संख्या</th>
                            <th>केंद्र का नाम</th>
                            <th>माह</th>
                            <th>वित्तीय वर्ष</th>
                            <th>उपस्थिति फाइल</th>
                            <th>कार्य (Action)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((report, index) => (
                            <tr key={report.id || index}>
                              <td>{index + 1}</td>
                              <td>{report.center_name}</td>
                              <td>{report.month}</td>
                              <td>{report.financial_year}</td>
                              <td>
                                {report.month_attendance ? (
                                  <a
                                    href={getFileUrl(report.month_attendance)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline-primary btn-sm"
                                  >
                                    <FaFileAlt className="me-1" /> देखें/डाउनलोड
                                  </a>
                                ) : (
                                  <span className="text-muted">
                                    फाइल उपलब्ध नहीं
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => openEditModal(report)}
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(report.id)}
                                  >
                                    <FaTrashAlt />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </Container>
        </div>
      </div>

      <Modal
        show={showFormModal}
        onHide={closeModal}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "#194e8b", color: "white" }}
        >
          <Modal.Title style={{ fontSize: "1rem" }}>
            <FaClipboardList className="me-2" />
            {editingReport ? "रिपोर्ट एडिट करें" : "नई उपस्थिति रिपोर्ट जोड़ें"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {message.text && (
              <Alert
                variant={message.type === "success" ? "success" : "danger"}
              >
                {message.text}
              </Alert>
            )}

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    केंद्र का नाम (Center Name)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="center_name"
                    value={formData.center_name}
                    onChange={handleInputChange}
                    required
                    className="date-input-sm"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    माह (Month) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="month"
                    value={formData.month}
                    onChange={handleInputChange}
                    required
                    className="date-input-sm"
                  >
                    <option value="">-- माह चुनें --</option>
                    {MONTH_OPTIONS.map((month, idx) => (
                      <option key={idx} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    वित्तीय वर्ष <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="financial_year"
                    value={formData.financial_year}
                    onChange={handleInputChange}
                    required
                    className="date-input-sm"
                  >
                    {FINANCIAL_YEAR_OPTIONS.map((year, idx) => (
                      <option key={idx} value={year}>
                        {year}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label className="filter-label-sm">
                    उपस्थिति फाइल अपलोड करें (Upload Excel/PDF){" "}
                    {!editingReport && <span className="text-danger">*</span>}
                  </Form.Label>
                  <Form.Control
                    type="file"
                    name="month_attendance"
                    onChange={handleFileChange}
                    accept=".xlsx, .xls, .pdf, .csv"
                    className="date-input-sm pt-1"
                    required={!editingReport}
                  />
                  {editingReport && (
                    <Form.Text className="text-muted d-block mt-1">
                      <FaFileAlt className="me-1" />
                      केवल तभी अपलोड करें यदि आप पुरानी फाइल बदलना चाहते हैं।
                      वर्तमान फाइल:{" "}
                      <a
                        href={getFileUrl(editingReport.month_attendance)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        यहां देखें
                      </a>
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={closeModal}>
              <FaTimes className="me-1" /> रद्द करें
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isLoading}
            >
              <FaSave className="me-1" />
              {isLoading
                ? "सहेजा जा रहा है..."
                : editingReport
                  ? "अपडेट करें"
                  : "रिपोर्ट सहेजें"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

export default MonthAttendance;
