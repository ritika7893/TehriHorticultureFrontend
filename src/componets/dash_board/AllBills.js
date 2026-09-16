import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Container,
  Spinner,
  Alert,
  Row,
  Col,
  Button,
  FormGroup,
  FormLabel,
  Form,
  FormCheck,
  Collapse,
  Badge,
  Pagination,
  ProgressBar,
  Modal,
  Table,
} from "react-bootstrap";
import Select from "react-select";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { FaDownload, FaEye } from "react-icons/fa";
import "../../assets/css/dashboard.css";
import "../../assets/css/table.css";
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";
import Footer from "../footer/Footer";
import {
  buildReceiptZipDownloadPayload,
  triggerBlobDownload,
} from "../../utils/receiptDownload";

// API URLs
const GET_REPORTS_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/report-billing-items/";
const UPDATE_REPORT_STATUS_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/update-billing-item/";
const UPDATE_BILLING_REPORT_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/billing-report/update/";
const BASE_URL = "https://mahadevaaya.com/govbillingsystem/backend";

// Custom styles for react-select components
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
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: "#6b7280",
    fontSize: "14px",
  }),
};

// Hindi translations
const translations = {
  dashboard: "डैशबोर्ड",
  allBills: "सभी बिल रिपोर्ट",
  filters: "फिल्टर",
  clearAllFilters: "सभी फिल्टर हटाएं",
  centerName: "केंद्र का नाम",
  sno: "क्र.सं.",
  reportId: "बिल संख्या",
  billId: "बिल संख्या",
  reportDate: "रिपोर्ट दिनांक",
  status: "स्थिति",
  download: "डाउनलोड",
  downloadFilteredPdf: "फ़िल्टर किए गए डेटा का PDF डाउनलोड करें",
  viewDetails: "विवरण देखें",
  loading: "लोड हो रहा है...",
  noReportsFound: "कोई बिल रिपोर्ट नहीं मिली।",
  noMatchingReports: "चयनित फिल्टर से मेल खाने वाली कोई रिपोर्ट नहीं मिली।",
  allCenters: "सभी केंद्र",
  fetchError: "डेटा लाने में विफल। कृपया बाद में पुन: प्रयास करें।",
  networkError: "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।",
  serverError: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  retry: "पुनः प्रयास करें",
  error: "त्रुटि",
  downloadError: "रिपोर्ट डाउनलोड करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  downloadSuccess: "रिपोर्ट सफलतापूर्वक डाउनलोड की गई।",
  statusUpdateSuccess: "रिपोर्ट स्थिति सफलतापूर्वक अपडेट की गई।",
  statusUpdateError: "रिपोर्ट स्थिति अपडेट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  cancelReport: "रिपोर्ट रद्द करें",
  confirmCancel: "क्या आप वाकई इस रिपोर्ट को रद्द करना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
  yes: "हाँ",
  no: "नहीं",
  accepted: "स्वीकृत",
  cancelled: "रद्द",
  nivesh: "निवेश",
  subniveshName: "उप-निवेश का नाम",
  unit: "इकाई",
  allocatedQuantity: "आवंटित मात्रा ",
  rate: "दर",
  updatedQuantity: "अपडेट की गई मात्रा",
  buyAmount: "कुल राशि",
  schemeName: "योजना का नाम",
  sourceOfReceipt: "सप्लायर",
  totalItems: "कुल आइटम",
  showing: "दिखा रहे हैं",
  to: "से",
  of: "का",
  entries: "प्रविष्टियां",
  itemsPerPage: "प्रति पृष्ठ आइटम:",
  details: "विवरण",
  viewReceipt: "रसीद देखें",
  receipt: "रसीद",
  downloadBill: "बिल डाउनलोड करें",
  downloadCancelledBill: "रद्द किए गए बिल डाउनलोड करें",
  quantityLeft: "बची हुई मात्रा",
  allotedRashi: "आवंटित राशि",
  soldRashi: "बेची गई राशि",
  totalBill: "कुल बिल",
  billingDate: "बिलिंग दिनांक",
  edit: "संपादित करें",
  save: "सहेजें",
  cancel: "रद्द करें",
  editBillDetails: "बिल विवरण संपादित करें",
  changeBillNumber: "बिल संख्या बदलें",
  editing: "संपादन...",
  updateSuccess: "बिल विवरण सफलतापूर्वक अपडेट किए गए।",
  updateError: "बिल विवरण अपडेट करने में विफल। कृपया बाद में पुन: प्रयास करें।",
  oldBillNumber: "पुरानी बिल संख्या",
  newBillNumber: "नई बिल संख्या",
  downloadSelectedBills: "चयनित बिल डाउनलोड करें",
  selectedBills: "चयनित बिल",
  clearSelection: "चयन हटाएं",
  selectAllOnPage: "इस पृष्ठ के सभी चुनें",
  downloadingBills: "बिल डाउनलोड हो रहे हैं...",
  allBillsDownloaded: "सभी चयनित बिल सफलतापूर्वक डाउनलोड हुए।",
  someBillsFailed: "में विफल",
  allBillsFailed: "सभी बिल डाउनलोड करने में विफल। कृपया बाद में पुन: प्रयास करें।",
  noPdfAvailable: "PDF उपलब्ध नहीं",
  fetching: "ला रहे हैं",
  ofWord: "में से",
  creatingZip: "ZIP फ़ाइल बनाई जा रही है...",
  downloadComplete: "डाउनलोड पूर्ण!",
  bill: "बिल",
  bills: "बिल",
  openedInTabs: "ब्राउज़र टैब में खोले गए (ब्राउज़र ने ऑटो-डाउनलोड ब्लॉक किया हो सकता है)",
  componentPageno: "उप-निवेश पेज नंबर",
  viewPagesBtn: "पेज देखें",
  pageDetails: "पेज नंबर विवरण",
  noPageData: "कोई पेज नंबर उपलब्ध नहीं है।",
  closeBtn: "बंद करें",
  pageNo: "पेज नंबर",
};

// Available columns for component download
const availableComponentColumns = [
  { key: "reportId", label: translations.reportId },
  { key: "nivesh", label: translations.nivesh },
  { key: "subnivesh_name", label: translations.subniveshName },
  { key: "scheme_name", label: translations.schemeName },
  { key: "source_of_receipt", label: translations.sourceOfReceipt },
  { key: "unit", label: translations.unit },
  { key: "allocated_quantity", label: translations.allocatedQuantity },
  { key: "rate", label: translations.rate },
  { key: "updated_quantity", label: translations.updatedQuantity },
  { key: "buy_amount", label: translations.allotedRashi },
  { key: "sold_amount", label: translations.soldRashi },
];

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("hi-IN");
};

// Calculation functions
const calculateQuantityLeft = (allocated, updated) => {
  return (parseFloat(allocated) || 0) - (parseFloat(updated) || 0);
};

// Column mapping for component data access
const columnMapping = {
  reportId: {
    header: translations.reportId,
    accessor: (item, billReportId) =>
      billReportId || item.bill_report_id || item.report_id || "",
  },
  nivesh: {
    header: translations.nivesh,
    accessor: (item) => item.investment_name,
  },
  subnivesh_name: {
    header: translations.subniveshName,
    accessor: (item) => item.sub_investment_name,
  },
  scheme_name: {
    header: translations.schemeName,
    accessor: (item) => item.scheme_name,
  },
  source_of_receipt: {
    header: translations.sourceOfReceipt,
    accessor: (item) => item.source_of_receipt,
  },
  unit: { header: translations.unit, accessor: (item) => item.unit },
  allocated_quantity: {
    header: translations.allocatedQuantity,
    accessor: (item) => item.allocated_quantity,
  },
  updated_quantity: {
    header: translations.updatedQuantity,
    accessor: (item) => item.updated_quantity,
  },
  rate: { header: translations.rate, accessor: (item) => item.rate },
  buy_amount: {
    header: translations.allotedRashi,
    accessor: (item) => item.buy_amount,
  },
  sold_amount: {
    header: translations.soldRashi,
    accessor: (item) => item.sold_amount,
  },
};

// Helper to calculate report sold amount from component_data
const calculateReportSoldAmount = (item) => {
  return (
    item.component_data?.reduce(
      (sum, comp) => sum + (parseFloat(comp.sold_amount) || 0),
      0
    ) || 0
  );
};

const downloadFilteredBillsPdf = (data, currentFilters) => {
  if (!data || data.length === 0) return;

  const formatStatus = (status) =>
    status === "accepted"
      ? translations.accepted
      : status === "cancelled"
      ? translations.cancelled
      : status || "";

  const filterSummary = [];
  if (currentFilters.center_name.length > 0)
    filterSummary.push(
      `केंद्र: ${currentFilters.center_name.map((c) => c.label).join(", ")}`
    );
  if (currentFilters.bill_id.length > 0)
    filterSummary.push(
      `बिल संख्या: ${currentFilters.bill_id.map((b) => b.label).join(", ")}`
    );
  if (currentFilters.status.length > 0)
    filterSummary.push(
      `स्थिति: ${currentFilters.status.map((s) => s.label).join(", ")}`
    );
  if (currentFilters.dateFrom) filterSummary.push(`From: ${currentFilters.dateFrom}`);
  if (currentFilters.dateTo) filterSummary.push(`To: ${currentFilters.dateTo}`);

  const rowsHtml = data
    .map(
      (item, idx) => `
        <tr>
          <td style="border:1px solid #444;padding:6px;text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #444;padding:6px;">${item.bill_report_id || ""}</td>
          <td style="border:1px solid #444;padding:6px;">${item.center_name || ""}</td>
          <td style="border:1px solid #444;padding:6px;">${formatDate(item.billing_date)}</td>
          <td style="border:1px solid #444;padding:6px;">${formatStatus(item.status)}</td>
          <td style="border:1px solid #444;padding:6px;text-align:right;">${item.component_data?.length || 0}</td>
          <td style="border:1px solid #444;padding:6px;text-align:right;">${calculateReportSoldAmount(item)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <div style="font-family:Arial, sans-serif; font-size:12px; color:#000;">
      <style>
        body { margin: 10mm; }
        table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #444; padding: 8px; text-align: left; page-break-inside: avoid; }
        th { background: #f2f2f2; }
        p { margin: 0 0 6px; }
      </style>
      <h2 style="text-align:center; margin-bottom:8px;">${translations.allBills}</h2>
      ${filterSummary.length > 0 ? `<p style="font-size:11px;">${filterSummary.join(" | ")}</p>` : ""}
      <table>
        <thead>
          <tr>
            <th>${translations.sno}</th>
            <th>${translations.reportId}</th>
            <th>${translations.centerName}</th>
            <th>${translations.reportDate}</th>
            <th>${translations.status}</th>
            <th>${translations.totalItems}</th>
            <th>${translations.buyAmount}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = html;

  const opt = {
    margin: [12, 12, 12, 12],
    filename: "filtered_bills.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
  };

  html2pdf().set(opt).from(container).save();
};

// Column mapping for reports table display
const reportsColumnMapping = {
  sno: {
    header: translations.sno,
    accessor: (item, index, currentPageVal, itemsPerPageVal) =>
      (currentPageVal - 1) * itemsPerPageVal + index + 1,
  },
  reportId: {
    header: translations.reportId,
    accessor: (item) => item.bill_report_id,
  },
  centerName: {
    header: translations.centerName,
    accessor: (item) => item.center_name,
  },
  reportDate: {
    header: translations.reportDate,
    accessor: (item) => formatDate(item.billing_date),
  },
  status: {
    header: translations.status,
    accessor: (item) =>
      item.status === "accepted"
        ? translations.accepted
        : item.status === "cancelled"
        ? translations.cancelled
        : item.status,
  },
  totalItems: {
    header: translations.totalItems,
    accessor: (item) => item.component_data?.length || 0,
  },
  buyAmount: {
    header: translations.buyAmount,
    accessor: (item) => calculateReportSoldAmount(item),
  },
};

let _debugLogged = false;
const getBillPdfPath = (item) => {
  if (!item) return null;

  if (!_debugLogged) {
    _debugLogged = true;
    console.log(
      "%c[AllBills Debug] First bill item keys:",
      "color: blue; font-weight: bold;",
      Object.keys(item)
    );
  }

  if (item.recipt_file) return item.recipt_file;

  const pathFields = [
    "receipt_path", "pdf_path", "bill_pdf_path", "file_path", "bill_pdf",
    "pdf", "receipt", "document_path", "document", "bill_file", "receipt_url",
    "pdf_url", "download_url", "bill_path", "report_path", "file", "path",
    "receipt_file", "pdf_file", "bill_document", "generated_pdf",
    "bill_receipt", "report_pdf", "invoice_path", "invoice_pdf",
  ];

  for (const field of pathFields) {
    if (
      item[field] &&
      typeof item[field] === "string" &&
      item[field].trim() !== "" &&
      item[field].trim() !== "null" &&
      item[field].trim() !== "undefined"
    ) {
      return item[field];
    }
  }

  if (item.component_data && item.component_data.length > 0) {
    const comp = item.component_data[0];
    for (const field of pathFields) {
      if (
        comp[field] &&
        typeof comp[field] === "string" &&
        comp[field].trim() !== "" &&
        comp[field].trim() !== "null" &&
        comp[field].trim() !== "undefined"
      ) {
        return comp[field];
      }
    }
  }

  for (const key of Object.keys(item)) {
    const val = item[key];
    if (
      typeof val === "string" &&
      val.trim() !== "" &&
      (val.endsWith(".pdf") ||
        val.includes("/media/") ||
        val.includes("/uploads/") ||
        val.includes("/receipt") ||
        val.includes("/bill"))
    ) {
      return val;
    }
  }

  return null;
};

const buildBillPdfUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${BASE_URL}${path}`;
  return `${BASE_URL}/${path}`;
};

const AllBills = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [lastDownloadType, setLastDownloadType] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadPhase, setDownloadPhase] = useState("");

  const [selectedBillIds, setSelectedBillIds] = useState(() => new Set());
  const selectAllCheckboxRef = useRef(null);

  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reportToCancel, setReportToCancel] = useState(null);
  const [billIdToCancel, setBillIdToCancel] = useState(null);

  const [expandedReports, setExpandedReports] = useState({});

  // Page Details Modal State
  const [showPageModal, setShowPageModal] = useState(false);
  const [currentPageData, setCurrentPageData] = useState([]);

  const [filters, setFilters] = useState({
    center_name: [],
    bill_id: [],
    status: [],
    dateFrom: "",
    dateTo: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [selectedComponentColumns, setSelectedComponentColumns] = useState(
    availableComponentColumns.map((col) => col.key)
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editData, setEditData] = useState({
    old_bill_report_id: "",
    new_bill_report_id: "",
    billing_date: "",
    multiple_bills: [],
    changeNewBillNumber: false,
  });
  const [editingStatus, setEditingStatus] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState(null);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(GET_REPORTS_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setReportsData(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const filterOptions = useMemo(() => {
    if (!reportsData || reportsData.length === 0) {
      return { center_name: [], bill_id: [], status: [] };
    }
    return {
      center_name: [...new Set(reportsData.map((item) => item.center_name))].map((name) => ({
        value: name,
        label: name,
      })),
      bill_id: [...new Set(reportsData.map((item) => item.bill_report_id))].map((id) => ({
        value: id,
        label: id,
      })),
      status: [...new Set(reportsData.map((item) => item.status))].map((status) => ({
        value: status,
        label:
          status === "accepted"
            ? translations.accepted
            : status === "cancelled"
            ? translations.cancelled
            : status,
      })),
    };
  }, [reportsData]);

  const filteredData = useMemo(() => {
    return reportsData.filter((item) => {
      const matchesCenter =
        filters.center_name.length === 0 ||
        filters.center_name.some((c) => c.value === item.center_name);
      const matchesBillId =
        filters.bill_id.length === 0 ||
        filters.bill_id.some((b) => b.value === item.bill_report_id);
      const matchesStatus =
        filters.status.length === 0 ||
        filters.status.some((s) => s.value === item.status);
      const itemDate = new Date(item.billing_date);
      const matchesDateFrom = !filters.dateFrom || itemDate >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || itemDate <= new Date(filters.dateTo + "T23:59:59");
      return matchesCenter && matchesBillId && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [reportsData, filters]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedReportsData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const currentPageBillIds = useMemo(
    () => paginatedReportsData.map((item) => item.id),
    [paginatedReportsData]
  );

  const allCurrentPageSelected = useMemo(
    () =>
      currentPageBillIds.length > 0 &&
      currentPageBillIds.every((id) => selectedBillIds.has(id)),
    [currentPageBillIds, selectedBillIds]
  );

  const someCurrentPageSelected = useMemo(
    () =>
      currentPageBillIds.some((id) => selectedBillIds.has(id)) && !allCurrentPageSelected,
    [currentPageBillIds, selectedBillIds, allCurrentPageSelected]
  );

  const totalSelectedCount = selectedBillIds.size;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someCurrentPageSelected;
    }
  }, [someCurrentPageSelected]);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ center_name: [], bill_id: [], status: [], dateFrom: "", dateTo: "" });
  };

  const toggleSelectAll = useCallback(() => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        currentPageBillIds.forEach((id) => next.delete(id));
      } else {
        currentPageBillIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allCurrentPageSelected, currentPageBillIds]);

  const toggleSelectBill = useCallback((id) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBillIds(new Set());
  }, []);

  const toggleReportDetails = (reportId) => {
    setExpandedReports((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  // --- New function to handle View Pages modal ---
  const handleViewPages = (item) => {
    const pagenoData = item.component_pageno;
    let parsedData = [];

    if (pagenoData && pagenoData.length > 0) {
      // Case 1: [["आम कलम", "आम कलम-2"], 19838]
      if (pagenoData.length === 2 && Array.isArray(pagenoData[0]) && !Array.isArray(pagenoData[1])) {
        parsedData = [{ names: pagenoData[0], pageNo: pagenoData[1] }];
      } 
      // Case 2: [[["आम कलम"], 1], [["लीची"], 2]]
      else if (pagenoData.every(group => Array.isArray(group) && group.length === 2 && Array.isArray(group[0]))) {
        parsedData = pagenoData.map(group => ({ names: group[0], pageNo: group[1] }));
      } else {
        // Fallback for unexpected structures
        parsedData = [{ names: [String(pagenoData[0])], pageNo: pagenoData[1] || "N/A" }];
      }
    }

    setCurrentPageData(parsedData);
    setShowPageModal(true);
  };

  const downloadSelectedBills = async () => {
    const selectedItems = reportsData.filter((item) => selectedBillIds.has(item.id));

    if (selectedItems.length === 0) return;

    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);
    setDownloadPhase("fetching");
    setDownloadProgress({ current: 0, total: selectedItems.length });

    try {
      const payload = buildReceiptZipDownloadPayload(selectedItems);
      const response = await fetch(
        "https://mahadevaaya.com/govbillingsystem/backend/api/download-multiple-receipts/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const blob = await response.blob();
      triggerBlobDownload(blob, "billing_receipts.zip");

      setDownloadPhase("complete");
      setDownloadSuccess(true);
      setLastDownloadType("receipts");
    } catch (downloadErr) {
      console.error("[AllBills] Receipt zip download failed:", downloadErr);
      setDownloadError(downloadErr.message || translations.downloadError);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
      setSelectedBillIds(new Set());

      setTimeout(() => {
        setDownloadSuccess(false);
        setDownloadError(null);
        setDownloadPhase("");
      }, 8000);
    }
  };

  const viewReceipt = (receiptPath) => {
    if (!receiptPath) {
      console.warn("[AllBills] viewReceipt called with no path.");
      return;
    }
    const fullUrl = buildBillPdfUrl(receiptPath);
    const filename = receiptPath.split("/").pop() || "bill.pdf";

    const anchor = document.createElement("a");
    anchor.href = fullUrl;
    anchor.download = filename;
    anchor.target = "_blank";

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdatingStatus(reportToCancel);
      setStatusUpdateError(null);
      setStatusUpdateSuccess(false);

      const payload = { bill_report_id: billIdToCancel, status: "cancelled" };

      const response = await fetch(UPDATE_REPORT_STATUS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      await response.json();

      setReportsData((prevData) =>
        prevData.map((item) =>
          item.id === reportToCancel ? { ...item, status: "cancelled" } : item
        )
      );

      setStatusUpdateSuccess(true);
      setShowConfirmDialog(false);
      setReportToCancel(null);
      setBillIdToCancel(null);
    } catch (e) {
      setStatusUpdateError(e.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const confirmCancelReport = (reportId, billId) => {
    setReportToCancel(reportId);
    setBillIdToCancel(billId);
    setShowConfirmDialog(true);
  };

  const cancelConfirmation = () => {
    setShowConfirmDialog(false);
    setReportToCancel(null);
    setBillIdToCancel(null);
  };

  const openEditModal = (item) => {
    setCurrentEditItem(item);
    setEditingReportId(item.id);
    setEditData({
      old_bill_report_id: item.bill_report_id,
      new_bill_report_id: item.bill_report_id,
      billing_date: item.billing_date,
      multiple_bills: item.component_data.map((comp) => ({
        bill_id: comp.bill_id,
        allocated_quantity: parseFloat(comp.allocated_quantity),
        rate: parseFloat(comp.rate),
        updated_quantity: parseFloat(comp.updated_quantity),
      })),
      changeNewBillNumber: false,
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingReportId(null);
    setCurrentEditItem(null);
    setEditData({
      old_bill_report_id: "",
      new_bill_report_id: "",
      billing_date: "",
      multiple_bills: [],
      changeNewBillNumber: false,
    });
    setEditError(null);
  };

  const handleEditDataChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillQuantityChange = (billId, newQuantity) => {
    setEditData((prev) => ({
      ...prev,
      multiple_bills: prev.multiple_bills.map((bill) =>
        bill.bill_id === billId
          ? { ...bill, updated_quantity: parseFloat(newQuantity) || 0 }
          : bill
      ),
    }));
  };

  const handleSubmitEdit = async () => {
    try {
      setEditingStatus(true);
      setEditError(null);

      const payload = {
        old_bill_report_id: editData.old_bill_report_id,
        billing_date: editData.billing_date,
        multiple_bills: editData.multiple_bills.map((bill) => ({
          bill_id: bill.bill_id,
          updated_quantity: bill.updated_quantity,
          allocated_quantity: bill.allocated_quantity,
          rate: bill.rate,
        })),
      };

      if (editData.changeNewBillNumber && editData.new_bill_report_id !== editData.old_bill_report_id) {
        payload.new_bill_report_id = editData.new_bill_report_id;
      }

      const response = await fetch(UPDATE_BILLING_REPORT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      setReportsData((prevData) =>
        prevData.map((item) => {
          if (item.id === editingReportId) {
            return {
              ...item,
              bill_report_id: editData.changeNewBillNumber
                ? editData.new_bill_report_id
                : item.bill_report_id,
              billing_date: editData.billing_date,
              component_data: item.component_data.map((comp) => {
                const updatedBill = editData.multiple_bills.find((b) => b.bill_id === comp.bill_id);
                return updatedBill
                  ? {
                      ...comp,
                      allocated_quantity: updatedBill.allocated_quantity,
                      rate: updatedBill.rate,
                      updated_quantity: updatedBill.updated_quantity,
                      sold_amount: (
                        parseFloat(updatedBill.updated_quantity) * parseFloat(updatedBill.rate)
                      ).toFixed(2),
                    }
                  : comp;
              }),
            };
          }
          return item;
        })
      );

      setShowSuccessModal(true);
      closeEditModal();
    } catch (e) {
      setEditError(e.message || translations.updateError);
    } finally {
      setEditingStatus(false);
    }
  };

  const downloadExcelComponent = (componentData, filename, billReportId) => {
    try {
      const excelData = componentData.map((item) => {
        const row = {};
        selectedComponentColumns.forEach((col) => {
          row[columnMapping[col].header] = columnMapping[col].accessor(item, billReportId);
        });
        return row;
      });

      const totals = componentData.reduce(
        (acc, comp) => {
          if (selectedComponentColumns.includes("allocated_quantity"))
            acc.allocated += parseFloat(comp.allocated_quantity) || 0;
          if (selectedComponentColumns.includes("rate")) acc.rate += parseFloat(comp.rate) || 0;
          if (selectedComponentColumns.includes("updated_quantity"))
            acc.updated += parseFloat(comp.updated_quantity) || 0;
          if (selectedComponentColumns.includes("buy_amount"))
            acc.buy += parseFloat(comp.buy_amount) || 0;
          if (selectedComponentColumns.includes("sold_amount"))
            acc.sold += parseFloat(comp.sold_amount) || 0;
          return acc;
        },
        { allocated: 0, rate: 0, updated: 0, buy: 0, sold: 0 }
      );

      const hasTotals = selectedComponentColumns.some((col) =>
        ["allocated_quantity", "rate", "updated_quantity", "buy_amount", "sold_amount"].includes(col)
      );

      if (hasTotals) {
        const totalRow = {};
        selectedComponentColumns.forEach((col) => {
          if (col === "reportId") totalRow[columnMapping[col].header] = "Total";
          else if (col === "allocated_quantity") totalRow[columnMapping[col].header] = totals.allocated;
          else if (col === "rate") totalRow[columnMapping[col].header] = totals.rate;
          else if (col === "updated_quantity") totalRow[columnMapping[col].header] = totals.updated;
          else if (col === "buy_amount") totalRow[columnMapping[col].header] = totals.buy;
          else if (col === "sold_amount") totalRow[columnMapping[col].header] = totals.sold;
          else totalRow[columnMapping[col].header] = "";
        });
        excelData.push(totalRow);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Components");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error("Excel download error:", e);
    }
  };

  const downloadPdfComponent = (componentData, filename, centerName, billReportId) => {
    try {
      const headers = selectedComponentColumns
        .map((col) => `<th>${columnMapping[col].header}</th>`)
        .join("");
      const rows = componentData
        .map((item) => {
          const cells = selectedComponentColumns
            .map((col) => `<td>${columnMapping[col].accessor(item, billReportId)}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      const totals = componentData.reduce(
        (acc, comp) => {
          if (selectedComponentColumns.includes("allocated_quantity"))
            acc.allocated += parseFloat(comp.allocated_quantity) || 0;
          if (selectedComponentColumns.includes("rate")) acc.rate += parseFloat(comp.rate) || 0;
          if (selectedComponentColumns.includes("updated_quantity"))
            acc.updated += parseFloat(comp.updated_quantity) || 0;
          if (selectedComponentColumns.includes("buy_amount"))
            acc.buy += parseFloat(comp.buy_amount) || 0;
          if (selectedComponentColumns.includes("sold_amount"))
            acc.sold += parseFloat(comp.sold_amount) || 0;
          return acc;
        },
        { allocated: 0, rate: 0, updated: 0, buy: 0, sold: 0 }
      );

      let totalRow = "";
      const hasTotals = selectedComponentColumns.some((col) =>
        ["allocated_quantity", "rate", "updated_quantity", "buy_amount", "sold_amount"].includes(col)
      );

      if (hasTotals) {
        const totalCells = selectedComponentColumns
          .map((col) => {
            if (col === "reportId") return "<td><strong>Total</strong></td>";
            else if (col === "allocated_quantity") return `<td><strong>${totals.allocated}</strong></td>`;
            else if (col === "rate") return `<td><strong>${totals.rate}</strong></td>`;
            else if (col === "updated_quantity") return `<td><strong>${totals.updated}</strong></td>`;
            else if (col === "buy_amount") return `<td><strong>${totals.buy}</strong></td>`;
            else if (col === "sold_amount") return `<td><strong>${totals.sold}</strong></td>`;
            else return "<td></td>";
          })
          .join("");
        totalRow = `<tr>${totalCells}</tr>`;
      }

      const tableHtml = `
        <html>
          <head>
            <style>
              table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>${centerName}</h2>
            <table>
              <tr>${headers}</tr>
              ${rows}
              ${totalRow}
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (e) {
      console.error("PDF download error:", e);
    }
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const paginationItems = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationItems.push(
      <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
        1
      </Pagination.Item>
    );
    if (startPage > 2) {
      paginationItems.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
    }
  }

  for (let number = startPage; number <= endPage; number++) {
    paginationItems.push(
      <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
        {number}
      </Pagination.Item>
    );
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationItems.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    }
    paginationItems.push(
      <Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>
        {totalPages}
      </Pagination.Item>
    );
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "accepted":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <LeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
        <div className="main-content d-flex justify-content-center align-items-center">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <LeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
        <div className="main-content">
          <Container fluid className="dashboard-body">
            <Alert variant="danger">{translations.error}: {error}</Alert>
          </Container>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <Container fluid className="p-4">
          <Row>
            <Col lg={12} md={12} sm={12}>
              <DashBoardHeader />
            </Col>
          </Row>

          <Row className="left-top">
            <Col lg={12} md={12} sm={10}>
              <Container fluid className="dashboard-body-main bg-home">
                <h1 className="page-title small-fonts">{translations.allBills}</h1>

                {downloadSuccess && (
                  <Alert variant="success" dismissible onClose={() => setDownloadSuccess(false)}>
                    {lastDownloadType === "bills_fallback"
                      ? `${translations.allBillsDownloaded} (${translations.openedInTabs})`
                      : translations.allBillsDownloaded}
                  </Alert>
                )}

                {statusUpdateSuccess && (
                  <Alert variant="success" dismissible onClose={() => setStatusUpdateSuccess(false)}>
                    {translations.statusUpdateSuccess}
                  </Alert>
                )}

                {downloadError && (
                  <Alert variant="danger" dismissible onClose={() => setDownloadError(null)}>
                    {downloadError}
                  </Alert>
                )}

                {statusUpdateError && (
                  <Alert variant="danger" dismissible onClose={() => setStatusUpdateError(null)}>
                    {translations.error}: {statusUpdateError}
                  </Alert>
                )}

                {editSuccess && (
                  <Alert variant="success" dismissible onClose={() => setEditSuccess(false)}>
                    {translations.updateSuccess}
                  </Alert>
                )}

                {editError && (
                  <Alert variant="danger" dismissible onClose={() => setEditError(null)}>
                    {translations.error}: {editError}
                  </Alert>
                )}

                <div className="filter-section mb-4 p-3 border rounded bg-light">
                  <Row className="mb-3">
                    <Col md={12} className="d-flex justify-content-between align-items-center main-table">
                      <h5 className="mb-0">{translations.filters}</h5>
                      {(filters.center_name.length > 0 ||
                        filters.bill_id.length > 0 ||
                        filters.status.length > 0 ||
                        filters.dateFrom ||
                        filters.dateTo) && (
                        <Button variant="outline-secondary" size="sm" onClick={clearFilters} className="small-fonts">
                          {translations.clearAllFilters}
                        </Button>
                      )}
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12} sm={6} md={3} className="mb-2">
                      <FormGroup>
                        <FormLabel className="form-label">{translations.centerName}</FormLabel>
                        <Select
                          value={filters.center_name}
                          onChange={(value) => handleFilterChange("center_name", value)}
                          options={filterOptions.center_name}
                          isMulti
                          isClearable
                          placeholder={translations.allCenters}
                          styles={customSelectStyles}
                          className="compact-input small-fonts filter-dropdown"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </FormGroup>
                    </Col>

                    <Col xs={12} sm={6} md={3} className="mb-2">
                      <FormGroup>
                        <FormLabel className="form-label">{translations.billId}</FormLabel>
                        <Select
                          value={filters.bill_id}
                          onChange={(value) => handleFilterChange("bill_id", value)}
                          options={filterOptions.bill_id}
                          isMulti
                          isClearable
                          placeholder="बिल संख्या"
                          styles={customSelectStyles}
                          className="compact-input small-fonts filter-dropdown"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </FormGroup>
                    </Col>

                    <Col xs={12} sm={6} md={3} className="mb-2">
                      <FormGroup>
                        <FormLabel className="form-label">{translations.status}</FormLabel>
                        <Select
                          value={filters.status}
                          onChange={(value) => handleFilterChange("status", value)}
                          options={filterOptions.status}
                          isMulti
                          isClearable
                          placeholder="स्थिति"
                          styles={customSelectStyles}
                          className="compact-input small-fonts filter-dropdown"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12} sm={6} md={3} className="mb-2">
                      <FormGroup>
                        <FormLabel className="form-label">From Date</FormLabel>
                        <input
                          type="date"
                          className="form-control compact-input small-fonts"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                        />
                      </FormGroup>
                    </Col>

                    <Col xs={12} sm={6} md={3} className="mb-2">
                      <FormGroup>
                        <FormLabel className="form-label">To Date</FormLabel>
                        <input
                          type="date"
                          className="form-control compact-input small-fonts"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </div>

                <div className="reports-container">
                  <Row className="mt-3">
                    <div className="col-md-12">
                      <div className="table-wrapper">
                        {filteredData.length > 0 ? (
                          <>
                            <div className="table-info mb-2">
                              <Row className="align-items-center">
                                <Col xs={12} md={6} className="d-flex align-items-center flex-wrap gap-2 mb-2 mb-md-0">
                                  <span className="small-fonts">
                                    {translations.showing} {indexOfFirstItem + 1} {translations.to}{" "}
                                    {Math.min(indexOfLastItem, filteredData.length)} {translations.of}{" "}
                                    {filteredData.length} {translations.entries}
                                  </span>
                                  <span className="small-fonts me-2">{translations.itemsPerPage}</span>
                                  <Badge bg="primary">{itemsPerPage}</Badge>
                                </Col>

                                <Col xs={12} md={6} className="d-flex align-items-center justify-content-md-end flex-wrap gap-2">
                                  {totalSelectedCount > 0 && (
                                    <div className="d-flex align-items-center gap-2 me-2">
                                      <Badge bg="info" pill>
                                        {totalSelectedCount}{" "}
                                        {totalSelectedCount === 1 ? translations.bill : translations.bills}{" "}
                                        {translations.selectedBills}
                                      </Badge>
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={clearSelection}
                                        className="small-fonts"
                                        disabled={downloading}
                                      >
                                        {translations.clearSelection}
                                      </Button>
                                    </div>
                                  )}

                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => downloadFilteredBillsPdf(filteredData, filters)}
                                    disabled={filteredData.length === 0 || downloading}
                                    className="small-fonts d-flex align-items-center gap-1"
                                  >
                                    <FaDownload />
                                    <span>{translations.downloadFilteredPdf}</span>
                                  </Button>

                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={downloadSelectedBills}
                                    disabled={totalSelectedCount === 0 || downloading}
                                    className="small-fonts d-flex align-items-center gap-1"
                                  >
                                    {downloading ? (
                                      <>
                                        <Spinner animation="border" size="sm" role="status" />
                                        <span className="ms-1">
                                          {downloadPhase === "fetching"
                                            ? `${translations.fetching} ${downloadProgress?.current || 0}/${downloadProgress?.total || 0}...`
                                            : downloadPhase === "creatingZip"
                                            ? translations.creatingZip
                                            : translations.downloadingBills}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <FaDownload />
                                        <span>{translations.downloadSelectedBills}</span>
                                        {totalSelectedCount > 0 && (
                                          <Badge bg="light" text="dark" pill className="ms-1">
                                            {totalSelectedCount}
                                          </Badge>
                                        )}
                                      </>
                                    )}
                                  </Button>
                                </Col>
                              </Row>

                              {downloading && downloadProgress && (
                                <Row className="mt-2">
                                  <Col xs={12}>
                                    <ProgressBar
                                      now={
                                        downloadProgress.total > 0
                                          ? (downloadProgress.current / downloadProgress.total) * 100
                                          : 0
                                      }
                                      variant={downloadPhase === "creatingZip" ? "warning" : "primary"}
                                      style={{ height: "6px" }}
                                      animated
                                    />
                                    <small className="text-muted small-fonts mt-1 d-block">
                                      {downloadPhase === "fetching" &&
                                        `${translations.fetching} ${downloadProgress.current} ${translations.ofWord} ${downloadProgress.total} ${translations.bills}...`}
                                      {downloadPhase === "creatingZip" && translations.creatingZip}
                                      {downloadPhase === "complete" && translations.downloadComplete}
                                    </small>
                                  </Col>
                                </Row>
                              )}
                            </div>

                            <div className="table-responsive">
                              <table className="table table-bordered table-hover table-striped small-fonts">
                                <thead className="table-light">
                                  <tr>
                                    <th style={{ width: "40px", textAlign: "center", verticalAlign: "middle" }}>
                                      <input
                                        type="checkbox"
                                        ref={selectAllCheckboxRef}
                                        checked={allCurrentPageSelected}
                                        onChange={toggleSelectAll}
                                        title={allCurrentPageSelected ? translations.clearAllFilters : translations.selectAllOnPage}
                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                      />
                                    </th>
                                    <th>{translations.sno}</th>
                                    <th>{translations.reportId}</th>
                                    <th>{translations.centerName}</th>
                                    <th>{translations.reportDate}</th>
                                    <th>{translations.status}</th>
                                    <th>{translations.totalItems}</th>
                                    <th>{translations.buyAmount}</th>
                                    <th style={{ minWidth: "250px", textAlign: "center" }}>
                                      {translations.details} / {translations.download}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedReportsData.map((item, index) => {
                                    const isExpanded = expandedReports[item.id] || false;
                                    const isSelected = selectedBillIds.has(item.id);
                                    const pdfPath = getBillPdfPath(item);

                                    return (
                                      <React.Fragment key={item.id}>
                                        <tr className={isSelected ? "table-primary" : ""}>
                                          <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleSelectBill(item.id)}
                                              style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                            />
                                          </td>
                                          <td>
                                            {reportsColumnMapping.sno.accessor(item, index, currentPage, itemsPerPage)}
                                          </td>
                                          <td>
                                            <strong>{item.bill_report_id}</strong>
                                          </td>
                                          <td>{item.center_name}</td>
                                          <td>{formatDate(item.billing_date)}</td>
                                          <td>
                                            <Badge variant={getStatusBadgeVariant(item.status)}>
                                              {item.status === "accepted"
                                                ? translations.accepted
                                                : item.status === "cancelled"
                                                ? translations.cancelled
                                                : item.status}
                                            </Badge>
                                          </td>
                                          <td>{item.component_data?.length || 0}</td>
                                          <td>{calculateReportSoldAmount(item)}</td>
                                          <td>
                                            <div className="d-flex flex-wrap gap-1 justify-content-center">
                                              <Button
                                                variant="outline-info"
                                                size="sm"
                                                onClick={() => toggleReportDetails(item.id)}
                                                className="small-fonts"
                                                title={translations.viewDetails}
                                              >
                                                {isExpanded ? "▲" : "▼"}
                                              </Button>

                                              {item.component_pageno && item.component_pageno.length > 0 && (
                                                <Button
                                                  variant="outline-secondary"
                                                  size="sm"
                                                  onClick={() => handleViewPages(item)}
                                                  className="small-fonts d-flex align-items-center gap-1"
                                                  title="उप-निवेश पेज नंबर देखें"
                                                >
                                                  <FaEye />
                                                  {translations.viewPagesBtn}
                                                </Button>
                                              )}

                                              {pdfPath ? (
                                                <Button
                                                  variant="outline-success"
                                                  size="sm"
                                                  onClick={() => viewReceipt(pdfPath)}
                                                  className="small-fonts"
                                                  title={item.status === "cancelled" ? translations.downloadCancelledBill : translations.downloadBill}
                                                >
                                                  <FaDownload className="me-1" />
                                                  {translations.download}
                                                </Button>
                                              ) : (
                                                <Badge bg="secondary" className="small-fonts" title="PDF path not found in API response">
                                                  {translations.noPdfAvailable}
                                                </Badge>
                                              )}

                                              <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => openEditModal(item)}
                                                className="small-fonts"
                                                title={translations.edit}
                                              >
                                                {translations.edit}
                                              </Button>

                                              {item.status === "accepted" && (
                                                <Button
                                                  variant="outline-danger"
                                                  size="sm"
                                                  onClick={() => confirmCancelReport(item.id, item.bill_report_id)}
                                                  className="small-fonts"
                                                  disabled={updatingStatus === item.id}
                                                  title={translations.cancelReport}
                                                >
                                                  {updatingStatus === item.id ? "..." : translations.cancel}
                                                </Button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td colSpan={9} className="p-0" style={{ borderBottom: isExpanded ? "1px solid #dee2e6" : "none" }}>
                                            <Collapse in={isExpanded}>
                                              <div className="p-3 bg-light">
                                                <Row className="mb-2 align-items-center">
                                                  <Col md={6} className="small-fonts">
                                                    <strong>
                                                      {item.center_name} — {item.bill_report_id}
                                                    </strong>
                                                  </Col>
                                                  <Col md={6} className="text-end">
                                                    <Button
                                                      variant="outline-success"
                                                      size="sm"
                                                      className="me-1 small-fonts"
                                                      onClick={() =>
                                                        downloadExcelComponent(
                                                          item.component_data,
                                                          `${item.bill_report_id}_components`,
                                                          item.bill_report_id
                                                        )
                                                      }
                                                    >
                                                      Excel
                                                    </Button>
                                                    <Button
                                                      variant="outline-danger"
                                                      size="sm"
                                                      className="small-fonts"
                                                      onClick={() =>
                                                        downloadPdfComponent(
                                                          item.component_data,
                                                          `${item.bill_report_id}_components`,
                                                          item.center_name,
                                                          item.bill_report_id
                                                        )
                                                      }
                                                    >
                                                      PDF
                                                    </Button>
                                                  </Col>
                                                </Row>

                                                <div className="table-responsive">
                                                  <table className="table table-bordered table-sm small-fonts mb-0">
                                                    <thead className="table-light">
                                                      <tr>
                                                        <th>{translations.reportId}</th>
                                                        <th>{translations.nivesh}</th>
                                                        <th>{translations.subniveshName}</th>
                                                        <th>{translations.schemeName}</th>
                                                        <th>{translations.sourceOfReceipt}</th>
                                                        <th>{translations.unit}</th>
                                                        <th>{translations.allocatedQuantity}</th>
                                                        <th>{translations.rate}</th>
                                                        <th>{translations.updatedQuantity}</th>
                                                        <th>{translations.allotedRashi}</th>
                                                        <th>{translations.soldRashi}</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {item.component_data?.map((comp, compIdx) => (
                                                        <tr key={compIdx}>
                                                          <td>{item.bill_report_id}</td>
                                                          <td>{comp.investment_name}</td>
                                                          <td>{comp.sub_investment_name}</td>
                                                          <td>{comp.scheme_name}</td>
                                                          <td>{comp.source_of_receipt}</td>
                                                          <td>{comp.unit}</td>
                                                          <td>{comp.allocated_quantity}</td>
                                                          <td>{comp.rate}</td>
                                                          <td>{comp.updated_quantity}</td>
                                                          <td>{comp.buy_amount}</td>
                                                          <td>{comp.sold_amount}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            </Collapse>
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {totalPages > 1 && (
                              <div className="d-flex justify-content-center mt-3">
                                <Pagination>
                                  <Pagination.Prev
                                    disabled={currentPage === 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                  />
                                  {paginationItems}
                                  <Pagination.Next
                                    disabled={currentPage === totalPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                  />
                                </Pagination>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-5">
                            <p className="text-muted">{translations.noMatchingReports}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Row>
                </div>
              </Container>
            </Col>
          </Row>
        </Container>
      </div>

      {/* ─── View Pages Modal ─── */}
      <style>{`
        .page-details-modal .modal-content {
          border: none;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25);
          background: #ffffff;
        }

        .page-details-modal .modal-header {
          background: #0b3d62;
          color: #ffffff;
          border-bottom: 0;
          padding: 12px 18px;
        }

        .page-details-modal .modal-title {
          color: #ffffff !important;
          font-weight: 600;
          font-size: 16px;
          line-height: 1.4;
        }

        .page-details-modal .btn-close {
          filter: invert(1) grayscale(100%) brightness(200%);
          opacity: 1;
          width: 14px;
          height: 14px;
        }

        .page-details-modal .modal-body {
          background: #ffffff;
          padding: 18px !important;
          overflow: visible !important;
          max-height: none !important;
        }

        .page-details-modal .page-details-table {
          width: 100%;
          margin: 0;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          overflow: visible;
        }

        .page-details-modal .page-details-table thead th {
          background: #0b3d62 !important;
          color: #ffffff !important;
          border-color: #0b3d62 !important;
          font-weight: 600;
          padding: 10px 12px;
          vertical-align: middle;
        }

        .page-details-modal .page-details-table tbody td {
          background: #ffffff;
          color: #1f2937;
          border-color: #d7dee7;
          padding: 9px 12px;
          vertical-align: middle;
        }

        .page-details-modal .page-details-table tbody tr:nth-child(even) td {
          background: #f5f8fb;
        }

        .page-details-modal .page-details-table tbody td.page-number-cell {
          color: #0b3d62;
          font-weight: 700;
          font-size: 15px;
        }

        .page-details-modal .modal-footer {
          background: #f3f6f9;
          border-top: 1px solid #d7dee7;
          padding: 10px 18px;
        }

        .page-details-modal .modal-footer .btn-secondary {
          background: #0b3d62;
          border-color: #0b3d62;
          color: #ffffff;
          font-weight: 500;
        }

        .page-details-modal .modal-footer .btn-secondary:hover {
          background: #082f4c;
          border-color: #082f4c;
        }
      `}</style>

      <Modal
        show={showPageModal}
        onHide={() => setShowPageModal(false)}
        centered
        size="lg"
        dialogClassName="page-details-modal"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="small-fonts">{translations.pageDetails}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {currentPageData.length === 0 ? (
            <p className="text-center small-fonts mb-0">{translations.noPageData}</p>
          ) : (
            <Table
              striped
              bordered
              hover
              size="sm"
              className="small-fonts page-details-table"
            >
              <thead>
                <tr>
                  <th style={{ width: "70%" }}>{translations.subniveshName}</th>
                  <th
                    className="text-center"
                    style={{ width: "30%", whiteSpace: "nowrap" }}
                  >
                    {translations.pageNo}
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((entry, index) => (
                  <tr key={index}>
                    <td style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                      {entry.names.join(", ")}
                    </td>
                    <td
                      className="text-center page-number-cell"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {entry.pageNo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowPageModal(false)}>
            {translations.closeBtn}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─── Cancel Confirmation Modal ─── */}
      <Modal show={showConfirmDialog} onHide={cancelConfirmation} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="small-fonts">{translations.cancelReport}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small-fonts">
          <p>{translations.confirmCancel}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={cancelConfirmation} disabled={updatingStatus !== null}>
            {translations.no}
          </Button>
          <Button variant="danger" size="sm" onClick={handleStatusUpdate} disabled={updatingStatus !== null}>
            {updatingStatus !== null ? <Spinner animation="border" size="sm" /> : translations.yes}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─── Edit Bill Modal ─── */}
      <Modal show={showEditModal} onHide={closeEditModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="small-fonts">{translations.editBillDetails}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small-fonts">
          {editError && (
            <Alert variant="danger" dismissible onClose={() => setEditError(null)}>
              {editError}
            </Alert>
          )}

          <Row className="mb-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>{translations.oldBillNumber}</FormLabel>
                <Form.Control
                  type="text"
                  value={editData.old_bill_report_id}
                  disabled
                  className="small-fonts"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormCheck
                  type="checkbox"
                  label={translations.changeBillNumber}
                  checked={editData.changeNewBillNumber}
                  onChange={(e) => handleEditDataChange("changeNewBillNumber", e.target.checked)}
                  className="mb-2 small-fonts"
                />
                {editData.changeNewBillNumber && (
                  <Form.Control
                    type="text"
                    value={editData.new_bill_report_id}
                    onChange={(e) => handleEditDataChange("new_bill_report_id", e.target.value)}
                    className="small-fonts"
                    placeholder={translations.newBillNumber}
                  />
                )}
              </FormGroup>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>{translations.billingDate}</FormLabel>
                <Form.Control
                  type="date"
                  value={editData.billing_date}
                  onChange={(e) => handleEditDataChange("billing_date", e.target.value)}
                  className="small-fonts"
                />
              </FormGroup>
            </Col>
          </Row>

          <h6 className="mt-3 mb-2">
            {translations.nivesh} {translations.details}
          </h6>
          <div className="table-responsive">
            <table className="table table-bordered table-sm small-fonts">
              <thead className="table-light">
                <tr>
                  <th>{translations.nivesh}</th>
                  <th>{translations.allocatedQuantity}</th>
                  <th>{translations.rate}</th>
                  <th>{translations.updatedQuantity}</th>
                </tr>
              </thead>
              <tbody>
                {editData.multiple_bills.map((bill) => (
                  <tr key={bill.bill_id}>
                    <td>{bill.bill_id}</td>
                    <td>{bill.allocated_quantity}</td>
                    <td>{bill.rate}</td>
                    <td>
                      <Form.Control
                        type="number"
                        value={bill.updated_quantity}
                        onChange={(e) => handleBillQuantityChange(bill.bill_id, e.target.value)}
                        className="small-fonts"
                        min="0"
                        max={bill.allocated_quantity}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={closeEditModal} disabled={editingStatus}>
            {translations.cancel}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmitEdit} disabled={editingStatus}>
            {editingStatus ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                {translations.editing}
              </>
            ) : (
              translations.save
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─── Success Modal ─── */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="small-fonts text-success">
            ✓ {translations.updateSuccess}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="small-fonts text-center">
          <p>{translations.updateSuccess}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" size="sm" onClick={() => setShowSuccessModal(false)}>
            {translations.save}
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />
    </>
  );
};

export default AllBills;
