import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Form,
  Button,
  Alert,
  Row,
  Col,
  Card,
  Spinner,
  Modal,
  Badge,
  Tabs,
  Tab,
  Table,
} from "react-bootstrap";
import axios from "axios";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import "../../assets/css/registration.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/table.css";
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";

// API URLs
const COMPONENT_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/component-list/";
const SCHEME_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/scheme-list/";

// Hindi translations
const translations = {
  pageTitle: "प्रबंधन केंद्र",
  components: "घटक",
  schemes: "योजनाएं",
  componentName: "घटक",
  investmentName: "निवेश का नाम",
  unit: "इकाई",
  schemeName: "योजना का नाम",
  save: "सहेज करें",
  update: "अपडेट करें",
  cancel: "रद्द करें",
  loading: "लोड हो रहा है...",
  success: "सफलता",
  error: "त्रुटि",
  required: "यह फ़ील्ड आवश्यक है",
  componentAddSuccess: "घटक सफलतापूर्वक जोड़ा गया",
  schemeAddSuccess: "योजना सफलतापूर्वक जोड़ी गई",
  investmentAddSuccess: "निवेश नाम सफलतापूर्वक जोड़ा गया",
  unitAddSuccess: "इकाई सफलतापूर्वक जोड़ी गई",
  fetchError: "डेटा लाने में विफल। कृपया बाद में पुन: प्रयास करें।",
  saveError: "सेव करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  confirmCancel:
    "क्या आप वाकई इस फॉर्म को रद्द करना चाहते हैं? सभी परिवर्तन खो जाएंगे।",
  yes: "हाँ",
  no: "नहीं",
  allComponents: "सभी घटक",
  allSchemes: "सभी योजनाएं",
  allInvestments: "सभी निवेश",
  allUnits: "सभी इकाइयां",
  totalComponents: "कुल घटक",
  totalSchemes: "कुल योजनाएं",
  totalInvestments: "कुल निवेश",
  totalUnits: "कुल इकाइयां",
  addComponent: "नया घटक जोड़ें",
  addScheme: "नई योजना जोड़ें",
  addMode: "जोड़ने का मोड",
  noDataFound: "कोई डेटा नहीं मिला।",
  viewAll: "सभी देखें",
};

// Reusable Column Selection Component
const ColumnSelection = ({ columns, selectedColumns, setSelectedColumns, title }) => {
  const handleColumnToggle = (columnKey) => {
    if (selectedColumns.includes(columnKey)) {
      setSelectedColumns(selectedColumns.filter(col => col !== columnKey));
    } else {
      setSelectedColumns([...selectedColumns, columnKey]);
    }
  };

  const handleSelectAll = () => {
    setSelectedColumns(columns.map(col => col.key));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  return (
    <div className="column-selection mb-3 p-3 border rounded bg-light">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="small-fonts mb-0">{title}</h6>
        <div>
          <Button variant="outline-secondary" size="sm" onClick={handleSelectAll} className="me-2">
            सभी चुनें
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleDeselectAll}>
            सभी अचयनित करें
          </Button>
        </div>
      </div>
      <Row>
        <Col>
          <div className="d-flex flex-wrap">
            {columns.map(col => (
              <Form.Check
                key={col.key}
                type="checkbox"
                id={`col-${col.key}`}
                checked={selectedColumns.includes(col.key)}
                onChange={() => handleColumnToggle(col.key)}
                className="me-3 mb-2"
                label={<span className="small-fonts">{col.label}</span>}
              />
            ))}
          </div>
        </Col>
      </Row>
    </div>
  );
};

// Column definitions for expandable tables
const componentDetailColumns = [
  { key: 'bill_id', label: 'बिल आईडी' },
  { key: 'center_name', label: 'केंद्र' },
  { key: 'component', label: 'घटक' },
  { key: 'scheme_name', label: 'योजना' },
  { key: 'unit', label: 'इकाई' },
  { key: 'allocated_quantity', label: 'आवंटित मात्रा ' },
  { key: 'updated_quantity', label: 'बिकी मात्रा' },
  { key: 'rate', label: 'दर' },
  { key: 'source_of_receipt', label: 'स्रोत' },
  { key: 'allocated_value', label: 'आवंटित मूल्य' }
];

const schemeDetailColumns = [
  { key: 'bill_id', label: 'बिल आईडी' },
  { key: 'center_name', label: 'केंद्र' },
  { key: 'component', label: 'घटक' },
  { key: 'scheme_name', label: 'योजना' },
  { key: 'investment_name', label: 'निवेश' },
  { key: 'allocated_quantity', label: 'आवंटित मात्रा ' },
  { key: 'updated_quantity', label: 'बिकी मात्रा' },
  { key: 'rate', label: 'दर' },
  { key: 'source_of_receipt', label: 'स्रोत' },
  { key: 'allocated_value', label: 'आवंटित मूल्य' }
];

const investmentDetailColumns = [
  { key: 'bill_id', label: 'बिल आईडी' },
  { key: 'center_name', label: 'केंद्र' },
  { key: 'component', label: 'घटक' },
  { key: 'scheme_name', label: 'योजना' },
  { key: 'unit', label: 'इकाई' },
  { key: 'allocated_quantity', label: 'आवंटित मात्रा ' },
  { key: 'updated_quantity', label: 'बिकी मात्रा' },
  { key: 'rate', label: 'दर' },
  { key: 'source_of_receipt', label: 'स्रोत' },
  { key: 'allocated_value', label: 'आवंटित मूल्य' }
];

const unitDetailColumns = [
  { key: 'bill_id', label: 'बिल आईडी' },
  { key: 'center_name', label: 'केंद्र' },
  { key: 'component', label: 'घटक' },
  { key: 'scheme_name', label: 'योजना' },
  { key: 'investment_name', label: 'निवेश' },
  { key: 'allocated_quantity', label: 'आवंटित मात्रा ' },
  { key: 'updated_quantity', label: 'बिकी मात्रा' },
  { key: 'rate', label: 'दर' },
  { key: 'source_of_receipt', label: 'स्रोत' },
  { key: 'allocated_value', label: 'आवंटित मूल्य' }
];

const summableColumns = ['allocated_quantity', 'updated_quantity', 'rate', 'allocated_value'];

// Helper to calculate allocated_value for totals
const calculateAllocatedValueTotal = (rows) => {
  return rows.reduce((sum, row) => {
    const qty = parseFloat(row.allocated_quantity) || 0;
    const rate = parseFloat(row.rate) || 0;
    return sum + (qty * rate);
  }, 0);
};

const AddEditComponent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Form states
  const [componentFormData, setComponentFormData] = useState({
    component: "",
    investment_name: "",
    unit: "",
  });

  const [schemeFormData, setSchemeFormData] = useState({
    scheme_name: "",
  });

  // State for API data
  const [components, setComponents] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for form visibility
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeForm, setActiveForm] = useState(null); // 'component' or 'scheme'

  // State for showing all items
  const [showAllComponents, setShowAllComponents] = useState(false);
  const [showAllSchemes, setShowAllSchemes] = useState(false);
  const [showAllInvestments, setShowAllInvestments] = useState(false);
  const [showAllUnits, setShowAllUnits] = useState(false);
  // State for summary card detail view and expansions
  const [activeCardDetails, setActiveCardDetails] = useState(null); // 'schemes' | 'investments' | 'units'
  const [expandedDetailRows, setExpandedDetailRows] = useState({});
  const [detailSelectedColumns, setDetailSelectedColumns] = useState([
    "component",
    "investment_name",
    "unit",
  ]);

  // Billing items for showing component/scheme/investment/unit details (from billing-items API)
  const [billingItems, setBillingItems] = useState([]);
  const [billingItemsLoading, setBillingItemsLoading] = useState(false);
  // Track which component names are expanded
  const [expandedComponentsMap, setExpandedComponentsMap] = useState({});
  // Expand maps for schemes, investments and units
  const [expandedSchemesMap, setExpandedSchemesMap] = useState({});
  const [expandedInvestmentsMap, setExpandedInvestmentsMap] = useState({});
  const [expandedUnitsMap, setExpandedUnitsMap] = useState({});
  // Search filters for expanded views
  const [componentSearch, setComponentSearch] = useState('');
  const [schemeSearch, setSchemeSearch] = useState('');
  const [investmentSearch, setInvestmentSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  // Column selection states for expandable tables
  const [componentDetailSelectedColumns, setComponentDetailSelectedColumns] = useState(['bill_id', 'center_name', 'component', 'scheme_name', 'unit', 'allocated_quantity', 'updated_quantity', 'rate', 'source_of_receipt', 'allocated_value']);
  const [schemeDetailSelectedColumns, setSchemeDetailSelectedColumns] = useState(['bill_id', 'center_name', 'component', 'scheme_name', 'investment_name', 'allocated_quantity', 'updated_quantity', 'rate', 'source_of_receipt', 'allocated_value']);
  const [investmentDetailSelectedColumns, setInvestmentDetailSelectedColumns] = useState(['bill_id', 'center_name', 'component', 'scheme_name', 'unit', 'allocated_quantity', 'updated_quantity', 'rate', 'source_of_receipt', 'allocated_value']);
  const [unitDetailSelectedColumns, setUnitDetailSelectedColumns] = useState(['bill_id', 'center_name', 'component', 'scheme_name', 'investment_name', 'allocated_quantity', 'updated_quantity', 'rate', 'source_of_receipt', 'allocated_value']);

  // State for active tab
  const [activeTab, setActiveTab] = useState("components");

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

  // Fetch initial data
  useEffect(() => {
    fetchComponents();
    fetchSchemes();
    fetchBillingItems();
  }, []);

  // Fetch components from API
  const fetchComponents = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(COMPONENT_API_URL);
      setComponents(response.data || []);
      // Extract unique investments and units from components (fallback)
      const uniqueInvestments = new Set();
      const uniqueUnits = new Set();

      response.data.forEach((item) => {
        if (item.investment_name) uniqueInvestments.add(item.investment_name);
        if (item.unit) uniqueUnits.add(item.unit);
      });

      // Set fallback values, but billing-items will override these
      setInvestments(Array.from(uniqueInvestments));
      setUnits(Array.from(uniqueUnits));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch schemes from API
  const fetchSchemes = async () => {
    try {
      const response = await axios.get(SCHEME_API_URL);
      setSchemes(response.data || []);
    } catch (e) {}
  };

  // Fetch billing items for details
  const fetchBillingItems = async () => {
    setBillingItemsLoading(true);
    try {
      const resp = await axios.get("https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/");
      setBillingItems(resp.data || []);

      // Extract unique values from billing-items API for consistency
      const uniqueComponents = new Set();
      const uniqueInvestments = new Set();
      const uniqueUnits = new Set();
      const uniqueSchemes = new Set();

      resp.data.forEach((item) => {
        if (item.component) uniqueComponents.add(item.component);
        if (item.investment_name) uniqueInvestments.add(item.investment_name);
        if (item.unit) uniqueUnits.add(item.unit);
        if (item.scheme_name) uniqueSchemes.add(item.scheme_name);
      });

      // Update states with billing-items data
      setInvestments(Array.from(uniqueInvestments));
      setUnits(Array.from(uniqueUnits));
      setSchemes(Array.from(uniqueSchemes).map(name => ({ scheme_name: name })));
    } catch (err) {
      // ignore silently, billing details are optional
      console.error('Failed to fetch billing-items:', err);
    } finally {
      setBillingItemsLoading(false);
    }
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('hi-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  // Handle component form field changes
  const handleComponentInputChange = (e) => {
    const { name, value } = e.target;
    setComponentFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle scheme form field changes
  const handleSchemeInputChange = (e) => {
    const { name, value } = e.target;
    setSchemeFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset component form
  const resetComponentForm = () => {
    setComponentFormData({
      component: "",
      investment_name: "",
      unit: "",
    });
    setShowComponentForm(false);
    setActiveForm(null);
  };

  // Reset scheme form
  const resetSchemeForm = () => {
    setSchemeFormData({
      scheme_name: "",
    });
    setShowSchemeForm(false);
    setActiveForm(null);
  };

  // Validate component form
  const validateComponentForm = () => {
    if (!componentFormData.investment_name.trim()) {
      setError(`${translations.required}: ${translations.investmentName}`);
      return false;
    }
    if (!componentFormData.unit.trim()) {
      setError(`${translations.required}: ${translations.unit}`);
      return false;
    }
    return true;
  };

  // Validate scheme form
  const validateSchemeForm = () => {
    if (!schemeFormData.scheme_name.trim()) {
      setError(`${translations.required}: ${translations.schemeName}`);
      return false;
    }
    return true;
  };

  // Handle component form submission
  const handleComponentSubmit = async (e) => {
    e.preventDefault();

    if (!validateComponentForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post(COMPONENT_API_URL, componentFormData);
      setSuccess(translations.componentAddSuccess);
      resetComponentForm();
      await fetchComponents();
    } catch (e) {
      setError(translations.saveError);
    } finally {
      setSaving(false);
    }
  };

  // Handle scheme form submission
  const handleSchemeSubmit = async (e) => {
    e.preventDefault();

    if (!validateSchemeForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post(SCHEME_API_URL, schemeFormData);
      setSuccess(translations.schemeAddSuccess);
      resetSchemeForm();
      await fetchSchemes();
    } catch (e) {
      setError(translations.saveError);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel with confirmation
  const handleCancel = () => {
    if (
      (activeForm === "component" &&
        (componentFormData.component ||
          componentFormData.investment_name ||
          componentFormData.unit)) ||
      (activeForm === "scheme" && schemeFormData.scheme_name)
    ) {
      setShowCancelModal(true);
    } else {
      if (activeForm === "component") {
        resetComponentForm();
      } else if (activeForm === "scheme") {
        resetSchemeForm();
      }
    }
  };

  // Confirm cancel
  const confirmCancel = () => {
    setShowCancelModal(false);
    if (activeForm === "component") {
      resetComponentForm();
    } else if (activeForm === "scheme") {
      resetSchemeForm();
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("hi-IN");
  };

  // Get unique components by filtering duplicates from billing-items
  const getUniqueComponents = () => {
    const uniqueComponents = [];
    const seen = new Set();

    billingItems.forEach((item) => {
      if (item.component && !seen.has(item.component)) {
        seen.add(item.component);
        uniqueComponents.push({ component: item.component, id: item.id });
      }
    });

    return uniqueComponents;
  };

  // Render loading state
  if (loading && components.length === 0 && schemes.length === 0) {
    return (
      <div className="dashboard-container">
        <LeftNav
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
          isTablet={isTablet}
        />
        <div className="main-content d-flex justify-content-center align-items-center">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  // Get unique components for display
  const uniqueComponents = getUniqueComponents();

  // Display only first 6 items if not showing all
  const displayComponents = showAllComponents
    ? uniqueComponents
    : uniqueComponents.slice(0, 6);
  const displaySchemes = showAllSchemes ? schemes : schemes.slice(0, 6);
  const displayInvestments = showAllInvestments
    ? investments
    : investments.slice(0, 6);
  const displayUnits = showAllUnits ? units : units.slice(0, 6);

  // Handle click on summary cards to show details (unique list first, expandable to full items)
  const handleSummaryCardClick = (key) => {
    // toggle if already active
    setActiveCardDetails((prev) => (prev === key ? null : key));
    setExpandedDetailRows({});
  };

  const toggleDetailRow = (value) => {
    setExpandedDetailRows((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  const getDetailItemsFor = (key, value) => {
    // key is 'schemes' | 'investments' | 'units'
    if (key === "schemes") {
      // schemes array may contain objects with scheme_name
      return schemes.filter((s) => (s.scheme_name || s).toString() === value);
    }
    if (key === "investments") {
      return components.filter(
        (c) => (c.investment_name || "").toString() === value
      );
    }
    if (key === "units") {
      return components.filter((c) => (c.unit || "").toString() === value);
    }
    return [];
  };

  // Generic Excel download for simple lists or objects
  const downloadExcel = (data, filename, columns) => {
    try {
      const excelData = data.map((item, idx) => {
        if (typeof item === "string")
          return { "क्र.सं.": idx + 1, Value: item };
        // object
        const row = { "क्र.सं.": idx + 1 };
        columns.forEach((col) => {
          row[col.label || col] = col.accessor
            ? col.accessor(item, idx)
            : item[col.key || col] || "";
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws["!cols"] = Object.keys(excelData[0] || {}).map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      setError("Excel file generation failed.");
    }
  };

  const downloadPdf = (data, filename, title, columns) => {
    try {
      const headers =
        columns && columns.length > 0
          ? columns.map((c) => `<th>${c.label || c}</th>`).join("")
          : "<th>Value</th>";
      const rows = data
        .map((item, idx) => {
          if (typeof item === "string")
            return `<tr><td>${idx + 1}</td><td>${item}</td></tr>`;
          const cells = columns
            .map(
              (c) =>
                `<td>${
                  (c.accessor ? c.accessor(item, idx) : item[c.key || c]) || ""
                }</td>`
            )
            .join("");
          return `<tr><td>${idx + 1}</td>${cells}</tr>`;
        })
        .join("");

      const tableHtml = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background: #f2f2f2; }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <table>
              <thead><tr><th>क्र.सं.</th>${headers}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;

      const w = window.open("", "_blank");
      w.document.write(tableHtml);
      w.document.close();
      w.onload = () => {
        setTimeout(() => {
          w.print();
          w.close();
        }, 500);
      };
    } catch (e) {
      setError("PDF generation failed.");
    }
  };

  // Generic Excel/PDF helpers for export of billing details
  const downloadDetailsExcel = (rows, filename, selectedColumns, columns) => {
    try {
      // Prepare data for Excel export based on selected columns (using Hindi headers)
      const excelData = rows.map((item) => {
        const row = {};
        selectedColumns.forEach(col => {
          const colDef = columns.find(c => c.key === col);
          const header = colDef ? colDef.label : col; // Use Hindi label
          const accessor = (item) => {
            switch(col) {
              case 'bill_id': return item.bill_id;
              case 'center_name': return item.center_name;
              case 'component': return item.component;
              case 'scheme_name': return item.scheme_name;
              case 'investment_name': return item.investment_name;
              case 'unit': return item.unit;
              case 'allocated_quantity': return (parseFloat(item.allocated_quantity) || 0).toFixed(2);
              case 'updated_quantity': return (parseFloat(item.updated_quantity) || 0).toFixed(2);
              case 'rate': return (parseFloat(item.rate) || 0).toFixed(2);
              case 'source_of_receipt': return item.source_of_receipt;
              case 'allocated_value': return formatCurrency((parseFloat(item.allocated_quantity) || 0) * (parseFloat(item.rate) || 0));
              default: return '';
            }
          };
          row[header] = accessor(item);
        });
        return row;
      });

      // Add totals row at the end (for Excel - will be on last row)
      if (rows.length > 0) {
        // Calculate totals including allocated_value
        const totals = {};
        summableColumns.forEach(col => {
          if (col === 'allocated_value') {
            totals[col] = calculateAllocatedValueTotal(rows);
          } else {
            totals[col] = rows.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
          }
        });

        const totalsRow = {};
        selectedColumns.forEach(col => {
          const colDef = columns.find(c => c.key === col);
          const header = colDef ? colDef.label : col;
          if (col === 'bill_id') {
            totalsRow[header] = `कुल (${rows.length} प्रविष्टियाँ)`;
          } else if (summableColumns.includes(col)) {
            if (col === 'allocated_value') {
              totalsRow[header] = formatCurrency(totals[col]);
            } else {
              totalsRow[header] = totals[col].toFixed(2);
            }
          } else {
            totalsRow[header] = '';
          }
        });

        excelData.push(totalsRow);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Style the totals row if present
      if (rows.length > 0) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        const totalsRowNum = range.e.r; // Last row
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: totalsRowNum, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "FFFFAA00" } }
          };
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, 'Details');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error('Excel export failed', e);
    }
  };

  const downloadDetailsPdf = (rows, filename, title, selectedColumns, columns) => {
    try {
      // Calculate totals including allocated_value
      const totals = {};
      summableColumns.forEach(col => {
        if (col === 'allocated_value') {
          totals[col] = calculateAllocatedValueTotal(rows);
        } else {
          totals[col] = rows.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
        }
      });

      // Use Hindi headers from column definitions
      const headers = selectedColumns.map(col => {
        const colDef = columns.find(c => c.key === col);
        return colDef ? colDef.label : col;
      });

      const rowsHtml = rows.map(r => {
        const cells = selectedColumns.map(col => {
          const accessor = (item) => {
            switch(col) {
              case 'bill_id': return item.bill_id;
              case 'center_name': return item.center_name;
              case 'component': return item.component;
              case 'scheme_name': return item.scheme_name;
              case 'investment_name': return item.investment_name;
              case 'unit': return item.unit;
              case 'allocated_quantity': return (parseFloat(item.allocated_quantity) || 0).toFixed(2);
              case 'updated_quantity': return (parseFloat(item.updated_quantity) || 0).toFixed(2);
              case 'rate': return (parseFloat(item.rate) || 0).toFixed(2);
              case 'source_of_receipt': return item.source_of_receipt;
              case 'allocated_value': return formatCurrency((parseFloat(item.allocated_quantity) || 0) * (parseFloat(item.rate) || 0));
              default: return '';
            }
          };
          return `<td>${accessor(r)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const totalsCells = selectedColumns.map(col => {
        if (col === 'bill_id') {
          return `<td><strong>कुल (${rows.length} प्रविष्टियाँ)</strong></td>`;
        } else if (summableColumns.includes(col)) {
          const value = col === 'allocated_value' ? formatCurrency(totals[col]) : totals[col].toFixed(2);
          return `<td><strong>${value}</strong></td>`;
        } else {
          return `<td></td>`;
        }
      }).join('');

      const tableHtml = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background: #f2f2f2; font-weight: bold; }
              .totals-row { 
                background-color: #f2f2f2; 
                font-weight: bold;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <table>
              <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${rowsHtml}
                <tr class="totals-row">${totalsCells}</tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    } catch (e) {
      console.error('PDF export failed', e);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <LeftNav
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
          isTablet={isTablet}
        />
        <div className="main-content">
          <DashBoardHeader
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
          <Container fluid className="dashboard-body">
            <h1 className="page-title small-fonts">{translations.pageTitle}</h1>

            {success && (
              <Alert
                variant="success"
                dismissible
                onClose={() => setSuccess(null)}
              >
                {success}
              </Alert>
            )}

            {error && (
              <Alert
                variant="danger"
                dismissible
                onClose={() => setError(null)}
              >
                {translations.error}: {error}
              </Alert>
            )}

            {/* Summary Cards Section */}
            <Row className="g-3 mb-4">
              <Col xs={6} md={3}>
                <div
                  className={`card radius-10 border-start border-0 border-4 border-info ${
                    activeTab === "components" ? "active-tab" : ""
                  }`}
                  onClick={() => setActiveTab("components")}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div>
                        <p className="mb-0 text-secondary">{translations.totalComponents}</p>
                        <h4 className="my-1 text-info">{uniqueComponents.length}</h4>
                      </div>
                      <div className="widgets-icons-2 rounded-circle bg-gradient-blues text-white ms-auto">📦</div>
                    </div>
                  </Card.Body>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div
                  className={`card radius-10 border-start border-0 border-4 border-info ${
                    activeTab === "schemes" ? "active-tab" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("schemes");
                    handleSummaryCardClick("schemes");
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div>
                        <p className="mb-0 text-secondary">{translations.totalSchemes}</p>
                        <h4 className="my-1 text-info">{schemes.length}</h4>
                      </div>
                      <div className="widgets-icons-2 rounded-circle bg-gradient-blues text-white ms-auto">📋</div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div
                  className={`card radius-10 border-start border-0 border-4 border-info ${
                    activeTab === "investments" ? "active-tab" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("investments");
                    handleSummaryCardClick("investments");
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div>
                        <p className="mb-0 text-secondary">{translations.totalInvestments}</p>
                        <h4 className="my-1 text-info">{investments.length}</h4>
                      </div>
                      <div className="widgets-icons-2 rounded-circle bg-gradient-blues text-white ms-auto">💼</div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div
                  className={`card radius-10 border-start border-0 border-4 border-info ${
                    activeTab === "units" ? "active-tab" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("units");
                    handleSummaryCardClick("units");
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div>
                        <p className="mb-0 text-secondary">{translations.totalUnits}</p>
                        <h4 className="my-1 text-info">{units.length}</h4>
                      </div>
                      <div className="widgets-icons-2 rounded-circle bg-gradient-blues text-white ms-auto">📏</div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Summary Card Details (unique rows + expandable full table) */}
            {activeCardDetails && (
              <div className="summary-details-container mb-4 p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0 small-fonts">
                    {activeCardDetails === "schemes"
                      ? translations.allSchemes
                      : activeCardDetails === "investments"
                      ? translations.allInvestments
                      : translations.allUnits}
                  </h5>
                  <div>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="me-2"
                      onClick={() => {
                        // export unique list
                        if (activeCardDetails === "schemes") {
                          const list = schemes.map((s) => s.scheme_name || s);
                          downloadExcel(
                            list,
                            `Schemes_${new Date().toISOString().slice(0, 10)}`,
                            [{ label: "योजना" }]
                          );
                        } else if (activeCardDetails === "investments") {
                          downloadExcel(
                            investments,
                            `Investments_${new Date()
                              .toISOString()
                              .slice(0, 10)}`,
                            [{ label: "निवेश" }]
                          );
                        } else {
                          downloadExcel(
                            units,
                            `Units_${new Date().toISOString().slice(0, 10)}`,
                            [{ label: "इकाई" }]
                          );
                        }
                      }}
                    >
                      <FaFileExcel className="me-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        if (activeCardDetails === "schemes") {
                          const list = schemes.map((s) => s.scheme_name || s);
                          downloadPdf(
                            list,
                            `Schemes_${new Date().toISOString().slice(0, 10)}`,
                            "योजनाएँ",
                            [{ label: "योजना" }]
                          );
                        } else if (activeCardDetails === "investments") {
                          downloadPdf(
                            investments,
                            `Investments_${new Date()
                              .toISOString()
                              .slice(0, 10)}`,
                            "निवेश",
                            [{ label: "निवेश" }]
                          );
                        } else {
                          downloadPdf(
                            units,
                            `Units_${new Date().toISOString().slice(0, 10)}`,
                            "इकाईयां",
                            [{ label: "इकाई" }]
                          );
                        }
                      }}
                    >
                      <FaFilePdf className="me-1" />
                      PDF
                    </Button>
                  </div>
                </div>

                {/* Unique list table */}
                <Table
                  striped
                  bordered
                  hover
                  responsive
                  className="small-fonts mb-2"
                >
                  <thead>
                    <tr>
                      <th>क्र.सं.</th>
                      <th>नाम</th>
                      <th>गिनती</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeCardDetails === "schemes"
                      ? schemes.map((s) => s.scheme_name || s)
                      : activeCardDetails === "investments"
                      ? investments
                      : units
                    )
                      .filter(Boolean)
                      .map((val, idx, arr) => {
                        // count occurrences
                        const count = (
                          activeCardDetails === "schemes"
                            ? schemes.map((s) => s.scheme_name || s)
                            : activeCardDetails === "investments"
                            ? components.map((c) => c.investment_name)
                            : components.map((c) => c.unit)
                        ).filter((v) => v === val).length;
                        return (
                          <React.Fragment key={val + idx}>
                            <tr
                              style={{ cursor: "pointer" }}
                              onClick={() => toggleDetailRow(val)}
                            >
                              <td>{idx + 1}</td>
                              <td>{val}</td>
                              <td>{count}</td>
                            </tr>
                            {expandedDetailRows[val] && (
                              <tr>
                                <td colSpan={3}>
                                  {/* full items table for this value */}
                                  <div className="p-2">
                                    <div className="d-flex justify-content-end mb-2">
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => {
                                          const items = getDetailItemsFor(
                                            activeCardDetails,
                                            val
                                          );
                                          downloadExcel(
                                            items,
                                            `${val}_Details_${new Date()
                                              .toISOString()
                                              .slice(0, 10)}`,
                                            [
                                              {
                                                label: "घटक",
                                                key: "component",
                                              },
                                              {
                                                label: "निवेश का नाम",
                                                key: "investment_name",
                                              },
                                              { label: "इकाई", key: "unit" },
                                            ]
                                          );
                                        }}
                                      >
                                        <FaFileExcel className="me-1" />
                                        Excel
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => {
                                          const items = getDetailItemsFor(
                                            activeCardDetails,
                                            val
                                          );
                                          downloadPdf(
                                            items,
                                            `${val}_Details_${new Date()
                                              .toISOString()
                                              .slice(0, 10)}`,
                                            `${val} Details`,
                                            [
                                              {
                                                label: "घटक",
                                                key: "component",
                                                accessor: (it) => it.component,
                                              },
                                              {
                                                label: "निवेश का नाम",
                                                key: "investment_name",
                                                accessor: (it) =>
                                                  it.investment_name,
                                              },
                                              {
                                                label: "इकाई",
                                                key: "unit",
                                                accessor: (it) => it.unit,
                                              },
                                            ]
                                          );
                                        }}
                                      >
                                        <FaFilePdf className="me-1" />
                                        PDF
                                      </Button>
                                    </div>
                                    <Table
                                      striped
                                      bordered
                                      hover
                                      responsive
                                      className="small-fonts"
                                    >
                                      <thead>
                                        <tr>
                                          <th>क्र.सं.</th>
                                          <th>घटक</th>
                                          <th>निवेश का नाम</th>
                                          <th>इकाई</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {getDetailItemsFor(
                                          activeCardDetails,
                                          val
                                        ).map((it, i) => (
                                          <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>{it.component}</td>
                                            <td>{it.investment_name}</td>
                                            <td>{it.unit}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Tab Content */}
            <Card className="p-3 mb-4">
              {/* Components Tab */}
              {activeTab === "components" && (
                <>
                  <Row className="align-items-center mb-3">
                    <Col md={6}>
                      <h3 className="section-title small-fonts">
                        {translations.components}
                      </h3>
                    </Col>
                    <Col md={6} className="text-end">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setShowComponentForm(!showComponentForm);
                          setActiveForm("component");
                        }}
                        className="small-fonts"
                      >
                        {showComponentForm
                          ? translations.cancel
                          : translations.addComponent}
                      </Button>
                    </Col>
                  </Row>

                  {/* Component Form */}
                  {showComponentForm && (
                    <div className="mt-3">
                      <div className="mb-3">
                        <Badge bg="info" className="p-2">
                          {translations.addMode}
                        </Badge>
                      </div>

                      <Form onSubmit={handleComponentSubmit}>
                        <Row>
                          <Col md={4} className="mb-3">
                            <Form.Group>
                              <Form.Label className="small-fonts">
                                {translations.componentName}
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="component"
                                value={componentFormData.component}
                                onChange={handleComponentInputChange}
                                placeholder={translations.componentName}
                                className="small-fonts"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4} className="mb-3">
                            <Form.Group>
                              <Form.Label className="small-fonts">
                                {translations.investmentName} *
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="investment_name"
                                value={componentFormData.investment_name}
                                onChange={handleComponentInputChange}
                                placeholder={translations.investmentName}
                                className="small-fonts"
                                required
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4} className="mb-3">
                            <Form.Group>
                              <Form.Label className="small-fonts">
                                {translations.unit} *
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="unit"
                                value={componentFormData.unit}
                                onChange={handleComponentInputChange}
                                placeholder={translations.unit}
                                className="small-fonts"
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row className="mt-4">
                          <Col
                            md={12}
                            className="d-flex justify-content-end gap-2"
                          >
                            <Button
                              variant="outline-secondary"
                              onClick={handleCancel}
                              disabled={saving}
                              className="small-fonts"
                            >
                              {translations.cancel}
                            </Button>
                            <Button
                              variant="primary"
                              type="submit"
                              disabled={saving}
                              className="small-fonts"
                            >
                              {saving ? (
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                />
                              ) : null}
                              {translations.save}
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </div>
                  )}

                  {/* Component Cards */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="small-fonts">
                      {translations.allComponents}
                    </h4>
                    {uniqueComponents.length > 6 && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowAllComponents(!showAllComponents)}
                        className="small-fonts"
                      >
                        {showAllComponents ? "कम दिखाएं" : translations.viewAll}
                      </Button>
                    )}
                  </div>

                  {displayComponents.length > 0 ? (
                    <Row className="g-3">
                      {displayComponents.map((item, index) => {
                        const componentName = item.component;
                        const isExpanded = expandedComponentsMap[componentName];
                        const componentDetails = billingItems.filter(b => b.component === componentName);
                        const totals = componentDetails.reduce((acc, r) => {
                          acc.allocated += parseFloat(r.allocated_quantity) || 0;
                          acc.sold += parseFloat(r.updated_quantity) || 0;
                          acc.allocatedValue += (parseFloat(r.allocated_quantity) || 0) * (parseFloat(r.rate) || 0);
                          return acc;
                        }, { allocated: 0, sold: 0, allocatedValue: 0 });

                        return (
                          <Col key={item.id} xs={12} sm={6} md={4} lg={3}>
                            <Card className={`component-card text-center h-100 ${isExpanded ? 'expanded' : ''}`}>
                              <Card.Body
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedComponentsMap(prev => ({ ...prev, [componentName]: !prev[componentName] }))}
                              >
                                <Card.Title className="small-fonts">
                                  {componentName}
                                </Card.Title>
                                <Card.Text className="small-fonts text-muted">
                                  {componentDetails.length} entries • {formatCurrency(totals.allocatedValue)}
                                </Card.Text>
                              </Card.Body>
                              {isExpanded && componentDetails.length > 0 && (
                                <div className="card-expansion p-3 border-top">
                                  <ColumnSelection
                                    columns={componentDetailColumns}
                                    selectedColumns={componentDetailSelectedColumns}
                                    setSelectedColumns={setComponentDetailSelectedColumns}
                                    title="कॉलम चुनें"
                                  />
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDetailsExcel(componentDetails, `${componentName}_Details_${new Date().toISOString().slice(0, 10)}`, componentDetailSelectedColumns, componentDetailColumns)}
                                      >
                                        <FaFileExcel className="me-1" />
                                        Excel
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => downloadDetailsPdf(componentDetails, `${componentName}_Details_${new Date().toISOString().slice(0, 10)}`, `${componentName} Details`, componentDetailSelectedColumns, componentDetailColumns)}
                                      >
                                        <FaFilePdf className="me-1" />
                                        PDF
                                      </Button>
                                    </div>
                                    <Form.Control
                                      type="text"
                                      placeholder="Search centers, schemes..."
                                      value={componentSearch}
                                      onChange={(e) => setComponentSearch(e.target.value)}
                                      size="sm"
                                      style={{ width: '200px' }}
                                    />
                                  </div>
                                  {(() => {
                                    const filteredDetails = componentDetails.filter(detail =>
                                      !componentSearch ||
                                      detail.center_name?.toLowerCase().includes(componentSearch.toLowerCase()) ||
                                      detail.scheme_name?.toLowerCase().includes(componentSearch.toLowerCase()) ||
                                      detail.investment_name?.toLowerCase().includes(componentSearch.toLowerCase()) ||
                                      detail.source_of_receipt?.toLowerCase().includes(componentSearch.toLowerCase())
                                    );
                                    const totals = summableColumns.reduce((acc, col) => {
                                      if (col === 'allocated_value') {
                                        acc[col] = filteredDetails.reduce((sum, row) => {
                                          const qty = parseFloat(row.allocated_quantity) || 0;
                                          const rate = parseFloat(row.rate) || 0;
                                          return sum + (qty * rate);
                                        }, 0);
                                      } else {
                                        acc[col] = filteredDetails.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
                                      }
                                      return acc;
                                    }, {});

                                    return (
                                      <>
                                        <Table striped bordered hover responsive className="small-fonts">
                                          <thead>
                                            <tr>
                                              {componentDetailSelectedColumns.map(col => (
                                                <th key={col}>
                                                  {componentDetailColumns.find(c => c.key === col)?.label}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredDetails.map((detail, i) => {
                                              const allocated = parseFloat(detail.allocated_quantity) || 0;
                                              const sold = parseFloat(detail.updated_quantity) || 0;
                                              const rate = parseFloat(detail.rate) || 0;
                                              const allocatedValue = allocated * rate;
                                              return (
                                                <tr key={i}>
                                                  {componentDetailSelectedColumns.map(col => {
                                                    switch(col) {
                                                      case 'bill_id': return <td key={col}>{detail.bill_id}</td>;
                                                      case 'center_name': return <td key={col}>{detail.center_name}</td>;
                                                      case 'component': return <td key={col}>{detail.component}</td>;
                                                      case 'scheme_name': return <td key={col}>{detail.scheme_name}</td>;
                                                      case 'unit': return <td key={col}>{detail.unit}</td>;
                                                      case 'allocated_quantity': return <td key={col}>{allocated.toFixed(2)}</td>;
                                                      case 'updated_quantity': return <td key={col}>{sold.toFixed(2)}</td>;
                                                      case 'rate': return <td key={col}>{rate.toFixed(2)}</td>;
                                                      case 'source_of_receipt': return <td key={col}>{detail.source_of_receipt}</td>;
                                                      case 'allocated_value': return <td key={col}>{formatCurrency(allocatedValue)}</td>;
                                                      default: return null;
                                                    }
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot>
                                            <tr className="table-totals">
                                              {componentDetailSelectedColumns.map(col => {
                                                const colDef = componentDetailColumns.find(c => c.key === col);
                                                const header = colDef ? colDef.label : col;
                                                if (col === 'bill_id') {
                                                  return <td key={col} className="fw-bold">{`कुल (${filteredDetails.length} प्रविष्टियाँ)`}</td>;
                                                } else if (summableColumns.includes(col)) {
                                                  if (col === 'allocated_value') {
                                                    return <td key={col} className="fw-bold">{formatCurrency(totals[col])}</td>;
                                                  } else {
                                                    return <td key={col} className="fw-bold">{totals[col].toFixed(2)}</td>;
                                                  }
                                                } else {
                                                  return <td key={col} className="fw-bold"></td>;
                                                }
                                              })}
                                            </tr>
                                          </tfoot>
                                        </Table>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                    <Alert variant="info">{translations.noDataFound}</Alert>
                  )}
                </>
              )}

              {/* Schemes Tab */}
              {activeTab === "schemes" && (
                <>
                  <Row className="align-items-center mb-3">
                    <Col md={6}>
                      <h3 className="section-title small-fonts">
                        {translations.schemes}
                      </h3>
                    </Col>
                    <Col md={6} className="text-end">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setShowSchemeForm(!showSchemeForm);
                          setActiveForm("scheme");
                        }}
                        className="small-fonts"
                      >
                        {showSchemeForm
                          ? translations.cancel
                          : translations.addScheme}
                      </Button>
                    </Col>
                  </Row>

                  {/* Scheme Form */}
                  {showSchemeForm && (
                    <div className="mt-3">
                      <div className="mb-3">
                        <Badge bg="info" className="p-2">
                          {translations.addMode}
                        </Badge>
                      </div>

                      <Form onSubmit={handleSchemeSubmit}>
                        <Row>
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label className="small-fonts">
                                {translations.schemeName} *
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="scheme_name"
                                value={schemeFormData.scheme_name}
                                onChange={handleSchemeInputChange}
                                placeholder={translations.schemeName}
                                className="small-fonts"
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row className="mt-4">
                          <Col
                            md={12}
                            className="d-flex justify-content-end gap-2"
                          >
                            <Button
                              variant="outline-secondary"
                              onClick={handleCancel}
                              disabled={saving}
                              className="small-fonts"
                            >
                              {translations.cancel}
                            </Button>
                            <Button
                              variant="primary"
                              type="submit"
                              disabled={saving}
                              className="small-fonts"
                            >
                              {saving ? (
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                />
                              ) : null}
                              {translations.save}
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </div>
                  )}

                  {/* Scheme Cards */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="small-fonts">{translations.allSchemes}</h4>
                    {schemes.length > 6 && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowAllSchemes(!showAllSchemes)}
                        className="small-fonts"
                      >
                        {showAllSchemes ? "कम दिखाएं" : translations.viewAll}
                      </Button>
                    )}
                  </div>

                  {displaySchemes.length > 0 ? (
                    <Row className="g-3">
                      {displaySchemes.map((item, index) => {
                        const schemeName = item.scheme_name || item;
                        const isExpanded = expandedSchemesMap[schemeName];
                        const schemeDetails = billingItems.filter(b => b.scheme_name === schemeName);
                        const totals = schemeDetails.reduce((acc, r) => {
                          acc.allocated += parseFloat(r.allocated_quantity) || 0;
                          acc.sold += parseFloat(r.updated_quantity) || 0;
                          acc.allocatedValue += (parseFloat(r.allocated_quantity) || 0) * (parseFloat(r.rate) || 0);
                          return acc;
                        }, { allocated: 0, sold: 0, allocatedValue: 0 });

                        return (
                          <Col key={item.id} xs={12} sm={6} md={4} lg={3}>
                            <Card className={`scheme-card text-center h-100 ${isExpanded ? 'expanded' : ''}`}>
                              <Card.Body
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedSchemesMap(prev => ({ ...prev, [schemeName]: !prev[schemeName] }))}
                              >
                                <Card.Title className="small-fonts">
                                  {schemeName}
                                </Card.Title>
                                <Card.Text className="small-fonts text-muted">
                                  {schemeDetails.length} entries • {formatCurrency(totals.allocatedValue)}
                                </Card.Text>
                              </Card.Body>
                              {isExpanded && schemeDetails.length > 0 && (
                                <div className="card-expansion p-3 border-top">
                                  <ColumnSelection
                                    columns={schemeDetailColumns}
                                    selectedColumns={schemeDetailSelectedColumns}
                                    setSelectedColumns={setSchemeDetailSelectedColumns}
                                    title="कॉलम चुनें"
                                  />
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDetailsExcel(schemeDetails, `${schemeName}_Details_${new Date().toISOString().slice(0, 10)}`, schemeDetailSelectedColumns, schemeDetailColumns)}
                                      >
                                        <FaFileExcel className="me-1" />
                                        Excel
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => downloadDetailsPdf(schemeDetails, `${schemeName}_Details_${new Date().toISOString().slice(0, 10)}`, `${schemeName} Details`, schemeDetailSelectedColumns, schemeDetailColumns)}
                                      >
                                        <FaFilePdf className="me-1" />
                                        PDF
                                      </Button>
                                    </div>
                                    <Form.Control
                                      type="text"
                                      placeholder="Search centers, components..."
                                      value={schemeSearch}
                                      onChange={(e) => setSchemeSearch(e.target.value)}
                                      size="sm"
                                      style={{ width: '200px' }}
                                    />
                                  </div>
                                  {(() => {
                                    const filteredDetails = schemeDetails.filter(detail =>
                                      !schemeSearch ||
                                      detail.center_name?.toLowerCase().includes(schemeSearch.toLowerCase()) ||
                                      detail.component?.toLowerCase().includes(schemeSearch.toLowerCase()) ||
                                      detail.investment_name?.toLowerCase().includes(schemeSearch.toLowerCase()) ||
                                      detail.source_of_receipt?.toLowerCase().includes(schemeSearch.toLowerCase())
                                    );
                                    const totals = summableColumns.reduce((acc, col) => {
                                      if (col === 'allocated_value') {
                                        acc[col] = filteredDetails.reduce((sum, row) => {
                                          const qty = parseFloat(row.allocated_quantity) || 0;
                                          const rate = parseFloat(row.rate) || 0;
                                          return sum + (qty * rate);
                                        }, 0);
                                      } else {
                                        acc[col] = filteredDetails.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
                                      }
                                      return acc;
                                    }, {});

                                    return (
                                      <>
                                        <Table striped bordered hover responsive className="small-fonts">
                                          <thead>
                                            <tr>
                                              {schemeDetailSelectedColumns.map(col => (
                                                <th key={col}>
                                                  {schemeDetailColumns.find(c => c.key === col)?.label}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredDetails.map((detail, i) => {
                                              const allocated = parseFloat(detail.allocated_quantity) || 0;
                                              const sold = parseFloat(detail.updated_quantity) || 0;
                                              const rate = parseFloat(detail.rate) || 0;
                                              const allocatedValue = allocated * rate;
                                              return (
                                                <tr key={i}>
                                                  {schemeDetailSelectedColumns.map(col => {
                                                    switch(col) {
                                                      case 'bill_id': return <td key={col}>{detail.bill_id}</td>;
                                                      case 'center_name': return <td key={col}>{detail.center_name}</td>;
                                                      case 'component': return <td key={col}>{detail.component}</td>;
                                                      case 'scheme_name': return <td key={col}>{detail.scheme_name}</td>;
                                                      case 'investment_name': return <td key={col}>{detail.investment_name}</td>;
                                                      case 'allocated_quantity': return <td key={col}>{allocated.toFixed(2)}</td>;
                                                      case 'updated_quantity': return <td key={col}>{sold.toFixed(2)}</td>;
                                                      case 'rate': return <td key={col}>{rate.toFixed(2)}</td>;
                                                      case 'source_of_receipt': return <td key={col}>{detail.source_of_receipt}</td>;
                                                      case 'allocated_value': return <td key={col}>{formatCurrency(allocatedValue)}</td>;
                                                      default: return null;
                                                    }
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot>
                                            <tr className="table-totals">
                                              {schemeDetailSelectedColumns.map(col => {
                                                const colDef = schemeDetailColumns.find(c => c.key === col);
                                                const header = colDef ? colDef.label : col;
                                                if (col === 'bill_id') {
                                                  return <td key={col} className="fw-bold">{`कुल (${filteredDetails.length} प्रविष्टियाँ)`}</td>;
                                                } else if (summableColumns.includes(col)) {
                                                  if (col === 'allocated_value') {
                                                    return <td key={col} className="fw-bold">{formatCurrency(totals[col])}</td>;
                                                  } else {
                                                    return <td key={col} className="fw-bold">{totals[col].toFixed(2)}</td>;
                                                  }
                                                } else {
                                                  return <td key={col} className="fw-bold"></td>;
                                                }
                                              })}
                                            </tr>
                                          </tfoot>
                                        </Table>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                    <Alert variant="info">{translations.noDataFound}</Alert>
                  )}
                </>
              )}

              {/* Investments Tab - Read Only */}
              {activeTab === "investments" && (
                <>
                  <Row className="align-items-center mb-3">
                    <Col md={6}>
                      <h3 className="section-title small-fonts">
                        {translations.investments}
                      </h3>
                    </Col>
                    <Col md={6} className="text-end">
                      <Badge bg="secondary" className="p-2">
                        केवल दृश्य मोड
                      </Badge>
                    </Col>
                  </Row>

                  {/* Investment Cards */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="small-fonts">
                      {translations.allInvestments}
                    </h4>
                    {investments.length > 6 && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          setShowAllInvestments(!showAllInvestments)
                        }
                        className="small-fonts"
                      >
                        {showAllInvestments
                          ? "कम दिखाएं"
                          : translations.viewAll}
                      </Button>
                    )}
                  </div>

                  {displayInvestments.length > 0 ? (
                    <Row className="g-3">
                      {displayInvestments.map((item, index) => {
                        const investmentName = item;
                        const isExpanded = expandedInvestmentsMap[investmentName];
                        const investmentDetails = billingItems.filter(b => b.investment_name === investmentName);
                        const totals = investmentDetails.reduce((acc, r) => {
                          acc.allocated += parseFloat(r.allocated_quantity) || 0;
                          acc.sold += parseFloat(r.updated_quantity) || 0;
                          acc.allocatedValue += (parseFloat(r.allocated_quantity) || 0) * (parseFloat(r.rate) || 0);
                          return acc;
                        }, { allocated: 0, sold: 0, allocatedValue: 0 });

                        return (
                          <Col key={index} xs={12} sm={6} md={4} lg={3}>
                            <Card className={`investment-card text-center h-100 ${isExpanded ? 'expanded' : ''}`}>
                              <Card.Body
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedInvestmentsMap(prev => ({ ...prev, [investmentName]: !prev[investmentName] }))}
                              >
                                <Card.Title className="small-fonts">
                                  {investmentName}
                                </Card.Title>
                                <Card.Text className="small-fonts text-muted">
                                  {investmentDetails.length} entries • {formatCurrency(totals.allocatedValue)}
                                </Card.Text>
                              </Card.Body>
                              {isExpanded && investmentDetails.length > 0 && (
                                <div className="card-expansion p-3 border-top">
                                  <ColumnSelection
                                    columns={investmentDetailColumns}
                                    selectedColumns={investmentDetailSelectedColumns}
                                    setSelectedColumns={setInvestmentDetailSelectedColumns}
                                    title="कॉलम चुनें"
                                  />
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDetailsExcel(investmentDetails, `${investmentName}_Details_${new Date().toISOString().slice(0, 10)}`, investmentDetailSelectedColumns, investmentDetailColumns)}
                                      >
                                        <FaFileExcel className="me-1" />
                                        Excel
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => downloadDetailsPdf(investmentDetails, `${investmentName}_Details_${new Date().toISOString().slice(0, 10)}`, `${investmentName} Details`, investmentDetailSelectedColumns, investmentDetailColumns)}
                                      >
                                        <FaFilePdf className="me-1" />
                                        PDF
                                      </Button>
                                    </div>
                                    <Form.Control
                                      type="text"
                                      placeholder="Search centers, schemes..."
                                      value={investmentSearch}
                                      onChange={(e) => setInvestmentSearch(e.target.value)}
                                      size="sm"
                                      style={{ width: '200px' }}
                                    />
                                  </div>
                                  {(() => {
                                    const filteredDetails = investmentDetails.filter(detail =>
                                      !investmentSearch ||
                                      detail.center_name?.toLowerCase().includes(investmentSearch.toLowerCase()) ||
                                      detail.scheme_name?.toLowerCase().includes(investmentSearch.toLowerCase()) ||
                                      detail.component?.toLowerCase().includes(investmentSearch.toLowerCase()) ||
                                      detail.source_of_receipt?.toLowerCase().includes(investmentSearch.toLowerCase())
                                    );
                                    const totals = summableColumns.reduce((acc, col) => {
                                      if (col === 'allocated_value') {
                                        acc[col] = filteredDetails.reduce((sum, row) => {
                                          const qty = parseFloat(row.allocated_quantity) || 0;
                                          const rate = parseFloat(row.rate) || 0;
                                          return sum + (qty * rate);
                                        }, 0);
                                      } else {
                                        acc[col] = filteredDetails.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
                                      }
                                      return acc;
                                    }, {});

                                    return (
                                      <>
                                        <Table striped bordered hover responsive className="small-fonts">
                                          <thead>
                                            <tr>
                                              {investmentDetailSelectedColumns.map(col => (
                                                <th key={col}>
                                                  {investmentDetailColumns.find(c => c.key === col)?.label}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredDetails.map((detail, i) => {
                                              const allocated = parseFloat(detail.allocated_quantity) || 0;
                                              const sold = parseFloat(detail.updated_quantity) || 0;
                                              const rate = parseFloat(detail.rate) || 0;
                                              const allocatedValue = allocated * rate;
                                              return (
                                                <tr key={i}>
                                                  {investmentDetailSelectedColumns.map(col => {
                                                    switch(col) {
                                                      case 'bill_id': return <td key={col}>{detail.bill_id}</td>;
                                                      case 'center_name': return <td key={col}>{detail.center_name}</td>;
                                                      case 'component': return <td key={col}>{detail.component}</td>;
                                                      case 'scheme_name': return <td key={col}>{detail.scheme_name}</td>;
                                                      case 'unit': return <td key={col}>{detail.unit}</td>;
                                                      case 'allocated_quantity': return <td key={col}>{allocated.toFixed(2)}</td>;
                                                      case 'updated_quantity': return <td key={col}>{sold.toFixed(2)}</td>;
                                                      case 'rate': return <td key={col}>{rate.toFixed(2)}</td>;
                                                      case 'source_of_receipt': return <td key={col}>{detail.source_of_receipt}</td>;
                                                      case 'allocated_value': return <td key={col}>{formatCurrency(allocatedValue)}</td>;
                                                      default: return null;
                                                    }
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot>
                                            <tr className="table-totals">
                                              {investmentDetailSelectedColumns.map(col => {
                                                const colDef = investmentDetailColumns.find(c => c.key === col);
                                                const header = colDef ? colDef.label : col;
                                                if (col === 'bill_id') {
                                                  return <td key={col} className="fw-bold">{`कुल (${filteredDetails.length} प्रविष्टियाँ)`}</td>;
                                                } else if (summableColumns.includes(col)) {
                                                  if (col === 'allocated_value') {
                                                    return <td key={col} className="fw-bold">{formatCurrency(totals[col])}</td>;
                                                  } else {
                                                    return <td key={col} className="fw-bold">{totals[col].toFixed(2)}</td>;
                                                  }
                                                } else {
                                                  return <td key={col} className="fw-bold"></td>;
                                                }
                                              })}
                                            </tr>
                                          </tfoot>
                                        </Table>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                    <Alert variant="info">{translations.noDataFound}</Alert>
                  )}
                </>
              )}

              {/* Units Tab - Read Only */}
              {activeTab === "units" && (
                <>
                  <Row className="align-items-center mb-3">
                    <Col md={6}>
                      <h3 className="section-title small-fonts">
                        {translations.units}
                      </h3>
                    </Col>
                    <Col md={6} className="text-end">
                      <Badge bg="secondary" className="p-2">
                        केवल दृश्य मोड
                      </Badge>
                    </Col>
                  </Row>

                  {/* Unit Cards */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="small-fonts">{translations.allUnits}</h4>
                    {units.length > 6 && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowAllUnits(!showAllUnits)}
                        className="small-fonts"
                      >
                        {showAllUnits ? "कम दिखाएं" : translations.viewAll}
                      </Button>
                    )}
                  </div>

                  {displayUnits.length > 0 ? (
                    <Row className="g-3">
                      {displayUnits.map((item, index) => {
                        const unitName = item;
                        const isExpanded = expandedUnitsMap[unitName];
                        const unitDetails = billingItems.filter(b => b.unit === unitName);
                        const totals = unitDetails.reduce((acc, r) => {
                          acc.allocated += parseFloat(r.allocated_quantity) || 0;
                          acc.sold += parseFloat(r.updated_quantity) || 0;
                          acc.allocatedValue += (parseFloat(r.allocated_quantity) || 0) * (parseFloat(r.rate) || 0);
                          return acc;
                        }, { allocated: 0, sold: 0, allocatedValue: 0 });

                        return (
                          <Col key={index} xs={12} sm={6} md={4} lg={3}>
                            <Card className={`unit-card text-center h-100 ${isExpanded ? 'expanded' : ''}`}>
                              <Card.Body
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedUnitsMap(prev => ({ ...prev, [unitName]: !prev[unitName] }))}
                              >
                                <Card.Title className="small-fonts">
                                  {unitName}
                                </Card.Title>
                                <Card.Text className="small-fonts text-muted">
                                  {unitDetails.length} entries • {formatCurrency(totals.allocatedValue)}
                                </Card.Text>
                              </Card.Body>
                              {isExpanded && unitDetails.length > 0 && (
                                <div className="card-expansion p-3 border-top">
                                  <ColumnSelection
                                    columns={unitDetailColumns}
                                    selectedColumns={unitDetailSelectedColumns}
                                    setSelectedColumns={setUnitDetailSelectedColumns}
                                    title="कॉलम चुनें"
                                  />
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDetailsExcel(unitDetails, `${unitName}_Details_${new Date().toISOString().slice(0, 10)}`, unitDetailSelectedColumns, unitDetailColumns)}
                                      >
                                        <FaFileExcel className="me-1" />
                                        Excel
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => downloadDetailsPdf(unitDetails, `${unitName}_Details_${new Date().toISOString().slice(0, 10)}`, `${unitName} Details`, unitDetailSelectedColumns, unitDetailColumns)}
                                      >
                                        <FaFilePdf className="me-1" />
                                        PDF
                                      </Button>
                                    </div>
                                    <Form.Control
                                      type="text"
                                      placeholder="Search centers, schemes..."
                                      value={unitSearch}
                                      onChange={(e) => setUnitSearch(e.target.value)}
                                      size="sm"
                                      style={{ width: '200px' }}
                                    />
                                  </div>
                                  {(() => {
                                    const filteredDetails = unitDetails.filter(detail =>
                                      !unitSearch ||
                                      detail.center_name?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                      detail.scheme_name?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                      detail.component?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                      detail.investment_name?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                      detail.source_of_receipt?.toLowerCase().includes(unitSearch.toLowerCase())
                                    );
                                    const totals = summableColumns.reduce((acc, col) => {
                                      if (col === 'allocated_value') {
                                        acc[col] = filteredDetails.reduce((sum, row) => {
                                          const qty = parseFloat(row.allocated_quantity) || 0;
                                          const rate = parseFloat(row.rate) || 0;
                                          return sum + (qty * rate);
                                        }, 0);
                                      } else {
                                        acc[col] = filteredDetails.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
                                      }
                                      return acc;
                                    }, {});

                                    return (
                                      <>
                                        <Table striped bordered hover responsive className="small-fonts">
                                          <thead>
                                            <tr>
                                              {unitDetailSelectedColumns.map(col => (
                                                <th key={col}>
                                                  {unitDetailColumns.find(c => c.key === col)?.label}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredDetails.map((detail, i) => {
                                              const allocated = parseFloat(detail.allocated_quantity) || 0;
                                              const sold = parseFloat(detail.updated_quantity) || 0;
                                              const rate = parseFloat(detail.rate) || 0;
                                              const allocatedValue = allocated * rate;
                                              return (
                                                <tr key={i}>
                                                  {unitDetailSelectedColumns.map(col => {
                                                    switch(col) {
                                                      case 'bill_id': return <td key={col}>{detail.bill_id}</td>;
                                                      case 'center_name': return <td key={col}>{detail.center_name}</td>;
                                                      case 'component': return <td key={col}>{detail.component}</td>;
                                                      case 'scheme_name': return <td key={col}>{detail.scheme_name}</td>;
                                                      case 'investment_name': return <td key={col}>{detail.investment_name}</td>;
                                                      case 'allocated_quantity': return <td key={col}>{allocated.toFixed(2)}</td>;
                                                      case 'updated_quantity': return <td key={col}>{sold.toFixed(2)}</td>;
                                                      case 'rate': return <td key={col}>{rate.toFixed(2)}</td>;
                                                      case 'source_of_receipt': return <td key={col}>{detail.source_of_receipt}</td>;
                                                      case 'allocated_value': return <td key={col}>{formatCurrency(allocatedValue)}</td>;
                                                      default: return null;
                                                    }
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot>
                                            <tr className="table-totals">
                                              {unitDetailSelectedColumns.map(col => {
                                                const colDef = unitDetailColumns.find(c => c.key === col);
                                                const header = colDef ? colDef.label : col;
                                                if (col === 'bill_id') {
                                                  return <td key={col} className="fw-bold">{`कुल (${filteredDetails.length} प्रविष्टियाँ)`}</td>;
                                                } else if (summableColumns.includes(col)) {
                                                  if (col === 'allocated_value') {
                                                    return <td key={col} className="fw-bold">{formatCurrency(totals[col])}</td>;
                                                  } else {
                                                    return <td key={col} className="fw-bold">{totals[col].toFixed(2)}</td>;
                                                  }
                                                } else {
                                                  return <td key={col} className="fw-bold"></td>;
                                                }
                                              })}
                                            </tr>
                                          </tfoot>
                                        </Table>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                    <Alert variant="info">{translations.noDataFound}</Alert>
                  )}
                </>
              )}
            </Card>
          </Container>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>पुष्टि करें</Modal.Title>
        </Modal.Header>
        <Modal.Body>{translations.confirmCancel}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            {translations.no}
          </Button>
          <Button variant="danger" onClick={confirmCancel}>
            {translations.yes}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddEditComponent;