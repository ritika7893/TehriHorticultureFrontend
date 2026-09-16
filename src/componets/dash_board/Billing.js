import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Spinner,
  Alert,
  Row,
  Col,
  Form,
  Button,
  FormGroup,
  FormLabel,
  Modal,
  Pagination,
} from "react-bootstrap";
import Select from "react-select";
import * as XLSX from "xlsx";
import { FaFileExcel, FaFilePdf, FaListAlt } from "react-icons/fa";
import "../../assets/css/dashboard.css";
import "../../assets/css/table.css";
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";
import Footer from "../footer/Footer";

// API URLs
const GET_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/";
const UPDATE_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/update-billing-item/";

// Custom styles for react-select
const customSelectStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
    "&:hover": { borderColor: "#3b82f6" },
    minHeight: "32px",
    fontSize: "14px",
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    zIndex: 9999,
    position: "absolute",
    fontSize: "14px",
  }),
  menuList: (baseStyles) => ({
    ...baseStyles,
    maxHeight: "200px",
    overflowY: "auto",
    fontSize: "14px",
  }),
  multiValue: (baseStyles) => ({ ...baseStyles, backgroundColor: "#e5e7eb" }),
  multiValueLabel: (baseStyles) => ({
    ...baseStyles,
    color: "#1f2937",
    fontSize: "12px",
  }),
  multiValueRemove: (baseStyles) => ({
    ...baseStyles,
    color: "#6b7280",
    "&:hover": { backgroundColor: "#d1d5db", color: "#1f2937" },
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: "#6b7280",
    fontSize: "14px",
  }),
};

// Hindi translations
const translations = {
  dashboard: "डैशबोर्ड",
  billingItems: "बिलिंग आइटम्स",
  filters: "फिल्टर",
  clearAllFilters: "सभी फिल्टर हटाएं",
  centerName: "केंद्र का नाम",
  nivesh: "निवेश",
  subniveshName: "उप-निवेश का नाम",
  unit: "इकाई",
  sourceOfReceipt: "सप्लायर",
  allocatedQuantity: "आवंटित मात्रा ",
  rate: "दर",
  sno: "क्र.सं.",
  id: "आईडी",
  loading: "लोड हो रहा है...",
  noItemsFound: "कोई बिलिंग आइटम नहीं मिला।",
  noMatchingItems: "चयनित फिल्टर से मेल खाने वाली कोई आइटम नहीं मिली।",
  noDataAvailable: "कोई बिलिंग आइटम डेटा उपलब्ध नहीं है।",
  showing: "दिखा रहे हैं",
  to: "से",
  of: "का",
  entries: "प्रविष्टियां",
  page: "पृष्ठ",
  previous: "पिछला",
  next: "अगला",
  itemsPerPage: "प्रति पृष्ठ आइटम:",
  allCenters: "सभी केंद्र",
  allNivesh: "सभी निवेश",
  allSubnivesh: "सभी उप-निवेश",
  allUnits: "सभी इकाइयां",
  allSources: "सभी स्रोत",
  allSchemes: "सभी योजनाएं",
  schemeName: "योजना का नाम",
  selectSourceFirst: "पहले स्रोत चुनें",
  selectCenterFirst: "पहले केंद्र चुनें",
  selectNiveshFirst: "पहले निवेश चुनें",
  selectSubniveshFirst: "पहले उप-निवेश चुनें",
  selectUnitFirst: "पहले इकाई चुनें",
  fetchError: "डेटा लाने में विफल। कृपया बाद में पुन: प्रयास करें।",
  networkError: "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।",
  serverError: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  dataError: "डेटा प्रोसेस करने में त्रुटि।",
  retry: "पुनः प्रयास करें",
  filterSeparator: " > ",
  billId: "बिल संख्या",
  updatedQuantity: "अपडेट की गई मात्रा",
  cutQuantity: "कटी हुई मात्रा",
  quantityLeft: "शेष मात्रा",
  submitUpdates: "अपडेट सबमिट करें",
  billing: "बिलिंग",
  billingDataUpdated: "बिलिंग डेटा सफलतापूर्वक अपडेट किया गया!",
  error: "त्रुटि",
  noItemsUpdated: "कोई आइटम अपडेट नहीं की गई।",
  cannotCutMore: "आइटम के लिए उपलब्ध मात्रा से अधिक नहीं काटा जा सकता",
  farmerSellingRate: "कृषक विक्रय दर (प्रति इकाई)",
  farmerSubsidyRate: "कृषक अनुदान दर (प्रति इकाई)",
  farmerShareAmount: "कृषक अंश (रु0)",
  subsidyAmount: "अनुदान राशि (रु0)",
  totalAmount: "कुल राशि (रु0)",
  anudanName: "अनुदान वहन योजना",
  remark: "रिमार्क",
  billDate: "पंजीकरण तिथि",
  soldRashi: "बेची राशि",
  allotedRashi: "आवंटित राशि",
  totalBill: "कुल बिल",
  billingDate: "बिलिंग तारीख",
  selectColumns: "कॉलम चुनें",
  for: "के लिए",
  fromDate: "तारीख से (कब से)",
  toDate: "तारीख तक (कब तक)",
  selectDateRange: "तारीख की सीमा चुनें",
  pleaseSelectDateRange: "कृपया तारीख की सीमा चुनें ताकि डेटा दिखाई दे",
  // Page No Translations
  assignPageNoBtn: "उप-निवेश पेज नंबर असाइन करें",
  pageNoModalTitle: "उप-निवेश पेज नंबर असाइन करें",
  pageNoLabel: "पेज नंबर",
  savePageNo: "पेज नंबर सेव करें",
  pageNoEmptyError: "कृपया कम से कम एक उप-निवेश के लिए पेज नंबर दर्ज करें।",
  noUniqueSubnivesh: "कोई उप-निवेश नाम उपलब्ध नहीं है।",
  closeBtn: "बंद करें",
};

const billingTableCss = `
  .billing-table-scroll {
    width: 100%; max-width: 100%; overflow-x: auto; overflow-y: auto;
    max-height: calc(100vh - 300px); min-height: 320px;
    border: 1px solid #d9dee5; border-radius: 7px; background: #fff;
    -webkit-overflow-scrolling: touch; scrollbar-width: thin;
  }
  .billing-data-table {
    width: max-content !important; min-width: 2100px !important;
    table-layout: fixed !important; border-collapse: collapse !important;
    border-spacing: 0 !important; margin: 0 !important; background: #fff;
  }
  .billing-data-table thead th {
    position: sticky; top: 0; z-index: 5; height: 58px; padding: 6px 5px !important;
    background: #238dce !important; color: #fff !important;
    border-right: 1px solid rgba(255,255,255,.35) !important;
    border-bottom: 2px solid #176fa7 !important;
    text-align: center !important; vertical-align: middle !important;
    white-space: normal !important; word-break: normal !important;
    overflow-wrap: break-word !important; line-height: 1.12 !important;
    font-size: 10px !important; font-weight: 700 !important;
  }
  .billing-data-table tbody td {
    height: 43px; padding: 5px 5px !important;
    border-right: 1px solid #e2e6ea !important;
    border-bottom: 1px solid #e2e6ea !important;
    text-align: center !important; vertical-align: middle !important;
    white-space: nowrap !important; font-size: 11px !important;
    line-height: 1.15 !important; color: #252b33; background: #fff;
  }
  .billing-data-table tbody tr:nth-child(even) td { background: #fafbfd; }
  .billing-data-table tbody tr:hover td { background: #eef7ff; }
  .billing-data-table input, .billing-data-table select {
    width: 100%; min-width: 0 !important; height: 31px; padding: 3px 5px !important;
    box-sizing: border-box; text-align: center; font-size: 11px !important; line-height: 1.1;
  }
  .billing-table-scroll::-webkit-scrollbar { width: 7px; height: 8px; }
  .billing-table-scroll::-webkit-scrollbar-track { background: #eef1f4; }
  .billing-table-scroll::-webkit-scrollbar-thumb { background: #9aa7b4; border-radius: 8px; }
  .pageno-modal-body { max-height: 60vh; overflow-y: auto; }
  .pageno-row { border-bottom: 1px solid #e2e6ea; padding: 10px 0; }
  .pageno-row:last-child { border-bottom: none; }
`;

const availableColumns = [
  { key: "sno", label: "क्र.सं." },
  { key: "center_name", label: translations.centerName },
  { key: "source_of_receipt", label: translations.sourceOfReceipt },
  { key: "nivesh", label: translations.nivesh },
  { key: "subnivesh_name", label: translations.subniveshName },
  { key: "scheme_name", label: translations.schemeName },
  { key: "unit", label: translations.unit },
  { key: "allocated_quantity", label: translations.allocatedQuantity },
  { key: "rate", label: "क्रय दर (प्रति इकाई)" },
  { key: "farmer_selling_rate", label: translations.farmerSellingRate },
  { key: "farmer_subsidy_rate", label: translations.farmerSubsidyRate },
  { key: "amount_of_farmer_share", label: translations.farmerShareAmount },
  { key: "amount_of_subsidy", label: translations.subsidyAmount },
  { key: "total_amount", label: translations.totalAmount },
  { key: "anudan_name", label: translations.anudanName },
  { key: "remark", label: translations.remark },
  { key: "bill_date", label: translations.billDate },
  { key: "updated_quantity", label: translations.updatedQuantity },
  { key: "quantity_left", label: translations.quantityLeft },
  { key: "alloted_rashi", label: translations.allotedRashi },
  { key: "sold_rashi", label: translations.soldRashi },
  { key: "cut_quantity", label: translations.cutQuantity },
  { key: "total_bill", label: translations.totalBill },
  { key: "bill_id", label: translations.billId },
  { key: "billing_date", label: translations.billingDate },
];

const Billing = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sourceUserMap, setSourceUserMap] = useState({});
  const [modifiedItems, setModifiedItems] = useState({});

  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map((col) => col.key)
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [filters, setFilters] = useState({
    center_name: [], source_of_receipt: [], nivesh: [],
    subnivesh_name: [], scheme_name: [],
  });

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Page Number State
  const [showPageNoModal, setShowPageNoModal] = useState(false);
  const [pageNoInputs, setPageNoInputs] = useState({}); 

  const columnMapping = {
    sno: { header: "क्र.सं.", accessor: (item, index, currentPage, itemsPerPage) => (currentPage - 1) * itemsPerPage + index + 1 },
    center_name: { header: translations.centerName, accessor: (item) => item.center_name },
    source_of_receipt: { header: translations.sourceOfReceipt, accessor: (item) => item.source_of_receipt },
    nivesh: { header: translations.nivesh, accessor: (item) => item.investment_name },
    subnivesh_name: { header: translations.subniveshName, accessor: (item) => item.sub_investment_name },
    scheme_name: { header: translations.schemeName, accessor: (item) => item.scheme_name },
    unit: { header: translations.unit, accessor: (item) => item.unit },
    allocated_quantity: { header: translations.allocatedQuantity, accessor: (item) => item.allocated_quantity },
    rate: { header: "क्रय दर (प्रति इकाई)", accessor: (item) => item.rate },
    farmer_selling_rate: { header: translations.farmerSellingRate, accessor: (item) => item.farmer_selling_rate },
    farmer_subsidy_rate: { header: translations.farmerSubsidyRate, accessor: (item) => item.farmer_subsidy_rate },
    amount_of_farmer_share: { header: translations.farmerShareAmount, accessor: (item) => item.amount_of_farmer_share },
    amount_of_subsidy: { header: translations.subsidyAmount, accessor: (item) => item.amount_of_subsidy },
    total_amount: { header: translations.totalAmount, accessor: (item) => item.total_amount },
    anudan_name: { header: translations.anudanName, accessor: (item) => item.anudan_name },
    remark: { header: translations.remark, accessor: (item) => item.remark },
    bill_date: { header: translations.billDate, accessor: (item) => item.bill_date },
    updated_quantity: { header: translations.updatedQuantity, accessor: (item) => item.updated_quantity },
    quantity_left: { header: translations.quantityLeft, accessor: (item) => calculateQuantityLeft(item.allocated_quantity, item.updated_quantity, item.cut_quantity) },
    alloted_rashi: { header: translations.allotedRashi, accessor: (item) => calculateAllocatedAmount(item.allocated_quantity, item.rate) },
    sold_rashi: { header: translations.soldRashi, accessor: (item) => calculateAmount(item.updated_quantity, item.rate) },
    cut_quantity: { header: translations.cutQuantity, accessor: (item) => item.cut_quantity },
    total_bill: { header: translations.totalBill, accessor: (item) => calculateTotalBill(item.cut_quantity, item.rate) },
    bill_id: { header: translations.billId, accessor: (item) => item.bill_report_id },
    billing_date: { header: translations.billingDate, accessor: (item) => item.billing_date },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(GET_API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        const sourceMapping = {};
        data.forEach((item) => {
          if (item.source_of_receipt && item.user_id) sourceMapping[item.source_of_receipt] = item.user_id;
        });
        setSourceUserMap(sourceMapping);

        const initializedData = data.map((item) => ({
          ...item, cut_quantity: "", billing_date: "", bill_report_id: "",
        }));
        setBillingData(initializedData);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    setCurrentPage(1);
  }, [filters, fromDate, toDate]);

  const filterOptions = useMemo(() => {
    if (!billingData || billingData.length === 0) return { center_name: [], source_of_receipt: [], nivesh: [], subnivesh_name: [], scheme_name: [] };
    return {
      center_name: [{ value: "select_all", label: "सभी चुनें" }, ...[...new Set(billingData.map((item) => item.center_name))].map((name) => ({ value: name, label: name }))],
      source_of_receipt: [{ value: "select_all", label: "सभी चुनें" }, ...[...new Set(billingData.map((item) => item.source_of_receipt))].map((name) => ({ value: name, label: name }))],
      nivesh: [{ value: "select_all", label: "सभी चुनें" }, ...[...new Set(billingData.map((item) => item.investment_name))].map((name) => ({ value: name, label: name }))],
      subnivesh_name: [{ value: "select_all", label: "सभी चुनें" }, ...[...new Set(billingData.map((item) => item.sub_investment_name))].map((name) => ({ value: name, label: name }))],
      scheme_name: [{ value: "select_all", label: "सभी चुनें" }, ...[...new Set(billingData.map((item) => item.scheme_name))].map((name) => ({ value: name, label: name }))],
    };
  }, [billingData]);

  const filteredData = useMemo(() => {
    return billingData.filter((item) => {
      const matchesCenter = filters.center_name.length === 0 || filters.center_name.some((c) => c.value === item.center_name);
      const matchesSource = filters.source_of_receipt.length === 0 || filters.source_of_receipt.some((s) => s.value === item.source_of_receipt);
      const matchesScheme = filters.scheme_name.length === 0 || filters.scheme_name.some((scheme) => scheme.value === item.scheme_name);
      const matchesNivesh = filters.nivesh.length === 0 || filters.nivesh.some((n) => n.value === item.investment_name);
      const matchesSubnivesh = filters.subnivesh_name.length === 0 || filters.subnivesh_name.some((sub) => sub.value === item.sub_investment_name);

      let matchesDateRange = true;
      if (fromDate || toDate) {
        const itemDate = item.bill_date ? new Date(item.bill_date) : null;
        if (itemDate && !isNaN(itemDate.getTime())) {
          if (fromDate) { const from = new Date(fromDate); from.setHours(0, 0, 0, 0); if (itemDate < from) matchesDateRange = false; }
          if (toDate) { const to = new Date(toDate); to.setHours(23, 59, 59, 999); if (itemDate > to) matchesDateRange = false; }
        } else {
          matchesDateRange = false;
        }
      }
      return matchesCenter && matchesSource && matchesScheme && matchesNivesh && matchesSubnivesh && matchesDateRange;
    });
  }, [billingData, filters, fromDate, toDate]);

  // Unique sub_investment_name values from filtered data
  const uniqueSubniveshNames = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const uniqueSet = new Set();
    filteredData.forEach((item) => {
      const name = item.sub_investment_name;
      if (name !== null && name !== undefined && String(name).trim() !== "") {
        uniqueSet.add(String(name).trim());
      }
    });
    return Array.from(uniqueSet);
  }, [filteredData]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedBillingData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const downloadExcel = (data, filename) => {
    try {
      const excelData = data.map((item, index) => {
        const row = {};
        selectedColumns.forEach((col) => { row[columnMapping[col].header] = columnMapping[col].accessor(item, index, currentPage, itemsPerPage); });
        return row;
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "BillingItems");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) { console.error("Error generating Excel file:", e); }
  };

  const downloadPdf = (data, filename) => {
    try {
      const headers = selectedColumns.map((col) => `<th>${columnMapping[col].header}</th>`).join("");
      const rows = data.map((item, index) => `<tr>${selectedColumns.map((col) => `<td>${columnMapping[col].accessor(item, index, currentPage, itemsPerPage)}</td>`).join("")}</tr>`).join("");
      const tableHtml = `<html><head><style>table{border-collapse:collapse;width:100%;font-family:Arial,sans-serif;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;font-weight:bold;}</style></head><body><h2>${translations.billingItems}</h2><table><tr>${headers}</tr>${rows}</table></body></html>`;
      const printWindow = window.open("", "_blank");
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    } catch (e) { console.error("Error generating PDF:", e); }
  };

  const handleFilterChange = (filterName, value) => {
    if (value && value.some((v) => v.value === "select_all")) {
      const allOptions = filterOptions[filterName].filter((opt) => opt.value !== "select_all");
      setFilters((prev) => ({ ...prev, [filterName]: allOptions }));
    } else {
      setFilters((prev) => ({ ...prev, [filterName]: value }));
    }
  };

  const handleCutQuantityChange = (id, value) => {
    const sanitizedValue = value === "" ? "" : String(value).trim();
    const numValue = sanitizedValue === "" ? 0 : Math.max(0, parseFloat(sanitizedValue) || 0);
    setBillingData((prevData) => prevData.map((row) => (row.id === id ? { ...row, cut_quantity: numValue } : row)));
    setModifiedItems((prev) => ({ ...prev, [id]: true }));
  };

  const applyBulkFieldValue = (fieldName, value, changedItemId) => {
    const normalizedValue = value === "" || value === null || value === undefined ? "" : typeof value === "string" ? value.trim() : value;
    setBillingData((prevData) => prevData.map((item) => ({ ...item, [fieldName]: normalizedValue })));
    setModifiedItems((prev) => {
      const next = { ...prev };
      billingData.forEach((item) => { next[item.id] = true; });
      next[changedItemId] = true;
      return next;
    });
  };

  const handleBillingDateChange = (id, value) => {
    let formattedDate = value;
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      formattedDate = value;
    } else if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) formattedDate = date.toISOString().split("T")[0];
    }
    applyBulkFieldValue("billing_date", formattedDate, id);
  };

  // FIXED: Only apply Bill Report ID to rows with the same Center and Billing Date
  const handleBillReportIdChange = (id, value) => {
    const trimmed = value ? value.toString().trim() : "";
    const changedItem = billingData.find(item => item.id === id);
    if (!changedItem) return;

    setBillingData((prevData) => prevData.map((item) => {
      if (item.center_id === changedItem.center_id && item.billing_date === changedItem.billing_date) {
        return { ...item, bill_report_id: trimmed };
      }
      return item;
    }));
    
    setModifiedItems((prev) => {
      const next = { ...prev };
      billingData.forEach((item) => {
        if (item.center_id === changedItem.center_id && item.billing_date === changedItem.billing_date) {
          next[item.id] = true;
        }
      });
      next[id] = true;
      return next;
    });
  };

  const resetRowFields = (id) => {
    setBillingData((prevData) => prevData.map((item) => item.id === id ? { ...item, cut_quantity: 0, billing_date: "", bill_report_id: "" } : item));
    setModifiedItems((prev) => ({ ...prev, [id]: true }));
  };

  const calculateQuantityLeft = (allocated, updated, cut) => ((parseFloat(allocated) || 0) - (parseFloat(updated) || 0) - (parseFloat(cut) || 0)).toFixed(2);
  const calculateAmount = (quantity, rate) => ((parseFloat(quantity) || 0) * (parseFloat(rate) || 0)).toFixed(2);
  const calculateAllocatedAmount = (allocatedQuantity, rate) => ((parseFloat(allocatedQuantity) || 0) * (parseFloat(rate) || 0)).toFixed(2);
  const calculateTotalBill = (cutQuantity, rate) => ((parseFloat(cutQuantity) || 0) * (parseFloat(rate) || 0)).toFixed(2);

  const handleOpenPageNoModal = () => {
    setShowPageNoModal(true);
  };

  const handlePageNoInputChange = (subniveshName, value) => {
    setPageNoInputs((prev) => ({ ...prev, [subniveshName]: value }));
  };

  const handleSavePageNo = () => {
    setShowPageNoModal(false);
  };

  // Main form submit (includes both multiple_bills and component_pageno)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedItems = billingData.filter((item) => modifiedItems[item.id] && item.cut_quantity > 0);
    if (updatedItems.length === 0) {
      setSubmitError(translations.noItemsUpdated);
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      setShowErrorModal(false);
      setSubmitSuccess(false);

      const itemsWithoutDate = updatedItems.filter((item) => !item.billing_date);
      if (itemsWithoutDate.length > 0) {
        setSubmitError(`Please select billing date for all items. Missing dates for ${itemsWithoutDate.length} item(s).`);
        return;
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const itemsWithInvalidDate = updatedItems.filter((item) => !dateRegex.test(item.billing_date));
      if (itemsWithInvalidDate.length > 0) {
        setSubmitError(`Invalid date format found. All dates must be in YYYY-MM-DD format. Please check ${itemsWithInvalidDate.length} item(s).`);
        return;
      }

      const itemsWithoutReportId = updatedItems.filter((item) => !item.bill_report_id || item.bill_report_id.toString().trim() === "");
      if (itemsWithoutReportId.length > 0) {
        setSubmitError(`Please enter Bill Report ID for all modified items. Missing for ${itemsWithoutReportId.length} item(s).`);
        return;
      }

      const itemsByCenterDateReport = {};
      updatedItems.forEach((item) => {
        const centerId = item.center_id;
        const billingDate = item.billing_date;
        const billReportId = item.bill_report_id || "";
        const compositeKey = `${centerId}_${billingDate}_${billReportId}`;
        if (!itemsByCenterDateReport[compositeKey]) {
          itemsByCenterDateReport[compositeKey] = { center_id: centerId, billing_date: billingDate, bill_report_id: billReportId, items: [] };
        }
        itemsByCenterDateReport[compositeKey].items.push(item);
      });

      // Check if the user entered the same Bill Report ID for different centers/dates
      const reportIdsArray = Object.values(itemsByCenterDateReport).map(g => g.bill_report_id);
      const duplicateReportIds = reportIdsArray.filter((id, index) => reportIdsArray.indexOf(id) !== index);
      if (duplicateReportIds.length > 0) {
        setSubmitError(`Duplicate Bill Report ID found: ${duplicateReportIds.join(", ")}. Please ensure each Center/Date combination has a unique Bill Report ID.`);
        return;
      }

      const payloads = Object.keys(itemsByCenterDateReport).map((compositeKey) => {
        const group = itemsByCenterDateReport[compositeKey];
        const multiple_bills = group.items.map((item) => {
          const existingUpdated = parseFloat(item.updated_quantity) || 0;
          const newCut = parseFloat(item.cut_quantity) || 0;
          const totalUpdated = (existingUpdated + newCut).toString();
          return [item.bill_id, totalUpdated];
        });

        // --- Build component_pageno array ---
        const pnoGrouped = {};
        group.items.forEach(item => {
          const name = item.sub_investment_name;
          const pno = pageNoInputs[name];
          if (pno !== undefined && pno !== null && String(pno).trim() !== "") {
            const pnoStr = String(pno).trim();
            if (!pnoGrouped[pnoStr]) pnoGrouped[pnoStr] = new Set();
            pnoGrouped[pnoStr].add(name);
          }
        });

        const pnoPairs = Object.entries(pnoGrouped).map(([pno, namesSet]) => {
          const parsedPno = parseInt(pno, 10);
          const finalPnoVal = isNaN(parsedPno) ? pno : parsedPno;
          return [Array.from(namesSet), finalPnoVal];
        });

        let finalComponentPageno = [];
        if (pnoPairs.length > 0) {
          finalComponentPageno = pnoPairs.length === 1 ? pnoPairs[0] : pnoPairs;
        }
        // -----------------------------------

        return {
          bill_report_id: group.bill_report_id || "",
          center_id: group.center_id,
          billing_date: group.billing_date,
          multiple_bills: multiple_bills,
          component_pageno: finalComponentPageno
        };
      });

      console.log("Submitting payloads:", JSON.stringify({ data: payloads }, null, 2));

      const response = await fetch(UPDATE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payloads }),
      });

      let responseText;
      try { responseText = await response.text(); } catch (e) { console.error("Error reading response text:", e); }
      let responseData;
      try { if (responseText) responseData = JSON.parse(responseText); } catch (e) { console.error("Error parsing response as JSON:", e); }

      if (!response.ok) {
        let errorMessage;
        if (responseData && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          // Deduplicate error messages so they don't show 9 times
          const uniqueErrorStrings = Array.from(new Set(responseData.errors.map(err => `बिल रिपोर्ट आईडी '${err.bill_report_id}' के लिए त्रुटि: ${err.error}`)));
          errorMessage = uniqueErrorStrings.join("\n");
        } else {
          errorMessage = responseData?.message || responseData?.error || `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      setSubmitSuccess(true);
      setModifiedItems({});
      setPageNoInputs({});

      const refreshResponse = await fetch(GET_API_URL);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const sourceMapping = {};
        data.forEach((item) => { if (item.source_of_receipt && item.user_id) sourceMapping[item.source_of_receipt] = item.user_id; });
        setSourceUserMap(sourceMapping);
        setBillingData(data.map((item) => ({ ...item, cut_quantity: "", billing_date: "" })));
      }
    } catch (e) {
      console.error("Submit error:", e);
      setSubmitError(e.message);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFilters({ center_name: [], source_of_receipt: [], nivesh: [], subnivesh_name: [], scheme_name: [] });
    setFromDate(""); setToDate("");
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const paginationItems = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);
  if (startPage > 1) {
    paginationItems.push(<Pagination.Item key={1} onClick={() => handlePageChange(1)}>1</Pagination.Item>);
    if (startPage > 2) paginationItems.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
  }
  for (let number = startPage; number <= endPage; number++) {
    paginationItems.push(<Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>{number}</Pagination.Item>);
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) paginationItems.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    paginationItems.push(<Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>{totalPages}</Pagination.Item>);
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <LeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
        <div className="main-content d-flex justify-content-center align-items-center"><Spinner animation="border" /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="dashboard-container">
        <LeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
        <div className="main-content"><Container fluid className="dashboard-body"><Alert variant="danger">{translations.error}: {error}</Alert></Container></div>
      </div>
    );
  }

  return (
    <>
      <style>{billingTableCss}</style>
      <div>
        <Container fluid className="p-4">
          <Row><Col lg={12} md={12} sm={12}><DashBoardHeader /></Col></Row>
          <Row className="left-top">
            <Col lg={12} md={12} sm={10}>
              <Container fluid className="dashboard-body-main bg-home">
                <h1 className="page-title small-fonts">{translations.billing}</h1>

                {submitSuccess && (<Alert variant="success" dismissible onClose={() => setSubmitSuccess(false)}>{translations.billingDataUpdated}</Alert>)}
                {submitError && (<Alert variant="danger" dismissible onClose={() => setSubmitError(null)}>{translations.error}: {submitError}</Alert>)}

                {/* Filters Section */}
                <div className="filter-section mb-4 p-3 border rounded bg-light">
                  <Row className="mb-3">
                    <Col md={12} className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 small-fonts">{translations.filters}</h5>
                      {(filters.center_name.length > 0 || filters.source_of_receipt.length > 0 || filters.nivesh.length > 0 || filters.subnivesh_name.length > 0 || filters.scheme_name.length > 0 || fromDate || toDate) && (
                        <Button variant="outline-secondary" size="sm" onClick={clearFilters} className="small-fonts">{translations.clearAllFilters}</Button>
                      )}
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.fromDate}</FormLabel><Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="small-fonts compact-input" /></FormGroup></Col>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.toDate}</FormLabel><Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="small-fonts compact-input" /></FormGroup></Col>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.centerName}</FormLabel><Select value={filters.center_name} onChange={(value) => handleFilterChange("center_name", value)} options={filterOptions.center_name} isMulti={true} isClearable={true} placeholder={translations.allCenters} styles={customSelectStyles} className="compact-input small-fonts filter-dropdown" menuPortalTarget={document.body} menuPosition="fixed" /></FormGroup></Col>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.sourceOfReceipt}</FormLabel><Select value={filters.source_of_receipt} onChange={(value) => handleFilterChange("source_of_receipt", value)} options={filterOptions.source_of_receipt} isMulti={true} isClearable={true} placeholder={translations.allSources} styles={customSelectStyles} className="compact-input small-fonts filter-dropdown" menuPortalTarget={document.body} menuPosition="fixed" /></FormGroup></Col>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.schemeName}</FormLabel><Select value={filters.scheme_name} onChange={(value) => handleFilterChange("scheme_name", value)} options={filterOptions.scheme_name} isClearable={true} isMulti={true} placeholder={translations.allSchemes} styles={customSelectStyles} className="compact-input small-fonts filter-dropdown" menuPortalTarget={document.body} menuPosition="fixed" /></FormGroup></Col>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.nivesh}</FormLabel><Select value={filters.nivesh} onChange={(value) => handleFilterChange("nivesh", value)} options={filterOptions.nivesh} isClearable={true} isMulti={true} placeholder={translations.allNivesh} styles={customSelectStyles} className="compact-input small-fonts filter-dropdown" menuPortalTarget={document.body} menuPosition="fixed" /></FormGroup></Col>
                  </Row>
                  <Row>
                    <Col xs={12} sm={6} md={3} className="mb-2"><FormGroup><FormLabel className="small-fonts fw-bold">{translations.subniveshName}</FormLabel><Select value={filters.subnivesh_name} onChange={(value) => handleFilterChange("subnivesh_name", value)} options={filterOptions.subnivesh_name} isClearable={true} isMulti={true} placeholder={translations.allSubnivesh} styles={customSelectStyles} className="compact-input small-fonts filter-dropdown" menuPortalTarget={document.body} menuPosition="fixed" /></FormGroup></Col>
                  </Row>
                </div>

                <div>
                  <Form onSubmit={handleSubmit}>
                    <div className="billing-table-container">
                      <Row className="mt-3">
                        <div className="col-md-12">
                          <div className="table-wrapper">
                            {!fromDate && !toDate ? (
                              <Alert variant="info" className="text-center"><h5>{translations.selectDateRange}</h5><p className="mb-0">{translations.pleaseSelectDateRange}</p></Alert>
                            ) : filteredData.length > 0 ? (
                              <>
                                <div className="d-flex justify-content-end mb-2 flex-wrap gap-2">
                                  <Button variant="primary" size="sm" onClick={handleOpenPageNoModal} className="small-fonts" title="Click to assign page numbers to unique उप-निवेश names">
                                    <FaListAlt className="me-1" />{translations.assignPageNoBtn}
                                  </Button>
                                  <Button variant="outline-success" size="sm" onClick={() => downloadExcel(filteredData, `BillingItems_${new Date().toISOString().split("T")[0]}`)}><FaFileExcel className="me-1" />Excel</Button>
                                  <Button variant="outline-danger" size="sm" onClick={() => downloadPdf(filteredData, `BillingItems_${new Date().toISOString().split("T")[0]}`)}><FaFilePdf className="me-1" />PDF</Button>
                                </div>

                                <div className="table-info mb-2 d-flex justify-content-between align-items-center">
                                  <span className="small-fonts">{translations.showing} {indexOfFirstItem + 1} {translations.to} {Math.min(indexOfLastItem, filteredData.length)} {translations.of} {filteredData.length} {translations.entries}</span>
                                  <div className="d-flex align-items-center"><span className="small-fonts me-2">{translations.itemsPerPage}</span><span className="badge bg-primary">{itemsPerPage}</span></div>
                                </div>

                                <div className="column-selection mb-3 p-3 border rounded bg-light">
                                  <h6 className="small-fonts mb-3">{translations.selectColumns}</h6>
                                  <Row><Col><div className="d-flex flex-wrap">
                                    {availableColumns.map((col) => (
                                      <div key={col.key} className="form-check me-3 mb-2">
                                        <input type="checkbox" id={`col-${col.key}`} checked={selectedColumns.includes(col.key)} onChange={(e) => { if (e.target.checked) setSelectedColumns([...selectedColumns, col.key]); else setSelectedColumns(selectedColumns.filter((c) => c !== col.key)); }} className="form-check-input" />
                                        <label className="form-check-label small-fonts ms-1" htmlFor={`col-${col.key}`}>{col.label}</label>
                                      </div>
                                    ))}
                                  </div></Col></Row>
                                </div>

                                <div className="billing-table-scroll">
                                  <table className="responsive-table small-fonts billing-data-table">
                                    <thead>
                                      <tr>
                                        <th>{translations.sno}</th><th>{translations.centerName}</th><th>{translations.sourceOfReceipt}</th><th>{translations.nivesh}</th><th>{translations.subniveshName}</th><th>{translations.schemeName}</th><th>{translations.unit}</th><th>{translations.allocatedQuantity}</th><th>क्रय दर<br />(प्रति इकाई)</th><th>{translations.farmerSellingRate}</th><th>{translations.farmerSubsidyRate}</th><th>{translations.farmerShareAmount}</th><th>{translations.subsidyAmount}</th><th>{translations.totalAmount}</th><th>{translations.anudanName}</th><th>{translations.remark}</th><th>{translations.billDate}</th><th>{translations.updatedQuantity}</th><th>{translations.quantityLeft}</th><th>{translations.allotedRashi}</th><th>{translations.soldRashi}</th><th>{translations.cutQuantity}</th><th>{translations.totalBill}</th><th>{translations.billId}</th><th>{translations.billingDate}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paginatedBillingData.map((item, index) => {
                                        const allocatedAmount = calculateAllocatedAmount(item.allocated_quantity, item.rate);
                                        const soldAmount = calculateAmount(item.updated_quantity, item.rate);
                                        const quantityLeft = calculateQuantityLeft(item.allocated_quantity, item.updated_quantity, item.cut_quantity);
                                        const maxCut = (parseFloat(item.allocated_quantity) || 0) - (parseFloat(item.updated_quantity) || 0);
                                        const totalBill = calculateTotalBill(item.cut_quantity, item.rate);
                                        return (
                                          <tr key={item.id}>
                                            <td data-label={translations.sno}>{indexOfFirstItem + index + 1}</td>
                                            <td data-label={translations.centerName}>{item.center_name}</td>
                                            <td data-label={translations.sourceOfReceipt}>{item.source_of_receipt}</td>
                                            <td data-label={translations.nivesh}>{item.investment_name}</td>
                                            <td data-label={translations.subniveshName}>{item.sub_investment_name}</td>
                                            <td data-label={translations.schemeName}>{item.scheme_name}</td>
                                            <td data-label={translations.unit}>{item.unit}</td>
                                            <td data-label={translations.allocatedQuantity}>{item.allocated_quantity}</td>
                                            <td data-label="क्रय दर (प्रति इकाई)">{item.rate}</td>
                                            <td data-label={translations.farmerSellingRate}>{item.farmer_selling_rate}</td>
                                            <td data-label={translations.farmerSubsidyRate}>{item.farmer_subsidy_rate}</td>
                                            <td data-label={translations.farmerShareAmount}>{item.amount_of_farmer_share}</td>
                                            <td data-label={translations.subsidyAmount}>{item.amount_of_subsidy}</td>
                                            <td data-label={translations.totalAmount}>{item.total_amount}</td>
                                            <td data-label={translations.anudanName}>{item.anudan_name}</td>
                                            <td data-label={translations.remark}>{item.remark}</td>
                                            <td data-label={translations.billDate}>{item.bill_date}</td>
                                            <td data-label={translations.updatedQuantity}>{item.updated_quantity}</td>
                                            <td data-label={translations.quantityLeft}>{quantityLeft}</td>
                                            <td data-label={translations.allotedRashi}>{allocatedAmount}</td>
                                            <td data-label={translations.soldRashi}>{soldAmount}</td>
                                            <td data-label={translations.cutQuantity}>
                                              <Form.Control type="number" min="0" max={maxCut} step="0.01" value={item.cut_quantity || ""} onChange={(e) => handleCutQuantityChange(item.id, e.target.value)} className={`small-fonts ${modifiedItems[item.id] ? "border-warning" : ""}`} />
                                            </td>
                                            <td data-label={translations.totalBill}><Form.Control type="text" value={totalBill} disabled className="bg-light small-fonts" /></td>
                                            <td data-label={translations.billId}>
                                              <Form.Control type="text" value={item.bill_report_id || ""} onChange={(e) => handleBillReportIdChange(item.id, e.target.value)} className={`small-fonts ${modifiedItems[item.id] ? "border-warning" : ""}`} />
                                            </td>
                                            <td data-label={translations.billingDate}>
                                              <div className="d-flex align-items-center gap-2">
                                                <Form.Control type="date" value={item.billing_date || ""} onChange={(e) => handleBillingDateChange(item.id, e.target.value)} className={`small-fonts ${modifiedItems[item.id] ? "border-warning" : ""}`} />
                                                <Button variant="outline-secondary" size="sm" onClick={() => resetRowFields(item.id)} title="Reset row">00</Button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {totalPages > 1 && (
                                  <div className="mt-2">
                                    <div className="small-fonts mb-3 text-center">{translations.page} {currentPage} {translations.of} {totalPages}</div>
                                    <Pagination className="d-flex justify-content-center">
                                      <Pagination.Prev disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} />
                                      {paginationItems}
                                      <Pagination.Next disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} />
                                    </Pagination>
                                  </div>
                                )}
                              </>
                            ) : fromDate || toDate ? (
                              <Alert variant="info">{translations.noMatchingItems}</Alert>
                            ) : null}
                          </div>
                        </div>
                      </Row>

                      <div className="d-flex justify-content-end mt-3">
                        <Button variant="primary" type="submit" disabled={submitting || Object.keys(modifiedItems).length === 0}>
                          {submitting ? <Spinner as="span" animation="border" size="sm" /> : null}
                          {translations.submitUpdates}
                        </Button>
                      </div>
                    </div>
                  </Form>
                </div>
              </Container>
            </Col>
          </Row>
        </Container>
      </div>

      {/* ===== Page Number Assignment Modal ===== */}
      <Modal show={showPageNoModal} onHide={() => setShowPageNoModal(false)} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ backgroundColor: "#238dce", color: "white" }}>
          <Modal.Title><FaListAlt className="me-2" />{translations.pageNoModalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pageno-modal-body">
          {uniqueSubniveshNames.length === 0 ? (
            <Alert variant="warning" className="text-center">{translations.noUniqueSubnivesh}</Alert>
          ) : (
            <>
              <p className="small-fonts text-muted mb-3">कुल अद्वितीय उप-निवेश नाम: <strong>{uniqueSubniveshNames.length}</strong></p>
              {uniqueSubniveshNames.map((name, idx) => (
                <div key={name} className="pageno-row">
                  <Row className="align-items-center">
                    <Col xs={12} md={7}>
                      <div className="d-flex align-items-center">
                        <span className="badge bg-secondary me-2">{idx + 1}</span>
                        <strong className="small-fonts">{name}</strong>
                      </div>
                      <small className="text-muted d-block ms-4" style={{ fontSize: "11px" }}>{translations.subniveshName}</small>
                    </Col>
                    <Col xs={12} md={5}>
                      <Form.Group>
                        <FormLabel className="small-fonts mb-1">{translations.pageNoLabel}</FormLabel>
                        <Form.Control type="text" value={pageNoInputs[name] || ""} onChange={(e) => handlePageNoInputChange(name, e.target.value)} placeholder="पेज नंबर दर्ज करें" className="small-fonts" />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              ))}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPageNoModal(false)}>{translations.closeBtn}</Button>
          <Button variant="primary" onClick={handleSavePageNo} disabled={uniqueSubniveshNames.length === 0}>{translations.savePageNo}</Button>
        </Modal.Footer>
      </Modal>

      {/* Error Modal */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: "#dc3545", color: "white" }}>
          <Modal.Title><FaFileExcel className="me-2" />{translations.error}</Modal.Title>
        </Modal.Header>
        <Modal.Body><p style={{ whiteSpace: "pre-wrap" }}>{submitError}</p></Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowErrorModal(false)}>{translations.closeBtn}</Button></Modal.Footer>
      </Modal>
    </>
  );
};

export default Billing;