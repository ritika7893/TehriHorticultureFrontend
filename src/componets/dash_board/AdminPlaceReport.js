import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import DashBoardHeader from "./DashBoardHeader";
import "../../assets/css/MainDashBoard.css";

const API_BASE = "https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api/";

const CATEGORY_CONFIG = {
  vegetables: {
    label: "सब्जी",
    url: "vegetable-monthly-report/",
    item: "vegetable",
    color: "#2e8b57",
    headerGroups: [
      { label: "क्र.सं.", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "सब्जी", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "केंद्र", colspan: 1, hasSub: false, subHeaders: [] },
      {
        label: "क्षेत्रफल (हेक्टेयर)",
        colspan: 3,
        hasSub: true,
        subHeaders: [
          "वर्तमान माह में बुवाई / रोपण का कुल क्षेत्रफल",
          "गत माह तक बुवाई / रोपण के अन्तर्गत क्षेत्रफल",
          "माह में कीट-व्याधि, सूखा, अतिवृष्टि आदि से क्षति",
        ],
      },
      {
        label: "उत्पादन (क्विंटल)",
        colspan: 2,
        hasSub: true,
        subHeaders: ["वर्तमान माह उत्पादन", "गत माह तक उत्पादन"],
      },
      { label: "अभ्युक्ति", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "माह", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "वित्तीय वर्ष", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "कार्यवाही", colspan: 1, hasSub: false, subHeaders: [] },
    ],
    inputFields: [
      "current_month_sown_area",
      "previous_month_total_sown_area",
      "total_damaged_area",
      "current_month_production",
      "previous_month_total_production",
    ],
    buildRow: (record, index, fmt) => [
      index + 1,
      record.vegetable || "",
      record.center_name || "",
      fmt(record.current_month_sown_area),
      fmt(record.previous_month_total_sown_area),
      fmt(record.total_damaged_area),
      fmt(record.current_month_production),
      fmt(record.previous_month_total_production),
      record.remarks || "",
      record.month || "",
      record.financial_year || "",
    ],
  },
  fruits: {
    label: "फल",
    url: "fruit-monthly-report/",
    item: "fruit",
    color: "#e38b2c",
    headerGroups: [
      { label: "क्र.सं.", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "फल", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "केंद्र", colspan: 1, hasSub: false, subHeaders: [] },
      {
        label: "क्षेत्रफल (हेक्टेयर)",
        colspan: 3,
        hasSub: true,
        subHeaders: [
          "वर्तमान माह में रोपण का कुल क्षेत्रफल",
          "गत माह तक रोपण के अन्तर्गत क्षेत्रफल",
          "माह में कीट-व्याधि, सूखा, अतिवृष्टि आदि से क्षति",
        ],
      },
      {
        label: "उत्पादन (क्विंटल)",
        colspan: 2,
        hasSub: true,
        subHeaders: ["वर्तमान माह उत्पादन", "गत माह तक उत्पादन"],
      },
      { label: "अभ्युक्ति", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "माह", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "वित्तीय वर्ष", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "कार्यवाही", colspan: 1, hasSub: false, subHeaders: [] },
    ],
    inputFields: [
      "current_month_planted_area",
      "previous_month_total_area",
      "damaged_area",
      "current_month_production",
      "previous_month_production",
    ],
    buildRow: (record, index, fmt) => [
      index + 1,
      record.fruit || "",
      record.center_name || "",
      fmt(record.current_month_planted_area),
      fmt(record.previous_month_total_area),
      fmt(record.damaged_area),
      fmt(record.current_month_production),
      fmt(record.previous_month_production),
      record.remarks || "",
      record.month || "",
      record.financial_year || "",
    ],
  },
  spices: {
    label: "मसाले",
    url: "spice-monthly-report/",
    item: "spice",
    color: "#9a5b35",
    headerGroups: [
      { label: "क्र.सं.", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "मसाले", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "केंद्र", colspan: 1, hasSub: false, subHeaders: [] },
      {
        label: "क्षेत्रफल (हेक्टेयर)",
        colspan: 3,
        hasSub: true,
        subHeaders: [
          "वर्तमान माह में बुवाई / रोपण का कुल क्षेत्रफल",
          "गत माह तक बुवाई / रोपण के अन्तर्गत क्षेत्रफल",
          "माह में कीट-व्याधि, सूखा, अतिवृष्टि आदि से क्षति",
        ],
      },
      {
        label: "उत्पादन (क्विंटल)",
        colspan: 2,
        hasSub: true,
        subHeaders: ["वर्तमान माह उत्पादन", "गत माह तक उत्पादन"],
      },
      { label: "अभ्युक्ति", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "माह", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "वित्तीय वर्ष", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "कार्यवाही", colspan: 1, hasSub: false, subHeaders: [] },
    ],
    inputFields: [
      "current_month_sown_area",
      "previous_month_sown_area",
      "damaged_area",
      "current_month_production",
      "previous_month_production",
    ],
    buildRow: (record, index, fmt) => [
      index + 1,
      record.spice || "",
      record.center_name || "",
      fmt(record.current_month_sown_area),
      fmt(record.previous_month_sown_area),
      fmt(record.damaged_area),
      fmt(record.current_month_production),
      fmt(record.previous_month_production),
      record.remarks || "",
      record.month || "",
      record.financial_year || "",
    ],
  },
  flowers: {
    label: "पुष्प",
    url: "flower-monthly-report/",
    item: "flower",
    color: "#a34d9b",
    headerGroups: [
      { label: "क्र.सं.", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "पुष्प", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "केंद्र", colspan: 1, hasSub: false, subHeaders: [] },
      {
        label: "क्षेत्रफल",
        colspan: 4,
        hasSub: true,
        subHeaders: [
          "पिछले वर्ष तक कुल आच्छादित क्षेत्रफल (3)",
          "वर्तमान माह बुवाई (4)",
          "गत माह तक बुवाई (5)",
          "क्षतिग्रस्त क्षेत्रफल (7)",
        ],
      },
      {
        label: "उत्पादन",
        colspan: 4,
        hasSub: true,
        subHeaders: [
          "वर्तमान स्पाइक (9)",
          "गत माह स्पाइक (10)",
          "वर्तमान लूज (12)",
          "गत माह लूज (13)",
        ],
      },
      { label: "टिप्पणी(15)", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "माह", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "वित्तीय वर्ष", colspan: 1, hasSub: false, subHeaders: [] },
      { label: "कार्यवाही", colspan: 1, hasSub: false, subHeaders: [] },
    ],
    inputFields: [
      "previous_year_total_covered_area",
      "current_month_sown_area",
      "previous_month_sown_area",
      "damaged_area",
      "current_month_spike_or_cut_flower_production",
      "previous_month_spike_or_cut_flower_production",
      "current_month_loose_flower_production",
      "previous_month_loose_flower_production",
    ],
    buildRow: (record, index, fmt) => [
      index + 1,
      record.flower || "",
      record.center_name || "",
      fmt(record.previous_year_total_covered_area),
      fmt(record.current_month_sown_area),
      fmt(record.previous_month_sown_area),
      fmt(record.damaged_area),
      fmt(record.current_month_spike_or_cut_flower_production),
      fmt(record.previous_month_spike_or_cut_flower_production),
      fmt(record.current_month_loose_flower_production),
      fmt(record.previous_month_loose_flower_production),
      record.remarks || "",
      record.month || "",
      record.financial_year || "",
    ],
  },
};

const number = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const fmt = (value) => number(value).toFixed(2);
const uniqueSorted = (records, key) =>
  [...new Set(records.map((row) => row[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );

const AdminCategoryReport = ({ category }) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.vegetables;
  const TOTAL_COLUMNS = config.headerGroups.reduce(
    (sum, g) => sum + g.colspan,
    0
  );

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [place, setPlace] = useState("");
  const [month, setMonth] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}${config.url}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object"
          ? [payload]
          : [];
      setRecords(rows);
      setLoading(false);
    } catch (error) {
      setErrors([`${config.label}: ${error.message || "Unable to load report"}`]);
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const places = useMemo(() => uniqueSorted(records, "center_name"), [records]);
  const months = useMemo(() => uniqueSorted(records, "month"), [records]);
  const years = useMemo(() => uniqueSorted(records, "financial_year"), [records]);
  const items = useMemo(() => uniqueSorted(records, config.item), [records, config.item]);

  const filtered = useMemo(() => {
    return records.filter(
      (row) =>
        (!place || row.center_name === place) &&
        (!month || row.month === month) &&
        (!financialYear || row.financial_year === financialYear) &&
        (!itemFilter || row[config.item] === itemFilter)
    );
  }, [records, place, month, financialYear, itemFilter, config.item]);

  useEffect(() => { setPage(1); }, [place, month, financialYear, itemFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const left = a.center_name ?? a[config.item] ?? "";
    const right = b.center_name ?? b[config.item] ?? "";
    const numeric = Number(left) - Number(right);
    const comparison =
      left !== "" &&
      right !== "" &&
      Number.isFinite(numeric) &&
      String(left).trim() !== "" &&
      String(right).trim() !== ""
        ? numeric
        : String(left).localeCompare(String(right), undefined, {
            numeric: true,
            sensitivity: "base",
          });
    return comparison;
  }), [filtered, config.item]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visibleRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setPlace("");
    setMonth("");
    setFinancialYear("");
    setItemFilter("");
    setPage(1);
  };

  const areaTotal = visibleRows.reduce(
    (total, row) =>
      total +
      config.inputFields
        .slice(0, category === "flowers" ? 4 : 3)
        .reduce((sub, field) => sub + number(row[field]), 0),
    0
  );
  const damagedTotal = visibleRows.reduce(
    (total, row) => total + number(row[config.inputFields[2]] || row.damaged_area),
    0
  );

  const exportRows = useMemo(() => {
    const rows = [];
    sorted.forEach((record, index) => {
      rows.push(config.buildRow(record, index, fmt));
    });
    return rows;
  }, [sorted, config, fmt]);

  const exportToExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`${config.label} प्रविष्टियां`, {
        views: [{ state: "frozen", ySplit: 2 }],
      });

      const colWidths = config.headerGroups.map(() => 16);
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

      const row1 = ws.getRow(1);
      row1.height = 32;
      let col = 1;
      config.headerGroups.forEach((g) => {
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

      const row2 = ws.getRow(2);
      row2.height = 28;
      let subCol = 1;
      config.headerGroups.forEach((g) => {
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

      exportRows.forEach((values, index) => {
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

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${config.label}_प्रविष्टियां_${new Date()
          .toISOString()
          .split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("exportToExcel error:", error);
      alert("एक्सेल फाइल बनाने में त्रुटि हुई।");
    }
  };

  const exportToPDF = () => {
    let wrapper;
    try {
      wrapper = document.createElement("div");
      wrapper.style.padding = "16px";
      wrapper.style.fontFamily =
        "'Noto Sans Devanagari','Mangal',Arial,sans-serif";
      wrapper.style.color = "#000000";
      wrapper.style.background = "#ffffff";

      const title = document.createElement("h3");
      title.textContent = `सेव की गई ${config.label} प्रविष्टियां`;
      title.style.textAlign = "center";
      title.style.margin = "0 0 6px 0";
      title.style.fontSize = "16px";
      title.style.color = "#2a4682";
      title.style.fontWeight = "700";
      wrapper.appendChild(title);

      const meta = document.createElement("div");
      meta.style.textAlign = "center";
      meta.style.marginBottom = "10px";
      meta.style.fontSize = "11px";
      meta.style.color = "#333";
      meta.innerHTML =
        `<strong>केंद्र:</strong> ${place || "सभी"} &nbsp;|&nbsp; ` +
        `<strong>वित्तीय वर्ष:</strong> ${financialYear || "सभी"} &nbsp;|&nbsp; ` +
        `<strong>माह:</strong> ${month || "सभी"} &nbsp;|&nbsp; ` +
        `<strong>${config.label}:</strong> ${itemFilter || "सभी"}`;
      wrapper.appendChild(meta);

      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.tableLayout = "fixed";
      table.style.fontSize = "9px";

      const baseWidth = 100 / TOTAL_COLUMNS;
      const colWidths = config.headerGroups.map((g) => `${g.colspan * baseWidth}%`);

      const thead = document.createElement("thead");

      const tr1 = document.createElement("tr");
      let colIdx = 0;
      config.headerGroups.forEach((g) => {
        const th = document.createElement("th");
        th.textContent = g.label;
        if (g.colspan === 1 && !g.hasSub) {
          th.rowSpan = 2;
          th.style.width = colWidths[colIdx];
        } else {
          th.colSpan = g.colspan;
          let groupWidth = 0;
          for (let k = 0; k < g.colspan; k += 1) {
            groupWidth += parseFloat(colWidths[colIdx + k]) || 0;
          }
          th.style.width = `${groupWidth}%`;
        }
        th.style.border = "1px solid #000";
        th.style.padding = "6px";
        th.style.background = "#2a4682";
        th.style.color = "#ffffff";
        th.style.textAlign = "center";
        th.style.fontWeight = "700";
        th.style.fontSize = "0.7rem";
        th.style.whiteSpace = "normal";
        th.style.wordBreak = "keep-all";
        tr1.appendChild(th);
        colIdx += g.colspan;
      });
      thead.appendChild(tr1);

      const tr2 = document.createElement("tr");
      let subColIdx = 0;
      config.headerGroups.forEach((g) => {
        if (g.hasSub) {
          g.subHeaders.forEach((s) => {
            const th = document.createElement("th");
            th.textContent = s;
            th.style.width = colWidths[subColIdx];
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
            subColIdx += 1;
          });
        } else {
          subColIdx += g.colspan;
        }
      });
      thead.appendChild(tr2);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      exportRows.forEach((values, index) => {
        const row = document.createElement("tr");
        if (index % 2 === 1) row.style.background = "#f3f6fc";
        values.forEach((text, ci) => {
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

      if (!exportRows.length) {
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

      document.body.appendChild(wrapper);

      const opt = {
        margin: 5,
        filename: `${config.label}_प्रविष्टियां_${new Date()
          .toISOString()
          .split("T")[0]}.pdf`,
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

  const itemLabel =
    category === "vegetables"
      ? "सब्जी के नाम से छांटें"
      : category === "fruits"
        ? "फल के नाम से छांटें"
        : category === "spices"
          ? "मसाले के नाम से छांटें"
          : "पुष्प के नाम से छांटें";

  const itemPlaceholder =
    category === "vegetables"
      ? "सभी सब्जियां"
      : category === "fruits"
        ? "सभी फल"
        : category === "spices"
          ? "सभी मसाले"
          : "सभी पुष्प";

  return (
    <Container fluid className="px-3" style={{ paddingTop: "60px" }}>
      <DashBoardHeader />
      <div className="mb-3">
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
              सेव की गई {config.label} प्रविष्टियां
            </h4>
            <small>केंद्र: {place || "सभी केंद्र"}</small>
          </Card.Header>
        </Card>
      </div>

      {errors.map((error) => (
        <Alert key={error} variant="warning" dismissible>
          {error}
        </Alert>
      ))}

      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <strong>सेव की गई {config.label} प्रविष्टियां</strong>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Button
              variant="outline-success"
              size="sm"
              disabled={!sorted.length}
              onClick={exportToExcel}
            >
              <FaFileExcel /> Excel
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              disabled={!sorted.length}
              onClick={exportToPDF}
            >
              <FaFilePdf /> PDF
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="row g-3 mb-3">
            <Form.Group className="col-12 col-md-3">
              <Form.Label>केंद्र से छांटें</Form.Label>
              <Form.Select
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              >
                <option value="">सभी केंद्र</option>
                {places.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-3">
              <Form.Label>वित्तीय वर्ष से छांटें</Form.Label>
              <Form.Select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
              >
                <option value="">सभी वित्तीय वर्ष</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-3">
              <Form.Label>माह से छांटें</Form.Label>
              <Form.Select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">सभी माह</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-12 col-md-3">
              <Form.Label>{itemLabel}</Form.Label>
              <Form.Select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)}>
                <option value="">सभी {itemPlaceholder}</option>
                {items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          <div className="d-flex justify-content-end mb-2">
            <Button variant="light" size="sm" onClick={resetFilters}>
              रीसेट फिल्टर
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            <div className="table-responsive">
              <Table
                bordered
                hover
                size="sm"
                className="align-middle"
                style={{ tableLayout: "fixed", width: "100%" }}
              >
                <thead className="table-light">
                  <tr>
                    <th
                      rowSpan={2}
                      className="align-middle text-center"
                      style={{ width: "4%" }}
                    >
                      क्र.सं.
                    </th>
                    <th
                      rowSpan={2}
                      className="align-middle text-center"
                      style={{ width: "12%" }}
                    >
                      {category === "vegetables" ? "सब्जी" : category === "fruits" ? "फल" : category === "spices" ? "मसाले" : "पुष्प"}
                    </th>
                    <th
                      rowSpan={2}
                      className="align-middle text-center"
                      style={{ width: "14%" }}
                    >
                      केंद्र
                    </th>
                    {category === "flowers" ? (
                      <>
                        <th
                          colSpan={4}
                          className="text-center"
                          style={{
                            background: "#2a4682",
                            color: "#fff",
                            width: "40%",
                          }}
                        >
                          क्षेत्रफल
                        </th>
                        <th
                          colSpan={4}
                          className="text-center"
                          style={{
                            background: "#2a4682",
                            color: "#fff",
                            width: "40%",
                          }}
                        >
                          उत्पादन
                        </th>
                      </>
                    ) : (
                      <>
                        <th
                          colSpan={3}
                          className="text-center"
                          style={{
                            background: "#2a4682",
                            color: "#fff",
                            width: "30%",
                          }}
                        >
                          क्षेत्रफल (हेक्टेयर)
                        </th>
                        <th
                          colSpan={2}
                          className="text-center"
                          style={{
                            background: "#2a4682",
                            color: "#fff",
                            width: "20%",
                          }}
                        >
                          उत्पादन (क्विंटल)
                        </th>
                      </>
                    )}
                    <th rowSpan={2} className="align-middle text-center" style={{ width: "12%" }}>
                      अभ्युक्ति / टिप्पणी
                    </th>
                    <th rowSpan={2} className="align-middle text-center" style={{ width: "7%" }}>
                      माह
                    </th>
                    <th rowSpan={2} className="align-middle text-center" style={{ width: "8%" }}>
                      वित्तीय वर्ष
                    </th>
                  </tr>
                  <tr style={{ background: "#3a5ba0", color: "#fff" }}>
                    {category === "flowers" ? (
                      <>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          पिछले वर्ष तक कुल आच्छादित क्षेत्रफल (3)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          वर्तमान माह बुवाई (4)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          गत माह तक बुवाई (5)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          क्षतिग्रस्त क्षेत्रफल (7)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          वर्तमान स्पाइक (9)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          गत माह स्पाइक (10)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          वर्तमान लूज (12)
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          गत माह लूज (13)
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          वर्तमान माह में बुवाई / रोपण का कुल क्षेत्रफल
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          गत माह तक बुवाई / रोपण के अन्तर्गत क्षेत्रफल
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          माह में कीट-व्याधि, सूखा, अतिवृष्टि आदि से क्षति
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          वर्तमान माह उत्पादन
                        </th>
                        <th className="text-center" style={{ color: "#fff", fontSize: "0.8rem" }}>
                          गत माह तक उत्पादन
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((record, index) => (
                    <tr key={record.id ?? index}>
                      <td>{index + 1}</td>
                      <td>{record[config.item] || ""}</td>
                      <td>{record.center_name || "—"}</td>
                      {category === "flowers" ? (
                        <>
                          <td>{fmt(record.previous_year_total_covered_area)}</td>
                          <td>{fmt(record.current_month_sown_area)}</td>
                          <td>{fmt(record.previous_month_sown_area)}</td>
                          <td>{fmt(record.damaged_area)}</td>
                          <td>{fmt(record.current_month_spike_or_cut_flower_production)}</td>
                          <td>{fmt(record.previous_month_spike_or_cut_flower_production)}</td>
                          <td>{fmt(record.current_month_loose_flower_production)}</td>
                          <td>{fmt(record.previous_month_loose_flower_production)}</td>
                        </>
                      ) : (
                        <>
                          <td>{fmt(record.current_month_sown_area || record.current_month_planted_area)}</td>
                          <td>{fmt(record.previous_month_total_sown_area || record.previous_month_total_area || record.previous_month_sown_area)}</td>
                          <td>{fmt(record.total_damaged_area || record.damaged_area)}</td>
                          <td>{fmt(record.current_month_production)}</td>
                          <td>{fmt(record.previous_month_total_production || record.previous_month_production)}</td>
                        </>
                      )}
                      <td>{record.remarks || "—"}</td>
                      <td>{record.month || "—"}</td>
                      <td>{record.financial_year || "—"}</td>
                    </tr>
                  ))}
                  {!visibleRows.length && (
                    <tr>
                      <td
                        colSpan={
                          category === "flowers" ? 15 : 12
                        }
                        className="text-center text-muted py-4"
                      >
                        इस चयन के लिए कोई प्रविष्टि उपलब्ध नहीं है।
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <div className="horticulture-pagination mt-3">
                <span>
                  Showing {(page - 1) * pageSize + 1} -{" "}
                  {Math.min(page * pageSize, sorted.length)} of {sorted.length}
                </span>
                <div>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span>Page {page} of {pageCount}</span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={page >= pageCount}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

const AdminVegetableReport = () => <AdminCategoryReport category="vegetables" />;
const AdminFruitReport = () => <AdminCategoryReport category="fruits" />;
const AdminSpicesReport = () => <AdminCategoryReport category="spices" />;
const AdminFlowerReport = () => <AdminCategoryReport category="flowers" />;

export { AdminVegetableReport, AdminFruitReport, AdminSpicesReport, AdminFlowerReport };
export default AdminCategoryReport;
