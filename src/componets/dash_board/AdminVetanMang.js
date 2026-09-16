import React, { useState, useEffect } from "react";
import {
  Container,
  Spinner,
  Alert,
  Row,
  Col,
  Card,
  Form,
  Button,
  Modal,
} from "react-bootstrap";
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";
import Footer from "../footer/Footer";
import {
  FaClipboardList,
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaSave,
  FaTimes,
  FaCalendarAlt,
  FaEye,
  FaPrint,
} from "react-icons/fa";
import "../../assets/css/dashboard.css";

const API_BASE_URL =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/salary-attendance-reports/";

// 12 Months List (January to December)
const MONTH_OPTIONS = [
  "जनवरी (January)",
  "फरवरी (February)",
  "मार्च (March)",
  "अप्रैल (April)",
  "मई (May)",
  "जून (June)",
  "जुलाई (July)",
  "अगस्त (August)",
  "सितम्बर (September)",
  "अक्टूबर (October)",
  "नवंबर (November)",
  "दिसंबर (December)",
];

const FINANCIAL_YEAR_OPTIONS = ["2024-25", "2025-26", "2026-27", "2027-28"];

const AdminVetanMang = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);

  // Filter States
  const [filterCenterName, setFilterCenterName] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");

  // Default empty form data
  const initialFormData = {
    center_name: "",
    month: "",
    financial_year: "",
    letter_number: "",
    report_date: "",
    subject: "",
    report_data: [],
  };

  const [formData, setFormData] = useState(initialFormData);

  // Check device width
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setSidebarOpen(width >= 1024);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
    };
  }, []);

  // ===== SELECTED REPORT PRINT PREVIEW =====
  // The preview is generated only for the report/centre selected
  // from the dashboard table. Therefore the centre name is always
  // dynamic and comes from that selected report.
  const handleOpenPreview = (report) => {
    setPreviewReport(report);
    setShowPreviewModal(true);
  };

  const formatPreviewDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      const d = new Date(dateValue);
      return Number.isNaN(d.getTime())
        ? String(dateValue)
        : d.toLocaleDateString("hi-IN");
    } catch {
      return String(dateValue);
    }
  };

  const escapePreviewHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const getPreviewRows = (report) => {
    const sourceRows = Array.isArray(report?.report_data)
      ? report.report_data
      : [];

    return sourceRows.map((sourceRow, rowIndex) => {
      const row = Array.isArray(sourceRow) ? [...sourceRow] : [];

      while (row.length < 14) row.push("");
      if (row.length > 14) row.length = 14;

      // Use the actual employee row number only when serial is absent.
      if (row[0] === null || row[0] === undefined || row[0] === "") {
        row[0] = rowIndex + 1;
      }

      return row;
    });
  };

  const buildSelectedReportPreview = (report) => {
    if (!report) return "";

    const centerName = escapePreviewHtml(report.center_name || "");
    const month = escapePreviewHtml(report.month || "");
    const financialYear = escapePreviewHtml(report.financial_year || "");
    const letterNumber = escapePreviewHtml(report.letter_number || "");
    const reportDate = escapePreviewHtml(formatPreviewDate(report.report_date));
    const yearPart = financialYear ? financialYear.split("-")[0] : "";
    const rows = getPreviewRows(report);

    const tableRows = rows
      .map(
        (row) => `
      <tr>
        ${row.map((cell) => `<td>${escapePreviewHtml(cell)}</td>`).join("")}
      </tr>
    `,
      )
      .join("");

    return `
      <div class="vm-print-document">
        <div class="vm-print-header">
          <div class="vm-print-title">उद्यान एवं खाद्य प्रसंस्करण विभाग, उत्तराखण्ड</div>
          <div class="vm-print-subtitle">
            कार्यालय — प्रभारी, उद्यान सचल दल केन्द्र ${centerName}
          </div>
          <div class="vm-print-subtitle">
            विकासखण्ड ${centerName}, जनपद पौड़ी गढ़वाल (उत्तराखण्ड)
          </div>
        </div>

        <div class="vm-print-ref-date">
          <span>
            <strong>पत्रांक:</strong>
            ${letterNumber} / वेतन मांग पत्र एवं उपस्थिति सूचना /
            वर्ष ${financialYear}
          </span>
          <span><strong>दिनांक:</strong> ${reportDate}</span>
        </div>

        <div class="vm-print-address">
          सेवा में,<br>
          श्रीमान उद्यान विशेषज्ञ,<br>
          टिहरी, जनपद पौड़ी गढ़वाल।
        </div>

        <div class="vm-print-subject">
          <strong>विषय :</strong>
          माह ${month}, वर्ष ${financialYear} का वेतन मांग पत्र (D-4)
          एवं नियमित तथा उपनल प्रायोजित कार्मिकों की उपस्थिति सूचना
          प्रेषित किये जाने के सम्बन्ध में।
        </div>

        <div class="vm-print-text">
          महोदय,<br>
          उपरोक्त विषयक अवगत कराना है कि इस केन्द्र में कार्यरत नियमित एवं
          उपनल प्रायोजित (कुशल-माली) कार्मिकों की माह ${month}, ${yearPart}
          की उपस्थिति सूचना एवं वेतन मांग पत्र (D-4) निम्नानुसार है,
          जो आपकी सेवा में सूचनार्थ एवं वेतन आहरण/भुगतान की आवश्यक कार्यवाही
          हेतु प्रेषित है :—
        </div>

        <table class="vm-print-table">
          <colgroup>
            <col style="width:4%">
            <col style="width:11%">
            <col style="width:10%">
            <col style="width:9%">
            <col style="width:5%">
            <col style="width:5%">
            <col style="width:5%">
            <col style="width:5%">
            <col style="width:6%">
            <col style="width:6%">
            <col style="width:6%">
            <col style="width:6%">
            <col style="width:6%">
            <col style="width:20%">
          </colgroup>

          <thead>
            <tr>
              <th rowspan="2">क्रम सं.</th>
              <th rowspan="2">कर्मचारी का नाम</th>
              <th rowspan="2">पदनाम</th>
              <th rowspan="2">नियुक्ति का प्रकार</th>
              <th colspan="2">वास्तविक उपस्थिति</th>
              <th colspan="2">संभावित उपस्थिति</th>
              <th colspan="2">माह में उपभोग किये गये अवकाश</th>
              <th colspan="2">अवशेष अवकाश</th>
              <th rowspan="2">माह में कुल दिवस</th>
              <th rowspan="2">अभ्युक्ति</th>
            </tr>
            <tr>
              <th>दिनांक से</th>
              <th>दिनांक तक</th>
              <th>दिनांक से</th>
              <th>दिनांक तक</th>
              <th>अकस्मिक अवकाश</th>
              <th>उपार्जित अवकाश</th>
              <th>अकस्मिक अवकाश</th>
              <th>उपार्जित अवकाश</th>
            </tr>
          </thead>

          <tbody>
            ${
              tableRows ||
              `
              <tr>
                <td colspan="14">कोई कर्मचारी डेटा उपलब्ध नहीं है।</td>
              </tr>
            `
            }
          </tbody>
        </table>

        <div class="vm-print-text">
          प्रमाणित किया जाता है कि उपरोक्त अंकित उपस्थिति विवरण कार्यालय की
          उपस्थिति पंजिका के अनुसार पूर्णतः सही एवं सत्य है। उपरोक्त कार्मिकों
          द्वारा उल्लिखित अवधि में अपने पदीय दायित्वों का निर्वहन किया गया है
          तथा किसी भी कार्मिक द्वारा अनाधिकृत रूप से अनुपस्थिति/अवकाश का
          उपभोग नहीं किया गया है। तदनुसार माह ${month}, ${yearPart} का वेतन
          आहरण किये जाने की कृपा करें।
        </div>

        <div class="vm-print-signoff">
          भवदीय,<br><br><br>
          ( हस्ताक्षर )<br>
          प्रभारी<br>
          उद्यान सचल दल केन्द्र, ${centerName}<br>
          जनपद पौड़ी गढ़वाल
        </div>

        <div class="vm-print-cc">
          <div class="vm-print-ref-date">
            <span>
              <strong>पत्रांक:</strong>
              ${letterNumber}-24 / वेतन मांग पत्र एवं उपस्थिति सूचना /
              वर्ष ${financialYear}
            </span>
            <span><strong>दिनांक:</strong> ${reportDate}</span>
          </div>
          <p><strong>प्रतिलिपि :</strong> निम्नलिखित को सूचनार्थ एवं आवश्यक कार्यवाही हेतु प्रेषित —</p>
          <p>1. सम्बन्धित कार्मिक को सूचनार्थ।</p>
          <p>2. कार्यालय प्रति।</p>
        </div>
      </div>
    `;
  };

  const handlePrintSelectedReport = () => {
    if (!previewReport) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("प्रिंट विंडो नहीं खुल सकी। कृपया browser pop-up अनुमति दें।");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="UTF-8">
        <title>वेतन मांग पत्र - ${escapePreviewHtml(previewReport.center_name || "")}</title>
        <style>
          * { box-sizing: border-box; }

          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }

          body {
            font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", Arial, sans-serif;
            font-size: 10.5px;
            line-height: 1.4;
          }

          .vm-print-document {
            width: 100%;
            padding: 8mm 10mm;
          }

          .vm-print-header {
            text-align: center;
            margin-bottom: 10px;
          }

          .vm-print-title {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 3px;
          }

          .vm-print-subtitle {
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 2px;
          }

          .vm-print-ref-date {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            margin: 8px 0 10px;
          }

          .vm-print-address,
          .vm-print-subject,
          .vm-print-text {
            margin: 7px 0;
            text-align: justify;
          }

          .vm-print-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            border-spacing: 0;
            margin: 12px 0;
            page-break-inside: auto;
            break-inside: auto;
          }

          .vm-print-table thead {
            display: table-header-group !important;
          }

          .vm-print-table tbody {
            display: table-row-group !important;
          }

          .vm-print-table tr {
            display: table-row !important;
            height: auto !important;
            min-height: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .vm-print-table th,
          .vm-print-table td {
            display: table-cell !important;
            border: 1px solid #000;
            padding: 3px 4px;
            font-size: 8.2px;
            line-height: 1.15;
            vertical-align: middle;
            text-align: center;
            height: auto !important;
            min-height: 0 !important;
            overflow-wrap: anywhere;
            word-break: normal;
            white-space: normal;
          }

          .vm-print-table th {
            font-weight: 700;
          }

          .vm-print-table td:last-child,
          .vm-print-table th:last-child {
            text-align: left;
          }

          .vm-print-signoff {
            margin-top: 18px;
            text-align: right;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .vm-print-cc {
            margin-top: 25px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .vm-print-cc p {
            margin: 3px 0;
          }

          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          @media print {
            .vm-print-document {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${buildSelectedReportPreview(previewReport)}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  // Fetch all reports (GET)
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE_URL, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const responseData = await response.json();
      setReports(Array.isArray(responseData.data) ? responseData.data : []);
    } catch (err) {
      setError("रिपोर्ट लोड करने में त्रुटि। कृपया पुनः प्रयास करें।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered Reports Logic
  const filteredReports = reports.filter((report) => {
    const matchesCenter = filterCenterName
      ? report.center_name &&
        report.center_name
          .toLowerCase()
          .includes(filterCenterName.toLowerCase())
      : true;
    const matchesMonth = filterMonth ? report.month === filterMonth : true;
    const matchesYear = filterFinancialYear
      ? report.financial_year === filterFinancialYear
      : true;

    return matchesCenter && matchesMonth && matchesYear;
  });

  const clearFilters = () => {
    setFilterCenterName("");
    setFilterMonth("");
    setFilterFinancialYear("");
  };

  // Handle standard input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle 2D Array report_data changes
  const handleReportDataChange = (rowIndex, colIndex, value) => {
    const newData = [...formData.report_data];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    setFormData((prev) => ({ ...prev, report_data: newData }));
  };

  const addReportRow = () => {
    setFormData((prev) => ({
      ...prev,
      report_data: [...prev.report_data, Array(14).fill("")],
    }));
  };

  const removeReportRow = (rowIndex) => {
    setFormData((prev) => ({
      ...prev,
      report_data: prev.report_data.filter((_, index) => index !== rowIndex),
    }));
  };

  // Open Modal for Add or Edit
  const handleOpenModal = (report = null) => {
    if (report) {
      setEditingReport(report);
      setFormData({
        center_name: report.center_name || "",
        month: report.month || "",
        financial_year: report.financial_year || "",
        letter_number: report.letter_number || "",
        report_date: report.report_date || "",
        subject: report.subject || "",
        report_data: report.report_data || [],
      });
    } else {
      setEditingReport(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  // Save (POST / PUT)
  const handleSaveReport = async () => {
    const method = editingReport ? "PUT" : "POST";
    const url = editingReport
      ? `${API_BASE_URL}${editingReport.id}/`
      : API_BASE_URL;

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save data");

      setShowModal(false);
      fetchReports();
    } catch (err) {
      alert("डेटा सेव करने में त्रुटि हुई।");
    }
  };

  // Delete (DELETE)
  const handleDeleteReport = async (id) => {
    if (!window.confirm("क्या आप वाकई इस रिपोर्ट को हटाना चाहते हैं?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}${id}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!response.ok && response.status !== 204)
        throw new Error("Failed to delete");

      fetchReports();
    } catch (err) {
      alert("डिलीट करने में त्रुटि हुई।");
    }
  };

  // Table Headers for report_data
  const reportColumns = [
    "क्र.सं.",
    "नाम",
    "पदनाम",
    "वेतन प्रकार",
    "प्रारंभ तिथि",
    "तिथि तक",
    "पुनः प्रारंभ",
    "पुनः तिथि तक",
    "छुट्टी",
    "विशेष कारण",
    "उपस्थिति",
    "विशेष कारण",
    "कुल",
    "कार्य विवरण",
  ];

  return (
    <>
      <div className="dashboard-container professional-dashboard">
        <LeftNav
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        <div className="main-content professional-main-content">
          <DashBoardHeader
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <Container
            fluid
            className="dashboard-body bg-home professional-dashboard-body"
          >
            {/* Welcome Section */}
            <div className="home-welcome-section professional-welcome d-flex justify-content-between text-center mb-4">
              <h1 className="home-title">वेतन मांग एवं उपस्थिति प्रबंधन</h1>
              <p className="home-subtitle">
                DHO टिहरी उद्यान विभाग डिजिटल प्लेटफॉर्म में आपका स्वागत है
              </p>
            </div>

            {/* Header and Filters */}
            <Card className="report-export-card professional-export-card mb-4">
              <Card.Body className="py-2">
                <Row className="align-items-center g-2">
                  <Col md={12} className="mb-2">
                    <div className="d-flex align-items-center">
                      <FaClipboardList className="text-primary me-2" />
                      <span
                        className="report-title"
                        style={{ fontSize: "0.9rem", fontWeight: "600" }}
                      >
                        वेतन मांग पत्र एवं उपस्थिति सूचना
                      </span>
                      <span
                        className="badge bg-info ms-2"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {filteredReports.length} रिपोर्ट्स
                      </span>
                    </div>
                  </Col>

                  {/* Filter Section */}
                  <Col md={4} sm={6} xs={12}>
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="केंद्र का नाम खोजें..."
                      value={filterCenterName}
                      onChange={(e) => setFilterCenterName(e.target.value)}
                    />
                  </Col>
                  <Col md={3} sm={6} xs={12}>
                    <Form.Select
                      size="sm"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                    >
                      <option value="">सभी महीने</option>
                      {MONTH_OPTIONS.map((month, idx) => (
                        <option key={idx} value={month}>
                          {month}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={3} sm={6} xs={12}>
                    <Form.Select
                      size="sm"
                      value={filterFinancialYear}
                      onChange={(e) => setFilterFinancialYear(e.target.value)}
                    >
                      <option value="">सभी वित्तीय वर्ष</option>
                      {FINANCIAL_YEAR_OPTIONS.map((year, idx) => (
                        <option key={idx} value={year}>
                          {year}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col
                    md={2}
                    sm={6}
                    xs={12}
                    className="d-flex justify-content-md-end"
                  >
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={clearFilters}
                      style={{ width: "100%" }}
                    >
                      <FaTimes className="me-1" /> साफ करें
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Loading & Error States */}
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" role="status" variant="primary">
                  <span className="visually-hidden">लोड हो रहा है...</span>
                </Spinner>
                <p className="mt-3">लोड हो रहा है...</p>
              </div>
            ) : error ? (
              <Alert variant="danger" className="text-center">
                {error}
                <div className="mt-2">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={fetchReports}
                  >
                    पुनः प्रयास करें
                  </button>
                </div>
              </Alert>
            ) : (
              /* Dynamic Report Section & Table */
              <section
                className="dynamic-report-section"
                style={{ marginTop: "0", paddingTop: "0" }}
              >
                <div
                  className="dynamic-report-heading"
                  style={{
                    marginTop: "0",
                    marginBottom: "8px",
                    paddingTop: "4px",
                    paddingBottom: "4px",
                  }}
                >
                  <h4 style={{ margin: 0 }}>
                    <FaClipboardList className="me-2" />
                    सभी वेतन एवं उपस्थिति रिपोर्ट्स
                  </h4>
                </div>

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
                          minWidth: "900px",
                          tableLayout: "auto",
                        }}
                      >
                        <thead>
                          <tr>
                            <th>क्रम संख्या</th>
                            <th>केंद्र का नाम</th>
                            <th>माह</th>
                            <th>वित्तीय वर्ष</th>
                            <th>पत्र संख्या</th>
                            <th>रिपोर्ट तिथि</th>
                            <th>विषय</th>
                            <th>कार्य (Action)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReports.length > 0 ? (
                            filteredReports.map((report, index) => (
                              <tr key={report.id}>
                                <td>{index + 1}</td>
                                <td>{report.center_name}</td>
                                <td>{report.month}</td>
                                <td>{report.financial_year}</td>
                                <td
                                  style={{
                                    maxWidth: "250px",
                                    whiteSpace: "normal",
                                  }}
                                >
                                  {report.letter_number}
                                </td>
                                <td>
                                  <FaCalendarAlt className="me-1" />
                                  {report.report_date
                                    ? new Date(
                                        report.report_date,
                                      ).toLocaleDateString("hi-IN")
                                    : "-"}
                                </td>
                                <td
                                  style={{
                                    maxWidth: "300px",
                                    whiteSpace: "normal",
                                  }}
                                >
                                  {report.subject}
                                </td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <Button
                                      variant="info"
                                      size="sm"
                                      title="देखें / प्रिंट प्रीव्यू"
                                      onClick={() => handleOpenPreview(report)}
                                    >
                                      <FaEye className="me-1" /> देखें
                                    </Button>

                                    <Button
                                      variant="warning"
                                      size="sm"
                                      title="एडिट करें"
                                      onClick={() => handleOpenModal(report)}
                                    >
                                      <FaEdit />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan="8"
                                className="dynamic-report-empty text-center p-4"
                              >
                                कोई डेटा नहीं मिला। कृपया फिल्टर बदलें या नई
                                रिपोर्ट जोड़ें।
                              </td>
                            </tr>
                          )}
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

      <Footer />

      {/* Selected Report Print Preview Modal */}
      <Modal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        fullscreen
        centered
        className="vm-print-preview-modal"
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: "#194e8b",
            color: "white",
            padding: "10px 16px",
          }}
        >
          <Modal.Title style={{ fontSize: "1rem" }}>
            <FaEye className="me-2" />
            प्रिंट प्रीव्यू
            {previewReport?.center_name
              ? ` — ${previewReport.center_name}`
              : ""}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          style={{
            background: "#525659",
            padding: "18px",
            overflow: "auto",
          }}
        >
          {previewReport ? (
            <div
              style={{
                width: "100%",
                maxWidth: "1500px",
                minWidth: isMobile ? "1050px" : "0",
                margin: "0 auto",
                background: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,.35)",
                padding: isMobile ? "18px" : "30px",
                overflowX: "auto",
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: buildSelectedReportPreview(previewReport),
                }}
              />
            </div>
          ) : (
            <div className="text-center text-white py-5">
              कोई रिपोर्ट चयनित नहीं है।
            </div>
          )}
        </Modal.Body>

        <Modal.Footer
          style={{
            background: "#fff",
            padding: "8px 16px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#555" }}>
            केंद्र:
            <strong className="ms-1">
              {previewReport?.center_name || "-"}
            </strong>
          </div>

          <div className="d-flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPreviewModal(false)}
            >
              <FaTimes className="me-1" /> बंद करें
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrintSelectedReport}
              disabled={!previewReport}
            >
              <FaPrint className="me-1" /> प्रिंट करें
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "#194e8b", color: "white" }}
        >
          <Modal.Title style={{ fontSize: "1rem" }}>
            <FaClipboardList className="me-2" />
            {editingReport
              ? "रिपोर्ट एडिट करें"
              : "नई वेतन/उपस्थिति रिपोर्ट जोड़ें"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    केंद्र का नाम
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="center_name"
                    value={formData.center_name}
                    onChange={handleInputChange}
                    placeholder="जैसे: बीरोंखाल"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">माह</Form.Label>
                  <Form.Select
                    name="month"
                    value={formData.month}
                    onChange={handleInputChange}
                  >
                    <option value="">-- माह चुनें --</option>
                    {MONTH_OPTIONS.map((month, idx) => (
                      <option key={idx} value={month}>
                        {month}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    वित्तीय वर्ष
                  </Form.Label>
                  <Form.Select
                    name="financial_year"
                    value={formData.financial_year}
                    onChange={handleInputChange}
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
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    पत्र संख्या
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="letter_number"
                    value={formData.letter_number}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">
                    रिपोर्ट तिथि
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="report_date"
                    value={formData.report_date}
                    onChange={handleInputChange}
                    className="date-input-sm"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="filter-label-sm">विषय</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              {/* 2D Array Data Table Editor */}
              <Col md={12} className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="dynamic-report-subtitle m-0">
                    कर्मचारी उपस्थिति विवरण (report_data)
                  </h6>
                  <Button variant="success" size="sm" onClick={addReportRow}>
                    <FaPlus className="me-1" /> पंक्ति जोड़ें
                  </Button>
                </div>

                <div
                  className="dynamic-report-table-scroll matrix-scroll"
                  style={{ width: "100%", overflowX: "auto" }}
                >
                  <table
                    className="dynamic-report-table matrix-table"
                    style={{ minWidth: "1800px", tableLayout: "auto" }}
                  >
                    <thead>
                      <tr>
                        {reportColumns.map((col, idx) => (
                          <th key={idx} style={{ minWidth: "120px" }}>
                            {col}
                          </th>
                        ))}
                        <th>हटाएं</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.report_data.length > 0 ? (
                        formData.report_data.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {reportColumns.map((_, colIndex) => (
                              <td key={colIndex}>
                                <Form.Control
                                  type="text"
                                  size="sm"
                                  value={row[colIndex] || ""}
                                  onChange={(e) =>
                                    handleReportDataChange(
                                      rowIndex,
                                      colIndex,
                                      e.target.value,
                                    )
                                  }
                                  style={{ minWidth: "100px" }}
                                />
                              </td>
                            ))}
                            <td>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeReportRow(rowIndex)}
                              >
                                <FaTimes />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={reportColumns.length + 1}
                            className="dynamic-report-empty text-center"
                          >
                            कोई कर्मचारी डेटा नहीं। कृपया "पंक्ति जोड़ें" पर
                            क्लिक करें।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowModal(false)}
          >
            <FaTimes className="me-1" /> बंद करें
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveReport}>
            <FaSave className="me-1" />{" "}
            {editingReport ? "अपडेट करें" : "सेव करें"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

const vmPreviewStyleText = `
  .vm-print-preview-modal .modal-dialog {
    margin: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
  }

  .vm-print-preview-modal .modal-content {
    height: 100vh !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  .vm-print-preview-modal .modal-body {
    min-height: 0 !important;
  }

  .vm-print-preview-modal .vm-print-document {
    width: 100%;
    color: #000;
    font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", Arial, sans-serif;
    font-size: 11px;
    line-height: 1.45;
  }

  .vm-print-preview-modal .vm-print-header {
    text-align: center;
    margin-bottom: 12px;
  }

  .vm-print-preview-modal .vm-print-title {
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .vm-print-preview-modal .vm-print-subtitle {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .vm-print-preview-modal .vm-print-ref-date {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 8px 0 12px;
  }

  .vm-print-preview-modal .vm-print-address,
  .vm-print-preview-modal .vm-print-subject,
  .vm-print-preview-modal .vm-print-text {
    margin: 8px 0;
    text-align: justify;
  }

  .vm-print-preview-modal .vm-print-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    border-spacing: 0;
    margin: 12px 0;
  }

  .vm-print-preview-modal .vm-print-table th,
  .vm-print-preview-modal .vm-print-table td {
    border: 1px solid #000;
    padding: 4px 5px;
    text-align: center;
    vertical-align: middle;
    font-size: 9px;
    line-height: 1.2;
    height: auto !important;
    min-height: 0 !important;
    overflow-wrap: anywhere;
    word-break: normal;
    white-space: normal;
  }

  .vm-print-preview-modal .vm-print-table th {
    font-weight: 700;
  }

  .vm-print-preview-modal .vm-print-table td:last-child,
  .vm-print-preview-modal .vm-print-table th:last-child {
    text-align: left;
  }

  .vm-print-preview-modal .vm-print-signoff {
    margin-top: 20px;
    text-align: right;
  }

  .vm-print-preview-modal .vm-print-cc {
    margin-top: 28px;
  }

  @media (max-width: 900px) {
    .vm-print-preview-modal .vm-print-document {
      min-width: 1050px;
    }

    .vm-print-preview-modal .vm-print-table {
      min-width: 1050px;
    }
  }
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById("vm-preview-styles")
) {
  const style = document.createElement("style");
  style.id = "vm-preview-styles";
  style.textContent = vmPreviewStyleText;
  document.head.appendChild(style);
}

export default AdminVetanMang;
