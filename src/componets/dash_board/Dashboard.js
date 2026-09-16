import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Container, Spinner, Alert, Row, Col, Card, Form, Button, Modal, Dropdown, ButtonGroup, Accordion, Collapse } from "react-bootstrap";
import Select from "react-select";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import "../../assets/css/dashboard.css";

/*
 * Summary tab table overflow fix:
 * Keep the complete last column visible. The wrapper scrolls horizontally
 * instead of clipping the right edge of the table.
 */
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";
import Footer from "../footer/Footer";
import { FaClipboardList, FaCalendarAlt, FaFilter, FaChartBar, FaChartPie, FaFilePdf, FaFileExcel, FaDownload, FaEye, FaTable, FaInfoCircle, FaShareAlt, FaWhatsapp, FaLinkedin, FaEnvelope, FaCopy } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

// Hindi translations
const translations = {
  home: "MIS रिपोर्ट ",
  welcomeMessage: "DHO कोटद्वार उद्यान विभाग डिजिटल प्लेटफॉर्म में आपका स्वागत है",
  selectScheme: "क्रय योजना चुनें",
  selectInvestment: "उप-मद चुनें",
  allSchemes: "सभी क्रय योजनाएं",
  allInvestments: "सभी उप-मद",
  allocatedQuantity: "भौतिक पूर्ति ",
  farmerShareAmount: "कृषक अंश (रु0)",
  subsidyAmount: "अनुदान राशि (रु0)",
  totalAmount: "कुल राशि (रु0)",
  farmerSellingRate: "कृषक विक्रय दर (प्रति इकाई)",
  farmerSubsidyRate: "कृषक अनुदान दर (प्रति इकाई)",
  anudanName: "अनुदान वहन योजना",
  remark: "रिमार्क",
  billDate: "पंजीकरण तिथि",
  loading: "लोड हो रहा है...",
  networkError: "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।",
  serverError: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  dataError: "डेटा प्रोसेस करने में त्रुटि।",
  retry: "पुनः प्रयास करें",
  overviewTitle: "समग्र डेटा अवलोकन",
  totalRecords: "कुल रिकॉर्ड",
  selectSchemeFirst: "पहले क्रय योजना चुनें",
  selectPlaceholder: "चुनें...",
  noOptions: "कोई विकल्प उपलब्ध नहीं",
  startDate: "प्रारंभ तिथि",
  endDate: "समाप्ति तिथि",
  applyFilter: "फ़िल्टर लागू करें",
  clearFilter: "फ़िल्टर हटाएं",
  dateFilter: "तिथि के अनुसार फ़िल्टर",
  dateRangeSelected: "चयनित तिथि सीमा",
  graphsByScheme: "योजना के अनुसार ग्राफ़",
  graphsByInvestment: "उप-मद के अनुसार ग्राफ़",
  combinedGraph: "संयुक्त ग्राफ़",
  amountComparison: "राशि तुलना",
  schemeWiseDistribution: "क्रय योजना-वार वितरण",
  investmentWiseDistribution: "उप-मद-वार वितरण"
};

// Custom styles for react-select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#194e8b' : '#e0e0e0',
    borderWidth: '1px',
    borderRadius: '6px',
    padding: '2px',
    minHeight: '36px',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(25, 78, 139, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#194e8b'
    }
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 6px'
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#194e8b',
    borderRadius: '3px',
    margin: '2px'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#ffffff',
    fontSize: '0.75rem',
    padding: '1px 4px'
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#ffffff',
    padding: '0 2px',
    '&:hover': {
      backgroundColor: '#0d3a6b',
      color: '#ffffff'
    }
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#6c757d',
    fontSize: '0.8rem'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#194e8b' : state.isFocused ? '#e8f0f8' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#333333',
    fontSize: '0.8rem',
    padding: '8px 12px',
    '&:active': {
      backgroundColor: '#194e8b'
    }
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999
  })
};

// ============================================================================
// Shared dashboard filter UI
// Same checkbox/multi-select behavior used by "विस्तृत रिपोर्ट".
// Empty selection means ALL; explicit values mean only those values.
// ============================================================================
const DashboardReportFilter = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  // ---- Selection state logic (unchanged) ----
  const rawSelected = Array.isArray(value) ? value : [];
  const noneSelected = rawSelected.includes("__NONE__");
  const selected = rawSelected.filter(v => v !== "__NONE__");

  const allSelected =
    !noneSelected &&
    (selected.length === 0 || selected.length === options.length);

  const selectedCount = noneSelected
    ? 0
    : allSelected
      ? options.length
      : selected.length;

  const toggleValue = (option) => {
    if (noneSelected) { onChange([option]); return; }
    if (allSelected) { onChange([option]); return; }
    if (selected.includes(option)) {
      const next = selected.filter(v => v !== option);
      onChange(next.length === 0 ? ["__NONE__"] : next);
      return;
    }
    const next = [...selected, option];
    onChange(next.length === options.length ? [] : next);
  };

  const selectAll = () => onChange([]);
  const selectNone = () => onChange(["__NONE__"]);

  // ---- Compute menu position relative to button ----
  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 260), // never narrower than 260px
    });
  };

  // Recompute on open
  useEffect(() => {
    if (open) {
      updateMenuPosition();
    }
  }, [open]);

  // Track scroll / resize while open so the menu stays glued to the button
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => updateMenuPosition();

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  return (
    <div
      className="dashboard-report-filter-wrap"
      style={{ position: 'relative' }}
    >
      <label className="filter-label-sm">{label}</label>

      <button
        ref={buttonRef}
        type="button"
        className={`dashboard-report-filter-button ${
          noneSelected || !allSelected ? "filtered" : ""
        }`}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="dashboard-report-filter-button-text">
          {noneSelected
            ? "कोई नहीं"
            : allSelected
              ? "चुनें..."
              : `${selected.length} चयनित`}
        </span>

        <span className="dashboard-report-filter-count">
          {selectedCount}/{options.length}
        </span>

        <span className="dashboard-report-filter-arrow">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="dashboard-report-filter-menu dashboard-report-filter-menu-portal"
          style={{
            position: 'absolute',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            width: `${menuPos.width}px`,
            zIndex: 99999,
            maxHeight: '320px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
            padding: '8px',
          }}
        >
          <div
            className="dashboard-report-filter-actions"
            style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '8px',
              flexWrap: 'wrap',
              borderBottom: '1px solid #f0f0f0',
              paddingBottom: '8px',
            }}
          >
            <button
              type="button"
              onClick={selectAll}
              style={{
                flex: 1,
                padding: '5px 8px',
                border: '1px solid #194e8b',
                background: '#194e8b',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              सभी चुनें
            </button>
            <button
              type="button"
              onClick={selectNone}
              style={{
                flex: 1,
                padding: '5px 8px',
                border: '1px solid #c8372d',
                background: '#fff',
                color: '#c8372d',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              कोई नहीं
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: '5px 10px',
                border: '1px solid #ccc',
                background: '#f8f9fa',
                color: '#333',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              बंद करें
            </button>
          </div>

          <div className="dashboard-report-filter-list">
            {options.length === 0 ? (
              <div
                className="dashboard-report-filter-empty"
                style={{ padding: '10px', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}
              >
                कोई विकल्प उपलब्ध नहीं
              </div>
            ) : (
              options.map(option => (
                <label
                  key={option}
                  className="dashboard-report-filter-option"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      !noneSelected &&
                      (allSelected || selected.includes(option))
                    }
                    onChange={() => toggleValue(option)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1 }}>{option}</span>
                </label>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
// Top-level: label map for all views
const rashiColumnLabelExcel = {
  farmerShare: 'कृषक अंश (रु0)',
  subsidy: 'अनुदान राशि (रु0)',
  total: 'कुल राशि (रु0)',
  farmerSellingRate: 'कृषक विक्रय दर (प्रति इकाई)',
  farmerSubsidyRate: 'कृषक अनुदान दर (प्रति इकाई)',
  anudanName: 'अनुदान वहन योजना',
  remark: 'रिमार्क',
  billDate: 'पंजीकरण तिथि'
};

// Helper function to calculate financial year dates (April 1 to March 31)
const getFinancialYearDates = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (0 = January, 3 = April)

  let startYear, endYear;
  
  // If current month is April (3) or later, financial year starts this year
  // Otherwise, it started last year
  if (currentMonth >= 3) { // April onwards
    startYear = currentYear;
    endYear = currentYear + 1;
  } else { // January to March
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  // Format dates as YYYY-MM-DD
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;

  return { startDate, endDate };
};

const dashboardFieldOrder = [
  "center_name",
  "scheme_name",
  "source_of_receipt",
  "investment_name",
  "sub_investment_name",
  "unit",
  "allocated_quantity",
  "rate",
  "farmer_selling_rate",
  "farmer_subsidy_rate",
  "amount_of_farmer_share",
  "amount_of_subsidy",
  "total_amount",
  "anudan_name",
  "remark",
  "bill_date",
];

// ============================================================================
// Dynamic Excel-style report tabs
// Existing dashboard/API data remains unchanged; this block adds the
// Excel-style reporting structure in the place of the removed graph section.
// ============================================================================
const cleanApiText = (value) => {
  if (value === null || value === undefined) return 'अन्य';
  const valueText = String(value).trim();
  return valueText || 'अन्य';
};

// Preserve the actual GET API value. If the API field is empty, null,
// undefined, or missing, use the same "अन्य" fallback as the previous code.
const normalizeBillingRow = (item) => ({
  ...item,
  raw: item,
  kendra: cleanApiText(item.center_name ?? item.kendra),
  center_name: cleanApiText(item.center_name ?? item.kendra),
  kraya: cleanApiText(item.scheme_name ?? item.kraya),
  scheme_name: cleanApiText(item.scheme_name ?? item.kraya),
  vahan: (item.anudan_name ?? item.vahan) == null ? '' : String(item.anudan_name ?? item.vahan).trim(),
  anudan_name: (item.anudan_name ?? item.vahan) == null ? '' : String(item.anudan_name ?? item.vahan).trim(),
  nivesh: cleanApiText(item.investment_name ?? item.nivesh),
  investment_name: cleanApiText(item.investment_name ?? item.nivesh),
  upnivesh: cleanApiText(item.sub_investment_name ?? item.upnivesh),
  sub_investment_name: cleanApiText(item.sub_investment_name ?? item.upnivesh),
  ikai: cleanApiText(item.unit),
  vidhan: cleanApiText(item.vidhan_sabha_name ?? item.vidhanasabha),
  block: cleanApiText(item.vikas_khand_name ?? item.block),
  matra: Number(item.allocated_quantity ?? item.matra) || 0,
  rate: Number(item.rate) || 0,
  vikray: Number(item.farmer_selling_rate ?? item.vikray) || 0,
  anudanRate: Number(item.farmer_subsidy_rate ?? item.anudanRate) || 0,
  ansh: Number(item.amount_of_farmer_share ?? item.ansh) || 0,
  anudan: Number(item.amount_of_subsidy ?? item.anudan) || 0,
  kul: Number(item.total_amount ?? item.kul) || 0,
  date: item.bill_date || item.date || '',
});

// ============================================================================
// Per-table column visibility selector
// Same idea as Registration page: every table has its OWN checkbox selector.
// ============================================================================
const ReportColumnSelector = ({ columns, visibleColumns, setVisibleColumns, label = "स्तंभ चुनें" }) => {
  const safeColumns = (columns || []).filter(Boolean);
  const visible = visibleColumns === null || visibleColumns === undefined
    ? safeColumns.map(c => c.key)
    : visibleColumns;

  const allSelected = safeColumns.length > 0 && visible.length === safeColumns.length;

  const toggle = (key) => {
    setVisibleColumns(prev => {
      const current = prev === null || prev === undefined
        ? safeColumns.map(c => c.key)
        : prev;

      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];

      return next.length === safeColumns.length ? null : next;
    });
  };

  return (
    <div className="report-column-selector">
      <div className="report-column-selector-header">
        <span className="report-column-selector-title">☷ {label}</span>
        <button
          type="button"
          className="report-column-select-all-btn"
          onClick={() => setVisibleColumns(allSelected ? [] : null)}
        >
          {allSelected ? "सभी हटाएं" : "सभी चुनें"}
        </button>
      </div>

      <div className="report-column-selector-options">
        {safeColumns.map(column => (
          <label key={column.key} className="report-column-option">
            <input
              type="checkbox"
              checked={visible.includes(column.key)}
              onChange={() => toggle(column.key)}
            />
            <span>{column.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};


// ============================================================================
// Independent date filter for each detailed-report tab.
// Every tab starts with the current financial year and keeps its own state.
// ============================================================================
const ReportTabDateFilter = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  appliedStartDate,
  appliedEndDate,
  onApply,
  onClear,
}) => (
  <div className="report-tab-date-filter">
    <div className="report-tab-date-filter-title">
      <FaCalendarAlt className="me-1" />
      तिथि के अनुसार फ़िल्टर
    </div>

    <Row className="align-items-end g-2">
      <Col lg={3} md={4} sm={6} className="mb-2">
        <Form.Group>
          <Form.Label className="filter-label-sm">प्रारंभ तिथि</Form.Label>
          <Form.Control
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="date-input-sm"
            size="sm"
          />
        </Form.Group>
      </Col>

      <Col lg={3} md={4} sm={6} className="mb-2">
        <Form.Group>
          <Form.Label className="filter-label-sm">समाप्ति तिथि</Form.Label>
          <Form.Control
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={e => setEndDate(e.target.value)}
            className="date-input-sm"
            size="sm"
          />
        </Form.Group>
      </Col>

      <Col lg={6} md={4} sm={12} className="mb-2">
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <Button
            type="button"
            size="sm"
            className="btn-filter-submit"
            onClick={onApply}
            disabled={!startDate && !endDate}
          >
            <FaFilter className="me-1" />
            फ़िल्टर लागू करें
          </Button>

          <Button
            type="button"
            size="sm"
            className="clear-btn-primary"
            onClick={onClear}
          >
            फ़िल्टर हटाएं
          </Button>

          {(appliedStartDate || appliedEndDate) && (
            <span
              className="badge bg-success d-flex align-items-center"
              style={{ fontSize: '0.7rem' }}
            >
              <FaCalendarAlt className="me-1" />
              {appliedStartDate || 'N/A'} - {appliedEndDate || 'N/A'}
            </span>
          )}
        </div>
      </Col>
    </Row>
  </div>
);

// This is the "सारांश देखें:" table moved to the top of the सारांश tab.
// It uses the currently filtered summary rows, so the selected tab date
// range and the सारांश tab filters are both reflected here.
const SummaryFilteredTable = ({ data }) => {
  const [summaryMode, setSummaryMode] = useState('financial');

  const summary = useMemo(() => {
    const map = new Map();

    data.forEach(row => {
      const plan = row.vahan || 'अन्य';
      if (!map.has(plan)) {
        map.set(plan, { quantity: 0, financial: 0 });
      }

      const item = map.get(plan);
      item.quantity += Number(row.matra) || 0;
      item.financial += Number(row.anudan) || 0;
    });

    return [...map.entries()]
      .filter(([, value]) => value.quantity > 0 || value.financial > 0)
      .sort((a, b) => b[1].financial - a[1].financial);
  }, [data]);

  const total = summary.reduce(
    (sum, [, value]) =>
      sum + (summaryMode === 'financial' ? value.financial : value.quantity),
    0
  );

  const formatInteger = value =>
    new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value) || 0));

  return (
    <div className="scheme-wise-financial-summary report-top-summary">
      <div className="scheme-summary-mode-filter">
        <label
          htmlFor="top-summary-mode"
          style={{
            margin: 0,
            color: '#194e8b',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          सारांश देखें:
        </label>

        <select
          id="top-summary-mode"
          value={summaryMode}
          onChange={e => setSummaryMode(e.target.value)}
        >
          <option value="financial">अनुदान राशि के अनुसार</option>
          <option value="quantity">भौतिक पूर्ति के अनुसार</option>
        </select>
      </div>

      <div className="report-top-summary-title">
        ▣ योजना-वार {summaryMode === 'financial'
          ? 'वित्तीय सारांश'
          : 'भौतिक पूर्ति सारांश'}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="report-top-summary-table">
          <thead>
            <tr>
              {summary.map(([plan]) => (
                <th key={`top-summary-head-${plan}`}>{plan}</th>
              ))}
              <th>कुल (Total)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {summary.map(([plan, value]) => {
                const displayValue =
                  summaryMode === 'financial'
                    ? value.financial
                    : value.quantity;

                return (
                  <td key={`top-summary-value-${plan}`}>
                    {summaryMode === 'financial' ? '₹' : ''}
                    {formatInteger(displayValue)}
                  </td>
                );
              })}

              <td className="report-top-summary-total">
                {summaryMode === 'financial' ? '₹' : ''}
                {formatInteger(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SummaryMadUpMadTable = ({ data, fixedPlan }) => {
  const summaryWiseUniq = values => [...new Set(
    values.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
  )].sort((a, b) => String(a).localeCompare(String(b), 'hi'));

  const summaryWiseFmtR = value => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

  // Format physical quantity values with exactly 2 decimal places.
  // This prevents floating-point artifacts such as 7.00000000000001
  // and keeps values consistent as 23.01, 23.00, etc.
  const summaryWiseFormatExactNumber = value => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-IN', {
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const [summaryWiseView, setSummaryWiseView] = useState('mad');
  const [summaryWiseFilters, setSummaryWiseFilters] = useState({
    nivesh: null,
    upnivesh: null,
    vidhan: null,
    block: null,
    kendra: null,
  });
  const [openSummaryWiseFilter, setOpenSummaryWiseFilter] = useState(null);
  const [selectedSummaryPlanFilter, setSelectedSummaryPlanFilter] = useState(null);
  const [summaryWiseSummaryMode, setSummaryWiseSummaryMode] = useState('financial');
  // Only these three table columns can be shown/hidden from the column selector.
  const [summaryWiseVisibleColumns, setSummaryWiseVisibleColumns] = useState(null);
  const summaryWiseColumnDefs = [
    { key: 'ikai', label: 'इकाई' },
    { key: 'matra', label: 'भौतिक पूर्ति ' },
    { key: 'anudan', label: 'अनुदान राशि (रु0)' },
  ];
  const summaryWiseShowIkai = summaryWiseVisibleColumns === null || summaryWiseVisibleColumns.includes('ikai');
  const summaryWiseShowMatra = summaryWiseVisibleColumns === null || summaryWiseVisibleColumns.includes('matra');
  const summaryWiseShowAnudan = summaryWiseVisibleColumns === null || summaryWiseVisibleColumns.includes('anudan');
  const summaryWisePlanColumnCount = (summaryWiseShowMatra ? 1 : 0) + (summaryWiseShowAnudan ? 1 : 0);

  const viewConfig = {
    mad: { field: 'nivesh', label: 'मद का नाम' },
    upmad: { field: 'upnivesh', label: 'उप-मद का नाम' },
    vidhan: { field: 'vidhan', label: 'विधानसभा का नाम' },
    block: { field: 'block', label: 'विकासखण्ड का नाम' },
    kendra: { field: 'kendra', label: 'केंद्र का नाम' },
  };

  const current = viewConfig[summaryWiseView];
  const rowField = current.field;
  const rowLabel = current.label;

  // Five independent filters for this table.
  // Empty/null selection means ALL values for that filter.
  const summaryWiseBaseRows = useMemo(
    () => (Array.isArray(data) ? data : []).filter(r => !fixedPlan || r.kraya !== fixedPlan),
    [data, fixedPlan]
  );

  const summaryWiseFilterDefinitions = [
    ['nivesh', 'मद का नाम'],
    ['upnivesh', 'उप-मद का नाम'],
    ['vidhan', 'विधानसभा'],
    ['block', 'विकासखण्ड'],
    ['kendra', 'केंद्र'],
  ];

  const summaryWiseFilterOptions = useMemo(() => ({
    nivesh: summaryWiseUniq(summaryWiseBaseRows.map(r => r.nivesh)),
    upnivesh: summaryWiseUniq(summaryWiseBaseRows.map(r => r.upnivesh)),
    vidhan: summaryWiseUniq(summaryWiseBaseRows.map(r => r.vidhan)),
    block: summaryWiseUniq(summaryWiseBaseRows.map(r => r.block)),
    kendra: summaryWiseUniq(summaryWiseBaseRows.map(r => r.kendra)),
  }), [summaryWiseBaseRows]);

  // Keep selections valid if API data changes.
  useEffect(() => {
    setSummaryWiseFilters(prev => {
      const next = { ...prev };
      let changed = false;

      summaryWiseFilterDefinitions.forEach(([field]) => {
        const selected = prev[field];
        const options = summaryWiseFilterOptions[field] || [];
        if (selected !== null && selected !== undefined) {
          const valid = selected.filter(value => options.includes(value));
          const normalized = valid.length === options.length ? null : valid;
          if (JSON.stringify(normalized) !== JSON.stringify(selected)) {
            next[field] = normalized;
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [summaryWiseFilterOptions]);

  const toggleSummaryWiseFilter = (field, value) => {
    setSummaryWiseFilters(prev => {
      const options = summaryWiseFilterOptions[field] || [];
      const currentSelection = prev[field] === null || prev[field] === undefined
        ? [...options]
        : [...prev[field]];

      const next = currentSelection.includes(value)
        ? currentSelection.filter(v => v !== value)
        : [...currentSelection, value];

      return {
        ...prev,
        [field]: next.length === options.length ? null : next,
      };
    });
  };

  const clearSummaryWiseFilters = () => {
    setSummaryWiseFilters({
      nivesh: null,
      upnivesh: null,
      vidhan: null,
      block: null,
      kendra: null,
    });
    setOpenSummaryWiseFilter(null);
  };

  const summaryWiseRows = useMemo(() => (
    summaryWiseBaseRows.filter(r =>
      summaryWiseFilterDefinitions.every(([field]) => {
        const selected = summaryWiseFilters[field];
        return selected === null || selected === undefined || selected.includes(r[field]);
      })
    )
  ), [summaryWiseBaseRows, summaryWiseFilters]);

  // Keep this helper local to SummaryMadUpMadTable.
  // The parent component's `uniq` is intentionally not used here because
  // SummaryMadUpMadTable is now a top-level component.
  const summaryWisePlanList = [
    ...new Set(
      summaryWiseRows
        .map(r => r.vahan)
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    ),
  ].sort((a, b) => String(a).localeCompare(String(b), 'hi'));

  const planList = summaryWisePlanList;

  useEffect(() => {
    setSelectedSummaryPlanFilter(prev => {
      if (prev === null || prev === undefined) return null;
      const valid = prev.filter(value => planList.includes(value));
      if (valid.length === planList.length) return null;
      return valid;
    });
  }, [planList.join('|')]);

  const selectedPlans = selectedSummaryPlanFilter === null || selectedSummaryPlanFilter === undefined
    ? planList
    : planList.filter(plan => selectedSummaryPlanFilter.includes(plan));

  const togglePlanFilter = plan => {
    setSelectedSummaryPlanFilter(prev => {
      const currentSelection = prev === null || prev === undefined
        ? [...planList]
        : [...prev];
      const next = currentSelection.includes(plan)
        ? currentSelection.filter(value => value !== plan)
        : [...currentSelection, plan];
      return next.length === planList.length ? null : next;
    });
  };

  const groupedRows = useMemo(() => {
    const map = new Map();

    summaryWiseRows.filter(r => selectedPlans.includes(r.vahan)).forEach(r => {
      const key = r[rowField] || 'अन्य';

      if (!map.has(key)) {
        map.set(key, {
          physical: {},
          financial: {},
          units: new Set(),
        });
      }

      const group = map.get(key);
      const plan = r.vahan || 'अन्य';

      group.physical[plan] = (group.physical[plan] || 0) + (Number(r.matra) || 0);
      group.financial[plan] = (group.financial[plan] || 0) + (Number(r.anudan) || 0);

      if (r.ikai) group.units.add(r.ikai);
    });

    return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'hi'));
  }, [summaryWiseRows, rowField, selectedPlans.join('|')]);

  const preserveScroll = callback => {
    const scrollY = window.scrollY;
    callback();
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: window.scrollX, behavior: 'auto' });
    });
  };

  const formatExactNumber = value => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-IN', {
      useGrouping: true,
      maximumFractionDigits: 20,
    }).format(num);
  };

  const formatSummaryInteger = value => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-IN', {
      useGrouping: true,
      maximumFractionDigits: 0,
    }).format(Math.round(num));
  };

  // IMPORTANT: calculate the summary from the SAME filtered/grouped data
  // that is visible in the table above. Do not divide financial values into
  // lakhs here, otherwise the total would not match the table.
  const schemeWiseSummary = selectedPlans.map(plan => {
    const rawValue = groupedRows.reduce(
      (sum, [, group]) => sum + (
        summaryWiseSummaryMode === 'quantity'
          ? (group.physical[plan] || 0)
          : (group.financial[plan] || 0)
      ),
      0
    );

    return {
      plan,
      rawValue,
      displayValue: rawValue,
    };
  });

  const totalSummaryValue = schemeWiseSummary.reduce(
    (sum, item) => sum + item.displayValue,
    0
  );

  return (
    <div className="summary-mad-upmad-report-wrapper">
      <div
        className="dynamic-report-view-row professional-view-row"
        style={{
          marginBottom: '10px',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <label htmlFor="summary-mad-upmad-view-select">देखने का प्रकार</label>
        <select
          id="summary-mad-upmad-view-select"
          value={summaryWiseView}
          onChange={e => {
            const value = e.target.value;
            preserveScroll(() => setSummaryWiseView(value));
          }}
          style={{
            minWidth: '230px',
            padding: '7px 10px',
            borderRadius: '6px',
            border: '1px solid #d9e1e8',
            background: '#fff',
            fontWeight: 600,
          }}
        >
          <option value="mad">मद के अनुसार</option>
          <option value="upmad">उप-मद के अनुसार</option>
        </select>

        {summaryWiseFilterDefinitions.map(([field, label]) => {
          const options = summaryWiseFilterOptions[field] || [];
          const selected = summaryWiseFilters[field];
          const selectedValues = selected === null || selected === undefined ? options : selected;
          const selectedCount = selectedValues.length;
          const filterId = `summary-mad-upmad-${field}`;
          const isOpen = openSummaryWiseFilter === filterId;
          const isFiltered = selected !== null && selected !== undefined && selectedCount !== options.length;

          return (
            <div key={field} className="dynamic-report-filter-wrap">
              <button
                type="button"
                className={`dynamic-report-filter-btn ${isFiltered ? 'filtered' : ''}`}
                onClick={() => setOpenSummaryWiseFilter(isOpen ? null : filterId)}
              >
                <span>{label} फ़िल्टर</span>
                <span className="dynamic-report-badge">{selectedCount}/{options.length}</span>
                <span>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="dynamic-report-filter-menu">
                  <div className="dynamic-report-filter-actions">
                    <button type="button" onClick={() => setSummaryWiseFilters(prev => ({ ...prev, [field]: null }))}>सभी चुनें</button>
                    <button type="button" onClick={() => setSummaryWiseFilters(prev => ({ ...prev, [field]: [] }))}>कोई नहीं</button>
                  </div>

                  <div className="dynamic-report-filter-list">
                    {options.length === 0 ? (
                      <div className="dynamic-report-filter-empty">कोई विकल्प उपलब्ध नहीं</div>
                    ) : (
                      options.map(value => (
                        <label key={value} className="dynamic-report-filter-option">
                          <input
                            type="checkbox"
                            checked={selected === null || selected === undefined ? true : selected.includes(value)}
                            onChange={() => {
                              const currentScrollY = window.scrollY;
                              toggleSummaryWiseFilter(field, value);
                              requestAnimationFrame(() => {
                                window.scrollTo({ top: currentScrollY, left: window.scrollX, behavior: 'auto' });
                              });
                            }}
                          />
                          <span>{value}</span>
                        </label>
                      ))
                    )}
                  </div>

                  <button type="button" className="dynamic-report-filter-close" onClick={() => setOpenSummaryWiseFilter(null)}>
                    बंद करें
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div className="dynamic-report-filter-wrap">
          <button
            type="button"
            className={`dynamic-report-filter-btn ${selectedSummaryPlanFilter !== null && selectedSummaryPlanFilter !== undefined && selectedSummaryPlanFilter.length !== planList.length ? 'filtered' : ''}`}
            onClick={() => setOpenSummaryWiseFilter(openSummaryWiseFilter === 'summary-mad-upmad-plan' ? null : 'summary-mad-upmad-plan')}
          >
            <span>योजना फ़िल्टर</span>
            <span className="dynamic-report-badge">{selectedPlans.length}/{planList.length}</span>
            <span>{openSummaryWiseFilter === 'summary-mad-upmad-plan' ? '▲' : '▼'}</span>
          </button>

          {openSummaryWiseFilter === 'summary-mad-upmad-plan' && (
            <div className="dynamic-report-filter-menu">
              <div className="dynamic-report-filter-actions">
                <button type="button" onClick={() => setSelectedSummaryPlanFilter(null)}>सभी चुनें</button>
                <button type="button" onClick={() => setSelectedSummaryPlanFilter([])}>कोई नहीं</button>
              </div>
              <div className="dynamic-report-filter-list">
                {planList.length === 0 ? (
                  <div className="dynamic-report-filter-empty">कोई विकल्प उपलब्ध नहीं</div>
                ) : (
                  planList.map(plan => (
                    <label key={plan} className="dynamic-report-filter-option">
                      <input
                        type="checkbox"
                        checked={selectedPlans.includes(plan)}
                        onChange={() => {
                          const currentScrollY = window.scrollY;
                          togglePlanFilter(plan);
                          requestAnimationFrame(() => {
                            window.scrollTo({ top: currentScrollY, left: window.scrollX, behavior: 'auto' });
                          });
                        }}
                      />
                      <span>{plan}</span>
                    </label>
                  ))
                )}
              </div>
              <button type="button" className="dynamic-report-filter-close" onClick={() => setOpenSummaryWiseFilter(null)}>
                बंद करें
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="dynamic-report-clear-btn"
          onClick={() => clearSummaryWiseFilters()}
        >
          फ़िल्टर हटाएं
        </button>
      </div>

      <ReportColumnSelector
        columns={summaryWiseColumnDefs}
        visibleColumns={summaryWiseVisibleColumns}
        setVisibleColumns={setSummaryWiseVisibleColumns}
        label="इस तालिका के स्तंभ चुनें"
      />

      <div
        className="dynamic-report-table-scroll matrix-scroll"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'visible',
        }}
      >
        <table
          className="dynamic-report-table matrix-table summary-mad-upmad-detail-table"
          style={{
            width: 'max-content',
            minWidth: '1100px',
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              <th rowSpan="2">क्रम संख्या</th>
              <th rowSpan="2">{rowLabel}</th>
              {summaryWiseShowIkai ? (
                <th rowSpan="2">इकाई</th>
              ) : null}
              {summaryWisePlanColumnCount > 0 && selectedPlans.map(plan => (
                <th
                  key={`yw-plan-${plan}`}
                  colSpan={summaryWisePlanColumnCount}
                  style={{ textAlign: 'center' }}
                >
                  {plan}
                </th>
              ))}
              <th colSpan="2" style={{ textAlign: 'center' }}>कुल योग</th>
            </tr>
            <tr>
              {selectedPlans.flatMap(plan => {
                const cells = [];
                if (summaryWiseShowMatra) {
                  cells.push(<th key={`yw-physical-${plan}`}>भौतिक पूर्ति </th>);
                }
                if (summaryWiseShowAnudan) {
                  cells.push(<th key={`yw-financial-${plan}`}>अनुदान राशि (रु0)</th>);
                }
                return cells;
              })}
              <th>भौतिक पूर्ति</th>
              <th>वित्तीय (₹)</th>
            </tr>
          </thead>

          <tbody>
            {groupedRows.length ? groupedRows.map(([name, group], index) => (
              <tr key={`summary-mad-upmad-${summaryWiseView}-${name}`}>
                <td>{index + 1}</td>
                <td>{name}</td>
                {summaryWiseShowIkai ? (
                  <td>{[...group.units].join(', ') || '-'}</td>
                ) : null}

                {selectedPlans.flatMap(plan => {
                  const cells = [];
                  if (summaryWiseShowMatra) {
                    cells.push(
                      <td key={`yw-matra-${name}-${plan}`}>
                        {group.physical[plan] ? summaryWiseFormatExactNumber(group.physical[plan]) : ''}
                      </td>
                    );
                  }
                  if (summaryWiseShowAnudan) {
                    cells.push(
                      <td key={`yw-anudan-${name}-${plan}`}>
                        {group.financial[plan] ? summaryWiseFmtR(group.financial[plan]) : ''}
                      </td>
                    );
                  }
                  return cells;
                })}

                {/* Row-wise total across all currently selected योजनाएं */}
                <td className="tot">
                  {summaryWiseFormatExactNumber(
                    selectedPlans.reduce((sum, plan) => sum + (group.physical[plan] || 0), 0)
                  )}
                </td>
                <td className="tot">
                  {summaryWiseFmtR(
                    selectedPlans.reduce((sum, plan) => sum + (group.financial[plan] || 0), 0)
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={2 + (summaryWiseVisibleColumns === null ? 1 : (summaryWiseVisibleColumns.includes('ikai') ? 1 : 0)) + selectedPlans.length * (summaryWiseVisibleColumns === null ? 2 : summaryWiseVisibleColumns.filter(k => k === 'matra' || k === 'anudan').length) + 2} className="dynamic-report-empty">
                  कोई डेटा नहीं — चुने फ़िल्टर पर कुछ नहीं मिला
                </td>
              </tr>
            )}
          </tbody>

          {groupedRows.length > 0 && (
            <tfoot>
              <tr className="report-total-values-row">
                <td>योग</td>
                <td></td>
                {summaryWiseShowIkai ? <td></td> : null}
                {selectedPlans.flatMap(plan => {
                  const physicalTotal = groupedRows.reduce(
                    (sum, [, group]) => sum + (group.physical[plan] || 0), 0
                  );
                  const financialTotal = groupedRows.reduce(
                    (sum, [, group]) => sum + (group.financial[plan] || 0), 0
                  );

                  const cells = [];
                  if (summaryWiseShowMatra) {
                    cells.push(
                      <td key={`yw-total-matra-${plan}`} className="tot">
                        {physicalTotal ? summaryWiseFormatExactNumber(physicalTotal) : ''}
                      </td>
                    );
                  }
                  if (summaryWiseShowAnudan) {
                    cells.push(
                      <td key={`yw-total-anudan-${plan}`} className="tot">
                        {financialTotal ? summaryWiseFmtR(financialTotal) : ''}
                      </td>
                    );
                  }
                  return cells;
                })}

                {/* Grand row-wise total across all selected योजनाएं */}
                <td className="tot">
                  {summaryWiseFormatExactNumber(
                    groupedRows.reduce(
                      (sum, [, group]) =>
                        sum + selectedPlans.reduce(
                          (inner, plan) => inner + (group.physical[plan] || 0), 0
                        ),
                      0
                    )
                  )}
                </td>
                <td className="tot">
                  {summaryWiseFmtR(
                    groupedRows.reduce(
                      (sum, [, group]) =>
                        sum + selectedPlans.reduce(
                          (inner, plan) => inner + (group.financial[plan] || 0), 0
                        ),
                      0
                    )
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

const DynamicReportTabs = ({ sourceData }) => {
  const [activeTab, setActiveTab] = useState('saransh');
  const [openFilter, setOpenFilter] = useState(null);
  const [progressView, setProgressView] = useState('vidhan');
  const [saleView, setSaleView] = useState('vidhan');

  // Each report tab has an independent financial-year date filter.
  const {
    startDate: summaryInitialStartDate,
    endDate: summaryInitialEndDate,
  } = getFinancialYearDates();

  const [summaryStartDate, setSummaryStartDate] = useState(summaryInitialStartDate);
  const [summaryEndDate, setSummaryEndDate] = useState(summaryInitialEndDate);
  const [summaryAppliedStartDate, setSummaryAppliedStartDate] = useState(summaryInitialStartDate);
  const [summaryAppliedEndDate, setSummaryAppliedEndDate] = useState(summaryInitialEndDate);

  const [progressStartDate, setProgressStartDate] = useState(summaryInitialStartDate);
  const [progressEndDate, setProgressEndDate] = useState(summaryInitialEndDate);
  const [progressAppliedStartDate, setProgressAppliedStartDate] = useState(summaryInitialStartDate);
  const [progressAppliedEndDate, setProgressAppliedEndDate] = useState(summaryInitialEndDate);

  const [saleStartDate, setSaleStartDate] = useState(summaryInitialStartDate);
  const [saleEndDate, setSaleEndDate] = useState(summaryInitialEndDate);
  const [saleAppliedStartDate, setSaleAppliedStartDate] = useState(summaryInitialStartDate);
  const [saleAppliedEndDate, setSaleAppliedEndDate] = useState(summaryInitialEndDate);

  const filterRowsByDate = (data, startDate, endDate) => {
    return data.filter(row => {
      const itemDate = row.date ? new Date(row.date) : null;
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (!itemDate || Number.isNaN(itemDate.getTime())) return false;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;

      return true;
    });
  };

  const applySummaryDateFilter = () => {
    setSummaryAppliedStartDate(summaryStartDate);
    setSummaryAppliedEndDate(summaryEndDate);
  };

  const clearSummaryDateFilter = () => {
    const { startDate, endDate } = getFinancialYearDates();
    setSummaryStartDate(startDate);
    setSummaryEndDate(endDate);
    setSummaryAppliedStartDate(startDate);
    setSummaryAppliedEndDate(endDate);
  };

  const applyProgressDateFilter = () => {
    setProgressAppliedStartDate(progressStartDate);
    setProgressAppliedEndDate(progressEndDate);
  };

  const clearProgressDateFilter = () => {
    const { startDate, endDate } = getFinancialYearDates();
    setProgressStartDate(startDate);
    setProgressEndDate(endDate);
    setProgressAppliedStartDate(startDate);
    setProgressAppliedEndDate(endDate);
  };

  const applySaleDateFilter = () => {
    setSaleAppliedStartDate(saleStartDate);
    setSaleAppliedEndDate(saleEndDate);
  };

  const clearSaleDateFilter = () => {
    const { startDate, endDate } = getFinancialYearDates();
    setSaleStartDate(startDate);
    setSaleEndDate(endDate);
    setSaleAppliedStartDate(startDate);
    setSaleAppliedEndDate(endDate);
  };


  // Independent selectors/column visibility for the two additional
  // "योजना प्रगति विवरण" tables. These tables are intentionally
  // independent of the main progress filters, matching the reference HTML.
  const [progressBlock, setProgressBlock] = useState('');
  const [progressVidhan, setProgressVidhan] = useState('');
  const [progressBlockColumns, setProgressBlockColumns] = useState(null);
  const [progressVidhanColumns, setProgressVidhanColumns] = useState(null);

  // Independent filters for each report tab.
  const [summaryFilters, setSummaryFilters] = useState({
    vahan: null, kendra: null
  });
  const [progressFilters, setProgressFilters] = useState({
    vahan: null, kendra: null, block: null, vidhan: null
  });
  const [saleFilters, setSaleFilters] = useState({
    kendra: null, block: null, vidhan: null, nivesh: null, upnivesh: null
  });

  // Summary report: one selector controls whether rows are shown Mad-wise or Up-Mad-wise.
  // Default is Mad-wise, as requested.
  const [summaryReportView, setSummaryReportView] = useState('mad');

  // Independent column visibility for the remaining report tables.
  const [summaryPlanColumns, setSummaryPlanColumns] = useState(null);
  const [progressColumns, setProgressColumns] = useState(null);
  const [saleColumns, setSaleColumns] = useState(null);

  // Independent view/column state for the second 4401 hierarchy table.
  const [saleSecondView, setSaleSecondView] = useState('vidhan');
  const [saleSecondColumns, setSaleSecondColumns] = useState(null);

  const rows = useMemo(() => (
    Array.isArray(sourceData) ? sourceData : []
  ).map(item => ({
    raw: item,
    kendra: item.center_name?.trim() || 'अन्य',
    kraya: item.scheme_name?.trim() || 'अन्य',
    vahan: item.anudan_name?.trim() || 'अन्य',
    nivesh: item.investment_name?.trim() || 'अन्य',
    upnivesh: item.sub_investment_name?.trim() || 'अन्य',
    ikai: item.unit?.trim() || 'अन्य',
    vidhan: item.vidhan_sabha_name?.trim() || 'अन्य',
    block: item.vikas_khand_name?.trim() || 'अन्य',
    matra: Number(item.allocated_quantity) || 0,
    rate: Number(item.rate) || 0,
    vikray: Number(item.farmer_selling_rate) || 0,
    anudanRate: Number(item.farmer_subsidy_rate) || 0,
    ansh: Number(item.amount_of_farmer_share) || 0,
    anudan: Number(item.amount_of_subsidy) || 0,
    kul: Number(item.total_amount) || 0,
    date: item.bill_date || '',
  })), [sourceData]);

  // Apply each tab's own date range only after rows has been initialized.
  const summaryDateRows = useMemo(
    () => filterRowsByDate(rows, summaryAppliedStartDate, summaryAppliedEndDate),
    [rows, summaryAppliedStartDate, summaryAppliedEndDate]
  );

  const progressDateRows = useMemo(
    () => filterRowsByDate(rows, progressAppliedStartDate, progressAppliedEndDate),
    [rows, progressAppliedStartDate, progressAppliedEndDate]
  );

  const saleDateRows = useMemo(
    () => filterRowsByDate(rows, saleAppliedStartDate, saleAppliedEndDate),
    [rows, saleAppliedStartDate, saleAppliedEndDate]
  );

  const uniq = values => [...new Set(values.filter(v => v !== null && v !== undefined && String(v).trim() !== ''))]
    .sort((a, b) => String(a).localeCompare(String(b), 'hi'));

  const lists = useMemo(() => ({
    kendra: uniq(rows.map(r => r.kendra)),
    kraya: uniq(rows.map(r => r.kraya)),
    vahan: uniq(rows.map(r => r.vahan)),
    nivesh: uniq(rows.map(r => r.nivesh)),
    upnivesh: uniq(rows.map(r => r.upnivesh)),
    block: uniq(rows.map(r => r.block)),
    vidhan: uniq(rows.map(r => r.vidhan)),
  }), [rows]);

  // Only use 4401 when it actually exists in the fetched API data.
  const fixedPlan = useMemo(
    () => lists.kraya.find(v => String(v).trim() === '4401 बिक्री हेतु') || null,
    [lists.kraya]
  );

  const getOptions = (section, field) => lists[field] || [];

  const getFilterState = section =>
    section === 'summary'
      ? [summaryFilters, setSummaryFilters]
      : section === 'progress'
        ? [progressFilters, setProgressFilters]
        : [saleFilters, setSaleFilters];


  const toggleFilter = (section, field, value) => {
    const [, setter] = getFilterState(section);

    setter(prev => {
      const options = getOptions(section, field);
      const current = prev[field] === null || prev[field] === undefined
        ? [...options]
        : [...prev[field]];

      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];

      return {
        ...prev,
        // null = ALL, [] = NONE, non-empty array = selected values.
        [field]: next.length === options.length
          ? null
          : next.length === 0
            ? []
            : next
      };
    });
  };

  const clearFilters = section => {
    const [state, setter] = getFilterState(section);
    setter(Object.fromEntries(Object.keys(state).map(key => [key, null])));
    setOpenFilter(null);
  };

  const FilterButton = ({ section, field, label }) => {
    const [state, setter] = getFilterState(section);
    const options = getOptions(section, field);
    const selected = state[field];
    const selectedValues = selected === null || selected === undefined ? options : selected;
    const selectedCount = selectedValues.length;
    const id = `${section}-${field}`;
    const open = openFilter === id;
    const isFiltered = selected !== null && selected !== undefined && selectedCount !== options.length;

    return (
      <div className="dynamic-report-filter-wrap">
        <button
          type="button"
          className={`dynamic-report-filter-btn ${isFiltered ? 'filtered' : ''}`}
          onClick={() => setOpenFilter(open ? null : id)}
        >
          <span>{label}</span>
          <span className="dynamic-report-badge">{`${selectedCount}/${options.length}`}</span>
          <span>▼</span>
        </button>

        {open && (
          <div className="dynamic-report-filter-menu">
            <div className="dynamic-report-filter-actions">
              <button
                type="button"
                onClick={() => setter(prev => ({ ...prev, [field]: null }))}
              >सभी चुनें</button>
              <button
                type="button"
                onClick={() => setter(prev => ({ ...prev, [field]: [] }))}
              >कोई नहीं</button>
            </div>

            <div className="dynamic-report-filter-list">
              {options.map(value => (
                <label key={value} className="dynamic-report-filter-option">
                  <input
                    type="checkbox"
                    checked={
                      selected === null || selected === undefined
                        ? true
                        : Array.isArray(selected) && selected.includes(value)
                    }
                    onChange={() => toggleFilter(section, field, value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>

            <button type="button" className="dynamic-report-filter-close" onClick={() => setOpenFilter(null)}>
              बंद करें
            </button>
          </div>
        )}
      </div>
    );
  };

  const FilterBar = ({ section }) => (
    <div className="dynamic-report-filterbar professional-filterbar">
      {filterDefinitions[section].map(([field, label]) => (
        <FilterButton key={field} section={section} field={field} label={label} />
      ))}
      <button type="button" className="dynamic-report-clear-btn" onClick={() => clearFilters(section)}>
        फ़िल्टर हटाएं
      </button>
    </div>
  );

  const filterDefinitions = {
    summary: [
      ['vahan', 'अनुदान वहन योजना'],
      ['kendra', 'केंद्र']
    ],
    progress: [
      ['vahan', 'योजना का नाम (अनुदान वहन योजना)'],
      ['kendra', 'केंद्र'],
      ['block', 'ब्लॉक'],
      ['vidhan', 'विधानसभा']
    ],
    sale: [
      ['kendra', 'केंद्र'],
      ['block', 'ब्लॉक'],
      ['vidhan', 'विधानसभा'],
      ['nivesh', 'मद का नाम'],
      ['upnivesh', 'उप-मद का नाम']
    ]
  };

  const applyFilters = (data, filters, fields) => data.filter(r =>
    fields.every(field => {
      const selected = filters[field];
      return selected === null || selected === undefined || selected.includes(r[field]);
    })
  );


  const summaryRows = useMemo(() => (
    applyFilters(summaryDateRows, summaryFilters, ['vahan', 'kendra'])
      .filter(r => !fixedPlan || r.kraya !== fixedPlan)
  ), [summaryDateRows, summaryFilters, fixedPlan]);

  const progressRows = useMemo(() => (
    applyFilters(progressDateRows, progressFilters, ['vahan', 'kendra', 'block', 'vidhan'])
      .filter(r => !fixedPlan || r.kraya !== fixedPlan)
  ), [progressDateRows, progressFilters, fixedPlan]);

  const saleRows = useMemo(() => (
    fixedPlan
      ? applyFilters(saleDateRows.filter(r => r.kraya === fixedPlan), saleFilters, ['kendra', 'block', 'vidhan', 'nivesh', 'upnivesh'])
      : []
  ), [saleDateRows, saleFilters, fixedPlan]);

  // ---------------------------------------------------------------------------
  // Two additional tables required inside "योजना प्रगति विवरण".
  // They intentionally do NOT use the main progress filters. They work exactly
  // like the reference HTML:
  //   1. Select a ब्लॉक -> show its centers as columns.
  //   2. Select a विधानसभा -> show its centers as columns.
  // Both tables use grant-bearing data only (4401 is excluded).
  // ---------------------------------------------------------------------------
  const grantRows = useMemo(
    () => progressDateRows.filter(r => !fixedPlan || r.kraya !== fixedPlan),
    [progressDateRows, fixedPlan]
  );

  const progressBlockOptions = useMemo(
    () => lists.block,
    [lists.block]
  );

  const progressVidhanOptions = useMemo(
    () => lists.vidhan,
    [lists.vidhan]
  );

  // Keep the selectors valid when API data changes.
  useEffect(() => {
    if (!progressBlockOptions.length) {
      setProgressBlock('');
    } else if (!progressBlockOptions.includes(progressBlock)) {
      setProgressBlock(progressBlockOptions[0]);
    }
  }, [progressBlockOptions, progressBlock]);

  useEffect(() => {
    if (!progressVidhanOptions.length) {
      setProgressVidhan('');
    } else if (!progressVidhanOptions.includes(progressVidhan)) {
      setProgressVidhan(progressVidhanOptions[0]);
    }
  }, [progressVidhanOptions, progressVidhan]);

  const progressBlockRows = useMemo(
    () => progressBlock
      ? grantRows.filter(r => r.block === progressBlock)
      : [],
    [grantRows, progressBlock]
  );

  const progressVidhanRows = useMemo(
    () => progressVidhan
      ? grantRows.filter(r => r.vidhan === progressVidhan)
      : [],
    [grantRows, progressVidhan]
  );

  const progressBlockCentres = useMemo(
    () => uniq(progressBlockRows.map(r => r.kendra)),
    [progressBlockRows]
  );

  const progressVidhanCentres = useMemo(
    () => uniq(progressVidhanRows.map(r => r.kendra)),
    [progressVidhanRows]
  );

  const fmtN = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const fmtR = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
  const fmtDate = value => value ? new Date(value).toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';


  const summaryPlanDefs = [
    { key: 'sno', label: 'क्रम संख्या' },
    { key: 'vahan', label: 'योजना का नाम (अनुदान वहन योजना)' },
    { key: 'matra', label: 'भौतिक पूर्ति ' },
    { key: 'anudan', label: 'अनुदान राशि (रु0)' },
  ];

  // Existing scheme-wise summary table (kept as the first summary table).
  const SummaryPlanTable = () => {
    const map = new Map();
    summaryRows.forEach(r => {
      if (!map.has(r.vahan)) map.set(r.vahan, { matra: 0, anudan: 0 });
      const g = map.get(r.vahan);
      g.matra += r.matra;
      g.anudan += r.anudan;
    });

    const groups = [...map.entries()]
      .filter(([name, g]) => g.matra > 0 && g.anudan > 0)
      .sort((a, b) => b[1].anudan - a[1].anudan);

    const visible = summaryPlanColumns === null
      ? summaryPlanDefs.map(c => c.key)
      : summaryPlanColumns;
    const show = key => visible.includes(key);

    const totalMatra = groups.reduce((s, [, g]) => s + g.matra, 0);
    const totalAnudan = groups.reduce((s, [, g]) => s + g.anudan, 0);

    return (
      <>
        <ReportColumnSelector
          columns={summaryPlanDefs}
          visibleColumns={summaryPlanColumns}
          setVisibleColumns={setSummaryPlanColumns}
          label="इस तालिका के स्तंभ चुनें"
        />
        <div className="dynamic-report-table-scroll" style={{ width: '100%', overflowX: 'auto' }}>
          <table
            className="dynamic-report-table"
            style={{ width: '100%', minWidth: '760px', tableLayout: 'auto' }}
          >
            <thead>
              <tr>
                {show('sno') && <th>#</th>}
                {show('vahan') && <th>योजना का नाम<br/>(अनुदान वहन योजना)</th>}
                {show('matra') && <th>भौतिक पूर्ति </th>}
                {show('anudan') && <th>अनुदान राशि (रु0)</th>}
              </tr>
            </thead>
            <tbody>
              {groups.length ? groups.map(([name, g], i) => (
                <tr key={name}>
                  {show('sno') && <td>{i + 1}</td>}
                  {show('vahan') && <td>{name}</td>}
                  {show('matra') && <td>{fmtN(g.matra)}</td>}
                  {show('anudan') && <td>{fmtR(g.anudan)}</td>}
                </tr>
              )) : (
                <tr>
                  <td colSpan={Math.max(1, visible.length)} className="dynamic-report-empty">
                    कोई डेटा नहीं — चुने फ़िल्टर पर कुछ नहीं मिला
                  </td>
                </tr>
              )}
            </tbody>
            {groups.length > 0 && (
              <tfoot>
                <tr className="report-total-values-row">
                  {visible.map((key, index) => {
                    const value = key === 'matra' ? fmtN(totalMatra)
                      : key === 'anudan' ? fmtR(totalAnudan)
                      : null;
                    const isFirst = index === 0;
                    return (
                      <td key={`summary-plan-total-${key}`} className={value !== null ? 'tot' : ''}>
                        {isFirst && value !== null ? `योग: ${value}` : isFirst ? 'योग' : value}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </>
    );
  };

  // ============================================================================
  // Single Mad / Up-Mad summary table
  // ----------------------------------------------------------------------------
  // One selector switches the row dimension:
  //   - मद       => rows grouped by investment_name
  //   - उप-मद    => rows grouped by sub_investment_name
  //
  // Column structure follows the supplied Excel/reference screenshot:
  //   क्रम संख्या | मद/उप-मद | इकाई |
  //   योजना 1 -> भौतिक पूर्ति  | अनुदान राशि (रु0) |
  //   योजना 2 -> भौतिक पूर्ति  | अनुदान राशि (रु0) | ...
  //   लाभार्थी
  //
  // Existing API data is used without changing the underlying records.
  // भौतिक = allocated_quantity
  // वित्तीय = amount_of_subsidy
  // लाभार्थी is read from an existing beneficiary field if the API provides
  // one; otherwise it is shown as "-". No beneficiary value is invented.
  // ============================================================================


  const MatrixTable = ({
    data,
    geoField,
    geoList,
    saleMode,
    schemeLabel,
    columns,
    setColumns,
    enableHierarchyFilters = false,
    hideSchemeColumn = false
  }) => {
    const [selectedMad, setSelectedMad] = useState([]);
    const [selectedUpmad, setSelectedUpmad] = useState([]);
    const [groupBy, setGroupBy] = useState('mad');

    const safeData = Array.isArray(data) ? data : [];

    const uniqValues = (values) => [...new Set(
      values.map(value => String(value ?? '').trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'hi'));

    const madOptions = useMemo(() => {
      const source = selectedUpmad.length
        ? safeData.filter(row => selectedUpmad.includes(String(row.upnivesh ?? '').trim()))
        : safeData;
      return uniqValues(source.map(row => row.nivesh)).map(value => ({ value, label: value }));
    }, [safeData, selectedUpmad]);

    const upmadOptions = useMemo(() => {
      const source = selectedMad.length
        ? safeData.filter(row => selectedMad.includes(String(row.nivesh ?? '').trim()))
        : safeData;
      return uniqValues(source.map(row => row.upnivesh)).map(value => ({ value, label: value }));
    }, [safeData, selectedMad]);

    useEffect(() => {
      if (!enableHierarchyFilters) return;
      const available = new Set(madOptions.map(option => option.value));
      setSelectedMad(prev => {
        const next = prev.filter(value => available.has(value));
        return next.length === prev.length && next.every((v, i) => v === prev[i]) ? prev : next;
      });
    }, [enableHierarchyFilters, madOptions]);
  
    useEffect(() => {
      if (!enableHierarchyFilters) return;
      const available = new Set(upmadOptions.map(option => option.value));
      setSelectedUpmad(prev => {
        const next = prev.filter(value => available.has(value));
        return next.length === prev.length && next.every((v, i) => v === prev[i]) ? prev : next;
      });
    }, [enableHierarchyFilters, upmadOptions]);


    const filteredData = useMemo(() => {
      if (!enableHierarchyFilters) return safeData;
      return safeData.filter(row => {
        const mad = String(row.nivesh ?? '').trim();
        const upmad = String(row.upnivesh ?? '').trim();
        if (selectedMad.length && !selectedMad.includes(mad)) return false;
        if (selectedUpmad.length && !selectedUpmad.includes(upmad)) return false;
        return true;
      });
    }, [safeData, enableHierarchyFilters, selectedMad, selectedUpmad]);

    // Decide which hierarchy should be unique in the first column.
    // This is independent for every table because MatrixTable owns its own state.
    const madMode = enableHierarchyFilters && groupBy === 'mad';
    const upmadMode = enableHierarchyFilters && groupBy === 'upmad';

    const groupedItems = useMemo(() => {
      const groups = new Map();

      
      filteredData.forEach(row => {
        const mad = String(row.nivesh ?? '').trim();
        const upmad = String(row.upnivesh ?? '').trim();
        const yojna = String(row.vahan ?? '').trim();
        const ikai = String(row.ikai ?? '').trim();

        let key;
        if (upmadMode) {
          key = `upmad|${upmad}`;
        } else if (madMode) {
          key = `mad|${mad}`;
        } else {
          key = `normal|${mad}|${upmad}|${yojna}|${ikai}`;
        }

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            niveshValues: new Set(),
            upniveshValues: new Set(),
            vahanValues: new Set(),
            ikaiValues: new Set(),
            rows: []
          });
        }

        const group = groups.get(key);
        if (mad) group.niveshValues.add(mad);
        if (upmad) group.upniveshValues.add(upmad);
        if (yojna) group.vahanValues.add(yojna);
        if (ikai) group.ikaiValues.add(ikai);
        group.rows.push(row);
      });

      return [...groups.values()].map(group => ({
        ...group,
        nivesh: [...group.niveshValues].join(', '),
        upnivesh: [...group.upniveshValues].join(', '),
        vahan: [...group.vahanValues].join(', '),
        ikai: [...group.ikaiValues].join(', ')
      }));
    }, [filteredData, madMode, upmadMode]);

    const hasData = (item, geo) => item.rows.some(r =>
      r[geoField] === geo &&
      (saleMode
        ? r.matra > 0 && r.ansh > 0
        : r.matra > 0 || r.anudan > 0)
    );

    const visibleGeo = geoList.filter(geo => groupedItems.some(item => hasData(item, geo)));
    const visibleItems = groupedItems.filter(item => visibleGeo.some(geo => hasData(item, geo)));

    const subColumns = saleMode
      ? ['विक्रय दर', 'भौतिक पूर्ति ', 'वित्तीय (₹)']
      : ['भौतिक पूर्ति ', 'वित्तीय (₹)'];

    const hierarchyDefs = enableHierarchyFilters
      ? (upmadMode
          ? [
              { key: 'scheme', label: 'योजना का नाम' },
              { key: 'submad', label: 'उप-मद का नाम' }
            ]
          : [
              { key: 'scheme', label: 'योजना का नाम' },
              { key: 'mad', label: 'मद का नाम' },
              { key: 'submad', label: 'उप-मद का नाम' }
            ])
      : [
          ...(!hideSchemeColumn ? [{ key: 'scheme', label: 'योजना का नाम' }] : []),
          { key: 'mad', label: 'मद का नाम' },
          { key: 'submad', label: 'उप-मद का नाम' }
        ];

    const matrixDefs = [
      { key: 'sno', label: 'क्रम संख्या' },
      ...hierarchyDefs,
      { key: 'ikai', label: 'इकाई' },
      ...visibleGeo.map((geo, index) => ({ key: `geo_${index}`, label: geo })),
      { key: 'total', label: saleMode ? 'कुल' : 'कुल योग' }
    ];

    const visible = columns === null ? matrixDefs.map(c => c.key) : columns;
    const show = key => {
      if (enableHierarchyFilters && upmadMode && key === 'mad') return false;
      return visible.includes(key);
    };

    const getCell = (item, geo) => item.rows
      .filter(r => r[geoField] === geo)
      .reduce((a, r) => ({
        mat: a.mat + r.matra,
        val: a.val + (saleMode ? r.ansh : r.anudan)
      }), { mat: 0, val: 0 });

    const geoTotals = Object.fromEntries(visibleGeo.map(geo => [geo, { mat: 0, val: 0 }]));
    let grandMat = 0;
    let grandVal = 0;

    const renderCellValues = (cellData, keyPrefix) => {
      const rate = cellData.mat ? cellData.val / cellData.mat : 0;
      if (saleMode) {
        return (
          <React.Fragment key={keyPrefix}>
            <td>{cellData.mat ? fmtR(rate) : ''}</td>
            <td>{cellData.mat ? fmtN(cellData.mat) : ''}</td>
            <td>{cellData.val ? fmtR(cellData.val) : ''}</td>
          </React.Fragment>
        );
      }
      return (
        <React.Fragment key={keyPrefix}>
          <td>{cellData.mat ? fmtN(cellData.mat) : ''}</td>
          <td>{cellData.val ? fmtR(cellData.val) : ''}</td>
        </React.Fragment>
      );
    };

    const renderTotalValues = (cellData, keyPrefix) => {
      const rate = cellData.mat ? cellData.val / cellData.mat : 0;
      if (saleMode) {
        return (
          <React.Fragment key={keyPrefix}>
            <td className="tot">{cellData.mat ? fmtR(rate) : ''}</td>
            <td className="tot">{fmtN(cellData.mat)}</td>
            <td className="tot">{fmtR(cellData.val)}</td>
          </React.Fragment>
        );
      }
      return (
        <React.Fragment key={keyPrefix}>
          <td className="tot">{fmtN(cellData.mat)}</td>
          <td className="tot">{fmtR(cellData.val)}</td>
        </React.Fragment>
      );
    };

    const colspan = subColumns.length;
    const selectedMadOptions = selectedMad.map(value => ({ value, label: value }));
    const selectedUpmadOptions = selectedUpmad.map(value => ({ value, label: value }));

    // Special actions for both multi-select filters.
    // These are handled without ever becoming actual selected filter values.
    const madFilterOptions = [
      { value: '__SELECT_ALL_MAD__', label: 'सभी चुनें' },
      { value: '__CLEAR_ALL_MAD__', label: 'सभी हटाएं' },
      ...madOptions
    ];
    const upmadFilterOptions = [
      { value: '__SELECT_ALL_UPMAD__', label: 'सभी चुनें' },
      { value: '__CLEAR_ALL_UPMAD__', label: 'सभी हटाएं' },
      ...upmadOptions
    ];

    const handleMadFilterChange = options => {
      const values = options || [];
      if (values.some(option => option.value === '__SELECT_ALL_MAD__')) {
        setSelectedMad(madOptions.map(option => option.value));
        return;
      }
      if (values.some(option => option.value === '__CLEAR_ALL_MAD__')) {
        setSelectedMad([]);
        return;
      }
      setSelectedMad(values.map(option => option.value));
    };

    const handleUpmadFilterChange = options => {
      const values = options || [];
      if (values.some(option => option.value === '__SELECT_ALL_UPMAD__')) {
        setSelectedUpmad(upmadOptions.map(option => option.value));
        return;
      }
      if (values.some(option => option.value === '__CLEAR_ALL_UPMAD__')) {
        setSelectedUpmad([]);
        return;
      }
      setSelectedUpmad(values.map(option => option.value));
    };

    return (
      <>
        {enableHierarchyFilters && (
          <div className="progress-hierarchy-filterbar">
            <div className="progress-hierarchy-filter-group progress-hierarchy-mode-group">
              <label>तालिका किसके अनुसार दिखाएं</label>
              <Select
                isSearchable={false}
                options={[
                  { value: 'mad', label: 'मद के अनुसार' },
                  { value: 'upmad', label: 'उप-मद के अनुसार' }
                ]}
                value={groupBy === 'upmad'
                  ? { value: 'upmad', label: 'उप-मद के अनुसार' }
                  : { value: 'mad', label: 'मद के अनुसार' }}
                onChange={option => {
                  const nextValue = option?.value || 'mad';
                  if (nextValue === 'upmad') {
                    setSelectedMad([]);
                  }
                  setGroupBy(nextValue);
                }}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            {groupBy !== 'upmad' && (
              <div className="progress-hierarchy-filter-group">
                <label>मद के अनुसार फ़िल्टर</label>
                <Select
                  isMulti
                  isSearchable
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  options={madFilterOptions}
                  value={selectedMadOptions}
                  onChange={handleMadFilterChange}
                  placeholder="एक या अधिक मद चुनें..."
                  noOptionsMessage={() => 'कोई मद उपलब्ध नहीं'}
                  styles={customSelectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
            )}

            <div className="progress-hierarchy-filter-group">
              <label>उप-मद के अनुसार फ़िल्टर</label>
              <Select
                isMulti
                isSearchable
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                options={upmadFilterOptions}
                value={selectedUpmadOptions}
                onChange={handleUpmadFilterChange}
                placeholder="एक या अधिक उप-मद चुनें..."
                noOptionsMessage={() => 'कोई उप-मद उपलब्ध नहीं'}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            {(selectedMad.length || selectedUpmad.length) ? (
              <button
                type="button"
                className="progress-hierarchy-clear-btn"
                onClick={() => {
                  setSelectedMad([]);
                  setSelectedUpmad([]);
                }}
              >
                फ़िल्टर हटाएं
              </button>
            ) : null}
          </div>
        )}

        <ReportColumnSelector
          columns={matrixDefs}
          visibleColumns={columns}
          setVisibleColumns={setColumns}
          label="प्रगति मैट्रिक्स — इस तालिका के स्तंभ चुनें"
        />

        {!visibleGeo.length || !visibleItems.length ? (
          <div className="dynamic-report-empty-box">कोई डेटा नहीं — चुने फ़िल्टर पर कुछ नहीं मिला</div>
        ) : (
          <div className="dynamic-report-table-scroll matrix-scroll">
            <table className="dynamic-report-table matrix-table">
              <thead>
                <tr>
                  {show('sno') && <th rowSpan="2">क्रम संख्या</th>}
                  {show('scheme') && (
                    <th rowSpan="2">{schemeLabel || 'योजना का नाम'}</th>
                  )}
                  {upmadMode ? (
                    <>
                      {show('submad') && <th rowSpan="2">उप-मद का नाम</th>}
                    </>
                  ) : (
                    <>
                      {show('mad') && <th rowSpan="2">मद का नाम</th>}
                      {show('submad') && <th rowSpan="2">उप-मद का नाम</th>}
                    </>
                  )}
                  {show('ikai') && <th rowSpan="2">इकाई</th>}
                  {visibleGeo.map((geo, index) =>
                    show(`geo_${index}`) && <th colSpan={colspan} key={geo}>{geo}</th>
                  )}
                  {show('total') && <th colSpan={colspan}>{saleMode ? 'कुल' : 'कुल योग'}</th>}
                </tr>
                <tr>
                  {visibleGeo.flatMap((geo, index) =>
                    show(`geo_${index}`)
                      ? subColumns.map(column => <th key={`${geo}-${column}`}>{column}</th>)
                      : []
                  )}
                  {show('total') && subColumns.map(column => <th key={`total-${column}`}>{column}</th>)}
                </tr>
              </thead>

              <tbody>
                {visibleItems.map((item, idx) => {
                  let rowMat = 0;
                  let rowVal = 0;

                  const cells = visibleGeo.flatMap((geo, geoIndex) => {
                    const c = getCell(item, geo);
                    geoTotals[geo].mat += c.mat;
                    geoTotals[geo].val += c.val;
                    rowMat += c.mat;
                    rowVal += c.val;
                    return show(`geo_${geoIndex}`)
                      ? [renderCellValues(c, `${item.key}-${geo}`)]
                      : [];
                  });

                  grandMat += rowMat;
                  grandVal += rowVal;

                  return (
                    <tr key={`${item.key}-${idx}`}>
                      {show('sno') && <td>{idx + 1}</td>}
                      {show('scheme') && (
                        <td>{schemeLabel || item.vahan}</td>
                      )}
                      {upmadMode ? (
                        <>
                          {show('submad') && <td>{item.upnivesh}</td>}
                        </>
                      ) : (
                        <>
                          {show('mad') && <td>{item.nivesh}</td>}
                          {show('submad') && <td>{item.upnivesh}</td>}
                        </>
                      )}
                      {show('ikai') && <td>{item.ikai}</td>}
                      {cells}
                      {show('total') && renderTotalValues({ mat: rowMat, val: rowVal }, `row-total-${idx}`)}
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="report-total-values-row">
                  {(() => {
                    const metaKeys = ['sno', 'mad', 'submad', 'scheme', 'ikai'];
                    const visibleMetaCount = metaKeys.filter(key => show(key)).length;
                    const labelCell = visibleMetaCount > 0 ? <td colSpan={visibleMetaCount}>योग</td> : null;
                    return (
                      <>
                        {labelCell}
                        {visibleGeo.map((geo, geoIndex) =>
                          show(`geo_${geoIndex}`)
                            ? renderTotalValues(geoTotals[geo], `footer-${geo}`)
                            : null
                        )}
                        {show('total') && renderTotalValues({ mat: grandMat, val: grandVal }, 'footer-grand-total')}
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <section
      className="dynamic-report-section"
      style={{
        marginTop: "0",
        paddingTop: "0"
      }}
    >
      <div
        className="dynamic-report-heading"
        style={{
          marginTop: "0",
          marginBottom: "8px",
          paddingTop: "4px",
          paddingBottom: "4px"
        }}
      >
        <h4 style={{ margin: 0 }}>
          <FaTable className="me-2" />विस्तृत रिपोर्ट
        </h4>
      </div>

      <div className="dynamic-report-tabs professional-report-tabs">
        {[['saransh','सारांश'],['pragati','योजना प्रगति विवरण'],['vivaran4401','4401 बिक्री हेतु']]
          .map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={activeTab === key ? 'active' : ''}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
      </div>

      <div className="dynamic-report-content professional-report-content">

        {activeTab === 'saransh' && (
          <div className="dynamic-report-panel">
            <h5 style={{ marginBottom: "6px" }}>सारांश — योजना-वार मद / उप-मद विवरण</h5>

            {/* तिथि के अनुसार फ़िल्टर सबसे ऊपर रहेगा,
                सारांश देखें सेक्शन से पहले।

                Summary tab में अनुदान वहन योजना और केंद्र वाले
                अतिरिक्त filters नहीं दिखाए जाएंगे। */}

            <ReportTabDateFilter
              startDate={summaryStartDate}
              endDate={summaryEndDate}
              setStartDate={setSummaryStartDate}
              setEndDate={setSummaryEndDate}
              appliedStartDate={summaryAppliedStartDate}
              appliedEndDate={summaryAppliedEndDate}
              onApply={applySummaryDateFilter}
              onClear={clearSummaryDateFilter}
            />

            {/* सारांश देखें + योजना-वार वित्तीय/भौतिक सारांश */}
            <SummaryFilteredTable data={summaryRows} />

            <h6 className="dynamic-report-subtitle">1) अनुदान वहन योजना के अनुसार सारांश</h6>
            <SummaryPlanTable />

            <h6 className="dynamic-report-subtitle">
              2) मद / उप-मद  के नाम अनुसार — योजना-वार
            </h6>
            <SummaryMadUpMadTable data={summaryRows} fixedPlan={fixedPlan} />
          </div>
        )}

        {activeTab === 'pragati' && (
          <div className="dynamic-report-panel">
            <h5 style={{ marginBottom: "6px" }}>योजना प्रगति विवरण — अनुदान वहन योजना के अनुसार</h5>

            <ReportTabDateFilter
              startDate={progressStartDate}
              endDate={progressEndDate}
              setStartDate={setProgressStartDate}
              setEndDate={setProgressEndDate}
              appliedStartDate={progressAppliedStartDate}
              appliedEndDate={progressAppliedEndDate}
              onApply={applyProgressDateFilter}
              onClear={clearProgressDateFilter}
            />

            <div className="dynamic-report-view-row professional-view-row">
              <label>देखने का प्रकार</label>
              <select value={progressView} onChange={e => setProgressView(e.target.value)}>
                <option value="vidhan">विधानसभा-वार</option>
                <option value="block">ब्लॉक-वार</option>
                <option value="kendra">केंद्र-वार</option>
              </select>
            </div>

            <FilterBar section="progress" />
            <h6 className="dynamic-report-subtitle">प्रगति मैट्रिक्स</h6>

            <MatrixTable
              enableHierarchyFilters={true}
              data={progressRows}
              geoField={progressView === 'vidhan' ? 'vidhan' : progressView === 'block' ? 'block' : 'kendra'}
              geoList={progressView === 'vidhan' ? lists.vidhan : progressView === 'block' ? lists.block : lists.kendra}
              saleMode={false}
              columns={progressColumns}
              setColumns={setProgressColumns}
            />

            {/* ================================================================
                अतिरिक्त प्रगति तालिका 1:
                एक ब्लॉक चुनें — उसके केंद्रों का विवरण
                यह मुख्य progress filters से स्वतंत्र है.
               ================================================================ */}
            <div className="dynamic-report-subsection professional-report-subsection" style={{ marginTop: "30px" }}>
              <h6 className="dynamic-report-subtitle">
               एक ब्लॉक चुनें — उसके केंद्रों का विवरण (मूल प्रारूप जैसा)
              </h6>
              <p className="dynamic-report-note">
                यह तालिका ऊपर के फ़िल्टरों से स्वतंत्र है। नीचे एक ब्लॉक चुनें,
                उसके अंदर आने वाले केंद्र अपने आप कॉलम बनेंगे।
              </p>

              <div className="dynamic-report-view-row professional-view-row">
                <label>ब्लॉक चुनें</label>
                <select
                  value={progressBlock}
                  onChange={e => setProgressBlock(e.target.value)}
                >
                  {progressBlockOptions.length === 0 ? (
                    <option value="">कोई विकल्प उपलब्ध नहीं</option>
                  ) : (
                    progressBlockOptions.map(block => (
                      <option key={block} value={block}>{block}</option>
                    ))
                  )}
                </select>
              </div>

              <p className="dynamic-report-note" style={{ marginTop: "10px" }}>
                ब्लॉक के अनुसार:
              </p>

              <MatrixTable
                enableHierarchyFilters={true}
                data={progressBlockRows}
                geoField="kendra"
                geoList={progressBlockCentres}
                saleMode={false}
                columns={progressBlockColumns}
                setColumns={setProgressBlockColumns}
              />
            </div>

            {/* ================================================================
                अतिरिक्त प्रगति तालिका 2:
                एक विधानसभा चुनें — उसके केंद्रों का विवरण
                यह मुख्य progress filters से स्वतंत्र है.
               ================================================================ */}
            <div className="dynamic-report-subsection professional-report-subsection" style={{ marginTop: "26px" }}>
              <h6 className="dynamic-report-subtitle">
                विधानसभा के अनुसार केंद्रों का विवरण
              </h6>
              <p className="dynamic-report-note">
                यह तालिका भी ऊपर के फ़िल्टरों से स्वतंत्र है। नीचे एक विधानसभा
                चुनें, उसके अंदर आने वाले केंद्र अपने आप कॉलम बनेंगे।
              </p>

              <div className="dynamic-report-view-row professional-view-row">
                <label>विधानसभा चुनें</label>
                <select
                  value={progressVidhan}
                  onChange={e => setProgressVidhan(e.target.value)}
                >
                  {progressVidhanOptions.length === 0 ? (
                    <option value="">कोई विकल्प उपलब्ध नहीं</option>
                  ) : (
                    progressVidhanOptions.map(vidhan => (
                      <option key={vidhan} value={vidhan}>{vidhan}</option>
                    ))
                  )}
                </select>
              </div>

              <p className="dynamic-report-note" style={{ marginTop: "10px" }}>
                विधानसभा के अनुसार:
              </p>

              <MatrixTable
                enableHierarchyFilters={true}
                data={progressVidhanRows}
                geoField="kendra"
                geoList={progressVidhanCentres}
                saleMode={false}
                columns={progressVidhanColumns}
                setColumns={setProgressVidhanColumns}
              />
            </div>
          </div>
        )}

        {activeTab === 'vivaran4401' && (
          <div className="dynamic-report-panel">
            <h5>{fixedPlan || '4401 बिक्री हेतु'} — क्रय योजना के अनुसार</h5>

            <ReportTabDateFilter
              startDate={saleStartDate}
              endDate={saleEndDate}
              setStartDate={setSaleStartDate}
              setEndDate={setSaleEndDate}
              appliedStartDate={saleAppliedStartDate}
              appliedEndDate={saleAppliedEndDate}
              onApply={applySaleDateFilter}
              onClear={clearSaleDateFilter}
            />

            <div className="dynamic-report-view-row professional-view-row">
              <label>देखने का प्रकार</label>
              <select value={saleView} onChange={e => setSaleView(e.target.value)}>
                <option value="vidhan">विधानसभा-वार</option>
                <option value="block">ब्लॉक-वार</option>
                <option value="kendra">केंद्र-वार</option>
              </select>
            </div>

            <FilterBar section="sale" />
            <h6 className="dynamic-report-subtitle">4401 प्रगति मैट्रिक्स — विक्रय दर व कृषक अंश</h6>

            {/* पहला 4401 table:
                योजना का नाम column intentionally removed. */}
            <MatrixTable
              data={saleRows}
              geoField={saleView === 'vidhan' ? 'vidhan' : saleView === 'block' ? 'block' : 'kendra'}
              geoList={saleView === 'vidhan' ? lists.vidhan : saleView === 'block' ? lists.block : lists.kendra}
              saleMode={true}
              schemeLabel={fixedPlan || '—'}
              columns={saleColumns}
              setColumns={setSaleColumns}
              hideSchemeColumn={true}
            />

            {/* दूसरा 4401 table:
                योजना प्रगति विवरण जैसी Mad/Up-Mad functionality.
                इसका view और column selection पहले 4401 table से स्वतंत्र है। */}
            <div
              className="dynamic-report-subsection professional-report-subsection"
              style={{ marginTop: "26px" }}
            >
              <h6 className="dynamic-report-subtitle">
                4401 प्रगति मैट्रिक्स — मद / उप-मद के अनुसार
              </h6>

              <p className="dynamic-report-note">
                इस तालिका में योजना प्रगति विवरण की तरह मद / उप-मद के अनुसार
                तालिका बदलने और संबंधित फ़िल्टर चुनने की सुविधा है।
              </p>

              <div className="dynamic-report-view-row professional-view-row">
                <label>देखने का प्रकार</label>
                <select
                  value={saleSecondView}
                  onChange={e => setSaleSecondView(e.target.value)}
                >
                  <option value="vidhan">विधानसभा-वार</option>
                  <option value="block">ब्लॉक-वार</option>
                  <option value="kendra">केंद्र-वार</option>
                </select>
              </div>

              <MatrixTable
                enableHierarchyFilters={true}
                data={saleRows}
                geoField={
                  saleSecondView === 'vidhan'
                    ? 'vidhan'
                    : saleSecondView === 'block'
                      ? 'block'
                      : 'kendra'
                }
                geoList={
                  saleSecondView === 'vidhan'
                    ? lists.vidhan
                    : saleSecondView === 'block'
                      ? lists.block
                      : lists.kendra
                }
                saleMode={true}
                schemeLabel={fixedPlan || '—'}
                columns={saleSecondColumns}
                setColumns={setSaleSecondColumns}
                hideSchemeColumn={true}
              />
            </div>
          </div>
        )}

      </div>
    </section>
  );
};


const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [billingData, setBillingData] = useState([]);

  // One normalized API dataset is the source for BOTH the upper dashboard
  // and the detailed report. No second/alternate data source is used.
  const reportApiData = useMemo(() => billingData.map(normalizeBillingRow), [billingData]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get initial financial year dates
  const { startDate: initialStartDate, endDate: initialEndDate } = getFinancialYearDates();

  // राशि filter state
  const [selectedRashi, setSelectedRashi] = useState('subsidy');
  const rashiOptions = [
    { value: 'farmerShare', label: 'कृषक अंश (रु0)' },
    { value: 'subsidy', label: 'अनुदान राशि (रु0)' },
    { value: 'total', label: 'कुल राशि' }
  ];

  // Date filter states - Initialize with current financial year
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [appliedStartDate, setAppliedStartDate] = useState(initialStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(initialEndDate);
  const [isDateFilterApplied, setIsDateFilterApplied] = useState(true);
  
  // Filter states - now arrays for multiple selection
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [selectedInvestments, setSelectedInvestments] = useState([]);

  // Track open collapsible tables by key
  const [openCollapses, setOpenCollapses] = useState([]);

  // State for scheme table filter
  const [selectedTableSchemes, setSelectedTableSchemes] = useState([]);

  // State for vidhan sabha table filters
  const [selectedVidhanSabhas, setSelectedVidhanSabhas] = useState([]);
  const [selectedVidhanSchemes, setSelectedVidhanSchemes] = useState([]);

  // State for center table filters
  const [selectedCenters, setSelectedCenters] = useState([]);
  const [selectedCenterSchemes, setSelectedCenterSchemes] = useState([]);

  // State for sub-investment table filters
  const [selectedSubInvestments, setSelectedSubInvestments] = useState([]);
  const [selectedSubInvestmentSchemes, setSelectedSubInvestmentSchemes] = useState([]);

  // State for investment table filters
  const [selectedMainInvestments, setSelectedMainInvestments] = useState([]);
  const [selectedMainInvestmentSchemes, setSelectedMainInvestmentSchemes] = useState([]);

  // Toggle collapsible handler
  const toggleCollapse = (key) => {
    setOpenCollapses(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Excel preview state
  const [excelPreviewData, setExcelPreviewData] = useState(null);
  const [showExcelPreview, setShowExcelPreview] = useState(false);

  // Filter data by date range first
  const dateFilteredData = useMemo(() => {
    if (!isDateFilterApplied || (!appliedStartDate && !appliedEndDate)) {
      return reportApiData;
    }

    return reportApiData.filter(item => {
      const itemDate = item.date ? new Date(item.date) : null;
      const start = appliedStartDate ? new Date(appliedStartDate) : null;
      const end = appliedEndDate ? new Date(appliedEndDate) : null;

      if (!itemDate || Number.isNaN(itemDate.getTime())) return false;
      if (start && end) return itemDate >= start && itemDate <= end;
      if (start) return itemDate >= start;
      if (end) return itemDate <= end;
      return true;
    });
  }, [reportApiData, appliedStartDate, appliedEndDate, isDateFilterApplied]);

  // Keep both top filter option lists independent, exactly like the
  // filters inside "विस्तृत रिपोर्ट".
  const schemeOptions = useMemo(() => {
    return [...new Set(
      dateFilteredData
        .map(item => item.scheme_name)
        .filter(Boolean)
    )].sort((a, b) => String(a).localeCompare(String(b), 'hi'));
  }, [dateFilteredData]);

  const investmentOptions = useMemo(() => {
    return [...new Set(
      dateFilteredData
        .map(item => item.sub_investment_name)
        .filter(Boolean)
    )].sort((a, b) => String(a).localeCompare(String(b), 'hi'));
  }, [dateFilteredData]);

  // SINGLE SOURCE OF TRUTH:
  // The exact same filteredData is used by all upper calculations/charts
  // and passed into "विस्तृत रिपोर्ट", so counts and totals always match.
  const filteredData = useMemo(() => {
    const schemeValues = selectedSchemes.map(s => s.value);
    const investmentValues = selectedInvestments.map(i => i.value);

    return dateFilteredData.filter(item => {
      const schemeMatch =
        schemeValues.length === 0 || schemeValues.includes(item.kraya);
      const investmentMatch =
        investmentValues.length === 0 || investmentValues.includes(item.upnivesh);
      return schemeMatch && investmentMatch;
    });
  }, [dateFilteredData, selectedSchemes, selectedInvestments]);

  // Calculate aggregated statistics
  const aggregatedStats = useMemo(() => {
    return filteredData.reduce((stats, row) => ({
      totalRecords: stats.totalRecords + 1,
      allocatedQuantity: stats.allocatedQuantity + row.matra,
      farmerShareAmount: stats.farmerShareAmount + row.ansh,
      subsidyAmount: stats.subsidyAmount + row.anudan,
      totalAmount: stats.totalAmount + row.kul,
    }), {
      totalRecords: 0,
      allocatedQuantity: 0,
      farmerShareAmount: 0,
      subsidyAmount: 0,
      totalAmount: 0,
    });
  }, [filteredData]);

  // Chart data for Center-wise analysis (केंद्र)
  const centerChartData = useMemo(() => {
    const centerData = {};
    filteredData.forEach(item => {
      const center = item.center_name || 'अन्य';
      if (!centerData[center]) {
        centerData[center] = { farmerShare: 0, subsidy: 0, total: 0, quantity: 0 };
      }
      centerData[center].farmerShare += parseFloat(item.amount_of_farmer_share) || 0;
      centerData[center].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      centerData[center].total += parseFloat(item.total_amount) || 0;
      centerData[center].quantity += parseFloat(item.allocated_quantity) || 0;
    });

    const sortedEntries = Object.entries(centerData).sort((a, b) => b[1].total - a[1].total);
    const labels = sortedEntries.map(([key]) => key);
    const truncated = labels.map(l => l.length > 20 ? l.substring(0, 18) + '...' : l);

    const baseColors = [
      'rgba(40, 167, 69, 0.8)', '#12355b', 'rgba(253, 126, 20, 0.8)',
      'rgba(102, 16, 242, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(32, 201, 151, 0.8)'
    ];
    const colors = labels.map((_, i) => baseColors[i % baseColors.length]);

    return {
      doughnut: {
        labels: truncated,
        fullLabels: labels,
        datasets: [{
          data: sortedEntries.map(([, val]) => val.total),
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.8', '1')),
          borderWidth: 1
        }]
      },
      rawData: centerData,
      itemCount: labels.length
    };
  }, [filteredData]);

  // Chart data for Vidhan Sabha-wise analysis (विधानसभा)
  const vidhanChartData = useMemo(() => {
    const vidhanData = {};
    filteredData.forEach(item => {
      const vidhan = item.vidhan_sabha_name || item.vidhanasabha || 'अन्य';
      if (!vidhanData[vidhan]) {
        vidhanData[vidhan] = { farmerShare: 0, subsidy: 0, total: 0, quantity: 0 };
      }
      vidhanData[vidhan].farmerShare += parseFloat(item.amount_of_farmer_share) || 0;
      vidhanData[vidhan].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      vidhanData[vidhan].total += parseFloat(item.total_amount) || 0;
      vidhanData[vidhan].quantity += parseFloat(item.allocated_quantity) || 0;
    });

    const sortedEntries = Object.entries(vidhanData).sort((a, b) => b[1].total - a[1].total);
    const fullLabels = sortedEntries.map(([key]) => key);
    const truncatedLabels = fullLabels.map(l => l.length > 20 ? l.substring(0, 18) + '...' : l);

    // generate colors
    const baseColors = [
      'rgba(40, 167, 69, 0.8)', '#12355b', 'rgba(253, 126, 20, 0.8)',
      'rgba(102, 16, 242, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(32, 201, 151, 0.8)',
      'rgba(255, 193, 7, 0.8)', 'rgba(23, 162, 184, 0.8)', 'rgba(108, 117, 125, 0.8)'
    ];
    const colors = fullLabels.map((_, i) => baseColors[i % baseColors.length]);

    const limitedFull = fullLabels.slice(0, 50);
    const limitedTruncated = truncatedLabels.slice(0, 50);

    return {
      doughnut: {
        labels: limitedTruncated,
        fullLabels: limitedFull,
        datasets: [{
          data: limitedFull.map(l => (vidhanData[l] && vidhanData[l].total) || 0),
          backgroundColor: colors.slice(0, limitedFull.length),
          borderColor: colors.slice(0, limitedFull.length).map(c => c.replace('0.8', '1')),
          borderWidth: 1
        }]
      },
      rawData: vidhanData,
      itemCount: fullLabels.length
    };
  }, [filteredData]);

  // Format number to Indian currency format
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Collapse graphs section cards initially and toggle on header click
  useEffect(() => {
    const container = document.getElementById('graphsSection');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.chart-card'));
    cards.forEach(card => {
      const header = card.querySelector('.chart-card-header');
      const body = card.querySelector('.card-body');
      if (header && body) {
        body.style.display = 'none';
        header.style.cursor = 'pointer';
        const toggle = () => {
          body.style.display = (body.style.display === 'none') ? '' : 'none';
        };
        header.addEventListener('click', toggle);
        // store for cleanup
        header.__toggle = toggle;
      }
    });

    return () => {
      cards.forEach(card => {
        const header = card.querySelector('.chart-card-header');
        if (header && header.__toggle) header.removeEventListener('click', header.__toggle);
      });
    };
  }, [filteredData]);

  // Reorder chart-cards inside graphsSection into a hierarchical order
  useEffect(() => {
    const container = document.getElementById('graphsSection');
    if (!container) return;
    const cardNodes = Array.from(container.querySelectorAll('.chart-card'));
    const order = [
      'क्रय योजना-वार', // scheme summary
      'क्रय योजना-वार कुल सब्सिडी तुलना',
      'उप-मद',
      'उप-मद - योजना',
      'मद',
      'केंद्र के अनुसार',
      'केंद्र के अनुसार क्रय योजना-वार',
      'विधानसभा के अनुसार',
      'विधानसभा के अनुसार क्रय योजना-वार'
    ];

    const getRank = (card) => {
      const hdr = card.querySelector('.chart-card-header h6');
      const text = hdr ? hdr.textContent.trim() : '';
      for (let i = 0; i < order.length; i++) {
        if (text.includes(order[i]) || text.startsWith(order[i])) return i;
      }
      return order.length + 1;
    };

    cardNodes.sort((a, b) => getRank(a) - getRank(b));
    cardNodes.forEach(node => container.appendChild(node));
  }, [filteredData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Chart data for scheme-wise analysis
  const schemeChartData = useMemo(() => {
    const schemeData = {};
    filteredData.forEach(item => {
      const scheme = item.scheme_name || 'अन्य';
      if (!schemeData[scheme]) {
        schemeData[scheme] = {
          farmerShare: 0,
          subsidy: 0,
          total: 0,
          quantity: 0
        };
      }
      schemeData[scheme].farmerShare += parseFloat(item.amount_of_farmer_share) || 0;
      schemeData[scheme].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      schemeData[scheme].total += parseFloat(item.total_amount) || 0;
      schemeData[scheme].quantity += parseFloat(item.allocated_quantity) || 0;
    });

    const labels = Object.keys(schemeData);
    const colors = [
      '#12355b', 'rgba(40, 167, 69, 0.8)', 'rgba(255, 193, 7, 0.8)',
      'rgba(220, 53, 69, 0.8)', '#12355b', 'rgba(108, 117, 125, 0.8)',
      'rgba(102, 16, 242, 0.8)', 'rgba(253, 126, 20, 0.8)', 'rgba(32, 201, 151, 0.8)'
    ];

    return {
      bar: {
        labels,
        datasets: [
          {
            label: translations.farmerShareAmount,
            data: labels.map(l => schemeData[l].farmerShare),
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 1
          },
          {
            label: translations.subsidyAmount,
            data: labels.map(l => schemeData[l].subsidy),
            backgroundColor: 'rgba(23, 162, 184, 0.7)',
            borderColor: 'rgba(23, 162, 184, 1)',
            borderWidth: 1
          }
        ]
      },
      pie: {
        labels,
        datasets: [{
          data: labels.map(l => schemeData[l].total),
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
          borderWidth: 2
        }]
      },
      rawData: schemeData
    };
  }, [filteredData]);

  // Chart data for investment-wise analysis (उप-मद)
  const investmentChartData = useMemo(() => {
    const investmentData = {};
    filteredData.forEach(item => {
      const investment = item.sub_investment_name || 'अन्य';
      if (!investmentData[investment]) {
        investmentData[investment] = {
          farmerShare: 0,
          subsidy: 0,
          total: 0,
          quantity: 0
        };
      }
      investmentData[investment].farmerShare += parseFloat(item.amount_of_farmer_share) || 0;
      investmentData[investment].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      investmentData[investment].total += parseFloat(item.total_amount) || 0;
      investmentData[investment].quantity += parseFloat(item.allocated_quantity) || 0;
    });

    // Sort by total amount descending for better visibility
    const sortedEntries = Object.entries(investmentData)
      .sort((a, b) => b[1].total - a[1].total);
    
    const labels = sortedEntries.map(([key]) => key);
    const truncatedLabels = labels.map(l => l.length > 20 ? l.substring(0, 18) + '...' : l);
    
    // Generate more colors for many items
    const baseColors = [
      'rgba(40, 167, 69, 0.8)', 'rgba(25, 78, 139, 0.8)', 'rgba(253, 126, 20, 0.8)',
      'rgba(102, 16, 242, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(32, 201, 151, 0.8)',
      'rgba(255, 193, 7, 0.8)', 'rgba(23, 162, 184, 0.8)', 'rgba(108, 117, 125, 0.8)',
      'rgba(0, 123, 255, 0.8)', 'rgba(111, 66, 193, 0.8)', 'rgba(253, 51, 114, 0.8)',
      'rgba(0, 200, 150, 0.8)', 'rgba(255, 120, 100, 0.8)', 'rgba(80, 180, 220, 0.8)',
      'rgba(180, 100, 200, 0.8)', 'rgba(100, 200, 100, 0.8)', 'rgba(255, 160, 50, 0.8)'
    ];
    const colors = labels.map((_, i) => baseColors[i % baseColors.length]);

    return {
      bar: {
        labels: truncatedLabels,
        fullLabels: labels, // Keep full labels for tooltips
        datasets: [
          {
            label: translations.farmerShareAmount,
            data: sortedEntries.map(([, val]) => val.farmerShare),
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 1
          },
          {
            label: translations.subsidyAmount,
            data: sortedEntries.map(([, val]) => val.subsidy),
            backgroundColor: 'rgba(23, 162, 184, 0.7)',
            borderColor: 'rgba(23, 162, 184, 1)',
            borderWidth: 1
          }
        ]
      },
      doughnut: {
        labels: truncatedLabels,
        fullLabels: labels,
        datasets: [{
          data: sortedEntries.map(([, val]) => val.total),
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.8', '1')),
          borderWidth: 1
        }]
      },
      rawData: investmentData,
      itemCount: labels.length
    };
  }, [filteredData]);

  // Chart data for main investment-wise subsidy analysis
  const investmentSubsidyChartData = useMemo(() => {
    const investmentData = {};
    filteredData.forEach(item => {
      const investment = item.investment_name || 'अन्य';
      if (!investmentData[investment]) {
        investmentData[investment] = {
          subsidy: 0,
          quantity: 0
        };
      }
      investmentData[investment].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      investmentData[investment].quantity += parseFloat(item.allocated_quantity) || 0;
    });

    const labels = Object.keys(investmentData).sort((a, b) => investmentData[b].subsidy - investmentData[a].subsidy);
    const truncatedLabels = labels.map(label => label.length > 15 ? label.substring(0, 15) + '...' : label);

    // Generate colors for the chart
    const baseColors = [
      'rgba(40, 167, 69, 0.8)', 'rgba(25, 78, 139, 0.8)', 'rgba(253, 126, 20, 0.8)',
      'rgba(102, 16, 242, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(32, 201, 151, 0.8)',
      'rgba(255, 193, 7, 0.8)', 'rgba(23, 162, 184, 0.8)', 'rgba(108, 117, 125, 0.8)',
      'rgba(0, 123, 255, 0.8)', 'rgba(111, 66, 193, 0.8)', 'rgba(253, 51, 114, 0.8)',
      'rgba(0, 200, 150, 0.8)', 'rgba(255, 120, 100, 0.8)', 'rgba(80, 180, 220, 0.8)',
      'rgba(180, 100, 200, 0.8)', 'rgba(100, 200, 100, 0.8)', 'rgba(255, 160, 50, 0.8)'
    ];
    const colors = labels.map((_, i) => baseColors[i % baseColors.length]);

    const data = labels.map(label => investmentData[label].subsidy);

    return {
      doughnut: {
        labels: truncatedLabels,
        fullLabels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
          borderWidth: 1
        }]
      },
      rawData: investmentData,
      itemCount: labels.length
    };
  }, [filteredData]);

  // Combined table data (Investment-wise Scheme breakdown)
  const combinedTableData = useMemo(() => {
    // Build investment -> scheme -> { subsidy, farmerShare, total, quantity }
    const investmentSchemeData = {};
    filteredData.forEach(item => {
      const investment = item.investment_name || 'अन्य';
      const scheme = item.scheme_name || 'अन्य';
      const subsidy = parseFloat(item.amount_of_subsidy) || 0;
      const farmerShare = parseFloat(item.amount_of_farmer_share) || 0;
      const total = parseFloat(item.total_amount) || 0;
      const qty = parseFloat(item.allocated_quantity) || 0;
      if (!investmentSchemeData[investment]) investmentSchemeData[investment] = {};
      if (!investmentSchemeData[investment][scheme]) investmentSchemeData[investment][scheme] = { subsidy: 0, farmerShare: 0, total: 0, quantity: 0 };
      investmentSchemeData[investment][scheme].subsidy += subsidy;
      investmentSchemeData[investment][scheme].farmerShare += farmerShare;
      investmentSchemeData[investment][scheme].total += total;
      investmentSchemeData[investment][scheme].quantity += qty;
    });

    const investments = Object.keys(investmentSchemeData).sort();
    const allSchemes = new Set();
    investments.forEach(inv => {
      Object.keys(investmentSchemeData[inv]).forEach(sch => allSchemes.add(sch));
    });
    const schemes = Array.from(allSchemes).sort();

    const totals = {};
    const quantities = {};
    investments.forEach(inv => {
      totals[inv] = schemes.reduce((sum, sch) => sum + ((investmentSchemeData[inv][sch] && investmentSchemeData[inv][sch].subsidy) || 0), 0);
      quantities[inv] = schemes.reduce((sum, sch) => sum + ((investmentSchemeData[inv][sch] && investmentSchemeData[inv][sch].quantity) || 0), 0);
    });
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const grandQuantity = Object.values(quantities).reduce((sum, val) => sum + val, 0);

    return { investments, schemes, data: investmentSchemeData, totals, quantities, grandTotal, grandQuantity };
  }, [filteredData]);

  // Sub-investment table data (Sub-investment-wise Scheme breakdown)
  const subCombinedTableData = useMemo(() => {
    const subInvestmentSchemeData = {};
    filteredData.forEach(item => {
      const subInvestment = item.sub_investment_name || 'अन्य';
      const scheme = item.scheme_name || 'अन्य';
      const subsidy = parseFloat(item.amount_of_subsidy) || 0;
      const farmerShare = parseFloat(item.amount_of_farmer_share) || 0;
      const total = parseFloat(item.total_amount) || 0;
      const qty = parseFloat(item.allocated_quantity) || 0;
      if (!subInvestmentSchemeData[subInvestment]) subInvestmentSchemeData[subInvestment] = {};
      if (!subInvestmentSchemeData[subInvestment][scheme]) subInvestmentSchemeData[subInvestment][scheme] = { subsidy: 0, farmerShare: 0, total: 0, quantity: 0 };
      subInvestmentSchemeData[subInvestment][scheme].subsidy += subsidy;
      subInvestmentSchemeData[subInvestment][scheme].farmerShare += farmerShare;
      subInvestmentSchemeData[subInvestment][scheme].total += total;
      subInvestmentSchemeData[subInvestment][scheme].quantity += qty;
    });

    const subInvestments = Object.keys(subInvestmentSchemeData).sort();
    const allSchemes = new Set();
    subInvestments.forEach(subInv => {
      Object.keys(subInvestmentSchemeData[subInv]).forEach(sch => allSchemes.add(sch));
    });
    const schemes = Array.from(allSchemes).sort();

    const data = subInvestmentSchemeData;
    const totals = {};
    const quantities = {};
    subInvestments.forEach(subInv => {
      totals[subInv] = schemes.reduce((sum, sch) => sum + ((data[subInv][sch] && data[subInv][sch].subsidy) || 0), 0);
      quantities[subInv] = schemes.reduce((sum, sch) => sum + ((data[subInv][sch] && data[subInv][sch].quantity) || 0), 0);
    });
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const grandQuantity = Object.values(quantities).reduce((sum, val) => sum + val, 0);

    return { subInvestments, schemes, data, totals, quantities, grandTotal, grandQuantity };
  }, [filteredData]);

  // Vidhan Sabha table data (Vidhan Sabha - Scheme breakdown)
  const vidhanCombinedTableData = useMemo(() => {
    const vidhanSchemeData = {};
    const vidhanQuantities = {};
    filteredData.forEach(item => {
      const vidhan = item.vidhan_sabha_name || 'अन्य';
      const scheme = item.scheme_name || 'अन्य';
      const subsidy = parseFloat(item.amount_of_subsidy) || 0;
      const farmerShare = parseFloat(item.amount_of_farmer_share) || 0;
      const total = parseFloat(item.total_amount) || 0;
      const qty = parseFloat(item.allocated_quantity) || 0;
      if (!vidhanSchemeData[vidhan]) vidhanSchemeData[vidhan] = {};
      if (!vidhanSchemeData[vidhan][scheme]) vidhanSchemeData[vidhan][scheme] = { subsidy: 0, farmerShare: 0, total: 0, quantity: 0 };
      vidhanSchemeData[vidhan][scheme].subsidy += subsidy;
      vidhanSchemeData[vidhan][scheme].farmerShare += farmerShare;
      vidhanSchemeData[vidhan][scheme].total += total;
      vidhanSchemeData[vidhan][scheme].quantity += qty;
      if (!vidhanQuantities[vidhan]) vidhanQuantities[vidhan] = 0;
      vidhanQuantities[vidhan] += qty;
    });

    const vidhans = Object.keys(vidhanSchemeData).sort();
    const allSchemes = new Set();
    vidhans.forEach(v => Object.keys(vidhanSchemeData[v]).forEach(s => allSchemes.add(s)));
    const schemes = Array.from(allSchemes).sort();

    const totals = {};
    const quantities = {};
    vidhans.forEach(v => {
      totals[v] = schemes.reduce((sum, sch) => sum + ((vidhanSchemeData[v][sch] && vidhanSchemeData[v][sch].subsidy) || 0), 0);
      quantities[v] = vidhanQuantities[v] || 0;
    });
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const grandQuantity = Object.values(quantities).reduce((sum, val) => sum + val, 0);

    return { vidhans, schemes, data: vidhanSchemeData, totals, grandTotal, quantities, grandQuantity };
  }, [filteredData]);

    // Center (Kendra) table data (Center - Scheme breakdown)
    const centerCombinedTableData = useMemo(() => {
      const centerSchemeData = {};
      const centerQuantities = {};
      filteredData.forEach(item => {
        const center = item.center_name || 'अन्य';
        const scheme = item.scheme_name || 'अन्य';
        const subsidy = parseFloat(item.amount_of_subsidy) || 0;
        const farmerShare = parseFloat(item.amount_of_farmer_share) || 0;
        const total = parseFloat(item.total_amount) || 0;
        const qty = parseFloat(item.allocated_quantity) || 0;
        if (!centerSchemeData[center]) centerSchemeData[center] = {};
        if (!centerSchemeData[center][scheme]) centerSchemeData[center][scheme] = { subsidy: 0, farmerShare: 0, total: 0, quantity: 0 };
        centerSchemeData[center][scheme].subsidy += subsidy;
        centerSchemeData[center][scheme].farmerShare += farmerShare;
        centerSchemeData[center][scheme].total += total;
        centerSchemeData[center][scheme].quantity += qty;
        if (!centerQuantities[center]) centerQuantities[center] = 0;
        centerQuantities[center] += qty;
      });

      const centers = Object.keys(centerSchemeData).sort();
      const allSchemes = new Set();
      centers.forEach(c => Object.keys(centerSchemeData[c]).forEach(s => allSchemes.add(s)));
      const schemes = Array.from(allSchemes).sort();

      const totals = {};
      const quantities = {};
      centers.forEach(c => {
        totals[c] = schemes.reduce((sum, sch) => sum + ((centerSchemeData[c][sch] && centerSchemeData[c][sch].subsidy) || 0), 0);
        quantities[c] = centerQuantities[c] || 0;
      });
      const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
      const grandQuantity = Object.values(quantities).reduce((sum, val) => sum + val, 0);

      return { centers, schemes, data: centerSchemeData, totals, grandTotal, quantities, grandQuantity };
    }, [filteredData]);

  // Combined chart data for pie chart (subsidy per investment)
  const combinedChartData = useMemo(() => {
    const colors = [
      'rgba(102, 16, 242, 0.8)', 'rgba(25, 78, 139, 0.8)', 'rgba(40, 167, 69, 0.8)',
      'rgba(253, 126, 20, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(23, 162, 184, 0.8)',
      'rgba(255, 193, 7, 0.8)', 'rgba(32, 201, 151, 0.8)', 'rgba(111, 66, 193, 0.8)',
      'rgba(253, 51, 114, 0.8)'
    ];

    return {
      labels: combinedTableData.investments.slice(0, 10), // Top 10 investments
      datasets: [{
        data: combinedTableData.investments.slice(0, 10).map(inv => combinedTableData.totals[inv]),
        backgroundColor: colors.slice(0, combinedTableData.investments.length),
        borderColor: colors.slice(0, combinedTableData.investments.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2
      }]
    };
  }, [combinedTableData]);

  // Chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 11 },
          padding: 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 10 },
          callback: (value) => {
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value}`;
          }
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { size: 9 },
          padding: 4,
          boxWidth: 10,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: 1,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            // Show full label in tooltip
            const chart = context[0].chart;
            const fullLabels = chart.data.fullLabels || chart.data.labels;
            return fullLabels[context[0].dataIndex];
          },
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `राशि: ${formatCurrency(context.raw)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Special options for doughnut with many items - show top 15 only
  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: {
        display: false // Hide legend, we'll show a custom table below
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const chart = context[0].chart;
            const fullLabels = chart.data.fullLabels || chart.data.labels;
            return fullLabels[context[0].dataIndex];
          },
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `कुल राशि: ${formatCurrency(context.raw)} (${percentage}%)`;
          }
        }
      }
    }
  };

  const horizontalBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 11 },
          padding: 10
        }
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const chart = context[0].chart;
            const fullLabels = chart.data.fullLabels || chart.data.labels;
            return fullLabels[context[0].dataIndex];
          },
          label: (context) => {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          font: { size: 10 },
          callback: (value) => {
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value}`;
          }
        }
      },
      y: {
        ticks: {
          font: { size: 8 }
        }
      }
    }
  };

  // Bar chart options specifically for उप-मद (handles many items)
  const investmentBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal bars for better readability with many items
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 11, weight: 'bold' },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const chart = context[0].chart;
            const fullLabels = chart.data.fullLabels || chart.data.labels;
            return fullLabels[context[0].dataIndex];
          },
          label: (context) => {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          font: { size: 10 },
          callback: (value) => {
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value}`;
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 10 },
          autoSkip: false,
          padding: 5
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 20
      }
    }
  };

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
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        const apiRows = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.results)
            ? responseData.results
            : responseData && typeof responseData === "object"
              ? [responseData]
              : [];

        const normalizedData = apiRows.map((item) => ({
          ...item,
          allocated_quantity: Number(item.allocated_quantity) || 0,
          rate: Number(item.rate) || 0,
          updated_quantity: Number(item.updated_quantity) || 0,
          amount_of_farmer_share: Number(item.amount_of_farmer_share) || 0,
          amount_of_subsidy: Number(item.amount_of_subsidy) || 0,
          total_amount: Number(item.total_amount) || 0,
          farmer_selling_rate: Number(item.farmer_selling_rate) || 0,
          farmer_subsidy_rate: Number(item.farmer_subsidy_rate) || 0,
          anudan_name: item.anudan_name ?? "",
          remark: item.remark ?? "",
          bill_date: item.bill_date ?? "",
          vikas_khand_name: item.vikas_khand_name ?? "",
          vidhan_sabha_name: item.vidhan_sabha_name ?? "",
        }));

        setBillingData(normalizedData);
      } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setError(translations.networkError);
        } else if (err.message.includes('HTTP error')) {
          setError(translations.serverError);
        } else {
          setError(translations.dataError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  // Handle apply date filter
  const handleApplyDateFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setIsDateFilterApplied(true);
    // Reset scheme and investment selections when date filter changes
    setSelectedSchemes([]);
    setSelectedInvestments([]);
  };

  // Handle clear date filter
  const handleClearDateFilter = () => {
    const { startDate: fyStartDate, endDate: fyEndDate } = getFinancialYearDates();
    setStartDate(fyStartDate);
    setEndDate(fyEndDate);
    setAppliedStartDate(fyStartDate);
    setAppliedEndDate(fyEndDate);
    setIsDateFilterApplied(true);
    setSelectedSchemes([]);
    setSelectedInvestments([]);
  };

  // Handle scheme filter change
  const handleSchemeChange = (selected) => {
    setSelectedSchemes(selected || []);
  };

  // Handle investment filter change
  const handleInvestmentChange = (selected) => {
    setSelectedInvestments(selected || []);
  };

  // Function to retry fetching data
  const retryFetch = () => {
    window.location.reload();
  };

  // State for PDF preview modal
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');

  // State for share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState(null); // 'pdf' or 'excel'
  const [shareFileUrl, setShareFileUrl] = useState('');
  const [shareFileName, setShareFileName] = useState('');

  // Get filter status text for report
  const getFilterStatusText = () => {
    const filters = [];
    if (isDateFilterApplied && (appliedStartDate || appliedEndDate)) {
      filters.push(`तिथि: ${formatDate(appliedStartDate) || 'N/A'} से ${formatDate(appliedEndDate) || 'N/A'}`);
    }
    if (selectedSchemes.length > 0) {
      filters.push(`क्रय क्रय योजना: ${selectedSchemes.map(s => s.label).join(', ')}`);
    }
    if (selectedInvestments.length > 0) {
      filters.push(`उप-मद: ${selectedInvestments.map(i => i.label).join(', ')}`);
    }
    return filters.length > 0 ? filters.join(' | ') : 'सभी डेटा (कोई फ़िल्टर नहीं)';
  };

  // Prepare report data based on filtered data
  const getReportData = () => {
    // Group by scheme and investment
    const schemeWise = {};
    const investmentWise = {};
    
    filteredData.forEach(item => {
      // Scheme-wise aggregation
      const scheme = item.scheme_name || 'अन्य';
      if (!schemeWise[scheme]) {
        schemeWise[scheme] = { quantity: 0, farmerShare: 0, subsidy: 0, total: 0, count: 0 };
      }
      schemeWise[scheme].quantity += parseFloat(item.allocated_quantity) || 0;
      schemeWise[scheme].farmerShare += parseFloat(item.amount_of_farmer_share) || 0;
      schemeWise[scheme].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      schemeWise[scheme].total += parseFloat(item.total_amount) || 0;
      schemeWise[scheme].count += 1;

      // Investment-wise aggregation
      const investment = item.sub_investment_name || 'अन्य';
      if (!investmentWise[investment]) {
        investmentWise[investment] = { quantity: 0, farmerShare: 0, subsidy: 0, total: 0, count: 0 };
      }
      investmentWise[investment].quantity += parseFloat(item.allocated_quantity) || 0;
      investmentWise[investment].farmerShare += parseFloat(item.amount_of_farmer_share) || 0;
      investmentWise[investment].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      investmentWise[investment].total += parseFloat(item.total_amount) || 0;
      investmentWise[investment].count += 1;
    });

    return { schemeWise, investmentWise };
  };

  // Prepare main investment subsidy data
  const getMainInvestmentSubsidyData = () => {
    const mainInvestmentSubsidy = {};
    filteredData.forEach(item => {
      const investment = item.investment_name || 'अन्य';
      if (!mainInvestmentSubsidy[investment]) {
        mainInvestmentSubsidy[investment] = { subsidy: 0, count: 0 };
      }
      mainInvestmentSubsidy[investment].subsidy += parseFloat(item.amount_of_subsidy) || 0;
      mainInvestmentSubsidy[investment].count += 1;
    });
    return mainInvestmentSubsidy;
  };

  // Prepare combined data (Investment-wise Scheme breakdown)
  const getCombinedData = () => {
    const investmentSchemeData = {};
    filteredData.forEach(item => {
      const investment = item.investment_name || 'अन्य';
      const scheme = item.scheme_name || 'अन्य';
      const subsidy = parseFloat(item.amount_of_subsidy) || 0;
      if (!investmentSchemeData[investment]) investmentSchemeData[investment] = {};
      if (!investmentSchemeData[investment][scheme]) investmentSchemeData[investment][scheme] = 0;
      investmentSchemeData[investment][scheme] += subsidy;
    });

    const investments = Object.keys(investmentSchemeData).sort();
    const allSchemes = new Set();
    investments.forEach(inv => {
      Object.keys(investmentSchemeData[inv]).forEach(sch => allSchemes.add(sch));
    });
    const schemes = Array.from(allSchemes).sort();

    const data = investmentSchemeData;
    const totals = {};
    investments.forEach(inv => {
      totals[inv] = schemes.reduce((sum, sch) => sum + (data[inv][sch] || 0), 0);
    });
    const grandTotal = investments.reduce((sum, inv) => sum + totals[inv], 0);

    return { investments, schemes, data, totals, grandTotal };
  };

  // Prepare sub-combined data (Sub-investment-wise Scheme breakdown)
  const getSubCombinedData = () => {
    const subInvestmentSchemeData = {};
    filteredData.forEach(item => {
      const subInvestment = item.sub_investment_name || 'अन्य';
      const scheme = item.scheme_name || 'अन्य';
      const subsidy = parseFloat(item.amount_of_subsidy) || 0;
      if (!subInvestmentSchemeData[subInvestment]) subInvestmentSchemeData[subInvestment] = {};
      if (!subInvestmentSchemeData[subInvestment][scheme]) subInvestmentSchemeData[subInvestment][scheme] = 0;
      subInvestmentSchemeData[subInvestment][scheme] += subsidy;
    });

    const subInvestments = Object.keys(subInvestmentSchemeData).sort();
    const allSchemes = new Set();
    subInvestments.forEach(subInv => {
      Object.keys(subInvestmentSchemeData[subInv]).forEach(sch => allSchemes.add(sch));
    });
    const schemes = Array.from(allSchemes).sort();

    const data = subInvestmentSchemeData;
    const totals = {};
    subInvestments.forEach(subInv => {
      totals[subInv] = schemes.reduce((sum, sch) => sum + (data[subInv][sch] || 0), 0);
    });
    const grandTotal = subInvestments.reduce((sum, subInv) => sum + totals[subInv], 0);

    return { subInvestments, schemes, data, totals, grandTotal };
  };

  // Generate PDF Report using html2pdf for proper Hindi support
  const generatePDF = (action = 'download') => {
    // Use UI aggregations so PDF mirrors the collapsible tables
    const schemeData = schemeChartData && schemeChartData.rawData ? schemeChartData.rawData : {};
    const investmentData = investmentChartData && investmentChartData.rawData ? investmentChartData.rawData : {};
    const combined = combinedTableData || { investments: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const subCombined = subCombinedTableData || { subInvestments: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const centerCombined = centerCombinedTableData || { centers: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const vidhanCombined = vidhanCombinedTableData || { vidhans: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const mainInvestmentSubsidy = getMainInvestmentSubsidyData();
    const currentDate = new Date().toLocaleDateString('hi-IN');

    // Create HTML content for PDF (only include open collapsible tables)
    const pdfContent = `
      <style>
        @page {
          margin: 12mm 10mm 12mm 10mm;
          size: A4 landscape;
        }
        
        /* Prevent headings from breaking across pages */
        h1, h2 {
          page-break-after: avoid;
          page-break-inside: avoid;
          margin-top: 18px !important;
          margin-bottom: 10px !important;
        }
        
        /* Prevent table headers from breaking */
        thead {
          page-break-inside: avoid;
        }
        
        /* Allow table rows to break but prefer not to */
        tbody tr {
          page-break-inside: avoid;
        }
        
        /* Ensure sections don't break awkwardly */
        div[style*="margin-bottom"] {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        
        /* Force page breaks before major sections if needed */
        div[style*="margin-bottom"]:nth-child(n+3) {
          page-break-before: auto;
        }
        
        /* Keep table headers with their tables */
        table {
          page-break-inside: auto;
          width: 100%;
        }
        
        /* Prevent table headers from being orphaned */
        thead {
          page-break-after: avoid;
        }
        
        /* Allow table body to break but keep rows together when possible */
        tbody {
          page-break-inside: auto;
        }
        
        /* Prevent single rows at bottom of page */
        tbody tr:last-child {
          page-break-inside: avoid;
        }
        
        /* Ensure table captions/headings stay with their tables */
        h2 + table {
          page-break-before: avoid;
        }
      </style>
      <div style="font-family: 'Noto Sans Devanagari', 'Mangal', Arial, sans-serif; padding: 20px; color: #333;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; page-break-inside: avoid;">
          <h1 style="color: #000; font-size: 24px; margin: 0;">DHO कोटद्वार बिलिंग रिपोर्ट</h1>
          <p style="color: #000; font-size: 12px; margin: 5px 0 0 0;">रिपोर्ट तिथि: ${currentDate}</p>
          <p style="color: #000; font-size: 11px; margin: 3px 0 0 0;">फ़िल्टर: ${getFilterStatusText()}</p>
        </div>

        <!-- Summary Section -->
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <h2 style="color: #000; font-size: 16px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px;">सारांश</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 10px; color: #333; text-align: center;">कुल रिकॉर्ड</th>
                <th style="border: 1px solid #ddd; padding: 10px; color: #333; text-align: center;">भौतिक पूर्ति </th>
                <th style="border: 1px solid #ddd; padding: 10px; color: #333; text-align: center;">किसान हिस्सेदारी</th>
                <th style="border: 1px solid #ddd; padding: 10px; color: #333; text-align: center;">सब्सिडी</th>
                <th style="border: 1px solid #ddd; padding: 10px; color: #333; text-align: center;">कुल राशि</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #f8f9fa;">
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${aggregatedStats.totalRecords}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${aggregatedStats.allocatedQuantity.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #28a745;">₹${aggregatedStats.farmerShareAmount.toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #6610f2;">₹${aggregatedStats.subsidyAmount.toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #194e8b;">₹${aggregatedStats.totalAmount.toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

         <!-- Scheme-wise Section (from UI aggregations) -->
         ${openCollapses.includes('scheme') ? `
         <div style="margin-bottom: 20px; page-break-inside: avoid;">
           <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">क्रय योजना-वार कुल सब्सिडी तुलना</h2>
           <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
             <thead>
               <tr style=" color:#000;">
                 <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">#</th>
                 <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">योजना</th>
                 <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">भौतिक पूर्ति </th>
                 <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">${rashiOptions.find(opt => opt.value === selectedRashi)?.label || 'कुल राशि'}</th>
               </tr>
             </thead>
             <tbody>
               ${Object.entries(schemeData)
                 .filter(([label]) => selectedTableSchemes.length === 0 || selectedTableSchemes.some(s => s.value === label))
                 .sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0)))
                 .map(([name, val], idx) => `
                 <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                   <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx+1}</td>
                   <td style="border: 1px solid #ddd; padding: 6px;">${name}</td>
                   <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${((val && val.quantity) || 0).toFixed(2)}</td>
                   <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">₹${((val && val[selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
               `).join('')}
             </tbody>
             <tfoot>
               <tr style="font-weight:700; background:#f1f5f9;">
                 <td colSpan="2" style="border:1px solid #ddd; padding:6px;">कुल</td>
                 <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(Object.entries(schemeData || {})
                   .filter(([label]) => selectedTableSchemes.length === 0 || selectedTableSchemes.some(s => s.value === label))
                   .reduce((s,[_, v])=> s + ((v && v.quantity) || 0),0)).toFixed(2)}</td>
                 <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(Object.entries(schemeData || {})
                   .filter(([label]) => selectedTableSchemes.length === 0 || selectedTableSchemes.some(s => s.value === label))
                   .reduce((s,[_, v])=> s + ((v && v[selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
               </tr>
             </tfoot>
           </table>
         </div>
         ` : ''}

        <!-- Investment-wise Section (from UI aggregations) -->
        ${openCollapses.includes('investment') ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">उप-मद के अनुसार - कुल सब्सिडी तुलना</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #ffffff; color: #000000;">
                <th style="border:1px solid #ddd; padding:6px; color: #000000;">#</th>
                <th style="border:1px solid #ddd; padding:6px; color: #000000; text-align:left;">उप-मद</th>
                <th style="border:1px solid #ddd; padding:6px; color: #000000; text-align:right;">भौतिक पूर्ति </th>
                <th style="border:1px solid #ddd; padding:6px; color: #000000; text-align:right;">${rashiOptions.find(opt => opt.value === selectedRashi)?.label || 'कुल राशि'}</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(investmentData).sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0))).map(([name,val], idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx+1}</td>
                  <td style="border:1px solid #ddd; padding:6px;">${name}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">${((val && val.quantity) || 0).toFixed(2)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${((val && val[selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700; background:#f1f5f9;">
                <td colSpan="2" style="border:1px solid #ddd; padding:6px;">कुल</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(Object.values(investmentData||{}).reduce((s,v)=> s + ((v && v.quantity) || 0),0)).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(Object.values(investmentData||{}).reduce((s,v)=> s + ((v && v[selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}

         <!-- Sub-investment Scheme Section (matrix with मात्रा + selectedRashi) -->
         ${openCollapses.includes('subInvestment') ? `
         <div style="margin-bottom: 20px; page-break-inside: avoid;">
           <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">उप-मद - योजना तुलना</h2>
           <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
             <thead>
               <tr style=" color: #000;">
                 <th style="border:1px solid #ddd; padding:6px;">#</th>
                 <th style="border:1px solid #ddd; padding:6px; text-align:left;">उप-मद</th>
                 ${subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).map(s => `<th style="border:1px solid #ddd; padding:6px; text-align:center;" colspan="2">${s}</th>`).join('')}
                 <th style="border:1px solid #ddd; padding:6px; text-align:center;" colspan="2">कुल</th>
               </tr>
               <tr style="background:#e9eef8;">
                 <th></th>
                 <th></th>
                 ${subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).map(() => `<th style="border:1px solid #ddd; padding:6px; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:6px; text-align:right;">${rashiOptions.find(opt => opt.value === selectedRashi)?.label}</th>`).join('')}
                 <th style="border:1px solid #ddd; padding:6px; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:6px; text-align:right;">कुल ${rashiOptions.find(opt => opt.value === selectedRashi)?.label}</th>
               </tr>
             </thead>
             <tbody>
               ${subCombined.subInvestments.filter(subInv => selectedSubInvestments.length === 0 || selectedSubInvestments.some(selected => selected.value === subInv)).map((subInv, idx) => `
                 <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                   <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx+1}</td>
                   <td style="border:1px solid #ddd; padding:6px;">${subInv}</td>
                   ${subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).map(s => `
                     <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(((subCombined.data[subInv] && subCombined.data[subInv][s]) && subCombined.data[subInv][s].quantity) || 0).toFixed(2)}</td>
                     <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(((subCombined.data[subInv] && subCombined.data[subInv][s]) && subCombined.data[subInv][s][selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                   `).join('')}
                   <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((subCombined.data[subInv] && subCombined.data[subInv][s]) && subCombined.data[subInv][s].quantity) || 0), 0)).toFixed(2)}</td>
                   <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((subCombined.data[subInv] && subCombined.data[subInv][s]) && subCombined.data[subInv][s][selectedRashi]) || 0), 0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
               `).join('')}
             </tbody>
             <tfoot>
               <tr style="font-weight:700; background:#f1f5f9;">
                 <td colSpan="2" style="border:1px solid #ddd; padding:6px;">कुल</td>
                 ${subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).map(s => `
                   <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(subCombined.subInvestments.filter(subInv => selectedSubInvestments.length === 0 || selectedSubInvestments.some(selected => selected.value === subInv)).reduce((sum, si) => sum + (((subCombined.data[si] && subCombined.data[si][s]) && subCombined.data[si][s].quantity) || 0),0)).toFixed(2)}</td>
                   <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(subCombined.subInvestments.filter(subInv => selectedSubInvestments.length === 0 || selectedSubInvestments.some(selected => selected.value === subInv)).reduce((sum, si) => sum + (((subCombined.data[si] && subCombined.data[si][s]) && subCombined.data[si][s][selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 `).join('')}
                 <td style="border:1px solid #ddd; padding:6px; text-align:right;">${subCombined.subInvestments.filter(subInv => selectedSubInvestments.length === 0 || selectedSubInvestments.some(selected => selected.value === subInv)).reduce((sum, subInv) => sum + subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((subCombined.data[subInv] && subCombined.data[subInv][s]) && subCombined.data[subInv][s].quantity) || 0), 0), 0).toFixed(2)}</td>
                 <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${subCombined.subInvestments.filter(subInv => selectedSubInvestments.length === 0 || selectedSubInvestments.some(selected => selected.value === subInv)).reduce((sum, subInv) => sum + subCombined.schemes.filter(s => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((subCombined.data[subInv] && subCombined.data[subInv][s]) && subCombined.data[subInv][s][selectedRashi]) || 0), 0), 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
               </tr>
             </tfoot>
           </table>
         </div>
         ` : ''}

        <!-- Center-wise Subsidy Comparison Table -->
        ${openCollapses.includes('center') ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">केंद्र के अनुसार राशि तुलना</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style=" color: #000;">
                <th style="border:1px solid #ddd; padding:6px;">#</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:left;">केंद्र</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:right;">भौतिक पूर्ति </th>
                <th style="border:1px solid #ddd; padding:6px; text-align:right;">${rashiOptions.find(opt => opt.value === selectedRashi)?.label || 'कुल राशि'}</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(centerChartData.rawData).sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0))).map(([name, val], idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx+1}</td>
                  <td style="border:1px solid #ddd; padding:6px;">${name}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">${((val && val.quantity) || 0).toFixed(2)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${((val && val[selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700; background:#f1f5f9;">
                <td colSpan="2" style="border:1px solid #ddd; padding:6px;">कुल</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(Object.values(centerChartData.rawData || {}).reduce((s,v)=> s + ((v && v.quantity) || 0),0)).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(Object.values(centerChartData.rawData || {}).reduce((s,v)=> s + ((v && v[selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}

         <!-- Center-Scheme Combined Section (matrix with मात्रा + selectedRashi) -->
         ${openCollapses.includes('centerCombined') ? `
         <div style="margin-bottom: 20px; page-break-inside: avoid;">
           <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">केंद्र के अनुसार क्रय योजना-वार तुलना</h2>
           <table style="width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed;">
             <thead>
               <tr style=" color:#000;">
                 <th style="border:1px solid #ddd; padding:5px; width:35px;">#</th>
                 <th style="border:1px solid #ddd; padding:5px; text-align:left;">केंद्र</th>
                 ${centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).map(s => `<th style="border:1px solid #ddd; padding:5px; text-align:center;" colspan="2">${s.substring(0, 18)}${s.length > 18 ? '..' : ''}</th>`).join('')}
                 <th style="border:1px solid #ddd; padding:5px; text-align:center;" colspan="2">कुल</th>
               </tr>
               <tr style="background:#e9eef8;">
                 <th></th>
                 <th></th>
                 ${centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).map(() => `<th style="border:1px solid #ddd; padding:5px; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:5px; text-align:right;">राशि</th>`).join('')}
                 <th style="border:1px solid #ddd; padding:5px; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:5px; text-align:right;">राशि</th>
               </tr>
             </thead>
             <tbody>
               ${centerCombined.centers.filter(c => selectedCenters.length === 0 || selectedCenters.some(selected => selected.value === c)).map((c, idx) => `
                 <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                   <td style="border:1px solid #ddd; padding:5px; text-align:center;">${idx+1}</td>
                   <td style="border:1px solid #ddd; padding:5px;">${c.substring(0, 22)}${c.length > 22 ? '..' : ''}</td>
                   ${centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).map(s => `
                     <td style="border:1px solid #ddd; padding:5px; text-align:right;">${(((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s].quantity) || 0).toFixed(2)}</td>
                     <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${(((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s][selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                   `).join('')}
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">${(centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s].quantity) || 0), 0)).toFixed(2)}</td>
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${(centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s][selectedRashi]) || 0), 0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
               `).join('')}
             </tbody>
             <tfoot>
               <tr style="font-weight:700; background:#f1f5f9;">
                 <td colSpan="2" style="border:1px solid #ddd; padding:5px;">कुल</td>
                 ${centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).map(s => `
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">${(centerCombined.centers.filter(c => selectedCenters.length === 0 || selectedCenters.some(selected => selected.value === c)).reduce((sum, c) => sum + (((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s].quantity) || 0),0)).toFixed(2)}</td>
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${(centerCombined.centers.filter(c => selectedCenters.length === 0 || selectedCenters.some(selected => selected.value === c)).reduce((sum, c) => sum + (((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s][selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 `).join('')}
                 <td style="border:1px solid #ddd; padding:5px; text-align:right;">${centerCombined.centers.filter(c => selectedCenters.length === 0 || selectedCenters.some(selected => selected.value === c)).reduce((sum, c) => sum + centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s].quantity) || 0), 0), 0).toFixed(2)}</td>
                 <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${centerCombined.centers.filter(c => selectedCenters.length === 0 || selectedCenters.some(selected => selected.value === c)).reduce((sum, c) => sum + centerCombined.schemes.filter(s => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((centerCombined.data[c] && centerCombined.data[c][s]) && centerCombined.data[c][s][selectedRashi]) || 0), 0), 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
               </tr>
             </tfoot>
           </table>
         </div>
         ` : ''}

        <!-- Vidhan Sabha-wise Subsidy Comparison Table -->
        ${openCollapses.includes('vidhan') ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">विधानसभा के अनुसार राशि तुलना</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: linear-gradient(135deg, #194e8b, #2d6cb5); color: white;">
                <th style="border:1px solid #ddd; padding:6px;">#</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:left;">विधानसभा</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:right;">भौतिक पूर्ति </th>
                <th style="border:1px solid #ddd; padding:6px; text-align:right;">${rashiOptions.find(opt => opt.value === selectedRashi)?.label || 'कुल राशि'}</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(vidhanChartData.rawData).sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0))).map(([name, val], idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                  <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx+1}</td>
                  <td style="border:1px solid #ddd; padding:6px;">${name}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">${((val && val.quantity) || 0).toFixed(2)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${((val && val[selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:700; background:#f1f5f9;">
                <td colSpan="2" style="border:1px solid #ddd; padding:6px;">कुल</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(Object.values(vidhanChartData.rawData || {}).reduce((s,v)=> s + ((v && v.quantity) || 0),0)).toFixed(2)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(Object.values(vidhanChartData.rawData || {}).reduce((s,v)=> s + ((v && v[selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}

         <!-- Vidhan Sabha Section (from UI aggregations) -->
         ${openCollapses.includes('vidhanCombined') ? `
         <div style="margin-bottom: 20px; page-break-inside: avoid;">
           <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">विधानसभा के अनुसार - क्रय योजना-वार तुलना</h2>
           <table style="width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed;">
             <thead>
               <tr style=" color:#000;">
                 <th style="border:1px solid #ddd; padding:5px; width:35px;">#</th>
                 <th style="border:1px solid #ddd; padding:5px; text-align:left;">विधानसभा</th>
                 ${vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).map(s => `<th style="border:1px solid #ddd; padding:5px; text-align:center;" colspan="2">${s.substring(0, 18)}${s.length > 18 ? '..' : ''}</th>`).join('')}
                 <th style="border:1px solid #ddd; padding:5px; text-align:center;" colspan="2">कुल</th>
               </tr>
               <tr style="background:#e9eef8;">
                 <th></th>
                 <th></th>
                 ${vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).map(() => `<th style="border:1px solid #ddd; padding:5px; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:5px; text-align:right;">राशि</th>`).join('')}
                 <th style="border:1px solid #ddd; padding:5px; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:5px; text-align:right;">राशि</th>
               </tr>
             </thead>
             <tbody>
               ${vidhanCombined.vidhans.filter(v => selectedVidhanSabhas.length === 0 || selectedVidhanSabhas.some(selected => selected.value === v)).map((v, idx) => `
                 <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                   <td style="border:1px solid #ddd; padding:5px; text-align:center;">${idx+1}</td>
                   <td style="border:1px solid #ddd; padding:5px;">${v.substring(0, 22)}${v.length > 22 ? '..' : ''}</td>
                   ${vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).map(s => `
                     <td style="border:1px solid #ddd; padding:5px; text-align:right;">${(((vidhanCombined.data[v] && vidhanCombined.data[v][s]) && vidhanCombined.data[v][s].quantity) || 0).toFixed(2)}</td>
                     <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${(((vidhanCombined.data[v] && vidhanCombined.data[v][s]) && vidhanCombined.data[v][s][selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                   `).join('')}
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">${(vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((vidhanCombined.data[v] && vidhanCombined.data[v][s]) && vidhanCombined.data[v][s].quantity) || 0), 0)).toFixed(2)}</td>
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${(vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((vidhanCombined.data[v] && vidhanCombined.data[v][s]) && vidhanCombined.data[v][s][selectedRashi]) || 0), 0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
               `).join('')}
             </tbody>
             <tfoot>
               <tr style="font-weight:700; background:#f1f5f9;">
                 <td colSpan="2" style="border:1px solid #ddd; padding:5px;">कुल</td>
                 ${vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).map(s => `
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">${(vidhanCombined.vidhans.filter(v => selectedVidhanSabhas.length === 0 || selectedVidhanSabhas.some(selected => selected.value === v)).reduce((sum, v) => sum + (((vidhanCombined.data[v][s] && vidhanCombined.data[v][s].quantity) || 0)), 0)).toFixed(2)}</td>
                   <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${(vidhanCombined.vidhans.filter(v => selectedVidhanSabhas.length === 0 || selectedVidhanSabhas.some(selected => selected.value === v)).reduce((sum, v) => sum + (((vidhanCombined.data[v][s] && vidhanCombined.data[v][s][selectedRashi]) || 0)), 0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 `).join('')}
                 <td style="border:1px solid #ddd; padding:5px; text-align:right;">${vidhanCombined.vidhans.filter(v => selectedVidhanSabhas.length === 0 || selectedVidhanSabhas.some(selected => selected.value === v)).reduce((sum, v) => sum + vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((vidhanCombined.data[v] && vidhanCombined.data[v][s]) && vidhanCombined.data[v][s].quantity) || 0), 0), 0).toFixed(2)}</td>
                 <td style="border:1px solid #ddd; padding:5px; text-align:right;">₹${vidhanCombined.vidhans.filter(v => selectedVidhanSabhas.length === 0 || selectedVidhanSabhas.some(selected => selected.value === v)).reduce((sum, v) => sum + vidhanCombined.schemes.filter(s => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((vidhanCombined.data[v] && vidhanCombined.data[v][s]) && vidhanCombined.data[v][s][selectedRashi]) || 0), 0), 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
               </tr>
             </tfoot>
           </table>
         </div>
         ` : ''}

         <!-- Main Investment Subsidy Section (match UI: name, quantity, subsidy) -->
         ${openCollapses.includes('mainInvestment') ? `
         <div style="margin-bottom: 25px; page-break-inside: avoid;">
           <h2 style="color: #17a2b8; font-size: 16px; border-bottom: 2px solid #17a2b8; padding-bottom: 5px; margin-bottom: 10px;">मद के अनुसार ग्राफ़ - ${rashiColumnLabelExcel[selectedRashi]}</h2>
           <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
             <thead>
               <tr>
                 <th style="border: 1px solid #ddd; padding: 6px; color: white; text-align: left;">#</th>
                 <th style="border: 1px solid #ddd; padding: 6px; color: white; text-align: left;">मद नाम</th>
                 <th style="border: 1px solid #ddd; padding: 6px; color: white; text-align: right;">भौतिक पूर्ति </th>
                 <th style="border: 1px solid #ddd; padding: 6px; color: white; text-align: right;">${rashiColumnLabelExcel[selectedRashi]}</th>
               </tr>
             </thead>
             <tbody>
               ${Object.entries(investmentChartData.rawData)
                 .filter(([name]) => selectedInvestments.length === 0 || selectedInvestments.some(selected => selected.value === name))
                 .sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0))).map(([name, val], idx) => `
                 <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                   <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
                   <td style="border: 1px solid #ddd; padding: 6px; font-size: 8px;">${name}</td>
                   <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${((val && val.quantity) || 0).toFixed(2)}</td>
                   <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">₹${((val && val[selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
               `).join('')}
             </tbody>
             <tfoot>
               <tr style="font-weight: 700; background-color: #f1f5f9;">
                 <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">कुल</td>
                 <td style="border: 1px solid #ddd; padding: 6px;"></td>
                 <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">${(Object.entries(investmentChartData.rawData || {})
                   .filter(([name]) => selectedInvestments.length === 0 || selectedInvestments.some(selected => selected.value === name))
                   .reduce((s,[_, v])=> s + ((v && v.quantity) || 0),0)).toFixed(2)}</td>
                 <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">₹${(Object.entries(investmentChartData.rawData || {})
                   .filter(([name]) => selectedInvestments.length === 0 || selectedInvestments.some(selected => selected.value === name))
                   .reduce((s,[_, v])=> s + ((v && v[selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
               </tr>
             </tfoot>
           </table>
         </div>
         ` : ''}

          <!-- Combined Investment-Scheme Section (matrix with मात्रा + सब्सिडी) -->
          ${openCollapses.includes('investmentCombined') ? `
          <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h2 style="color: #000; font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">मद - योजना तुलना</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="background: #ffffff; color: black;">
                  <th style="border:1px solid #ddd; padding:6px; color: black;">#</th>
                  <th style="border:1px solid #ddd; padding:6px; color: black; text-align:left;">मद</th>
                  ${combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).map(s => `<th style="border:1px solid #ddd; padding:6px; color: black; text-align:center;" colspan="2">${s}</th>`).join('')}
                  <th style="border:1px solid #ddd; padding:6px; color: black; text-align:center;" colspan="2">कुल</th>
                </tr>
                <tr style="background:#ffffff; color: black;">
                  <th style="border:1px solid #ddd; padding:6px; color: black;"></th>
                  <th style="border:1px solid #ddd; padding:6px; color: black;"></th>
                  ${combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).map(() => `<th style="border:1px solid #ddd; padding:6px; color: black; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:6px; color: black; text-align:right;">${rashiOptions.find(opt => opt.value === selectedRashi)?.label}</th>`).join('')}
                  <th style="border:1px solid #ddd; padding:6px; color: black; text-align:right;">मात्रा</th><th style="border:1px solid #ddd; padding:6px; color: black; text-align:right;">कुल ${rashiOptions.find(opt => opt.value === selectedRashi)?.label}</th>
                </tr>
              </thead>
              <tbody>
                ${combined.investments.filter(inv => selectedMainInvestments.length === 0 || selectedMainInvestments.some(selected => selected.value === inv)).map((inv, idx) => `
                  <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx+1}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${inv}</td>
                    ${combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).map(s => `
                      <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s].quantity) || 0).toFixed(2)}</td>
                      <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s][selectedRashi]) || 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                    `).join('')}
                    <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s].quantity) || 0), 0)).toFixed(2)}</td>
                    <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).reduce((sum, s) => sum + (((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s][selectedRashi]) || 0), 0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8f9fa; color: #000000;">
                  <td colSpan="2" style="border:1px solid #ddd; padding:6px; color: #000000;">कुल</td>
                  ${combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).map(s => `
                    <td style="border:1px solid #ddd; padding:6px; text-align:right;">${(combined.investments.filter(inv => selectedMainInvestments.length === 0 || selectedMainInvestments.some(selected => selected.value === inv)).reduce((sum, inv) => sum + (((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s].quantity) || 0),0)).toFixed(2)}</td>
                    <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${(combined.investments.filter(inv => selectedMainInvestments.length === 0 || selectedMainInvestments.some(selected => selected.value === inv)).reduce((sum, inv) => sum + (((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s][selectedRashi]) || 0),0)).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                  `).join('')}
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">${combined.investments.filter(inv => selectedMainInvestments.length === 0 || selectedMainInvestments.some(selected => selected.value === inv)).reduce((sum, inv) => sum + combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s].quantity) || 0), 0), 0).toFixed(2)}</td>
                  <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${combined.investments.filter(inv => selectedMainInvestments.length === 0 || selectedMainInvestments.some(selected => selected.value === inv)).reduce((sum, inv) => sum + combined.schemes.filter(s => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(selected => selected.value === s)).reduce((schemeSum, s) => schemeSum + (((combined.data[inv] && combined.data[inv][s]) && combined.data[inv][s][selectedRashi]) || 0), 0), 0).toLocaleString('hi-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          ` : ''}

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; color: #888; font-size: 9px;">
          <p>DHO कोटद्वार बिलिंग प्रणाली | रिपोर्ट जनरेट तिथि: ${currentDate}</p>
        </div>
      </div>
    `;

    // Create a temporary element
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    document.body.appendChild(element);

    const opt = {
      margin: [12, 10, 12, 10],
      filename: `DHO_रिपोर्ट_${currentDate.replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'landscape',
        compress: true,
        precision: 16,
        userUnit: 1.0
      },
      pagebreak: { 
        mode: ['css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: ['h1', 'h2', 'thead', 'tr']
      }
    };

    if (action === 'download') {
      html2pdf().set(opt).from(element).save().then(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }).catch((err) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        console.error('PDF download error:', err);
        alert('PDF बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
      });
    } else {
      html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }

        if (action === 'share') {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const fileName = `DHO_रिपोर्ट_${currentDate.replace(/\//g, '-')}.pdf`;

          // Replace an older share URL safely.
          setShareFileUrl(prevUrl => {
            if (prevUrl) {
              try { URL.revokeObjectURL(prevUrl); } catch (_) {}
            }
            return pdfUrl;
          });
          setShareFileName(fileName);
        } else {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          setPdfPreviewUrl(pdfUrl);
          setShowPdfPreview(true);
        }
      }).catch((err) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        console.error('PDF generation error:', err);
        alert('PDF बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
      });
    }
  };

  // Share handlers for PDF and Excel
  // Share handlers for PDF and Excel
  const handleShare = async (type) => {
    // IMPORTANT: close every Bootstrap preview/modal before opening Share.
    // A leftover Bootstrap .modal-backdrop can sit above the page and make
    // every control appear disabled / unclickable.
    setShowPdfPreview(false);
    setShowExcelPreview(false);

    // Remove stale Bootstrap modal state/backdrops immediately.
    try {
      document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
    } catch (cleanupError) {
      console.warn('Modal cleanup warning:', cleanupError);
    }

    // Clean up any previous temporary file URL first.
    if (shareFileUrl) {
      try { URL.revokeObjectURL(shareFileUrl); } catch (_) {}
    }

    setShareType(type);
    setShareFileUrl('');
    setShareFileName('');
    setShowShareModal(true);

    try {
      if (type === 'pdf') {
        // Use the same PDF generator as the normal PDF download.
        // This fixes the previous issue where an iframe containing a PDF
        // was passed to html2pdf, producing an invalid/blank share file.
        generatePDF('share');
      } else {
        // Build the Excel workbook directly and create a real ArrayBuffer Blob.
        const currentDate = new Date().toLocaleDateString('hi-IN');
        const { schemeWise, investmentWise } = getReportData();
        const { investments, schemes, data, totals, grandTotal } = getCombinedData();
        const { subInvestments, schemes: subSchemes, data: subData, totals: subTotals, grandTotal: subGrandTotal } = getSubCombinedData();
        const mainInvestmentSubsidy = getMainInvestmentSubsidyData();

        const wb = XLSX.utils.book_new();

        const summaryData = [
          ['DHO कोटद्वार बिलिंग रिपोर्ट'],
          [`रिपोर्ट तिथि: ${currentDate}`],
          [`फ़िल्टर: ${getFilterStatusText()}`],
          [],
          ['सारांश'],
          ['कुल रिकॉर्ड', 'भौतिक पूर्ति ', 'किसान हिस्सेदारी', 'सब्सिडी', 'कुल राशि'],
          [
            aggregatedStats.totalRecords,
            Number(aggregatedStats.allocatedQuantity || 0).toFixed(2),
            Number(aggregatedStats.farmerShareAmount || 0).toFixed(2),
            Number(aggregatedStats.subsidyAmount || 0).toFixed(2),
            Number(aggregatedStats.totalAmount || 0).toFixed(2)
          ]
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = [
          { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'सारांश');

        const rashiColumnLabelExcel = {
          farmerShare: 'कृषक अंश (रु0)',
          subsidy: 'अनुदान राशि (रु0)',
          total: 'कुल राशि'
        };

        // Scheme-wise
        if (openCollapses.includes('scheme')) {
          const schemeRaw = schemeChartData?.rawData || {};
          const schemeHeaders = ['#', 'योजना', 'भौतिक पूर्ति ', rashiColumnLabelExcel[selectedRashi]];
          const schemeRows = Object.entries(schemeRaw)
            .filter(([label]) =>
              selectedTableSchemes.length === 0 ||
              selectedTableSchemes.some(s => s.value === label)
            )
            .sort((a, b) => (b[1][selectedRashi] || 0) - (a[1][selectedRashi] || 0))
            .map(([name, val], idx) => [
              idx + 1,
              name,
              Number(val?.quantity || 0).toFixed(2),
              Number(val?.[selectedRashi] || 0).toFixed(2)
            ]);

          const ws = XLSX.utils.aoa_to_sheet([schemeHeaders, ...schemeRows]);
          ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 18 }];
          XLSX.utils.book_append_sheet(wb, ws, 'क्रय योजना-वार');
        }

        // Investment-wise
        if (openCollapses.includes('investment')) {
          const invRaw = investmentChartData?.rawData || {};
          const headers = ['#', 'उप-मद', 'भौतिक पूर्ति ', rashiColumnLabelExcel[selectedRashi]];
          const rows = Object.entries(invRaw)
            .sort((a, b) => (b[1][selectedRashi] || 0) - (a[1][selectedRashi] || 0))
            .map(([name, val], idx) => [
              idx + 1,
              name,
              Number(val?.quantity || 0).toFixed(2),
              Number(val?.[selectedRashi] || 0).toFixed(2)
            ]);

          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 18 }];
          XLSX.utils.book_append_sheet(wb, ws, 'उप-मद-वार');
        }

        // Sub-investment - Scheme
        if (openCollapses.includes('subInvestment')) {
          const sub = subCombinedTableData || {
            subInvestments: [], schemes: [], data: {}
          };

          const filteredSchemes = sub.schemes.filter(
            s => selectedSubInvestmentSchemes.length === 0 ||
                 selectedSubInvestmentSchemes.some(x => x.value === s)
          );
          const filteredSubInvestments = sub.subInvestments.filter(
            s => selectedSubInvestments.length === 0 ||
                 selectedSubInvestments.some(x => x.value === s)
          );

          const headers = [
            '#',
            'उप-मद',
            ...filteredSchemes.flatMap(s => [
              `${s} - मात्रा`,
              `${s} - ${rashiColumnLabelExcel[selectedRashi]}`
            ]),
            'कुल मात्रा',
            `कुल ${rashiColumnLabelExcel[selectedRashi]}`
          ];

          const rows = filteredSubInvestments.map((si, idx) => [
            idx + 1,
            si,
            ...filteredSchemes.flatMap(s => [
              Number(sub.data?.[si]?.[s]?.quantity || 0).toFixed(2),
              Number(sub.data?.[si]?.[s]?.[selectedRashi] || 0).toFixed(2)
            ]),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(sub.data?.[si]?.[s]?.quantity || 0), 0
            ).toFixed(2),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(sub.data?.[si]?.[s]?.[selectedRashi] || 0), 0
            ).toFixed(2)
          ]);

          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          ws['!cols'] = [
            { wch: 6 }, { wch: 30 },
            ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 18 }]),
            { wch: 15 }, { wch: 18 }
          ];
          XLSX.utils.book_append_sheet(wb, ws, 'उप-मद - योजना');
        }

        // Main investment subsidy
        if (openCollapses.includes('mainInvestment')) {
          const raw = investmentChartData?.rawData || {};
          const headers = ['#', 'मद नाम', 'भौतिक पूर्ति ', rashiColumnLabelExcel[selectedRashi]];
          const rows = Object.entries(raw)
            .sort((a, b) => (b[1][selectedRashi] || 0) - (a[1][selectedRashi] || 0))
            .map(([name, val], idx) => [
              idx + 1,
              name,
              Number(val?.quantity || 0).toFixed(2),
              Number(val?.[selectedRashi] || 0).toFixed(2)
            ]);

          rows.push([
            'कुल',
            '',
            Object.values(raw).reduce((s, v) => s + Number(v?.quantity || 0), 0).toFixed(2),
            Object.values(raw).reduce((s, v) => s + Number(v?.[selectedRashi] || 0), 0).toFixed(2)
          ]);

          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 18 }];
          XLSX.utils.book_append_sheet(wb, ws, 'मद सब्सिडी');
        }

        // Center - Scheme
        if (openCollapses.includes('centerCombined')) {
          const center = centerCombinedTableData || {
            centers: [], schemes: [], data: {}
          };

          const filteredSchemes = center.schemes.filter(
            s => selectedCenterSchemes.length === 0 ||
                 selectedCenterSchemes.some(x => x.value === s)
          );
          const filteredCenters = center.centers.filter(
            c => selectedCenters.length === 0 ||
                 selectedCenters.some(x => x.value === c)
          );

          const headers = [
            '#',
            'केंद्र',
            ...filteredSchemes.flatMap(s => [
              `${s} - मात्रा`,
              `${s} - ${rashiColumnLabelExcel[selectedRashi]}`
            ]),
            'कुल मात्रा',
            `कुल ${rashiColumnLabelExcel[selectedRashi]}`
          ];

          const rows = filteredCenters.map((c, idx) => [
            idx + 1,
            c,
            ...filteredSchemes.flatMap(s => [
              Number(center.data?.[c]?.[s]?.quantity || 0).toFixed(2),
              Number(center.data?.[c]?.[s]?.[selectedRashi] || 0).toFixed(2)
            ]),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(center.data?.[c]?.[s]?.quantity || 0), 0
            ).toFixed(2),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(center.data?.[c]?.[s]?.[selectedRashi] || 0), 0
            ).toFixed(2)
          ]);

          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          ws['!cols'] = [
            { wch: 6 }, { wch: 30 },
            ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 18 }]),
            { wch: 15 }, { wch: 18 }
          ];
          XLSX.utils.book_append_sheet(wb, ws, 'केंद्र - योजना');
        }

        // Vidhan Sabha - Scheme
        if (openCollapses.includes('vidhanCombined')) {
          const vidhan = vidhanCombinedTableData || {
            vidhans: [], schemes: [], data: {}
          };

          const filteredSchemes = vidhan.schemes.filter(
            s => selectedVidhanSchemes.length === 0 ||
                 selectedVidhanSchemes.some(x => x.value === s)
          );
          const filteredVidhans = vidhan.vidhans.filter(
            v => selectedVidhanSabhas.length === 0 ||
                 selectedVidhanSabhas.some(x => x.value === v)
          );

          const headers = [
            '#',
            'विधानसभा',
            ...filteredSchemes.flatMap(s => [
              `${s} - मात्रा`,
              `${s} - ${rashiColumnLabelExcel[selectedRashi]}`
            ]),
            'कुल मात्रा',
            `कुल ${rashiColumnLabelExcel[selectedRashi]}`
          ];

          const rows = filteredVidhans.map((v, idx) => [
            idx + 1,
            v,
            ...filteredSchemes.flatMap(s => [
              Number(vidhan.data?.[v]?.[s]?.quantity || 0).toFixed(2),
              Number(vidhan.data?.[v]?.[s]?.[selectedRashi] || 0).toFixed(2)
            ]),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(vidhan.data?.[v]?.[s]?.quantity || 0), 0
            ).toFixed(2),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(vidhan.data?.[v]?.[s]?.[selectedRashi] || 0), 0
            ).toFixed(2)
          ]);

          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          ws['!cols'] = [
            { wch: 6 }, { wch: 30 },
            ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 18 }]),
            { wch: 15 }, { wch: 18 }
          ];
          XLSX.utils.book_append_sheet(wb, ws, 'विधानसभा - योजना');
        }

        // Investment - Scheme
        if (openCollapses.includes('investmentCombined')) {
          const comb = combinedTableData || {
            investments: [], schemes: [], data: {}
          };

          const filteredSchemes = comb.schemes.filter(
            s => selectedMainInvestmentSchemes.length === 0 ||
                 selectedMainInvestmentSchemes.some(x => x.value === s)
          );
          const filteredInvestments = comb.investments.filter(
            inv => selectedMainInvestments.length === 0 ||
                   selectedMainInvestments.some(x => x.value === inv)
          );

          const headers = [
            '#',
            'मद',
            ...filteredSchemes.flatMap(s => [
              `${s} - मात्रा`,
              `${s} - ${rashiColumnLabelExcel[selectedRashi]}`
            ]),
            'कुल मात्रा',
            `कुल ${rashiColumnLabelExcel[selectedRashi]}`
          ];

          const rows = filteredInvestments.map((inv, idx) => [
            idx + 1,
            inv,
            ...filteredSchemes.flatMap(s => [
              Number(comb.data?.[inv]?.[s]?.quantity || 0).toFixed(2),
              Number(comb.data?.[inv]?.[s]?.[selectedRashi] || 0).toFixed(2)
            ]),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(comb.data?.[inv]?.[s]?.quantity || 0), 0
            ).toFixed(2),
            filteredSchemes.reduce(
              (sum, s) => sum + Number(comb.data?.[inv]?.[s]?.[selectedRashi] || 0), 0
            ).toFixed(2)
          ]);

          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          ws['!cols'] = [
            { wch: 6 }, { wch: 30 },
            ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 18 }]),
            { wch: 15 }, { wch: 18 }
          ];
          XLSX.utils.book_append_sheet(wb, ws, 'मद - योजना');
        }

        // Ensure at least one sheet always exists.
        if (!wb.SheetNames.length) {
          XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.aoa_to_sheet([['DHO कोटद्वार बिलिंग रिपोर्ट'], ['कोई अतिरिक्त तालिका चयनित नहीं है।']]),
            'रिपोर्ट'
          );
        }

        // IMPORTANT: use type:'array', not type:'binary'.
        // This produces a valid XLSX Blob in Chrome/Edge/Firefox and on mobile.
        const excelArray = XLSX.write(wb, {
          bookType: 'xlsx',
          type: 'array',
          compression: true
        });

        const excelBlob = new Blob(
          [excelArray],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );

        const fileName = `DHO_रिपोर्ट_${currentDate.replace(/\//g, '-')}.xlsx`;
        const url = URL.createObjectURL(excelBlob);

        setShareFileUrl(url);
        setShareFileName(fileName);
      }
    } catch (err) {
      console.error('Share file generation error:', err);
      setShareFileUrl('');
      setShareFileName('');
      alert(`फाइल शेयर करने के लिए बनाने में त्रुटि हुई: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleSocialShare = async (platform) => {
    if (!shareFileUrl || !shareFileName) {
      alert('फाइल अभी तैयार नहीं है। कृपया कुछ सेकंड प्रतीक्षा करें।');
      return;
    }

    const reportInfo =
      `DHO कोटद्वार बिलिंग रिपोर्ट\n` +
      `रिपोर्ट: ${shareFileName}\n` +
      `तिथि: ${new Date().toLocaleDateString('hi-IN')}\n` +
      `फ़िल्टर: ${getFilterStatusText()}`;

    try {
      // Open these URLs directly inside the click handler.
      // Waiting for async fetch() before window.open() can make browsers
      // block the new tab as a popup.
      if (platform === 'whatsapp') {
        const url = `https://wa.me/?text=${encodeURIComponent(reportInfo)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (platform === 'linkedin') {
        const url =
          `https://www.linkedin.com/sharing/share-offsite/?url=` +
          `${encodeURIComponent(window.location.href)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (platform === 'email') {
        const url =
          `mailto:?subject=${encodeURIComponent('DHO कोटद्वार बिलिंग रिपोर्ट')}` +
          `&body=${encodeURIComponent(
            reportInfo + '\n\nफाइल डाउनलोड करके ईमेल में अटैच करें।'
          )}`;
        window.location.href = url;
        return;
      }

      if (platform === 'copy') {
        try {
          await navigator.clipboard.writeText(reportInfo);
          alert('रिपोर्ट जानकारी कॉपी हो गई है।');
        } catch (err) {
          const textarea = document.createElement('textarea');
          textarea.value = reportInfo;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();

          try {
            document.execCommand('copy');
            alert('रिपोर्ट जानकारी कॉपी हो गई है।');
          } catch (_) {
            alert('कॉपी करने में त्रुटि हुई।');
          }

          document.body.removeChild(textarea);
        }
      }
    } catch (err) {
      console.error('Social share error:', err);
      alert('शेयर करने में समस्या हुई। कृपया पुनः प्रयास करें।');
    }
  };

  const handleDirectShare = async () => {
    if (!shareFileUrl || !shareFileName) return;

    try {
      const response = await fetch(shareFileUrl);
      if (!response.ok) throw new Error('Generated file could not be read.');

      const blob = await response.blob();
      const fallbackType =
        shareType === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const file = new File([blob], shareFileName, {
        type: blob.type || fallbackType
      });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'DHO कोटद्वार बिलिंग रिपोर्ट',
          text: `रिपोर्ट शेयर की जा रही है: ${shareFileName}`,
          files: [file]
        });
        return;
      }

      // Desktop browsers often do not support file sharing. In that case,
      // download the exact generated file instead of showing a misleading error.
      handleShareDownload();
      alert('इस ब्राउज़र में direct file sharing उपलब्ध नहीं है। फाइल डाउनलोड हो गई है; इसे WhatsApp/Email आदि में अटैच करके शेयर करें।');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Direct share error:', err);
      alert('फाइल शेयर नहीं हो सकी। कृपया डाउनलोड विकल्प का उपयोग करें।');
    }
  };

  const handleShareDownload = () => {
    if (!shareFileUrl || !shareFileName) return;

    const link = document.createElement('a');
    link.href = shareFileUrl;
    link.download = shareFileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Delay revocation slightly so the browser has time to start the download.
    const urlToRevoke = shareFileUrl;
    setTimeout(() => {
      try { URL.revokeObjectURL(urlToRevoke); } catch (_) {}
    }, 1500);

    setShowShareModal(false);
    setShareFileUrl('');
    setShareFileName('');
    setShareType(null);
  };

  const handleShareClose = () => {
    setShowShareModal(false);
    setShareType(null);

    // Remove any Bootstrap backdrop that may have been left behind.
    try {
      document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
    } catch (cleanupError) {
      console.warn('Modal close cleanup warning:', cleanupError);
    }
    if (shareFileUrl) {
      try { URL.revokeObjectURL(shareFileUrl); } catch (_) {}
    }
    setShareFileUrl('');
    setShareFileName('');
  };

  // Generate Excel Report
  const generateExcel = (action = 'download') => {
    const { schemeWise, investmentWise } = getReportData();
    const { investments, schemes, data, totals, grandTotal } = getCombinedData();
    const { subInvestments, schemes: subSchemes, data: subData, totals: subTotals, grandTotal: subGrandTotal } = getSubCombinedData();
    const mainInvestmentSubsidy = getMainInvestmentSubsidyData();
    const currentDate = new Date().toLocaleDateString('hi-IN');
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ['DHO कोटद्वार बिलिंग रिपोर्ट'],
      [`रिपोर्ट तिथि: ${currentDate}`],
      [`फ़िल्टर: ${getFilterStatusText()}`],
      [],
      ['सारांश'],
      ['कुल रिकॉर्ड', 'भौतिक पूर्ति ', 'किसान हिस्सेदारी', 'सब्सिडी', 'कुल राशि'],
      [
        aggregatedStats.totalRecords,
        aggregatedStats.allocatedQuantity.toFixed(2),
        aggregatedStats.farmerShareAmount.toFixed(2),
        aggregatedStats.subsidyAmount.toFixed(2),
        aggregatedStats.totalAmount.toFixed(2)
      ]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'सारांश');

    // Top-level: label map for all views
    const rashiColumnLabelExcel = {
      farmerShare: 'कृषक अंश (रु0)',
      subsidy: 'अनुदान राशि (रु0)',
      total: 'कुल राशि'
    };
    // Scheme-wise Sheet (use UI aggregation order)
    if (openCollapses.includes('scheme')) {
    const schemeData = schemeChartData && schemeChartData.rawData ? schemeChartData.rawData : {};
    const schemeHeaders = ['#', 'योजना', 'भौतिक पूर्ति ', rashiColumnLabelExcel[selectedRashi]];
    const schemeRows = Object.entries(schemeData)
      .filter(([label]) => selectedTableSchemes.length === 0 || selectedTableSchemes.some(s => s.value === label))
      .sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0)))
      .map(([name, val], idx) => [
        idx + 1, name, ((val && val.quantity) || 0).toFixed(2), ((val && val[selectedRashi]) || 0).toFixed(2)
      ]);
    const schemeWs = XLSX.utils.aoa_to_sheet([schemeHeaders, ...schemeRows]);
    schemeWs['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, schemeWs, 'क्रय योजना-वार');
    }

    // Investment-wise Sheet (from UI aggregation)
    if (openCollapses.includes('investment')) {
    const invData = investmentChartData && investmentChartData.rawData ? investmentChartData.rawData : {};
    const investmentHeaders = ['#', 'उप-मद', 'भौतिक पूर्ति ', rashiColumnLabelExcel[selectedRashi]];
    const investmentRows = Object.entries(invData).sort((a,b)=> ((b[1][selectedRashi]||0)-(a[1][selectedRashi]||0))).map(([name, val], idx) => [
      idx + 1, name, ((val && val.quantity) || 0).toFixed(2), ((val && val[selectedRashi]) || 0).toFixed(2)
    ]);
    const investmentWs = XLSX.utils.aoa_to_sheet([investmentHeaders, ...investmentRows]);
    investmentWs['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, investmentWs, 'उप-मद-वार');
    }

    // Sub-investment Scheme Sheet (flattened columns: for each scheme show मात्रा and selectedRashi)
    if (openCollapses.includes('subInvestment')) {
    const sub = subCombinedTableData || { subInvestments: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const filteredSchemes = sub.schemes.filter(scheme => selectedSubInvestmentSchemes.length === 0 || selectedSubInvestmentSchemes.some(s => s.value === scheme));
    const filteredSubInvestments = sub.subInvestments.filter(subInv => selectedSubInvestments.length === 0 || selectedSubInvestments.some(s => s.value === subInv));
    const subHeaders = ['#', 'उप-मद', ...filteredSchemes.flatMap(s => [`${s} - मात्रा`, `${s} - ${rashiColumnLabelExcel[selectedRashi]}`]), 'कुल मात्रा', `कुल ${rashiColumnLabelExcel[selectedRashi]}`];
    const subRows = filteredSubInvestments.map((si, idx) => [
      idx + 1,
      si,
      ...filteredSchemes.flatMap(s => [((sub.data[si] && sub.data[si][s] && sub.data[si][s].quantity) || 0).toFixed(2), ((sub.data[si] && sub.data[si][s] && sub.data[si][s][selectedRashi]) || 0).toFixed(2)]),
      (filteredSchemes.reduce((sum, s) => sum + (((sub.data[si] && sub.data[si][s]) && sub.data[si][s].quantity) || 0), 0)).toFixed(2),
      (filteredSchemes.reduce((sum, s) => sum + (((sub.data[si] && sub.data[si][s]) && sub.data[si][s][selectedRashi]) || 0), 0)).toFixed(2)
    ]);
    subRows.push([
      'कुल',
      '',
      ...filteredSchemes.flatMap(s => [
        (filteredSubInvestments.reduce((sum, si) => sum + (((sub.data[si] && sub.data[si][s]) && sub.data[si][s].quantity) || 0), 0)).toFixed(2),
        (filteredSubInvestments.reduce((sum, si) => sum + (((sub.data[si] && sub.data[si][s]) && sub.data[si][s][selectedRashi]) || 0), 0)).toFixed(2)
      ]),
      (filteredSubInvestments.reduce((sum, si) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((sub.data[si] && sub.data[si][s]) && sub.data[si][s].quantity) || 0), 0), 0)).toFixed(2),
      (filteredSubInvestments.reduce((sum, si) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((sub.data[si] && sub.data[si][s]) && sub.data[si][s][selectedRashi]) || 0), 0), 0)).toFixed(2)
    ]);
    const subCombinedWs = XLSX.utils.aoa_to_sheet([subHeaders, ...subRows]);
    subCombinedWs['!cols'] = [{ wch: 6 }, { wch: 30 }, ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 15 }]), { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, subCombinedWs, 'उप-मद - योजना');
    }

    // Main Investment Subsidy Sheet (match UI: name, quantity, subsidy)
    if (openCollapses.includes('mainInvestment')) {
    const mainInvestmentHeaders = ['#', 'मद नाम', 'भौतिक पूर्ति ', rashiColumnLabelExcel[selectedRashi]];
    const mainInvestmentRows = Object.entries(investmentChartData.rawData)
      .sort((a, b) => ((b[1][selectedRashi] || 0) - (a[1][selectedRashi] || 0)))
      .map(([name, val], idx) => [
        idx + 1,
        name,
        ((val && val.quantity) || 0).toFixed(2),
        ((val && val[selectedRashi]) || 0).toFixed(2)
      ]);
    mainInvestmentRows.push([
      'कुल',
      '',
      (Object.values(investmentChartData.rawData || {}).reduce((s,v)=> s + ((v && v.quantity) || 0),0)).toFixed(2),
      (Object.values(investmentChartData.rawData || {}).reduce((s,v)=> s + ((v && v[selectedRashi]) || 0),0)).toFixed(2)
    ]);
    const mainInvestmentWs = XLSX.utils.aoa_to_sheet([mainInvestmentHeaders, ...mainInvestmentRows]);
    mainInvestmentWs['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, mainInvestmentWs, 'मद सब्सिडी');
    }

    // Center (Kendra) Sheet (matrix flattened: for each scheme show मात्रा + selectedRashi)
    if (openCollapses.includes('centerCombined')) {
    const center = centerCombinedTableData || { centers: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const filteredSchemes = center.schemes.filter(scheme => selectedCenterSchemes.length === 0 || selectedCenterSchemes.some(s => s.value === scheme));
    const filteredCenters = center.centers.filter(center => selectedCenters.length === 0 || selectedCenters.some(c => c.value === center));
    const centerHeaders = ['#', 'केंद्र', ...filteredSchemes.flatMap(s => [`${s} - मात्रा`, `${s} - ${rashiColumnLabelExcel[selectedRashi]}`]), 'कुल मात्रा', `कुल ${rashiColumnLabelExcel[selectedRashi]}`];
    const centerRows = filteredCenters.map((c, idx) => [
      idx + 1,
      c,
      ...filteredSchemes.flatMap(s => [((center.data[c] && center.data[c][s] && center.data[c][s].quantity) || 0).toFixed(2), ((center.data[c] && center.data[c][s] && center.data[c][s][selectedRashi]) || 0).toFixed(2)]),
      (filteredSchemes.reduce((sum, s) => sum + (((center.data[c] && center.data[c][s]) && center.data[c][s].quantity) || 0), 0)).toFixed(2),
      (filteredSchemes.reduce((sum, s) => sum + (((center.data[c] && center.data[c][s]) && center.data[c][s][selectedRashi]) || 0), 0)).toFixed(2)
    ]);
    centerRows.push([
      'कुल',
      '',
      ...filteredSchemes.flatMap(s => [
        (filteredCenters.reduce((sum, c) => sum + (((center.data[c] && center.data[c][s]) && center.data[c][s].quantity) || 0),0)).toFixed(2),
        (filteredCenters.reduce((sum, c) => sum + (((center.data[c] && center.data[c][s]) && center.data[c][s][selectedRashi]) || 0),0)).toFixed(2)
      ]),
      (filteredCenters.reduce((sum, c) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((center.data[c] && center.data[c][s]) && center.data[c][s].quantity) || 0), 0), 0)).toFixed(2),
      (filteredCenters.reduce((sum, c) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((center.data[c] && center.data[c][s]) && center.data[c][s][selectedRashi]) || 0), 0), 0)).toFixed(2)
    ]);
    const centerWs = XLSX.utils.aoa_to_sheet([centerHeaders, ...centerRows]);
    centerWs['!cols'] = [{ wch: 6 }, { wch: 30 }, ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 15 }]), { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, centerWs, 'केंद्र - योजना');
    }

    // Vidhan Sabha Sheet (matrix flattened: for each scheme show मात्रा + selectedRashi)
    if (openCollapses.includes('vidhanCombined')) {
    const vidhan = vidhanCombinedTableData || { vidhans: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const filteredSchemes = vidhan.schemes.filter(scheme => selectedVidhanSchemes.length === 0 || selectedVidhanSchemes.some(s => s.value === scheme));
    const filteredVidhans = vidhan.vidhans.filter(vidhan => selectedVidhanSabhas.length === 0 || selectedVidhanSabhas.some(v => v.value === vidhan));
    const vidhanHeaders = ['#', 'विधानसभा', ...filteredSchemes.flatMap(s => [`${s} - मात्रा`, `${s} - ${rashiColumnLabelExcel[selectedRashi]}`]), 'कुल मात्रा', `कुल ${rashiColumnLabelExcel[selectedRashi]}`];
    const vidhanRows = filteredVidhans.map((v, idx) => [
      idx + 1,
      v,
      ...filteredSchemes.flatMap(s => [((vidhan.data[v] && vidhan.data[v][s] && vidhan.data[v][s].quantity) || 0).toFixed(2), ((vidhan.data[v] && vidhan.data[v][s] && vidhan.data[v][s][selectedRashi]) || 0).toFixed(2)]),
      (filteredSchemes.reduce((sum, s) => sum + (((vidhan.data[v] && vidhan.data[v][s]) && vidhan.data[v][s].quantity) || 0), 0)).toFixed(2),
      (filteredSchemes.reduce((sum, s) => sum + (((vidhan.data[v] && vidhan.data[v][s]) && vidhan.data[v][s][selectedRashi]) || 0), 0)).toFixed(2)
    ]);
    vidhanRows.push([
      'कुल',
      '',
      ...filteredSchemes.flatMap(s => [
        (filteredVidhans.reduce((sum, v) => sum + (((vidhan.data[v] && vidhan.data[v][s]) && vidhan.data[v][s].quantity) || 0),0)).toFixed(2),
        (filteredVidhans.reduce((sum, v) => sum + (((vidhan.data[v] && vidhan.data[v][s]) && vidhan.data[v][s][selectedRashi]) || 0),0)).toFixed(2)
      ]),
      (filteredVidhans.reduce((sum, v) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((vidhan.data[v] && vidhan.data[v][s]) && vidhan.data[v][s].quantity) || 0), 0), 0)).toFixed(2),
      (filteredVidhans.reduce((sum, v) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((vidhan.data[v] && vidhan.data[v][s]) && vidhan.data[v][s][selectedRashi]) || 0), 0), 0)).toFixed(2)
    ]);
    const vidhanWs = XLSX.utils.aoa_to_sheet([vidhanHeaders, ...vidhanRows]);
    vidhanWs['!cols'] = [{ wch: 6 }, { wch: 30 }, ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 15 }]), { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, vidhanWs, 'विधानसभा - योजना');
    }

    // Combined Investment-Scheme Sheet (matrix with मात्रा + selectedRashi flattened)
    if (openCollapses.includes('investmentCombined')) {
    const comb = combinedTableData || { investments: [], schemes: [], data: {}, totals: {}, quantities: {}, grandTotal: 0, grandQuantity: 0 };
    const filteredSchemes = comb.schemes.filter(scheme => selectedMainInvestmentSchemes.length === 0 || selectedMainInvestmentSchemes.some(s => s.value === scheme));
    const filteredInvestments = comb.investments.filter(inv => selectedMainInvestments.length === 0 || selectedMainInvestments.some(s => s.value === inv));
    const combinedHeaders = ['#', 'मद', ...filteredSchemes.flatMap(s => [`${s} - मात्रा`, `${s} - ${rashiColumnLabelExcel[selectedRashi]}`]), 'कुल मात्रा', `कुल ${rashiColumnLabelExcel[selectedRashi]}`];
    const combinedRows = filteredInvestments.map((inv, idx) => [
      idx + 1,
      inv,
      ...filteredSchemes.flatMap(s => [((comb.data[inv] && comb.data[inv][s] && comb.data[inv][s].quantity) || 0).toFixed(2), ((comb.data[inv] && comb.data[inv][s] && comb.data[inv][s][selectedRashi]) || 0).toFixed(2)]),
      (filteredSchemes.reduce((sum, s) => sum + (((comb.data[inv] && comb.data[inv][s]) && comb.data[inv][s].quantity) || 0), 0)).toFixed(2),
      (filteredSchemes.reduce((sum, s) => sum + (((comb.data[inv] && comb.data[inv][s]) && comb.data[inv][s][selectedRashi]) || 0), 0)).toFixed(2)
    ]);
    combinedRows.push([
      'कुल', '',
      ...filteredSchemes.flatMap(s => [
        (filteredInvestments.reduce((sum, inv) => sum + (((comb.data[inv] && comb.data[inv][s]) && comb.data[inv][s].quantity) || 0),0)).toFixed(2),
        (filteredInvestments.reduce((sum, inv) => sum + (((comb.data[inv] && comb.data[inv][s]) && comb.data[inv][s][selectedRashi]) || 0),0)).toFixed(2)
      ]),
      (filteredInvestments.reduce((sum, inv) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((comb.data[inv] && comb.data[inv][s]) && comb.data[inv][s].quantity) || 0), 0), 0)).toFixed(2),
      (filteredInvestments.reduce((sum, inv) => sum + filteredSchemes.reduce((schemeSum, s) => schemeSum + (((comb.data[inv] && comb.data[inv][s]) && comb.data[inv][s][selectedRashi]) || 0), 0), 0)).toFixed(2)
    ]);
    const combinedWs = XLSX.utils.aoa_to_sheet([combinedHeaders, ...combinedRows]);
    combinedWs['!cols'] = [{ wch: 6 }, { wch: 30 }, ...filteredSchemes.flatMap(() => [{ wch: 12 }, { wch: 15 }]), { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, combinedWs, 'मद - योजना');
    }

    if (action === 'download') {
      // XLSX.writeFile handles browser downloads directly.
      // Keep the workbook binary generation out of this path.
      XLSX.writeFile(wb, `DHO_रिपोर्ट_${currentDate.replace(/\//g, '-')}.xlsx`);
    } else {
      // For view, display preview modal with sheet data
      const sheetData = {};
      wb.SheetNames.forEach(sheetName => {
        sheetData[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
      });
      setExcelPreviewData({ sheets: sheetData, filename: `DHO_रिपोर्ट_${currentDate.replace(/\//g, '-')}.xlsx` });
      setShowExcelPreview(true);
    }
  };

  return (
    <>
      <div className="dashboard-container professional-dashboard">
        {/* Left Sidebar */}
        <LeftNav
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Main Content */}
        <div className="main-content professional-main-content">
          <DashBoardHeader sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <Container fluid className="dashboard-body bg-home professional-dashboard-body">
            {/* Welcome Section */}
            <div className="home-welcome-section professional-welcome d-flex justify-content-between text-center mb-4">
              <h1 className="home-title">{translations.home}</h1>
              <p className="home-subtitle">{translations.welcomeMessage}</p>
            </div>

            {/* Report Export Buttons */}
            {!loading && !error && (
              <Card className="report-export-card professional-export-card mb-4">
                <Card.Body className="py-2">
                  <Row className="align-items-center">
                    <Col md={6} className="mb-2 mb-md-0">
                      <div className="d-flex align-items-center">
                        <FaClipboardList className="text-primary me-2" />
                        <span className="report-title" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                          रिपोर्ट निर्यात करें
                        </span>
                        <span className="badge bg-info ms-2" style={{ fontSize: '0.7rem' }}>
                          {filteredData.length} रिकॉर्ड
                        </span>
                        {(isDateFilterApplied || selectedSchemes.length > 0 || selectedInvestments.length > 0) && (
                          <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.65rem' }}>
                            फ़िल्टर्ड डेटा
                          </span>
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                        {/* PDF Options */}
                        <Dropdown as={ButtonGroup} size="sm">
                          <Button variant="danger" size="sm" onClick={() => generatePDF('download')}>
                            <FaFilePdf className="me-1" /> PDF
                          </Button>
                          <Dropdown.Toggle split variant="danger" size="sm" />
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => generatePDF('view')}>
                              <FaEye className="me-2" /> देखें (View)
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => generatePDF('download')}>
                              <FaDownload className="me-2" /> डाउनलोड (Download)
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleShare('pdf')}>
                              <FaShareAlt className="me-2" /> शेयर करें (Share)
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>

                        {/* Excel Options */}
                        <Dropdown as={ButtonGroup} size="sm">
                          <Button variant="success" size="sm" onClick={() => generateExcel('download')}>
                            <FaFileExcel className="me-1" /> Excel
                          </Button>
                          <Dropdown.Toggle split variant="success" size="sm" />
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => generateExcel('view')}>
                              <FaEye className="me-2" /> देखें (View)
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => generateExcel('download')}>
                              <FaDownload className="me-2" /> डाउनलोड (Download)
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleShare('excel')}>
                              <FaShareAlt className="me-2" /> शेयर करें (Share)
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* PDF Preview Modal */}
            <Modal show={showPdfPreview} onHide={() => { setShowPdfPreview(false); URL.revokeObjectURL(pdfPreviewUrl); }} size="xl" centered>
              <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: 'white' }}>
                <Modal.Title style={{ fontSize: '1rem' }}>
                  <FaFilePdf className="me-2" /> PDF रिपोर्ट प्रीव्यू
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: 0, height: '75vh' }}>
                <iframe src={pdfPreviewUrl} width="100%" height="100%" title="PDF Preview" style={{ border: 'none' }} />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={() => { setShowPdfPreview(false); URL.revokeObjectURL(pdfPreviewUrl); }}>
                  बंद करें
                </Button>
                <Button variant="danger" size="sm" onClick={() => generatePDF('download')}>
                  <FaDownload className="me-1" /> डाउनलोड करें
                </Button>
              </Modal.Footer>
            </Modal>

            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" role="status" variant="primary">
                  <span className="visually-hidden">{translations.loading}</span>
                </Spinner>
                <p className="mt-3">{translations.loading}</p>
              </div>
            ) : error ? (
              <Alert variant="danger" className="text-center">
                {error}
                <div className="mt-2">
                  <button className="btn btn-outline-danger btn-sm" onClick={retryFetch}>
                    {translations.retry}
                  </button>
                </div>
              </Alert>
            ) : null}
          </Container>
        </div>
      </div>
      <Footer />

                {/* ==================== DYNAMIC EXCEL-STYLE REPORT TABS ==================== */}
                {reportApiData.length > 0 && <DynamicReportTabs sourceData={reportApiData} />}

      {/* Excel Preview Modal */}
      <Modal show={showExcelPreview} onHide={() => setShowExcelPreview(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>एक्सेल प्रिव्यू - {excelPreviewData?.filename}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {excelPreviewData && (
            <div>
              {Object.entries(excelPreviewData.sheets).map(([sheetName, rows]) => (
                <div key={sheetName} className="mb-4">
                  <h6 style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
                    📄 {sheetName}
                  </h6>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse', 
                      fontSize: '0.85rem',
                      border: '1px solid #ddd'
                    }}>
                      <tbody>
                        {rows.slice(0, 50).map((row, rowIdx) => (
                          <tr key={`${sheetName}-row-${rowIdx}`} style={{ 
                            backgroundColor: rowIdx === 0 ? '#194e8b' : (rowIdx % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                            borderBottom: '1px solid #ddd'
                          }}>
                            {row.map((cell, cellIdx) => (
                              <td 
                                key={`${sheetName}-cell-${rowIdx}-${cellIdx}`}
                                style={{ 
                                  padding: '8px', 
                                  border: '1px solid #ddd',
                                  color: rowIdx === 0 ? 'white' : 'black',
                                  fontWeight: rowIdx === 0 ? 'bold' : 'normal'
                                }}
                              >
                                {cell !== null && cell !== undefined ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 50 && (
                    <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '10px' }}>
                      ... और भी {rows.length - 50} पंक्तियाँ हैं। डाउनलोड करने के लिए "डाउनलोड" बटन का उपयोग करें।
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="success" 
            onClick={() => {
              setShowExcelPreview(false);
              generateExcel('download');
            }}
          >
            <FaDownload className="me-2" />
            डाउनलोड
          </Button>
          <Button variant="secondary" onClick={() => setShowExcelPreview(false)}>
            बंद करें
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Share Modal - rendered in document.body to avoid ALL parent/backdrop
          stacking-context and pointer-event conflicts. */}
      {showShareModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-report-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleShareClose();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.55)',
            pointerEvents: 'auto'
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#fff',
              borderRadius: '14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              pointerEvents: 'auto'
            }}
          >
            <div
              style={{
                backgroundColor: '#198754',
                color: '#fff',
                padding: '14px 18px',
                borderRadius: '14px 14px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div id="share-report-title" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                <FaShareAlt className="me-2" />
                {shareType === 'pdf' ? 'PDF' : 'Excel'} शेयर करें
              </div>

              <button
                type="button"
                onClick={handleShareClose}
                aria-label="Close"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#fff',
                  fontSize: '30px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0 5px',
                  pointerEvents: 'auto'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {shareFileUrl ? (
                <>
                  <div
                    className="text-center"
                    style={{
                      padding: '20px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      marginBottom: '18px'
                    }}
                  >
                    <FaDownload
                      style={{
                        fontSize: '3rem',
                        color: '#198754',
                        marginBottom: '10px'
                      }}
                    />
                    <h5 style={{ margin: '10px 0', wordBreak: 'break-word' }}>
                      {shareFileName}
                    </h5>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 0 }}>
                      फ़ाइल तैयार है। नीचे दिए गए विकल्प से शेयर करें।
                    </p>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <h6 style={{ marginBottom: '12px', color: '#333' }}>
                      सोशल मीडिया पर शेयर करें:
                    </h6>

                    <div
                      style={{
                        display: 'flex',
                        gap: '14px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSocialShare('whatsapp')}
                        title="WhatsApp पर शेयर करें"
                        style={{
                          border: 0,
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#198754',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          boxShadow: '0 2px 6px rgba(0,0,0,.2)'
                        }}
                      >
                        <FaWhatsapp style={{ fontSize: '1.8rem' }} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSocialShare('linkedin')}
                        title="LinkedIn पर शेयर करें"
                        style={{
                          border: 0,
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#0a66c2',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          boxShadow: '0 2px 6px rgba(0,0,0,.2)'
                        }}
                      >
                        <FaLinkedin style={{ fontSize: '1.8rem' }} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSocialShare('email')}
                        title="ईमेल से शेयर करें"
                        style={{
                          border: 0,
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          boxShadow: '0 2px 6px rgba(0,0,0,.2)'
                        }}
                      >
                        <FaEnvelope style={{ fontSize: '1.8rem' }} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSocialShare('copy')}
                        title="रिपोर्ट जानकारी कॉपी करें"
                        style={{
                          border: 0,
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#6c757d',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          boxShadow: '0 2px 6px rgba(0,0,0,.2)'
                        }}
                      >
                        <FaCopy style={{ fontSize: '1.8rem' }} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #ddd',
                      paddingTop: '16px',
                      marginTop: '16px'
                    }}
                  >
                    <h6 style={{ marginBottom: '12px', color: '#333' }}>
                      अन्य विकल्प:
                    </h6>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleDirectShare}
                        style={{
                          border: 0,
                          borderRadius: '6px',
                          padding: '9px 15px',
                          backgroundColor: '#0d6efd',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                      >
                        <FaShareAlt className="me-2" />
                        सीधे शेयर करें
                      </button>

                      <button
                        type="button"
                        onClick={handleShareDownload}
                        style={{
                          border: 0,
                          borderRadius: '6px',
                          padding: '9px 15px',
                          backgroundColor: '#198754',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                      >
                        <FaDownload className="me-2" />
                        डाउनलोड करें
                      </button>

                      <button
                        type="button"
                        onClick={handleShareClose}
                        style={{
                          border: 0,
                          borderRadius: '6px',
                          padding: '9px 15px',
                          backgroundColor: '#6c757d',
                          color: '#fff',
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                      >
                        बंद करें
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center" style={{ padding: '30px 10px' }}>
                  <div
                    className="spinner-border text-success mb-3"
                    role="status"
                    aria-label="Loading"
                  />
                  <p style={{ marginBottom: 0 }}>फ़ाइल तैयार की जा रही है...</p>
                </div>
              )}
            </div>

          </div>
        </div>
        , document.body)}

    </>
  );
};

export default Dashboard;
