import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Alert,
  Spinner,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../assets/css/vetan.css";

const API_URL =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/salary-attendance-reports/";

// Default headers for the dynamic table (Text Headings)
const TABLE_HEADERS = [
  "क्र.",
  "नाव",
  "पदनाव",
  "वर्ग",
  "दिनांक (शुरू)",
  "दिनांक (अंत)",
  "छुट्टी (शुरू)",
  "छुट्टी (अंत)",
  "उपस्थिति",
  "अवैतनिक",
  "कुल दिन",
  "शेष",
  "वित्तीय वर्ष",
  "टिप्पणी / कार्य विवरण",
];

// Marathi Month Options for Dropdown
const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Financial Year Options
const FINANCIAL_YEAR_OPTIONS = ["2024-25", "2025-26", "2026-27", "2027-28"];

// Column widths for print/preview (14 columns)
const COL_WIDTHS = [
  "3%", // 0  क्र.
  "7%", // 1  नाव
  "7%", // 2  पदनाव
  "4%", // 3  वर्ग
  "6%", // 4  दिनांक (शुरू)
  "6%", // 5  दिनांक (अंत)
  "6%", // 6  छुट्टी (शुरू)
  "6%", // 7  छुट्टी (अंत)
  "5%", // 8  उपस्थिति
  "5%", // 9  अवैतनिक
  "4%", // 10 कुल दिन
  "4%", // 11 शेष
  "7%", // 12 वित्तीय वर्ष
  "30%", // 13 टिप्पणी / कार्य विवरण
];

// Helper to extract center name
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

// Helper to format date into Hindi readable format (e.g., 20 अगस्त, 2026)
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("hi-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
};

function VetanMang() {
  const { user } = useAuth();
  const centerName = getCenterNameFromUser(user);

  const [formData, setFormData] = useState({
    center_name: centerName || "",
    month: "",
    financial_year: "2026-27",
    letter_number: "",
    report_date: "",
    subject: "वेतन मांग पत्र एवं उपस्थिति सूचना",
    report_data: [],
  });

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);

  const openAddModal = () => {
    setShowFormModal(true);
  };

  const closeAddModal = () => {
    setShowFormModal(false);
  };

  const openPreviewModal = (report) => {
    setPreviewReport(report);
    setShowPreviewModal(true);
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewReport(null);
  };

  // Reusable HTML generator for formal letter print format
  const generatePrintHTML = (report) => {
    const tableRows = report.report_data
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${cell || ""}</td>`).join("")}</tr>`,
      )
      .join("");

    const colGroup = COL_WIDTHS.map((w) => `<col style="width:${w};">`).join(
      "",
    );
    const yearPart = report.financial_year
      ? report.financial_year.split("-")[0]
      : "";
    const formattedDate = formatDate(report.report_date);

    return `
      <div class="doc-header">
        <h1>उद्यान एवं खाद्य प्रसंस्करण विभाग, उत्तराखण्ड</h1>
        <h2>कार्यालय — प्रभारी, उद्यान सचल दल केन्द्र ${report.center_name}</h2>
        <h3>विकासखण्ड ${report.center_name}, जनपद पौड़ी गढ़वाल (उत्तराखण्ड)</h3>
      </div>

      <div class="ref-date">
        <span><strong>पत्रांक:</strong> ${report.letter_number} / वेतन मांग पत्र एवं उपस्थिति सूचना / वर्ष ${report.financial_year}</span>
        <span><strong>दिनांक:</strong> ${formattedDate}</span>
      </div>

      <div class="to-address">
        सेवा में,<br>
        श्रीमान उद्यान विशेषज्ञ,<br>
        टिहरी, जनपद पौड़ी गढ़वाल।
      </div>

      <div class="subject">
        <strong>विषय :</strong> माह ${report.month}, वर्ष ${report.financial_year} का वेतन मांग पत्र (D-4) एवं नियमित तथा उपनल प्रायोजित कार्मिकों की उपस्थिति सूचना प्रेषित किये जाने के सम्बन्ध में।
      </div>

      <div class="body-text">
        महोदय,<br>
        उपरोक्त विषयक अवगत कराना है कि इस केन्द्र में कार्यरत नियमित एवं उपनल प्रायोजित (कुशल-माली) कार्मिकों की माह ${report.month}, ${yearPart} की उपस्थिति सूचना एवं वेतन मांग पत्र (D-4) निम्नानुसार है, जो आपकी सेवा में सूचनार्थ एवं वेतन आहरण/भुगतान की आवश्यक कार्यवाही हेतु प्रेषित है :—
      </div>

      <table class="print-attendance-table">
        <colgroup>
          <col style="width:4%;">
          <col style="width:11%;">
          <col style="width:10%;">
          <col style="width:9%;">
          <col style="width:5%;">
          <col style="width:5%;">
          <col style="width:5%;">
          <col style="width:5%;">
          <col style="width:6%;">
          <col style="width:6%;">
          <col style="width:6%;">
          <col style="width:6%;">
          <col style="width:6%;">
          <col style="width:20%;">
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
        <tbody>${tableRows}</tbody>
      </table>

      <div class="body-text">
        प्रमाणित किया जाता है कि उपरोक्त अंकित उपस्थिति विवरण कार्यालय की उपस्थिति पंजिका के अनुसार पूर्णतः सही एवं सत्य है। उपरोक्त कार्मिकों द्वारा उल्लिखित अवधि में अपने पदीय दायित्वों का निर्वहन किया गया है तथा किसी भी कार्मिक द्वारा अनाधिकृत रूप से अनुपस्थिति/अवकाश का उपभोग नहीं किया गया है। तदनुसार माह ${report.month}, ${yearPart} का वेतन आहरण किये जाने की कृपा करें।
      </div>

      <div class="sign-off">
        भवदीय,<br><br><br>
        ( हस्ताक्षर )<br>
        प्रभारी<br>
        उद्यान सचल दल केन्द्र, ${report.center_name}<br>
        जनपद पौड़ी गढ़वाल
      </div>

      <div class="cc-section">
        <div class="ref-date no-margin">
          <span><strong>पत्रांक:</strong> ${report.letter_number}-24 / वेतन मांग पत्र एवं उपस्थिति सूचना / वर्ष ${report.financial_year}</span>
          <span><strong>दिनांक:</strong> ${formattedDate}</span>
        </div>
        <p><strong>प्रतिलिपि :</strong> निम्नलिखित को सूचनार्थ एवं आवश्यक कार्यवाही हेतु प्रेषित —</p>
        <p>1. सम्बन्धित कार्मिक को सूचनार्थ।</p>
        <p>2. कार्यालय प्रति।</p>
      </div>
    `;
  };

  // ===== PRINT PREVIEW (Single Report) =====
  const handlePrintPreview = () => {
    if (!previewReport) return;
    setShowPreviewModal(false);
    setTimeout(() => {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
        <head>
          <title>वेतन मांग पत्र - प्रिव्यू</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Mangal', 'Nirmala UI', 'Segoe UI', Tahoma, sans-serif;
              padding: 20px;
              color: #000;
              line-height: 1.5;
            }
            .doc-header { text-align: center; margin-bottom: 20px; }
            .doc-header h1 { font-size: 16px; margin-bottom: 5px; }
            .doc-header h2 { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .doc-header h3 { font-size: 13px; font-weight: normal; }
            
            .ref-date { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
            .ref-date.no-margin { margin-bottom: 5px; margin-top: 30px; border-top: 1px solid #000; padding-top: 15px; }
            
            .to-address { margin: 20px 0; font-size: 13px; }
            
            .subject { margin: 20px 0; font-size: 13px; }
            
            .body-text { margin: 15px 0; text-align: justify; font-size: 13px; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              border-spacing: 0;
              margin: 12px 0;
              font-size: 8.5px;
              table-layout: fixed;
              page-break-inside: auto;
              break-inside: auto;
            }

            thead { display: table-header-group; }
            tbody { display: table-row-group; }

            tr {
              display: table-row;
              height: auto !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            th, td {
              display: table-cell;
              height: auto !important;
              min-height: 0 !important;
              border: 1px solid #000;
              padding: 3px 4px;
              text-align: center;
              vertical-align: middle;
              word-wrap: break-word;
              overflow-wrap: anywhere;
              word-break: normal;
              white-space: normal;
              line-height: 1.15;
            }
            th {
              background-color: #f2f2f2;
              color: #000;
              font-weight: bold;
              text-align: center;
              font-size: 10px;
            }
            td { text-align: center; }
            td:last-child { text-align: left; }
            
            .sign-off { margin-top: 40px; text-align: right; font-size: 13px; }
            
            .cc-section { margin-top: 50px; font-size: 13px; }
            .cc-section p { margin-bottom: 5px; }
            
            @page {
              size: landscape;
              margin: 10mm;
            }
          </style>
        </head>
        <body>
          ${generatePrintHTML(previewReport)}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }, 300);
  };

  // Update useEffect to trigger fetchReports as soon as the centerName is available
  useEffect(() => {
    if (centerName) {
      fetchReports();
    }
  }, [centerName]);

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
      const url = `${API_URL}?center_name=${encodeURIComponent(centerName)}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Network response was not ok");

      const result = await response.json();
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setMessage({ text: "रिपोर्ट लाने में त्रुटि हुई।", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle Input Change and Calculate Columns
  const handleReportDataChange = (rowIndex, colIndex, value) => {
    const updatedReportData = [...formData.report_data];
    updatedReportData[rowIndex][colIndex] = value;

    // Indices for logic
    // 4: दिनांक (शुरू), 5: दिनांक (अंत), 6: छुट्टी (शुरू), 7: छुट्टी (अंत)
    // 10: कुल दिन, 11: शेष

    // Calculate Total Days (कुल दिन) - Difference between Start and End Date
    if (colIndex === 4 || colIndex === 5) {
      const startDateStr = updatedReportData[rowIndex][4];
      const endDateStr = updatedReportData[rowIndex][5];
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start date
          updatedReportData[rowIndex][10] = diffDays.toString();
        } else {
          updatedReportData[rowIndex][10] = "";
        }
      } else {
        updatedReportData[rowIndex][10] = "";
      }
    }

    // Calculate Leave Balance (शेष) - Difference between Leave Start and Leave End
    if (colIndex === 6 || colIndex === 7) {
      const leaveStartStr = updatedReportData[rowIndex][6];
      const leaveEndStr = updatedReportData[rowIndex][7];
      if (leaveStartStr && leaveEndStr) {
        const leaveStart = new Date(leaveStartStr);
        const leaveEnd = new Date(leaveEndStr);
        if (
          !isNaN(leaveStart.getTime()) &&
          !isNaN(leaveEnd.getTime()) &&
          leaveEnd >= leaveStart
        ) {
          const diffTime = Math.abs(leaveEnd - leaveStart);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start date
          updatedReportData[rowIndex][11] = diffDays.toString();
        } else {
          updatedReportData[rowIndex][11] = "";
        }
      } else {
        updatedReportData[rowIndex][11] = "";
      }
    }

    setFormData({ ...formData, report_data: updatedReportData });
  };

  const addRow = () => {
    const newRow = Array(14).fill("");
    newRow[0] = formData.report_data.length + 1; // Auto increment क्र.
    setFormData({
      ...formData,
      report_data: [...formData.report_data, newRow],
    });
  };

  const removeRow = (rowIndex) => {
    const updatedReportData = formData.report_data.filter(
      (_, index) => index !== rowIndex,
    );
    // Re-number क्र. column after deletion
    updatedReportData.forEach((row, index) => {
      row[0] = index + 1;
    });
    setFormData({ ...formData, report_data: updatedReportData });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    const cleanedReportData = formData.report_data.filter((row) =>
      row.some((cell) => cell && String(cell).trim() !== ""),
    );

    const payload = { ...formData, report_data: cleanedReportData };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setMessage({
          text: "वेतन मांग पत्र सफलतापूर्वक सहेजा गया।",
          type: "success",
        });
        setFormData({
          center_name: centerName || "",
          month: "",
          financial_year: "2026-27",
          letter_number: "",
          report_date: "",
          subject: "वेतन मांग पत्र एवं उपस्थिति सूचना",
          report_data: [],
        });
        fetchReports();
      } else {
        throw new Error(result.message || "Submission failed");
      }
    } catch (error) {
      console.error("Error posting report:", error);
      setMessage({
        text: "सबमिशन में त्रुटि हुई। कृपया पुनः प्रयास करें।",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Share all reports data
  const handleShareAll = async () => {
    if (!reports.length) {
      alert("कोई रिपोर्ट उपलब्ध नहीं है।");
      return;
    }

    const shareText = reports
      .map(
        (report, idx) =>
          `${idx + 1}. केंद्र: ${report.center_name} | माह: ${report.month} | वर्ष: ${report.financial_year} | दिनांक: ${report.report_date} | विषय: ${report.subject}\n` +
          `   पत्र संख्या: ${report.letter_number}\n` +
          `   डेटा:\n${report.report_data.map((row) => `   ${row.join(" | ")}`).join("\n")}`,
      )
      .join("\n\n");

    const fullText = `वेतन मांग पत्र एवं उपस्थिति सूचना\nकुल रिपोर्ट: ${reports.length}\n\n${shareText}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "वेतन मांग पत्र रिपोर्ट",
          text: fullText,
        });
      } catch (error) {
        console.log("Sharing failed", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullText);
        alert("सभी रिपोर्ट का विवरण क्लिपबोर्ड पर कॉपी कर दिया गया है!");
      } catch (error) {
        console.error("Copy failed", error);
        alert("शेयर करने में त्रुटि हुई।");
      }
    }
  };

  // ===== PRINT ALL REPORTS =====
  const handlePrintAll = () => {
    if (!reports.length) {
      alert("कोई रिपोर्ट उपलब्ध नहीं है।");
      return;
    }

    const firstReport = reports[0];

    const allRows = [];
    reports.forEach((report) => {
      (report.report_data || []).forEach((row) => {
        const safeRow = Array.isArray(row) ? [...row] : [];

        while (safeRow.length < 14) safeRow.push("");
        if (safeRow.length > 14) safeRow.length = 14;

        allRows.push(safeRow);
      });
    });

    if (!allRows.length) {
      alert("प्रिंट करने के लिए कोई कर्मचारी डेटा उपलब्ध नहीं है।");
      return;
    }

    const tableRows = allRows
      .map(
        (row) => `
      <tr>
        ${row
          .map(
            (cell) => `
          <td>${cell === null || cell === undefined ? "" : String(cell)}</td>
        `,
          )
          .join("")}
      </tr>
    `,
      )
      .join("");

    const yearPart = firstReport.financial_year
      ? firstReport.financial_year.split("-")[0]
      : "";

    const formattedDate = formatDate(firstReport.report_date);

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
        <title>वेतन मांग पत्र एवं उपस्थिति सूचना - सभी कर्मचारी</title>

        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; width: 100%; background: #fff; }
          body {
            font-family: 'Nirmala UI', 'Mangal', 'Noto Sans Devanagari', 'Segoe UI', sans-serif;
            color: #000;
            font-size: 10.5pt;
            line-height: 1.45;
          }

          .print-document { width: 100%; padding: 8mm 10mm; }
          .doc-header { text-align: center; margin: 0 0 10px; }
          .doc-header h1 { margin: 0 0 3px; font-size: 15px; font-weight: 700; }
          .doc-header h2 { margin: 0 0 2px; font-size: 13px; font-weight: 700; }
          .doc-header h3 { margin: 0; font-size: 11.5px; font-weight: 400; }

          .ref-date {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin: 8px 0 12px;
            font-size: 10.5px;
          }

          .to-address, .subject, .body-text { margin: 8px 0; font-size: 10.5px; }
          .subject, .body-text { text-align: justify; }

          table.print-attendance-table {
            width: 100%;
            margin: 10px 0 12px;
            border-collapse: collapse;
            border-spacing: 0;
            table-layout: fixed;
            page-break-inside: auto;
            break-inside: auto;
          }

          table.print-attendance-table thead { display: table-header-group !important; }
          table.print-attendance-table tbody { display: table-row-group !important; }
          
          table.print-attendance-table tr {
            display: table-row !important;
            height: auto !important;
            min-height: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          table.print-attendance-table th, table.print-attendance-table td {
            display: table-cell !important;
            width: auto;
            height: auto !important;
            min-height: 0 !important;
            border: 1px solid #000;
            padding: 3px 4px;
            vertical-align: middle;
            line-height: 1.15;
            font-size: 8.5px;
            overflow: hidden;
            overflow-wrap: anywhere;
            word-break: normal;
            white-space: normal;
          }

          table.print-attendance-table th {
            background: #fff !important;
            color: #000 !important;
            text-align: center;
            font-weight: 700;
            vertical-align: middle;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          table.print-attendance-table td { text-align: center; }
          table.print-attendance-table td:last-child { text-align: left; }

          .sign-off { margin-top: 18px; text-align: right; font-size: 10.5px; page-break-inside: avoid; break-inside: avoid; }
          .cc-section { margin-top: 25px; font-size: 10.5px; page-break-inside: avoid; break-inside: avoid; }
          .cc-section p { margin: 3px 0; }

          @page { size: A4 landscape; margin: 8mm; }

          @media print {
            html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #fff !important; }
            .print-document { width: 100% !important; padding: 0 !important; }
            table.print-attendance-table { width: 100% !important; table-layout: fixed !important; page-break-inside: auto !important; break-inside: auto !important; }
            table.print-attendance-table thead { display: table-header-group !important; }
            table.print-attendance-table tbody { display: table-row-group !important; }
            table.print-attendance-table tr { height: auto !important; page-break-inside: avoid !important; break-inside: avoid !important; }
            table.print-attendance-table th, table.print-attendance-table td { height: auto !important; min-height: 0 !important; }
          }
        </style>
      </head>

      <body>
        <main class="print-document">

          <div class="doc-header">
            <h1>उद्यान एवं खाद्य प्रसंस्करण विभाग, उत्तराखण्ड</h1>
            <h2>कार्यालय — प्रभारी, उद्यान सचल दल केन्द्र ${firstReport.center_name || ""}</h2>
            <h3>विकासखण्ड ${firstReport.center_name || ""}, जनपद पौड़ी गढ़वाल (उत्तराखण्ड)</h3>
          </div>

          <div class="ref-date">
            <span>
              <strong>पत्रांक:</strong>
              ${firstReport.letter_number || ""}
              / वेतन मांग पत्र एवं उपस्थिति सूचना /
              वर्ष ${firstReport.financial_year || ""}
            </span>
            <span>
              <strong>दिनांक:</strong> ${formattedDate}
            </span>
          </div>

          <div class="to-address">
            सेवा में,<br>
            श्रीमान उद्यान विशेषज्ञ,<br>
            टिहरी, जनपद पौड़ी गढ़वाल।
          </div>

          <div class="subject">
            <strong>विषय :</strong>
            माह ${firstReport.month || ""}, वर्ष ${firstReport.financial_year || ""}
            का वेतन मांग पत्र (D-4) एवं नियमित तथा उपनल प्रायोजित कार्मिकों की
            उपस्थिति सूचना प्रेषित किये जाने के सम्बन्ध में।
          </div>

          <div class="body-text">
            महोदय,<br>
            उपरोक्त विषयक अवगत कराना है कि इस केन्द्र में कार्यरत नियमित एवं
            उपनल प्रायोजित (कुशल-माली) कार्मिकों की माह ${firstReport.month || ""},
            ${yearPart} की उपस्थिति सूचना एवं वेतन मांग पत्र (D-4) निम्नानुसार है,
            जो आपकी सेवा में सूचनार्थ एवं वेतन आहरण/भुगतान की आवश्यक कार्यवाही
            हेतु प्रेषित है :—
          </div>

          <table class="print-attendance-table">
            <colgroup>
              <col style="width:4%;">
              <col style="width:11%;">
              <col style="width:10%;">
              <col style="width:9%;">
              <col style="width:5%;">
              <col style="width:5%;">
              <col style="width:5%;">
              <col style="width:5%;">
              <col style="width:6%;">
              <col style="width:6%;">
              <col style="width:6%;">
              <col style="width:6%;">
              <col style="width:6%;">
              <col style="width:20%;">
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
              ${tableRows}
            </tbody>
          </table>

          <div class="body-text">
            प्रमाणित किया जाता है कि उपरोक्त अंकित उपस्थिति विवरण कार्यालय की
            उपस्थिति पंजिका के अनुसार पूर्णतः सही एवं सत्य है। उपरोक्त कार्मिकों
            द्वारा उल्लिखित अवधि में अपने पदीय दायित्वों का निर्वहन किया गया है
            तथा किसी भी कार्मिक द्वारा अनाधिकृत रूप से अनुपस्थिति/अवकाश का
            उपभोग नहीं किया गया है। तदनुसार माह ${firstReport.month || ""},
            ${yearPart} का वेतन आहरण किये जाने की कृपा करें।
          </div>

          <div class="sign-off">
            भवदीय,<br><br><br>
            ( हस्ताक्षर )<br>
            प्रभारी<br>
            उद्यान सचल दल केन्द्र, ${firstReport.center_name || ""}<br>
            जनपद पौड़ी गढ़वाल
          </div>

          <div class="cc-section">
            <div class="ref-date">
              <span>
                <strong>पत्रांक:</strong>
                ${firstReport.letter_number || ""}-24 /
                वेतन मांग पत्र एवं उपस्थिति सूचना /
                वर्ष ${firstReport.financial_year || ""}
              </span>
              <span>
                <strong>दिनांक:</strong> ${formattedDate}
              </span>
            </div>

            <p>
              <strong>प्रतिलिपि :</strong>
              निम्नलिखित को सूचनार्थ एवं आवश्यक कार्यवाही हेतु प्रेषित —
            </p>
            <p>1. सम्बन्धित कार्मिक को सूचनार्थ।</p>
            <p>2. कार्यालय प्रति।</p>
          </div>

        </main>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 700);
  };

  return (
    <Container fluid className="px-3" style={{ paddingTop: "89px" }}>
      <Row className="mb-3">
        <Col>
          <div
            className="p-3 rounded shadow-sm"
            style={{ backgroundColor: "#1a5276", color: "white" }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 fw-bold">
                  वेतन मांग पत्र एवं उपस्थिति सूचना
                </h5>
                <small className="opacity-75">{centerName}</small>
              </div>
              <Button
                variant="light"
                size="sm"
                onClick={openAddModal}
                className="fw-bold"
              >
                + नई रिपोर्ट दर्ज करें
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {message.text && showFormModal === false && (
        <Row className="mb-3">
          <Col>
            <Alert variant={message.type === "success" ? "success" : "danger"}>
              {message.text}
            </Alert>
          </Col>
        </Row>
      )}

      {showFormModal && (
        <div className="vm-modal-overlay vm-add-report-overlay">
          <div className="vm-modal vm-add-report-modal">
            <div className="vm-modal-header">
              <h2>नई रिपोर्ट दर्ज करें (Add New Report)</h2>
              <button
                type="button"
                className="vm-modal-close"
                onClick={closeAddModal}
              >
                ×
              </button>
            </div>

            {message.text && (
              <div className={`vm-alert ${message.type}`}>{message.text}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="vm-grid-2">
                <div className="vm-input-group">
                  <label>केंद्र का नाम (Center Name)</label>
                  <input
                    type="text"
                    name="center_name"
                    value={formData.center_name}
                    readOnly
                    className="vm-readonly-input"
                  />
                </div>

                <div className="vm-input-group">
                  <label>
                    माह (Month) <span className="vm-required">*</span>
                  </label>
                  <select
                    name="month"
                    value={formData.month}
                    onChange={handleInputChange}
                    required
                    className="vm-select-input"
                  >
                    <option value="">-- माह निवडा --</option>
                    {MONTH_OPTIONS.map((month, idx) => (
                      <option key={idx} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vm-input-group">
                  <label>
                    वित्तीय वर्ष (Financial Year){" "}
                    <span className="vm-required">*</span>
                  </label>
                  <select
                    name="financial_year"
                    value={formData.financial_year}
                    onChange={handleInputChange}
                    required
                    className="vm-select-input"
                  >
                    {FINANCIAL_YEAR_OPTIONS.map((year, idx) => (
                      <option key={idx} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vm-input-group">
                  <label>
                    पत्र संख्या (Letter Number){" "}
                    <span className="vm-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="letter_number"
                    value={formData.letter_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="vm-input-group">
                  <label>
                    रिपोर्ट दिनांक (Report Date){" "}
                    <span className="vm-required">*</span>
                  </label>
                  <input
                    type="date"
                    name="report_date"
                    value={formData.report_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="vm-input-group vm-full-width">
                  <label>
                    विषय (Subject) <span className="vm-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="vm-table-container">
                <div className="vm-table-header-bar">
                  <h3>कर्मचारी विवरण (Employee Details)</h3>
                  <button
                    type="button"
                    className="vm-btn vm-btn-secondary"
                    onClick={addRow}
                  >
                    + पंक्ति जोड़ें (Add Row)
                  </button>
                </div>

                <div className="vm-table-scroll">
                  <table className="vm-data-table">
                    <thead>
                      <tr>
                        {TABLE_HEADERS.map((header, idx) => (
                          <th key={idx}>{header}</th>
                        ))}
                        <th className="vm-action-col">कार्य (Action)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.report_data.length === 0 ? (
                        <tr>
                          <td
                            colSpan={TABLE_HEADERS.length + 1}
                            className="vm-empty-row"
                          >
                            कृपया डेटा जोड़ने के लिए "पंक्ति जोड़ें" पर क्लिक
                            करें
                          </td>
                        </tr>
                      ) : (
                        formData.report_data.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => {
                              // क्र. (cIdx === 0) should be read only and auto filled
                              if (cIdx === 0) {
                                return (
                                  <td key={cIdx}>
                                    <input
                                      type="text"
                                      value={cell}
                                      readOnly
                                      style={{
                                        backgroundColor: "#f8f9fa",
                                        fontWeight: "bold",
                                      }}
                                    />
                                  </td>
                                );
                              }
                              // Date inputs for दिनांक (शुरू), दिनांक (अंत), छुट्टी (शुरू), छुट्टी (अंत)
                              else if (
                                cIdx === 4 ||
                                cIdx === 5 ||
                                cIdx === 6 ||
                                cIdx === 7
                              ) {
                                return (
                                  <td key={cIdx}>
                                    <input
                                      type="date"
                                      value={cell}
                                      onChange={(e) =>
                                        handleReportDataChange(
                                          rIdx,
                                          cIdx,
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                );
                              }
                              // कुल दिन (cIdx === 10) and शेष (cIdx === 11) should be read only as they are auto-calculated
                              else if (cIdx === 10 || cIdx === 11) {
                                return (
                                  <td key={cIdx}>
                                    <input
                                      type="text"
                                      value={cell}
                                      readOnly
                                      style={{ backgroundColor: "#e9ecef" }}
                                    />
                                  </td>
                                );
                              }
                              // Default Text Input
                              else {
                                return (
                                  <td key={cIdx}>
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) =>
                                        handleReportDataChange(
                                          rIdx,
                                          cIdx,
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                );
                              }
                            })}
                            <td className="vm-action-col">
                              <button
                                type="button"
                                className="vm-btn-danger"
                                onClick={() => removeRow(rIdx)}
                              >
                                हटाएं
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="vm-form-actions">
                <button
                  type="button"
                  className="vm-btn vm-btn-cancel"
                  onClick={closeAddModal}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="vm-btn vm-btn-primary"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "सहेजा जा रहा है..."
                    : "रिपोर्ट सहेजें (Save Report)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GET Data Section */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header
              className="py-2"
              style={{ backgroundColor: "#0d9488", color: "white" }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="fw-bold">
                    सहेजी गई रिपोर्ट्स (Saved Reports)
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="light"
                    size="sm"
                    onClick={fetchReports}
                    disabled={isLoading}
                    className="fw-bold"
                  >
                    {isLoading ? "लोड हो रहा है..." : "रिफ्रेश करें"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrintAll}
                    disabled={!reports.length}
                    className="fw-bold"
                  >
                    प्रिंट करें
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" style={{ color: "#0d9488" }} />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  कोई रिपोर्ट उपलब्ध नहीं है।
                </div>
              ) : (
                <div className="table-responsive">
                  <Table
                    bordered
                    striped
                    hover
                    responsive
                    className="mb-0 table-sm"
                  >
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: "50px" }}>
                          क्र.
                        </th>
                        <th>केंद्र</th>
                        <th>माह</th>
                        <th>वित्तीय वर्ष</th>
                        <th>रिपोर्ट दिनांक</th>
                        {TABLE_HEADERS.map((header, idx) => (
                          <th key={idx}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) =>
                        report.report_data.map((row, rIdx) => (
                          <tr key={`${report.id}-${rIdx}`}>
                            <td className="text-center text-muted">
                              {rIdx + 1}
                            </td>
                            <td className="text-nowrap">
                              {report.center_name}
                            </td>
                            <td className="text-nowrap">{report.month}</td>
                            <td className="text-nowrap">
                              {report.financial_year}
                            </td>
                            <td className="text-nowrap">
                              {report.report_date}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        )),
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Preview Modal */}
      {showPreviewModal && previewReport && (
        <div className="vm-modal-overlay">
          <div className="vm-modal">
            <div className="vm-modal-header">
              <h2>रिपोर्ट प्रिव्यू - {previewReport.center_name}</h2>
              <button
                type="button"
                className="vm-modal-close"
                onClick={closePreviewModal}
              >
                ×
              </button>
            </div>
            <div className="vm-preview-content">
              <div className="vm-preview-header">
                <h3>वेतन मांग पत्र एवं उपस्थिति सूचना</h3>
                <p className="vm-preview-subject">{previewReport.subject}</p>
              </div>
              <div className="vm-preview-meta">
                <div className="vm-preview-meta-row">
                  <span>
                    <strong>केंद्र:</strong> {previewReport.center_name}
                  </span>
                  <span>
                    <strong>माह:</strong> {previewReport.month}
                  </span>
                </div>
                <div className="vm-preview-meta-row">
                  <span>
                    <strong>वित्तीय वर्ष:</strong>{" "}
                    {previewReport.financial_year}
                  </span>
                  <span>
                    <strong>पत्र संख्या:</strong> {previewReport.letter_number}
                  </span>
                </div>
                <div className="vm-preview-meta-row">
                  <span>
                    <strong>रिपोर्ट दिनांक:</strong> {previewReport.report_date}
                  </span>
                </div>
              </div>
              <div className="vm-preview-table-wrapper">
                <table className="vm-preview-table">
                  <colgroup>
                    <col style={{ width: "3%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "30%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {TABLE_HEADERS.map((header, idx) => (
                        <th key={idx}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewReport.report_data.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="vm-form-actions">
              <button
                type="button"
                className="vm-btn vm-btn-cancel"
                onClick={closePreviewModal}
              >
                बंद करें
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-primary"
                onClick={handlePrintPreview}
              >
                प्रिंट करें
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

export default VetanMang;
