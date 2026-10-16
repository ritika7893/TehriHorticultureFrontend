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
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import DemandNavigation from "../DemandNavigation";
import { useCenter } from "../all_login/CenterContext";
import "./FruitReport.css";

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
  damaged_area: "कीट-व्याधि, पातन, सूखा, बाढ़, निर्माण आदि कारणों से क्षतिग्रस्त क्षेत्रफल",
  current_month_production: "वर्तमान माह में उत्पादन",
  previous_month_production: "गत माह तक उत्पादन",
  remarks: "टिप्पणी",
};

// ───────── HEADER CONFIG (single source of truth — ONLY ONCE) ─────────
// colspan=1 + hasSub=false  → rowSpan=2 (spans both header rows)
// colspan>1 + hasSub=true   → colSpan=N in row 1, sub-headers in row 2
const HEADER_GROUPS = [
  { label: "क्र.सं.", colspan: 1, hasSub: false, subHeaders: [] },
  { label: "फल", colspan: 1, hasSub: false, subHeaders: [] },
  {
    label: "क्षेत्रफल (हेक्टेयर)",
    colspan: 3,
    hasSub: true,
    subHeaders: [
      "गत माह तक का कुल क्षेत्रफल (3)",
      "वर्तमान माह में नर्सरी क्षेत्रफल (4)",
      "क्षतिग्रस्त क्षेत्रफल (6)",
    ],
  },
  {
    label: "उत्पादन (क्विंटल)",
    colspan: 2,
    hasSub: true,
    subHeaders: ["वर्तमान माह उत्पादन (9)", "गत माह तक उत्पादन (10)"],
  },
  { label: "अभ्युक्ति(12)", colspan: 1, hasSub: false, subHeaders: [] },
  { label: "माह", colspan: 1, hasSub: false, subHeaders: [] },
  { label: "वित्तीय वर्ष", colspan: 1, hasSub: false, subHeaders: [] },
  { label: "प्रभारी का नाम", colspan: 1, hasSub: false, subHeaders: [] },
];

const TOTAL_COLUMNS = HEADER_GROUPS.reduce((sum, g) => sum + g.colspan, 0); // = 11

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

const SavedFruitEntries = () => {
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
  const [filterFruit, setFilterFruit] = useState("");
  const [entryMonth, setEntryMonth] = useState("");
  const [entryFinancialYear, setEntryFinancialYear] = useState(
    getCurrentFinancialYear()
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
          getErrorMessage(data, "फलों की सूची प्राप्त नहीं हो सकी।")
        );
      }
      const fruitComponents = getItems(data)
        .filter(
          (item) =>
            item.investment_name === "फल" ||
            item.investment_name === "फल-नींबू प्रजाति"
        )
        .sort((first, second) => Number(first.id) - Number(second.id));
      setComponents(fruitComponents);
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

  useEffect(() => {
    setEntryMonth(filterMonth);
  }, [filterMonth]);

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

  const uniqueFinancialYears = useMemo(
    () =>
      [...new Set(records.map((r) => r.financial_year).filter(Boolean))].sort(),
    [records]
  );
  const uniqueMonths = useMemo(
    () =>
      [...new Set(records.map((r) => r.month).filter(Boolean))].sort(
        (a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)
      ),
    [records]
  );
  const uniqueFruits = useMemo(
    () =>
      [...new Set(records.map((r) => r.fruit).filter(Boolean))].sort(),
    [records]
  );

  const entryYearFromMonth = (financialYear, month) => {
    if (!financialYear || !month) return "";
    const [startYear, endYear] = financialYear.split("-").map(Number);
    const monthIndex = MONTHS.indexOf(month);
    return monthIndex >= 0 && monthIndex < 3 ? endYear : startYear;
  };

  const financialYearShort = entryFinancialYear
    ? `${entryFinancialYear.slice(0, 4)}-${entryFinancialYear.slice(-2)}`
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
        center_name: centerName,
        fruit: record.fruit,
        ...validateNumericFields(editingRecord),
        prabhari_ka_naam: String(editingRecord.prabhari_ka_naam || "").trim(),
        remarks: String(editingRecord.remarks || "").trim(),
        financial_year: record.financial_year,
        month: record.month,
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
      console.error("updateFruitReport:", error);
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
        throw new Error(
          getErrorMessage(data, "प्रविष्टियां हटाई नहीं जा सकीं।")
        );
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
    } finally {
      setSubmitting(false);
    }
  };

  // Build a flat data row (same for all exports)
  const buildRow = (record, index) => [
    index + 1,
    record.fruit || "",
    formatNumber(record.previous_month_total_area),
    formatNumber(record.current_month_planted_area),
    formatNumber(record.damaged_area),
    formatNumber(record.current_month_production),
    formatNumber(record.previous_month_production),
    record.remarks || "",
    record.month || "",
    record.financial_year || "",
    record.prabhari_ka_naam || "",
  ];

  // ═════════════════════════════════════════════════════
  //  EXCEL EXPORT — correct colspan + rowSpan via mergeCells
  // ═════════════════════════════════════════════════════
  const exportToExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("फल प्रविष्टियां", {
        views: [{ state: "frozen", ySplit: 2 }],
      });

      const colWidths = [8, 20, 18, 18, 18, 18, 18, 22, 12, 14, 20];
      ws.columns = colWidths.map((w) => ({ width: w }));

      const applyHeaderStyle = (cell, { fontSize = 11 }) => {
        cell.font = { bold: true, color: { argb: "FF000000" }, size: fontSize };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      };

      // ---- Row 1: Group headers ----
      const row1 = ws.getRow(1);
      row1.height = 32;
      let col = 1;
      HEADER_GROUPS.forEach((g) => {
        const cell = row1.getCell(col);
        cell.value = g.label;
        applyHeaderStyle(cell, { fontSize: 9 });

        if (g.colspan === 1 && !g.hasSub) {
          ws.mergeCells(1, col, 2, col);
        } else if (g.colspan > 1) {
          ws.mergeCells(1, col, 1, col + g.colspan - 1);
        }
        col += g.colspan;
      });
      row1.commit();

      // ---- Row 2: Sub-headers (only for grouped columns) ----
      const row2 = ws.getRow(2);
      row2.height = 28;
      let subCol = 1;
      HEADER_GROUPS.forEach((g) => {
        if (g.hasSub) {
          g.subHeaders.forEach((s) => {
            const cell = row2.getCell(subCol);
            cell.value = s;
            applyHeaderStyle(cell, { fontSize: 8 });
            subCol++;
          });
        } else {
          subCol += g.colspan;
        }
      });
      row2.commit();

      // ---- Data rows ----
      filteredRecords.forEach((record, index) => {
        const values = buildRow(record, index);
        const r = ws.getRow(index + 3);
        r.height = 22;
        const isEven = index % 2 === 1;
        values.forEach((val, c) => {
          const cell = r.getCell(c + 1);
          cell.value = val;
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          if (isEven) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF3F6FC" },
            };
          }
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });
        r.commit();
      });

      // ---- Footer: प्रभारी का नाम ----
      const footerRowNum = filteredRecords.length + 3;
      const fRow = ws.getRow(footerRowNum);
      fRow.height = 26;
      const fCell = fRow.getCell(1);
      fCell.value = `प्रभारी का नाम: ${filteredRecords[0]?.prabhari_ka_naam || "—"}`;
      fCell.font = { bold: true, color: { argb: "FF2A4682" }, size: 11 };
      fCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F6FC" },
      };
      fCell.alignment = { horizontal: "left", vertical: "middle" };
      fCell.border = {
        top: { style: "thin", color: { argb: "FFC9D6EF" } },
        bottom: { style: "thin", color: { argb: "FFC9D6EF" } },
        left: { style: "thin", color: { argb: "FFC9D6EF" } },
        right: { style: "thin", color: { argb: "FFC9D6EF" } },
      };
      ws.mergeCells(footerRowNum, 1, footerRowNum, TOTAL_COLUMNS);
      fRow.commit();

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `फल_प्रविष्टियां_${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("exportToExcel error:", error);
      alert("एक्सेल फाइल बनाने में त्रुटि हुई।");
    }
  };

  // ═════════════════════════════════════════════════════
  //  PDF EXPORT — correct rowSpan + colSpan in HTML <thead>
  // ═════════════════════════════════════════════════════
  const exportToPDF = () => {
    let wrapper;
    try {
      wrapper = document.createElement("div");
      wrapper.style.padding = "16px";
      wrapper.style.fontFamily =
        "'Noto Sans Devanagari','Mangal',Arial,sans-serif";
      wrapper.style.color = "#000000";
      wrapper.style.background = "#ffffff";

      // Title
      const title = document.createElement("h3");
      title.textContent = "सेव की गई फल प्रविष्टियां";
      title.style.textAlign = "center";
      title.style.margin = "0 0 6px 0";
      title.style.fontSize = "16px";
      title.style.color = "#2a4682";
      title.style.fontWeight = "700";
      wrapper.appendChild(title);

      // Meta info
      const meta = document.createElement("div");
      meta.style.textAlign = "center";
      meta.style.marginBottom = "10px";
      meta.style.fontSize = "11px";
      meta.style.color = "#333";
      meta.innerHTML =
        `<strong>केंद्र:</strong> ${centerName || "—"} &nbsp;|&nbsp; ` +
        `<strong>वित्तीय वर्ष:</strong> ${filterFinancialYear || "सभी"} &nbsp;|&nbsp; ` +
        `<strong>माह:</strong> ${filterMonth || "सभी"} &nbsp;|&nbsp; ` +
        `<strong>फल:</strong> ${filterFruit || "सभी"}`;
      wrapper.appendChild(meta);

      // Table
      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.tableLayout = "fixed";
      table.style.fontSize = "9px";

      const colWidths = [
        "4%", "9%", "10%", "10%", "9%", "10%", "10%", "13%", "7%", "8%", "10%",
      ];

      // thead: TWO rows with rowSpan/colSpan
      const thead = document.createElement("thead");

      // Row 1: group headers
      const tr1 = document.createElement("tr");
      let colIdx = 0;
      HEADER_GROUPS.forEach((g) => {
        const th = document.createElement("th");
        th.textContent = g.label;
        if (g.colspan === 1 && !g.hasSub) {
          th.rowSpan = 2;
        } else {
          th.colSpan = g.colspan;
        }
        th.style.border = "1px solid #000";
        th.style.padding = "6px";
        th.style.background = "#2a4682";
        th.style.color = "#ffffff";
        th.style.textAlign = "center";
        th.style.fontWeight = "700";
        th.style.fontSize = "0.7rem";
        th.style.whiteSpace = "normal";
        th.style.wordBreak = "break-word";
        th.style.width = colWidths[colIdx];
        tr1.appendChild(th);
        colIdx += g.colspan;
      });
      thead.appendChild(tr1);

      // Row 2: sub-headers ONLY for grouped columns
      const tr2 = document.createElement("tr");
      HEADER_GROUPS.forEach((g) => {
        if (g.hasSub) {
          g.subHeaders.forEach((s) => {
            const th = document.createElement("th");
            th.textContent = s;
            th.style.border = "1px solid #000";
            th.style.padding = "5px";
            th.style.background = "#3a5ba0";
            th.style.color = "#ffffff";
            th.style.textAlign = "center";
            th.style.fontWeight = "700";
            th.style.fontSize = "0.65rem";
            th.style.whiteSpace = "normal";
            th.style.wordBreak = "break-word";
            tr2.appendChild(th);
          });
        }
      });
      thead.appendChild(tr2);
      table.appendChild(thead);

      // tbody
      const tbody = document.createElement("tbody");
      filteredRecords.forEach((record, index) => {
        const row = document.createElement("tr");
        if (index % 2 === 1) row.style.background = "#f3f6fc";

        const cells = buildRow(record, index);
        cells.forEach((text, ci) => {
          const td = document.createElement("td");
          td.textContent = text;
          td.style.border = "1px solid #000";
          td.style.padding = "4px";
          td.style.textAlign = "center";
          td.style.whiteSpace = "normal";
          td.style.wordBreak = "break-word";
          td.style.width = colWidths[ci];
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });

      if (!filteredRecords.length) {
        const emptyRow = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = TOTAL_COLUMNS;
        td.textContent = "इस चयन के लिए कोई प्रविष्टि उपलब्ध नहीं है।";
        td.style.textAlign = "center";
        td.style.padding = "14px";
        td.style.border = "1px solid #000";
        emptyRow.appendChild(td);
        tbody.appendChild(emptyRow);
      }
      table.appendChild(tbody);
      wrapper.appendChild(table);

      // Footer
      const footer = document.createElement("div");
      footer.style.marginTop = "10px";
      footer.style.padding = "10px 12px";
      footer.style.border = "1px solid #c9d6ef";
      footer.style.borderRadius = "6px";
      footer.style.background = "#f3f6fc";
      footer.style.fontSize = "11px";
      footer.style.color = "#2a4682";
      footer.innerHTML = `<strong>प्रभारी का नाम:</strong> ${
        filteredRecords[0]?.prabhari_ka_naam || "—"
      }`;
      wrapper.appendChild(footer);

      document.body.appendChild(wrapper);

      const opt = {
        margin: 5,
        filename: `फल_प्रविष्टियां_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: wrapper.scrollWidth,
          windowHeight: wrapper.scrollHeight,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      html2pdf()
        .set(opt)
        .from(wrapper)
        .save()
        .then(() => {
          if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        })
        .catch((err) => {
          console.error(err);
          if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        });
    } catch (error) {
      console.error("exportToPDF error:", error);
      alert("PDF बनाने में त्रुटि हुई।");
      if (wrapper && document.body.contains(wrapper))
        document.body.removeChild(wrapper);
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
        onChange={(e) => updateEditingRecord(field, e.target.value)}
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
      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="report-clean-card-header">
          <h4
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              margin: 0,
              color: "#2a4682",
            }}
          >
            सेव की गई फल प्रविष्टियां
          </h4>
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


      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <strong>सेव की गई फल प्रविष्टियां</strong>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Button
              variant="outline-success"
              size="sm"
              disabled={!filteredRecords.length}
              onClick={exportToExcel}
            >
              <FaFileExcel /> Excel
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              disabled={!filteredRecords.length}
              onClick={exportToPDF}
            >
              <FaFilePdf /> PDF
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              disabled={!selectedIds.length || submitting}
              onClick={handleDeleteSelected}
              style={{ color: "white" }}
            >
              चयनित हटाएं ({selectedIds.length})
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="row g-3 mb-3">
            <Form.Group className="col-12 col-md-4">
              <Form.Label>वित्तीय वर्ष से छांटें</Form.Label>
              <Form.Select
                value={filterFinancialYear}
                onChange={(e) => {
                  setFilterFinancialYear(e.target.value);
                  setEntryFinancialYear(e.target.value);
                }}
              >
                <option value="">सभी वित्तीय वर्ष</option>
                {uniqueFinancialYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>माह से छांटें</Form.Label>
              <Form.Select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setEntryMonth(e.target.value);
                }}
              >
                <option value="">सभी माह</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-4">
              <Form.Label>फल के नाम से छांटें</Form.Label>
              <Form.Select
                value={filterFruit}
                onChange={(e) => setFilterFruit(e.target.value)}
              >
                <option value="">सभी फल</option>
                {uniqueFruits.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          {filteredRecords.length > 0 && (
            <div className="mb-3 p-3 border rounded bg-light">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <div>
                  <strong>वर्ष:</strong> {financialYearShort}
                </div>
                <div>
                  <strong>माह:</strong>{" "}
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
                  {/* Row 1: Group headers with rowSpan/colSpan */}
                  <tr>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "10px" }}>
                      <Form.Check
                        aria-label="दिख रही सभी प्रविष्टियां चुनें"
                        checked={
                          filteredRecords.length > 0 &&
                          filteredRecords.every((r) =>
                            selectedIds.includes(r.id)
                          )
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "0.8rem" }}>क्र.सं.</th>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "0.8rem" }}>फल</th>
                    <th
                      colSpan={3}
                      className="text-center"
                      style={{ background: "#2a4682", color: "#fff", fontSize: "0.8rem" }}
                    >
                      क्षेत्रफल (हेक्टेयर)
                    </th>
                    <th
                      colSpan={2}
                      className="text-center"
                      style={{ background: "#2a4682", color: "#fff", fontSize: "0.8rem" }}
                    >
                      उत्पादन (क्विंटल)
                    </th>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "0.8rem" }}>अभ्युक्ति
 (12)</th>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "0.8rem" }}>माह</th>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "0.8rem" }}>वित्तीय वर्ष</th>
                    <th rowSpan={2} className="align-middle text-center" style={{ fontSize: "0.8rem" }}>प्रभारी का नाम</th>
                  </tr>
                  {/* Row 2: Sub-headers for grouped columns only */}
                  <tr style={{ background: "#3a5ba0", color: "#fff" }}>
                    <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>गत माह तक का कुल क्षेत्रफल (3)</th>
                    <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>वर्तमान माह में नर्सरी क्षेत्रफल (4)</th>
                    <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>वर्तमान माह में कीट-व्याधि, इल्मी, सूखा, बाढ़, भूस्खलन आदि कारणों से कुल क्षेत्रफल में क्षति (कॉलम संख्या-5 के सापेक्ष)
 (6)</th>
                    <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>वर्तमान माह उत्पादन (9)</th>
                    <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>गत माह तक उत्पादन (10)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr key={record.id}>
                      <td>
                        <Form.Check
                          aria-label={`${record.fruit} प्रविष्टि चुनें`}
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelected(record.id)}
                        />
                      </td>
                      <td>{index + 1}</td>
                      <td>{record.fruit}</td>
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
                            onChange={(e) =>
                              updateEditingRecord("remarks", e.target.value)
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
                  ))}
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

          {filteredRecords.length > 0 && (
            <div className="mt-3 p-3 border rounded bg-light">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <strong style={{ color: "#2a4682", minWidth: "120px" }}>
                  प्रभारी का नाम:
                </strong>
                <span
                  className="d-flex align-items-center gap-1"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {filteredRecords[0]?.prabhari_ka_naam || "—"}
                </span>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SavedFruitEntries;