import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import {
  FaClipboardList,
  FaFileAlt,
  FaEye,
  FaDownload,
  FaTimes,
} from "react-icons/fa";
import ExcelJS from "exceljs";
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";
import Footer from "../footer/Footer";
import "../../assets/css/dashboard.css";

const API_URL =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/month-attendance-reports/";

const BACKEND_BASE =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend";

// The API returns the Excel workbook directly from /{id}/.
// Example: /api/month-attendance-reports/6/
const FILE_API_URL = (id) => `${API_URL}${id}/`;

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  return `${BACKEND_BASE}/${String(filePath).replace(/^\/+/, "")}`;
};

/* =========================================================
   Excel helpers - READ ONLY viewer
========================================================= */

const normalizeColor = (value) => {
  if (!value) return null;

  let color = value;

  if (typeof color === "object") {
    color = color.argb || color.rgb || color.indexed || color.theme || null;
  }

  if (typeof color !== "string") return null;

  color = color.replace("#", "").trim();

  // ExcelJS ARGB -> RGB
  if (/^[0-9a-fA-F]{8}$/.test(color)) {
    color = color.slice(2);
  }

  if (/^[0-9a-fA-F]{6}$/.test(color)) {
    return `#${color}`;
  }

  return null;
};

const getFillColor = (cell) => {
  const fill = cell?.fill;

  if (!fill || fill.type === "none") return null;

  return normalizeColor(fill.fgColor) || normalizeColor(fill.bgColor) || null;
};

const getBorderStyle = (side) => {
  if (!side) return "none";

  const styles = {
    thin: "1px solid",
    medium: "2px solid",
    thick: "3px solid",
    double: "3px double",
    dotted: "1px dotted",
    dashed: "1px dashed",
    hair: "1px solid",
  };

  return styles[side.style] || "1px solid";
};

const getBorderColor = (side) => normalizeColor(side?.color) || "#b7b7b7";

const excelValueToText = (value) => {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toLocaleDateString("en-IN");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText
        .map((item) => excelValueToText(item?.text))
        .join("");
    }

    if (value.text !== undefined) {
      return excelValueToText(value.text);
    }

    if (value.result !== undefined && value.result !== null) {
      return excelValueToText(value.result);
    }

    if (value.error !== undefined) {
      return String(value.error);
    }
  }

  return "";
};

const getDisplayText = (cell) => {
  if (!cell) return "";

  /*
    Do not convert blank cells to 0.00.
    The viewer is strictly read-only and displays the value
    that actually exists in the workbook.
  */
  if (cell.value === null || cell.value === undefined) {
    return "";
  }

  const value = cell.value;

  if (value && typeof value === "object" && value.formula !== undefined) {
    if (value.result !== undefined && value.result !== null) {
      return excelValueToText(value.result);
    }

    return `=${value.formula}`;
  }

  try {
    if (typeof cell.text === "string" && cell.text !== "") {
      return cell.text;
    }
  } catch {
    // Fall back to raw value.
  }

  return excelValueToText(value);
};

const parseMerge = (range) => {
  const [start, end] = String(range).split(":");

  const a = start?.match(/^([A-Z]+)(\d+)$/i);
  const b = end?.match(/^([A-Z]+)(\d+)$/i);

  if (!a || !b) return null;

  return {
    startRow: Number(a[2]),
    endRow: Number(b[2]),
    startCol: columnNumber(a[1]),
    endCol: columnNumber(b[1]),
  };
};

const columnNumber = (letters) => {
  let result = 0;

  for (const char of String(letters).toUpperCase()) {
    result = result * 26 + char.charCodeAt(0) - 64;
  }

  return result;
};

const createMergeMap = (worksheet) => {
  const map = new Map();
  const merges = worksheet.model?.merges || [];

  merges.forEach((range) => {
    const merge = parseMerge(range);

    if (!merge) return;

    for (let row = merge.startRow; row <= merge.endRow; row += 1) {
      for (let col = merge.startCol; col <= merge.endCol; col += 1) {
        map.set(`${row}:${col}`, {
          ...merge,
          isMaster: row === merge.startRow && col === merge.startCol,
        });
      }
    }
  });

  return map;
};

const getCellStyle = (cell) => {
  const alignment = cell?.alignment || {};
  const font = cell?.font || {};

  const horizontal =
    alignment.horizontal === "center"
      ? "center"
      : alignment.horizontal === "right"
        ? "right"
        : "left";

  const vertical =
    alignment.vertical === "top"
      ? "top"
      : alignment.vertical === "bottom"
        ? "bottom"
        : "middle";

  return {
    backgroundColor: getFillColor(cell) || "#ffffff",
    color: normalizeColor(font.color) || "#000000",
    fontFamily: font.name || "Calibri, Arial, sans-serif",
    fontSize: `${font.size || 11}pt`,
    fontWeight: font.bold ? 700 : 400,
    fontStyle: font.italic ? "italic" : "normal",
    textDecoration:
      [font.underline ? "underline" : "", font.strike ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || "none",
    textAlign: horizontal,
    verticalAlign: vertical,
    // Excel-like text overflow: long text remains on one line and can
    // visually continue into adjacent EMPTY cells. Actual populated
    // cells still provide the natural visual boundary.
    whiteSpace: "nowrap",
    overflow: "visible",
    textOverflow: "clip",
    borderTop: `${getBorderStyle(cell?.border?.top)} ${getBorderColor(
      cell?.border?.top,
    )}`,
    borderRight: `${getBorderStyle(cell?.border?.right)} ${getBorderColor(
      cell?.border?.right,
    )}`,
    borderBottom: `${getBorderStyle(cell?.border?.bottom)} ${getBorderColor(
      cell?.border?.bottom,
    )}`,
    borderLeft: `${getBorderStyle(cell?.border?.left)} ${getBorderColor(
      cell?.border?.left,
    )}`,
    padding: "4px 6px",
    boxSizing: "border-box",
  };
};

const getColumnWidth = (column) => {
  const excelWidth = Number(column?.width);

  if (!Number.isFinite(excelWidth) || excelWidth <= 0) {
    return 90;
  }

  // Approximate Excel character width -> CSS pixels.
  return Math.max(45, Math.min(500, excelWidth * 7));
};

const getRowHeight = (row) => {
  const height = Number(row?.height);

  if (!Number.isFinite(height) || height <= 0) {
    return 22;
  }

  // Excel row height is approximately points.
  return Math.max(18, Math.min(500, height * 1.33));
};

/* =========================================================
   READ-ONLY FILE VIEW MODAL
========================================================= */

function ExcelReadOnlyViewer({ report, onClose }) {
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reportFileUrl = report?.id
    ? FILE_API_URL(report.id)
    : getFileUrl(report?.month_attendance);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadWorkbook = async () => {
      try {
        setLoading(true);
        setError("");

        if (!reportFileUrl) {
          throw new Error("Excel file URL उपलब्ध नहीं है।");
        }

        const response = await fetch(reportFileUrl, {
          method: "GET",
          headers: {
            // The API returns the Excel binary directly.
            // Do not force an XLSX Accept type because the endpoint
            // can otherwise respond with HTTP 406 Not Acceptable.
            Accept: "*/*",
          },
        });

        if (!response.ok) {
          throw new Error(`Excel file load नहीं हुई (${response.status}).`);
        }

        const buffer = await response.arrayBuffer();

        const loadedWorkbook = new ExcelJS.Workbook();

        await loadedWorkbook.xlsx.load(buffer);

        if (!loadedWorkbook.worksheets.length) {
          throw new Error("Workbook में कोई worksheet नहीं मिली।");
        }

        if (!cancelled) {
          setWorkbook(loadedWorkbook);
          setActiveSheet(0);
        }
      } catch (err) {
        console.error("Attendance Excel preview error:", err);

        if (!cancelled) {
          setError(err?.message || "Excel file preview नहीं हो पाया।");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadWorkbook();

    return () => {
      cancelled = true;
    };
  }, [reportFileUrl]);

  const downloadExcel = async () => {
    try {
      if (!reportFileUrl) {
        throw new Error("Download URL उपलब्ध नहीं है।");
      }

      const response = await fetch(reportFileUrl, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Download failed (${response.status}).`);
      }

      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = report?.month_attendance
        ? String(report.month_attendance).split("/").pop()
        : `Attendance_Report_${report?.center_name || "Report"}.xlsx`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Excel download error:", err);

      // Keep the user inside the ExcelJS viewer.
      // Do not open the API response in a new browser tab.
    }
  };

  if (loading) {
    return (
      <div style={viewerOverlayStyle}>
        <div style={viewerStateCardStyle}>
          <Spinner animation="border" variant="primary" />
          <h4 style={{ marginTop: 16 }}>Excel रिपोर्ट लोड हो रही है...</h4>
          <p style={{ margin: 0 }}>
            रिपोर्ट का डेटा और Excel जैसा structure तैयार किया जा रहा है।
          </p>
        </div>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div style={viewerOverlayStyle}>
        <div style={viewerStateCardStyle}>
          <div style={errorIconStyle}>!</div>

          <h4>Excel Report Open नहीं हो सकी</h4>

          <p style={{ color: "#666" }}>{error || "Workbook उपलब्ध नहीं है।"}</p>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={downloadExcel}
              style={downloadButtonStyle}
            >
              <FaDownload />
              Download
            </button>

            <button type="button" onClick={onClose} style={closeButtonStyle}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sheet =
    workbook.worksheets[Math.min(activeSheet, workbook.worksheets.length - 1)];

  const mergeMap = createMergeMap(sheet);

  const maxRow = Math.max(sheet.rowCount || 1, sheet.actualRowCount || 1);

  const maxCol = Math.max(sheet.columnCount || 1, sheet.actualColumnCount || 1);

  return (
    <div style={viewerOverlayStyle}>
      <div style={viewerContainerStyle}>
        {/* Header */}
        <div style={viewerHeaderStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div style={excelIconStyle}>XLS</div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: "#1f2937",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                उपस्थिति रिपोर्ट —{" "}
                {report?.center_name || "Monthly Attendance Report"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 2,
                }}
              >
                {report?.month || ""}{" "}
                {report?.financial_year ? `| ${report.financial_year}` : ""} |
                केवल देखने के लिए
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={downloadExcel}
              style={downloadButtonStyle}
            >
              <FaDownload />
              Download Excel
            </button>

            <button type="button" onClick={onClose} style={closeButtonStyle}>
              <FaTimes />
              Close
            </button>
          </div>
        </div>

        {/* Sheet tabs */}
        {workbook.worksheets.length > 1 && (
          <div style={sheetTabsStyle}>
            {workbook.worksheets.map((item, index) => (
              <button
                type="button"
                key={`${item.name}-${index}`}
                onClick={() => setActiveSheet(index)}
                style={{
                  ...sheetTabStyle,
                  ...(activeSheet === index ? activeSheetTabStyle : {}),
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {/* Disabled/read-only notice */}
        <div style={readOnlyNoticeStyle}>
          <span>
            🔒 यह Excel केवल देखने के लिए है। इसमें कोई editing उपलब्ध नहीं है।
          </span>
        </div>

        {/* Excel grid */}
        <div style={gridWrapperStyle}>
          <table
            style={{
              borderCollapse: "collapse",
              tableLayout: "fixed",
              width: "max-content",
              minWidth: "100%",
              background: "#fff",
            }}
          >
            <colgroup>
              {Array.from({ length: maxCol }, (_, index) => {
                const column = sheet.getColumn(index + 1);

                return (
                  <col
                    key={index}
                    style={{
                      width: `${getColumnWidth(column)}px`,
                    }}
                  />
                );
              })}
            </colgroup>

            <tbody>
              {Array.from({ length: maxRow }, (_, rowIndex) => {
                const rowNumber = rowIndex + 1;

                const row = sheet.getRow(rowNumber);

                if (row.hidden) {
                  return null;
                }

                return (
                  <tr
                    key={`excel-row-${rowNumber}`}
                    style={{
                      height: `${getRowHeight(row)}px`,
                    }}
                  >
                    {Array.from({ length: maxCol }, (_, colIndex) => {
                      const colNumber = colIndex + 1;

                      const cell = sheet.getCell(rowNumber, colNumber);

                      const merge = mergeMap.get(`${rowNumber}:${colNumber}`);

                      if (merge && !merge.isMaster) {
                        return null;
                      }

                      const rowSpan = merge
                        ? merge.endRow - merge.startRow + 1
                        : 1;

                      const colSpan = merge
                        ? merge.endCol - merge.startCol + 1
                        : 1;

                      return (
                        <td
                          key={`cell-${rowNumber}-${colNumber}`}
                          rowSpan={rowSpan}
                          colSpan={colSpan}
                          style={{
                            ...getCellStyle(cell),
                            cursor: "default",
                            userSelect: "text",
                            whiteSpace: "nowrap",
                            overflow: "visible",
                            textOverflow: "clip",
                            position: "relative",
                            zIndex:
                              cell?.value !== null &&
                              cell?.value !== undefined &&
                              String(cell.value).trim() !== ""
                                ? 2
                                : 1,
                          }}
                        >
                          {getDisplayText(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const viewerOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 99999,
  width: "100vw",
  height: "100vh",
  background: "#ffffff",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "stretch",
  padding: 0,
  boxSizing: "border-box",
};

const viewerContainerStyle = {
  width: "100vw",
  height: "100vh",
  maxHeight: "none",
  maxWidth: "none",
  background: "#ffffff",
  borderRadius: 0,
  overflow: "hidden",
  boxShadow: "none",
  border: 0,
  display: "flex",
  flexDirection: "column",
};

const viewerHeaderStyle = {
  minHeight: 64,
  padding: "12px 16px",
  borderBottom: "1px solid #d9dee7",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const excelIconStyle = {
  width: 42,
  height: 38,
  borderRadius: 6,
  background: "#217346",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800,
};

const downloadButtonStyle = {
  border: 0,
  borderRadius: 6,
  padding: "9px 13px",
  background: "#217346",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const closeButtonStyle = {
  border: 0,
  borderRadius: 6,
  padding: "9px 13px",
  background: "#374151",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const sheetTabsStyle = {
  display: "flex",
  gap: 2,
  overflowX: "auto",
  background: "#e9eef3",
  borderBottom: "1px solid #cbd5e1",
  padding: "6px 8px 0",
};

const sheetTabStyle = {
  border: "1px solid #cbd5e1",
  borderBottom: 0,
  background: "#dce3ea",
  color: "#334155",
  padding: "8px 14px",
  borderRadius: "6px 6px 0 0",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const activeSheetTabStyle = {
  background: "#ffffff",
  color: "#217346",
  fontWeight: 700,
};

const readOnlyNoticeStyle = {
  minHeight: 34,
  padding: "7px 12px",
  background: "#f1f5f9",
  color: "#475569",
  borderBottom: "1px solid #d9dee7",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
};

const gridWrapperStyle = {
  flex: 1,
  overflow: "auto",
  background: "#e5e7eb",
  padding: 0,
};

const viewerStateCardStyle = {
  width: "min(520px, 94vw)",
  background: "#ffffff",
  borderRadius: 10,
  padding: 30,
  textAlign: "center",
  boxShadow: "0 18px 50px rgba(0,0,0,0.30)",
  border: "1px solid #d1d5db",
};

const errorIconStyle = {
  width: 44,
  height: 44,
  margin: "0 auto 12px",
  borderRadius: "50%",
  background: "#fee2e2",
  color: "#b91c1c",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 22,
};

/* =========================================================
   ADMIN MONTH ATTENDANCE
========================================================= */

function AdminMonthAttendance() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  const [isTablet, setIsTablet] = useState(false);

  const [reports, setReports] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

  const [selectedReport, setSelectedReport] = useState(null);

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

  const fetchReports = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();

      if (Array.isArray(result)) {
        setReports(result);
      } else if (Array.isArray(result.data)) {
        setReports(result.data);
      } else if (result.data && Array.isArray(result.data.results)) {
        setReports(result.data.results);
      } else if (Array.isArray(result.results)) {
        setReports(result.results);
      } else if (result.data) {
        setReports([result.data]);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);

      setMessage({
        text: "रिपोर्ट लाने में त्रुटि हुई।",
        type: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openReport = (report) => {
    if (!report) return;

    setMessage({
      text: "",
      type: "",
    });

    setSelectedReport(report);
  };

  const closeViewer = () => {
    setSelectedReport(null);
  };

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
            <div className="home-welcome-section professional-welcome d-flex justify-content-between text-center mb-4">
              <h1 className="home-title">मासिक उपस्थिति प्रबंधन</h1>

              <p className="home-subtitle">
                DHO टिहरी उद्यान विभाग डिजिटल प्लेटफॉर्म में आपका स्वागत है
              </p>
            </div>

            <Card className="report-export-card professional-export-card mb-4">
              <Card.Body className="py-2">
                <Row className="align-items-center">
                  <Col md={12}>
                    <div className="d-flex align-items-center">
                      <FaClipboardList className="text-primary me-2" />

                      <span
                        className="report-title"
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "600",
                        }}
                      >
                        मासिक उपस्थिति रिपोर्ट
                      </span>

                      <span
                        className="badge bg-info ms-2"
                        style={{
                          fontSize: "0.7rem",
                        }}
                      >
                        {reports.length} रिपोर्ट्स
                      </span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {message.text && (
              <Alert
                variant={message.type === "success" ? "success" : "danger"}
                className="demand-center-alert"
              >
                {message.text}
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />

                <p className="mt-3">डेटा लोड हो रहा है...</p>
              </div>
            ) : reports.length === 0 ? (
              <Alert variant="info" className="demand-center-empty">
                <strong>कोई रिपोर्ट उपलब्ध नहीं है।</strong>
              </Alert>
            ) : (
              <section
                className="dynamic-report-section"
                style={{
                  marginTop: 0,
                  paddingTop: 0,
                }}
              >
                <div className="dynamic-report-content professional-report-content">
                  <div className="dynamic-report-panel">
                    <div
                      className="dynamic-report-table-scroll"
                      style={{
                        width: "100%",
                        overflowX: "auto",
                      }}
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
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => openReport(report)}
                                  >
                                    <FaEye className="me-1" />
                                    View
                                  </button>
                                ) : (
                                  <span className="text-muted">
                                    फाइल उपलब्ध नहीं
                                  </span>
                                )}
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

      <Footer />

      {selectedReport && (
        <ExcelReadOnlyViewer report={selectedReport} onClose={closeViewer} />
      )}
    </>
  );
}

export default AdminMonthAttendance;
