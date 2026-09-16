import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Form,
  Button,
  Alert,
  Row,
  Col,
  Table,
  OverlayTrigger,
  Tooltip,
  Spinner,
  Pagination,
  Modal,
} from "react-bootstrap";
import { FaFileExcel, FaFilePdf, FaTimes, FaSync } from "react-icons/fa";
import {
  RiFilePdfLine,
  RiFileExcelLine,
  RiEyeLine,
  RiDeleteBinLine,
} from "react-icons/ri";
import axios from "axios";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import Select from "react-select";
import "../../assets/css/registration.css";

import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";
import {
  convertToBackendFormat,
  convertToDisplayFormat,
  parseDateFromExcel,
  getTodayInDisplayFormat,
  getTodayInBackendFormat,
} from "../../utils/dateUtils";

// API URLs
const BILLING_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/";
const VIKAS_KHAND_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/get-vikas-khand-by-center/";
const FORM_FILTERS_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/billing-form-filters/";
const CENTERS_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/centers/";

// Utility function to round numbers to 2 decimal places
const roundTo2Decimals = (value) => {
  const num = parseFloat(value) || 0;
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

const validKendraNames = [
  "कोटद्वार",
  "किनगोड़िखाल",
  "चौखाल",
  "धुमाकोट",
  "बीरोंखाल",
  "हल्दूखाल",
  "किल्वोंखाल",
  "चेलूसैंण",
  "जयहरीखाल",
  "जेठागांव",
  "देवियोंखाल",
  "सिलोगी",
  "सिसल्ड़ी",
  "पौखाल",
  "सतपुली",
  "संगलाकोटी",
  "देवराजखाल",
  "पोखड़ा",
  "वेदीखाल",
  "विथ्याणी",
  "गंगाभोगपुर",
  "दिउली",
  "दुगड्डा",
  "सेंधीखाल",
];

// Static options for form fields
const investmentOptions = [
  "भवन निर्माण",
  "सड़क निर्माण",
  "पुल निर्माण",
  "कुआँ निर्माण",
];
const unitOptions = ["बैग", "क्विंटल", "किलोग्राम", "नंबर", "लीटर"];
const sourceOptions = ["PWD", "PMGSY", "NREGA"];
const schemeOptions = ["MGNREGA", "PMKSY", "DDUGJY"];
const vikasKhandOptions = [
  "नैनीडांडा",
  "बीरोंखाल",
  "यमकेश्वर",
  "दुगड्डा",
  "पौड़ी",
  "द्वारीखाल",
  "जयहरीखाल",
  "रिखणीखाल",
  "नगर निगम कोटद्वार",
];
const vidhanSabhaOptions = [
  "लैन्सडाउन",
  "यमकेश्वर",
  "चौबट्टाखाल",
  "कोटद्वार",
  "श्रीनगर",
];

// Available columns for the table (excluding sno which is always shown)
// Reordered according to the requested sequence
const billingTableColumns = [
  { key: "center_name", label: "केंद्र का नाम" },
  { key: "scheme_name", label: "क्रय योजना का नाम" },
  { key: "source_of_receipt", label: "सप्लायर" },
  { key: "investment_name", label: "मद का नाम" },
  { key: "sub_investment_name", label: "उप-मद का नाम" },
  { key: "unit", label: "इकाई" },
  { key: "allocated_quantity", label: "आवंटित मात्रा " },
  { key: "rate", label: "क्रय दर\n(प्रति इकाई)" },
  { key: "farmer_selling_rate", label: "कृषक विक्रय दर\n(प्रति इकाई)" },
  { key: "farmer_subsidy_rate", label: "कृषक अनुदान दर\n(प्रति इकाई)" },
  { key: "amount_of_farmer_share", label: "कृषक अंश\n(रु0)" },
  { key: "amount_of_subsidy", label: "अनुदान राशि\n(रु0)" },
  { key: "total_amount", label: "कुल राशि\n(रु0)" },
  { key: "anudan_name", label: "अनुदान वहन योजना" },
  { key: "remark", label: "रिमार्क" },
  { key: "bill_date", label: "पंजीकरण तिथि" },
];

const billingTableColumnMapping = {
  sno: { header: "क्र.सं.", accessor: (item, index) => index + 1 },
  center_name: {
    header: "केंद्र का नाम",
    accessor: (item) => item.center_name || "",
  },
  scheme_name: {
    header: "क्रय योजना का नाम",
    accessor: (item) => item.scheme_name || "",
  },
  source_of_receipt: {
    header: "सप्लायर",
    accessor: (item) => item.source_of_receipt || "",
  },
  investment_name: {
    header: "मद का नाम",
    accessor: (item) => item.investment_name || "",
  },
  sub_investment_name: {
    header: "उप-मद का नाम",
    accessor: (item) => item.sub_investment_name || "",
  },
  unit: {
    header: "इकाई",
    accessor: (item) => item.unit || "",
  },
  allocated_quantity: {
    header: "आवंटित मात्रा ",
    accessor: (item) => item.allocated_quantity ?? "",
  },
  rate: {
    header: "क्रय दर\n(प्रति इकाई)",
    accessor: (item) => item.rate ?? "",
  },
  farmer_selling_rate: {
    header: "कृषक विक्रय दर\n(प्रति इकाई)",
    accessor: (item) => item.farmer_selling_rate ?? "",
  },
  farmer_subsidy_rate: {
    header: "कृषक अनुदान दर\n(प्रति इकाई)",
    accessor: (item) => item.farmer_subsidy_rate ?? "",
  },
  amount_of_farmer_share: {
    header: "कृषक अंश\n(रु0)",
    accessor: (item) => item.amount_of_farmer_share ?? 0,
  },
  amount_of_subsidy: {
    header: "अनुदान राशि\n(रु0)",
    accessor: (item) => item.amount_of_subsidy ?? 0,
  },
  total_amount: {
    header: "कुल राशि\n(रु0)",
    accessor: (item) => item.total_amount ?? 0,
  },
  anudan_name: {
    header: "अनुदान वहन योजना",
    accessor: (item) => item.anudan_name || "",
  },
  remark: {
    header: "रिमार्क",
    accessor: (item) => item.remark || "",
  },
  bill_date: {
    header: "पंजीकरण तिथि",
    accessor: (item) => {
      if (!item.bill_date) return "";
      const date = new Date(item.bill_date);
      return isNaN(date.getTime()) ? item.bill_date : date.toLocaleDateString("hi-IN");
    },
  },
};

// Hindi translations for form
const translations = {
  pageTitle: "सप्लायर डेटा एंट्री",
  centerName: "केंद्र का नाम",
  investmentName: "मद का नाम",
  subInvestmentName: "उप-मद का नाम",
  unit: "इकाई",
  allocatedQuantity: "आवंटित मात्रा ",
  rate: "क्रय दर\n(प्रति इकाई)",
  farmerSellingRate: "कृषक विक्रय दर\n(प्रति इकाई)",
  farmerSubsidyRate: "कृषक अनुदान दर\n(प्रति इकाई)",
  sourceOfReceipt: "सप्लायर",
  schemeName: "क्रय योजना का नाम",
  amountOfFarmerShare: "कृषक अंश\n(रु0)",
  amountOfSubsidy: "अनुदान राशि\n(रु0)",
  totalAmount: "कुल राशि\n(रु0)",
  anudanName: "अनुदान वहन योजना",
  remark: "रिमार्क",
  vikasKhandName: "विकास खंड का नाम",
  vidhanSabhaName: "विधानसभा का नाम",
  startDate: "प्रारंभ तिथि",
  endDate: "अंतिम तिथि",
  submitButton: "जमा करें",
  submitting: "जमा कर रहे हैं...",
  successMessage: "बिलिंग आइटम सफलतापूर्वक जोड़ा गया!",
  bulkUpload: "बल्क अपलोड (Excel)",
  uploadFile: "फाइल चुनें",
  uploadButton: "अपलोड करें",
  required: "यह फ़ील्ड आवश्यक है",
  selectOption: "चुनें",
  genericError: "प्रस्तुत करते समय एक त्रुटि हुई। कृपया बाद में पुन: प्रयास करें।",
  showing: "दिखा रहे हैं",
  to: "से",
  of: "का",
  entries: "प्रविष्टियां",
  page: "पृष्ठ",
  itemsPerPage: "प्रति पृष्ठ आइटम",
};

// Helper function to get the default financial year dates
const getFinancialYearDates = () => ({
  start_date: "2026-04-01",
  end_date: "2027-03-31",
});

const Registration = () => {
  // Reusable Column Selection Component
  const ColumnSelection = ({
    columns,
    selectedColumns,
    setSelectedColumns,
    title,
  }) => {
    const handleColumnToggle = (columnKey) => {
      if (selectedColumns.includes(columnKey)) {
        setSelectedColumns(selectedColumns.filter((col) => col !== columnKey));
      } else {
        setSelectedColumns([...selectedColumns, columnKey]);
      }
    };

    const handleSelectAll = () => {
      setSelectedColumns(columns.map((col) => col.key));
    };

    const handleDeselectAll = () => {
      setSelectedColumns([]);
    };

    return (
      <div className="column-selection mb-3 p-3 border rounded bg-light">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="small-fonts mb-0">{title}</h6>
          <div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleSelectAll}
              className="me-2"
            >
              सभी चुनें
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleDeselectAll}
            >
              सभी हटाएं
            </Button>
          </div>
        </div>
        <Row>
          <Col>
            <div className="d-flex flex-wrap">
              {columns.map((col) => (
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Form state for single entry
  const [formData, setFormData] = useState({
    center_name: "",
    investment_name: "",
    sub_investment_name: "",
    unit: "",
    allocated_quantity: "",
    rate: "",
    source_of_receipt: "",
    scheme_name: "",
    vikas_khand_name: "",
    vidhan_sabha_name: "",
    amount_of_farmer_share: "",
    amount_of_subsidy: "",
    total_amount: "",
    farmer_selling_rate: "",
    farmer_subsidy_rate: "",
    anudan_name: "",
    remark: "",
    bill_date: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [billingItems, setBillingItems] = useState([]);
  const [allBillingItems, setAllBillingItems] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);
  const [previewData, setPreviewData] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [failedRows, setFailedRows] = useState([]);
  const [validationErrorsList, setValidationErrorsList] = useState([]);
  const [duplicateRowIndices, setDuplicateRowIndices] = useState([]);
  const [showAllDuplicatesModal, setShowAllDuplicatesModal] = useState(false);
  const [allDuplicateEntries, setAllDuplicateEntries] = useState([]);
  const [centerNameCorrections, setCenterNameCorrections] = useState([]);
  const [centerNameCorrectionValues, setCenterNameCorrectionValues] = useState({});
  const [showCenterNameCorrectionModal, setShowCenterNameCorrectionModal] =
    useState(false);
  const fileInputRef = useRef(null);
  const [selectedColumns, setSelectedColumns] = useState(
    billingTableColumns.map((col) => col.key),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [vikasKhandData, setVikasKhandData] = useState(null);
  const [isFetchingVikasKhand, setIsFetchingVikasKhand] = useState(false);
  const [centerOptions, setCenterOptions] = useState([]);

  // State for filters
  const [filters, setFilters] = useState({
    center_name: [],
    investment_name: [],
    sub_investment_name: [],
    source_of_receipt: [],
    scheme_name: [],
    vikas_khand_name: [],
    vidhan_sabha_name: [],
    start_date: "",
    end_date: "",
  });

  // State for new created_at date filter (separate from existing date range filters)
  const [createdAtFilter, setCreatedAtFilter] = useState({
    selectedDate: "", // For dropdown selection
    manualDate: "", // For manual calendar selection
    showManualPicker: false, // Toggle for manual date picker
  });

  // State to store unique created_at dates extracted from data
  const [uniqueCreatedAtDates, setUniqueCreatedAtDates] = useState([]);

  // State for filter options (unique values from API)
  const [filterOptions, setFilterOptions] = useState({
    center_name: [],
    investment_name: [],
    sub_investment_name: [],
    unit: [],
    source_of_receipt: [],
    scheme_name: [],
    vikas_khand_name: [],
    vidhan_sabha_name: [],
    anudan_name: [],
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  // Dynamic form options
  const [formOptions, setFormOptions] = useState({
    investment_name: investmentOptions,
    sub_investment_name: [],
    unit: unitOptions,
    source_of_receipt: sourceOptions,
    scheme_name: schemeOptions,
    vikas_khand_name: vikasKhandOptions,
    vidhan_sabha_name: vidhanSabhaOptions,
  });

  // Dynamic edit options
  const [editOptions, setEditOptions] = useState({
    investment_name: investmentOptions,
    sub_investment_name: [],
    unit: unitOptions,
    source_of_receipt: sourceOptions,
    scheme_name: schemeOptions,
    vikas_khand_name: vikasKhandOptions,
    vidhan_sabha_name: vidhanSabhaOptions,
  });

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingValues, setEditingValues] = useState({});

  // State for multi-select delete
  const [selectedItems, setSelectedItems] = useState([]);

  // State for form field editing (Vidhan Sabha and Vikas Khand)
  const [isFormFieldsEditMode, setIsFormFieldsEditMode] = useState(false);
  const [tempFormFields, setTempFormFields] = useState({
    vidhan_sabha_name: "",
    vikas_khand_name: "",
  });

  // Track which fields are in "Other" mode (text input instead of dropdown)
  const [otherMode, setOtherMode] = useState({
    investment_name: false,
    sub_investment_name: false,
    unit: false,
    source_of_receipt: false,
    scheme_name: false,
  });

  // Track which fields are in "Other" mode for editing
  const [editingOtherMode, setEditingOtherMode] = useState({
    investment_name: false,
    sub_investment_name: false,
    unit: false,
    source_of_receipt: false,
    scheme_name: false,
  });

  // Get unique values for dropdowns from allBillingItems
  const getUniqueValues = (fieldName) => {
    const values = allBillingItems
      .map((item) => item[fieldName])
      .filter(Boolean);
    return [...new Set(values)].sort();
  };

  // Fetch center options from backend
  const fetchCenterOptions = async () => {
    try {
      const response = await axios.get(CENTERS_API_URL);
      const centers = response.data || [];
      if (Array.isArray(centers) && centers.length > 0) {
        setCenterOptions(centers);
      } else {
        // Fallback to hardcoded options if API returns empty or invalid data
        setCenterOptions([
          "कोटद्वार",
          "किनगोड़िखाल",
          "चौखाल",
          "धुमाकोट",
          "बीरोंखाल",
          "हल्दूखाल",
          "किल्वोंखाल",
          "चेलूसैंण",
          "जयहरीखाल",
          "जेठागांव",
          "देवियोंखाल",
          "सिलोगी",
          "सिसल्ड़ी",
          "पौखाल",
          "सतपुली",
          "संगलाकोटी",
          "देवराजखाल",
          "पोखड़ा",
          "वेदीखाल",
          "विथ्याणी",
          "गंगाभोगपुर",
          "दिउली",
          "दुगड्डा",
          "सेंधीखाल",
        ]);
      }
    } catch (error) {
      console.error("Error fetching center options:", error);
      // Fallback to hardcoded options if API fails
      setCenterOptions([
        "कोटद्वार",
        "किनगोड़िखाल",
        "चौखाल",
        "धुमाकोट",
        "बीरोंखाल",
        "हल्दूखाल",
        "किल्वोंखाल",
        "चेलूसैंण",
        "जयहरीखाल",
        "जेठागांव",
        "देवियोंखाल",
        "सिलोगी",
        "सिसल्ड़ी",
        "पौखाल",
        "सतपुली",
        "संगलाकोटी",
        "देवराजखाल",
        "पोखड़ा",
        "वेदीखाल",
        "विथ्याणी",
        "गंगाभोगपुर",
        "दिउली",
        "दुगड्डा",
        "सेंधीखाल",
      ]);
    }
  };

  // Fetch billing items data
  const fetchBillingItems = async (appliedFilters = {}) => {
    try {
      setIsLoading(true);
      setApiError(null);
      const params = {};
      Object.keys(appliedFilters).forEach((key) => {
        if (
          Array.isArray(appliedFilters[key]) &&
          appliedFilters[key].length > 0
        ) {
          params[key] = appliedFilters[key];
        } else if (
          appliedFilters[key] &&
          typeof appliedFilters[key] === "string" &&
          appliedFilters[key].trim()
        ) {
          params[key] = appliedFilters[key];
        }
      });
      const response = await axios.get(BILLING_API_URL, { params });
      const data =
        response.data && response.data.data
          ? response.data.data
          : response.data;
      const items = Array.isArray(data) ? data : [];
      setBillingItems(items);
      if (Object.keys(params).length === 0) {
        setAllBillingItems(items);
      }
    } catch (error) {
      console.error("Error fetching billing items:", error);
      setApiError("डेटा लोड करने में त्रुटि हुई।");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vikas khand data based on center
  const fetchVikasKhandData = async (centerName) => {
    if (!centerName) {
      setVikasKhandData(null);
      setFormData((prev) => ({
        ...prev,
        vikas_khand_name: "",
        vidhan_sabha_name: "",
      }));
      return;
    }

    try {
      setIsFetchingVikasKhand(true);
      console.log("Fetching vikas khand for center:", centerName);

      // Try exact match first
      let response = await axios.get(
        `${VIKAS_KHAND_API_URL}?center_name=${encodeURIComponent(centerName)}`,
      );

      let data = response.data;
      console.log("API response:", data);

      // If no data found with exact match, try partial match
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log("No exact match found, trying partial match");
        response = await axios.get(
          `${VIKAS_KHAND_API_URL}?search=${encodeURIComponent(centerName)}`,
        );
        data = response.data;
        console.log("Partial match response:", data);
      }

      // Handle different response structures
      let vikasData = null;
      if (Array.isArray(data) && data.length > 0) {
        vikasData = data[0];
      } else if (data && typeof data === "object") {
        // Check if the response has the expected fields
        if (data.vikas_khand_name || data.vidhan_sabha_name) {
          vikasData = data;
        } else if (data.data && typeof data.data === "object") {
          // Handle nested data structure
          vikasData = data.data;
        }
      }

      console.log("Extracted vikas data:", vikasData);

      if (vikasData) {
        setVikasKhandData(vikasData);
        // Update form data immediately
        setFormData((prev) => ({
          ...prev,
          vikas_khand_name: vikasData.vikas_khand_name || "",
          vidhan_sabha_name: vikasData.vidhan_sabha_name || "",
          scheme_name: "MGNREGA", // Set default scheme_name
        }));
        // Update editing values if editing
        if (editingRowId) {
          setEditingValues((prev) => ({
            ...prev,
            vikas_khand_name: vikasData.vikas_khand_name || "",
            vidhan_sabha_name: vikasData.vidhan_sabha_name || "",
            scheme_name: "MGNREGA", // Set default scheme_name
          }));
        }
        console.log("Form data updated with:", vikasData);
        // Clear any previous error
        setApiError(null);
      } else {
        // Show an error message when no data is found
        setApiError(`No vikas khand data found for center: ${centerName}`);
        setVikasKhandData(null);
        setFormData((prev) => ({
          ...prev,
          vikas_khand_name: "",
          vidhan_sabha_name: "",
        }));
        if (editingRowId) {
          setEditingValues((prev) => ({
            ...prev,
            vikas_khand_name: "",
            vidhan_sabha_name: "",
          }));
        }
        console.log("No vikas data found, cleared form");
      }
    } catch (error) {
      console.error("Error fetching vikas khand data:", error);
      setApiError(`Error fetching vikas khand data: ${error.message}`);
      setVikasKhandData(null);
      setFormData((prev) => ({
        ...prev,
        vikas_khand_name: "",
        vidhan_sabha_name: "",
      }));
      if (editingRowId) {
        setEditingValues((prev) => ({
          ...prev,
          vikas_khand_name: "",
          vidhan_sabha_name: "",
        }));
      }
    } finally {
      setIsFetchingVikasKhand(false);
    }
  };

  // Fetch form filters
  const fetchFormFilters = async (
    investmentName = "",
    subInvestmentName = "",
  ) => {
    try {
      setIsLoadingFilters(true);
      let url = FORM_FILTERS_API_URL;
      const params = [];
      if (investmentName)
        params.push(`investment_name=${encodeURIComponent(investmentName)}`);
      if (subInvestmentName)
        params.push(
          `sub_investment_name=${encodeURIComponent(subInvestmentName)}`,
        );
      if (params.length > 0) url += "?" + params.join("&");

      console.log("Fetching filters from:", url);
      const response = await axios.get(url);
      const data = response.data;
      console.log("API response:", data);

      setFormOptions((prev) => ({
        ...prev,
        investment_name:
          data.level === "investment_name"
            ? data.data || []
            : prev.investment_name,
        sub_investment_name:
          data.level === "sub_investment_name"
            ? data.data || []
            : prev.sub_investment_name,
        unit: data.unit || prev.unit,
        source_of_receipt: data.source_of_receipt || prev.source_of_receipt,
        scheme_name: data.scheme_name || prev.scheme_name,
      }));

      // Auto-select first sub_investment_name if available
      if (
        data.level === "sub_investment_name" &&
        data.data &&
        data.data.length > 0
      ) {
        setFormData((prev) => ({ ...prev, sub_investment_name: data.data[0] }));
      }
    } catch (error) {
      console.error("Error fetching form filters:", error);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  // Fetch edit options
  const fetchEditOptions = async (
    investmentName = "",
    subInvestmentName = "",
  ) => {
    try {
      let url = FORM_FILTERS_API_URL;
      const params = [];
      if (investmentName)
        params.push(`investment_name=${encodeURIComponent(investmentName)}`);
      if (subInvestmentName)
        params.push(
          `sub_investment_name=${encodeURIComponent(subInvestmentName)}`,
        );
      if (params.length > 0) url += "?" + params.join("&");

      const response = await axios.get(url);
      const data = response.data;

      setEditOptions((prev) => ({
        ...prev,
        investment_name:
          data.level === "investment_name"
            ? data.data || []
            : prev.investment_name,
        sub_investment_name:
          data.level === "sub_investment_name"
            ? data.data || []
            : prev.sub_investment_name,
        unit: data.unit || prev.unit,
        source_of_receipt: data.source_of_receipt || prev.source_of_receipt,
        scheme_name: data.scheme_name || prev.scheme_name,
      }));

      // Auto-select first sub_investment_name if available
      if (
        data.level === "sub_investment_name" &&
        data.data &&
        data.data.length > 0
      ) {
        setEditingValues((prev) => ({
          ...prev,
          sub_investment_name: data.data[0],
        }));
      }
    } catch (error) {
      console.error("Error fetching edit filters:", error);
    }
  };

  // Fetch data on component mount and set default financial year filters
  useEffect(() => {
    const financialYearDates = getFinancialYearDates();
    setFilters({
      center_name: [],
      investment_name: [],
      sub_investment_name: [],
      source_of_receipt: [],
      scheme_name: [],
      vikas_khand_name: [],
      vidhan_sabha_name: [],
      start_date: financialYearDates.start_date,
      end_date: financialYearDates.end_date,
    });
    fetchBillingItems();
    fetchFormFilters();
    fetchCenterOptions();
  }, []);

  // Populate filter options from all billing items
  useEffect(() => {
    if (allBillingItems.length > 0) {
      setFilterOptions({
        center_name: [
          ...new Set(
            allBillingItems.map((item) => item.center_name).filter(Boolean),
          ),
        ],
        investment_name: [
          ...new Set(
            allBillingItems.map((item) => item.investment_name).filter(Boolean),
          ),
        ],
        sub_investment_name: [
          ...new Set(
            allBillingItems
              .map((item) => item.sub_investment_name)
              .filter(Boolean),
          ),
        ],
        unit: [
          ...new Set(allBillingItems.map((item) => item.unit).filter(Boolean)),
        ],
        source_of_receipt: [
          ...new Set(
            allBillingItems
              .map((item) => item.source_of_receipt)
              .filter(Boolean),
          ),
        ],
        scheme_name: [
          ...new Set(
            allBillingItems.map((item) => item.scheme_name).filter(Boolean),
          ),
        ],
        vikas_khand_name: [
          ...new Set(
            allBillingItems
              .map((item) => item.vikas_khand_name)
              .filter(Boolean),
          ),
        ],
        vidhan_sabha_name: [
          ...new Set(
            allBillingItems
              .map((item) => item.vidhan_sabha_name)
              .filter(Boolean),
          ),
        ],
        anudan_name: [
          ...new Set(
            allBillingItems
              .map((item) => item.anudan_name)
              .filter(Boolean),
          ),
        ],
      });

      // Extract unique created_at dates for the new date filter
      const createdAtDates = allBillingItems
        .map((item) =>
          item.created_at
            ? new Date(item.created_at).toISOString().split("T")[0]
            : null,
        )
        .filter(Boolean);
      const uniqueDates = [...new Set(createdAtDates)].sort().reverse();
      setUniqueCreatedAtDates(uniqueDates);
    }
  }, [allBillingItems]);

  // Apply local filtering when filters change
  useEffect(() => {
    let filtered = allBillingItems;

    const hasFilters = Object.keys(filters).some((key) =>
      Array.isArray(filters[key])
        ? filters[key].length > 0
        : filters[key].trim(),
    );
    if (hasFilters) {
      filtered = allBillingItems.filter((item) => {
        // Check all other filters
        for (const key in filters) {
          if (key === "start_date" || key === "end_date") continue;
          if (filters[key].length > 0 && !filters[key].includes(item[key])) {
            return false;
          }
        }

        // Check date range filters (use bill_date)
        if (filters.start_date || filters.end_date) {
          if (!item.bill_date) return false;

          const itemDate = new Date(item.bill_date);
          const startDate = filters.start_date
            ? new Date(filters.start_date)
            : null;
          const endDate = filters.end_date ? new Date(filters.end_date) : null;

          if (endDate) {
            endDate.setHours(23, 59, 59, 999);
          }

          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
        }

        return true;
      });
    }

    // Apply created_at filter on top of other filters
    if (createdAtFilter.selectedDate || createdAtFilter.manualDate) {
      const { selectedDate, manualDate } = createdAtFilter;
      const filterDate = selectedDate || manualDate;

      filtered = filtered.filter((item) => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at).toISOString().split("T")[0];
        return itemDate === filterDate;
      });
    }

    setBillingItems(filtered);
  }, [filters, allBillingItems, createdAtFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Clear all filters and reset to financial year
  const clearFilters = () => {
    const financialYearDates = getFinancialYearDates();
    setFilters({
      center_name: [],
      investment_name: [],
      sub_investment_name: [],
      source_of_receipt: [],
      scheme_name: [],
      vikas_khand_name: [],
      vidhan_sabha_name: [],
      start_date: financialYearDates.start_date,
      end_date: financialYearDates.end_date,
    });
    // Also clear the new created_at filter
    setCreatedAtFilter({
      selectedDate: "",
      manualDate: "",
      showManualPicker: false,
    });
  };

  // Handle dropdown date selection from unique created_at dates
  const handleCreatedAtDateSelect = (date) => {
    // When dropdown selection is made, clear manual date and disable picker
    setCreatedAtFilter((prev) => ({
      ...prev,
      selectedDate: date,
      manualDate: "",
      showManualPicker: false,
    }));
  };

  // Handle manual calendar date selection
  const handleCreatedAtManualDateChange = (date) => {
    // When manual date is selected, clear dropdown selection
    setCreatedAtFilter((prev) => ({
      ...prev,
      manualDate: date,
      selectedDate: "",
    }));
  };

  // Toggle manual date picker visibility
  const toggleManualDatePicker = () => {
    setCreatedAtFilter((prev) => ({
      ...prev,
      showManualPicker: !prev.showManualPicker,
      // If enabling manual picker, clear the dropdown selection
      selectedDate: !prev.showManualPicker ? "" : prev.selectedDate,
    }));
  };

  // Filtered items (now from API)
  const filteredItems = billingItems;

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Handler for editing Vidhan Sabha and Vikas Khand fields
  const handleFormFieldsEditStart = () => {
    setTempFormFields({
      vidhan_sabha_name: formData.vidhan_sabha_name,
      vikas_khand_name: formData.vikas_khand_name,
    });
    setIsFormFieldsEditMode(true);
  };

  // Handler for changing temp form field values
  const handleFormFieldsEditChange = (e) => {
    const { name, value } = e.target;
    setTempFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for saving form field changes
  const handleFormFieldsSaveEdit = () => {
    setFormData((prev) => ({
      ...prev,
      vidhan_sabha_name: tempFormFields.vidhan_sabha_name,
      vikas_khand_name: tempFormFields.vikas_khand_name,
    }));
    setIsFormFieldsEditMode(false);
  };

  // Handler for canceling form field edit
  const handleFormFieldsCancelEdit = () => {
    setIsFormFieldsEditMode(false);
    setTempFormFields({
      vidhan_sabha_name: "",
      vikas_khand_name: "",
    });
  };

  // Numeric/categorical totals used by Excel/PDF/table exports
  const getColumnTotal = (data, col) => {
    const numericColumns = [
      "allocated_quantity",
      "rate",
      "farmer_selling_rate",
      "farmer_subsidy_rate",
      "amount_of_farmer_share",
      "amount_of_subsidy",
      "total_amount",
    ];

    if (numericColumns.includes(col)) {
      return data
        .reduce((sum, item) => sum + (parseFloat(item[col]) || 0), 0)
        .toFixed(2);
    }

    if (col === "bill_date" || col === "remark" || col === "anudan_name") {
      return "";
    }

    const values = new Set(
      data.map((item) => item[col]).filter((value) => value !== null && value !== undefined && value !== "")
    );
    return values.size;
  };

  const renderTableCell = (item, col) => {
    if (editingRowId !== item.id) {
      return billingTableColumnMapping[col]?.accessor(item, 0) ?? "";
    }

    const numericColumns = [
      "allocated_quantity",
      "rate",
      "farmer_selling_rate",
      "farmer_subsidy_rate",
      "amount_of_farmer_share",
      "amount_of_subsidy",
      "total_amount",
    ];

    if (col === "center_name") {
      return (
        <Form.Select
          value={editingValues.center_name || ""}
          onChange={(e) =>
            setEditingValues((prev) => ({
              ...prev,
              center_name: e.target.value,
            }))
          }
          size="sm"
        >
          <option value="">चुनें</option>
          {centerOptions.map((center, index) => (
            <option key={index} value={center}>
              {center}
            </option>
          ))}
        </Form.Select>
      );
    }

    if (col === "bill_date") {
      return (
        <Form.Control
          type="date"
          value={editingValues.bill_date || ""}
          onChange={(e) =>
            setEditingValues((prev) => ({ ...prev, bill_date: e.target.value }))
          }
          size="sm"
        />
      );
    }

    if (numericColumns.includes(col)) {
      return (
        <Form.Control
          type="number"
          step="0.01"
          value={editingValues[col] ?? ""}
          onChange={(e) =>
            setEditingValues((prev) => ({ ...prev, [col]: e.target.value }))
          }
          size="sm"
        />
      );
    }

    return (
      <Form.Control
        type="text"
        value={editingValues[col] ?? ""}
        onChange={(e) =>
          setEditingValues((prev) => ({ ...prev, [col]: e.target.value }))
        }
        size="sm"
      />
    );
  };

  // Download Excel function
  const downloadExcel = (data, filename, columnMapping, selectedColumns) => {
    try {
      const orderedColumns = selectedColumns.filter((col) => columnMapping[col]);
      const excelData = data.map((item, index) => {
        const row = { "क्र.सं.": index + 1 };
        orderedColumns.forEach((col) => {
          row[columnMapping[col].header] = columnMapping[col].accessor(item, index);
        });
        return row;
      });

      const totalRow = { "क्र.सं.": "कुल" };
      orderedColumns.forEach((col) => {
        totalRow[columnMapping[col].header] = getColumnTotal(data, col);
      });
      excelData.push(totalRow);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws["!cols"] = [
        { wch: 8 },
        ...orderedColumns.map((col) => ({
          wch:
            col === "remark" ? 35 :
            col === "source_of_receipt" ? 30 :
            col === "investment_name" ? 25 :
            col === "sub_investment_name" ? 30 :
            18,
        })),
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error("Error generating Excel file:", e);
      setApiError("Excel file generation failed. Please try again.");
    }
  };

  // Download the NEW Excel sample template based on final_excel headings/order.
  // The registration date is intentionally the LAST column.
  const downloadSampleTemplate = () => {
    try {
      const headers = [
        "केंद्र का नाम",
        "क्रय योजना का नाम",
        "सप्लायर",
        "मद का नाम",
        "उप-मद का नाम",
        "इकाई",
        "आवंटित मात्रा ",
        "क्रय दर\n(प्रति इकाई)",
        "कृषक विक्रय दर\n(प्रति इकाई)",
        "कृषक अनुदान दर\n(प्रति इकाई)",
        "कृषक अंश\n(रु0)",
        "अनुदान राशि\n(रु0)",
        "कुल राशि\n(रु0)",
        "अनुदान वहन योजना",
        "रिमार्क",
        "पंजीकरण तिथि",
      ];

      const sampleData = [
        [
          "किनगोड़िखाल",
          "4401 बिक्री हेतु",
          "मै0 किसान ट्रेडिंग कॉरपोरेशन",
          "सब्जी बीज",
          "पालक पहाड़ी",
          "किग्रा",
          2,
          295,
          147.5,
          147.5,
          295,
          295,
          590,
          "जिला योजना",
          "अनुदान जिला योजना मद से वहन",
          getTodayInDisplayFormat(),
        ],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

      ws["!cols"] = [
        { wch: 20 },
        { wch: 25 },
        { wch: 32 },
        { wch: 25 },
        { wch: 30 },
        { wch: 10 },
        { wch: 15 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 38 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Master");
      XLSX.writeFile(wb, "Billing_Items_Template.xlsx");
    } catch (e) {
      console.error("Error generating sample template:", e);
      setApiError("Sample template generation failed. Please try again.");
    }
  };

  // Download PDF function
  const downloadPdf = (
    data,
    filename,
    columnMapping,
    selectedColumns,
    title,
  ) => {
    try {
      // Add serial number column header
      const headers = `<th>क्र.सं.</th>${selectedColumns
        .map((col) => `<th>${columnMapping[col].header}</th>`)
        .join("")}`;

      // Add serial numbers to data rows
      const rows = data
        .map((item, index) => {
          const cells = `<td>${index + 1}</td>${selectedColumns
            .map(
              (col) => `<td>${columnMapping[col].accessor(item, index)}</td>`,
            )
            .join("")}`;
          return `<tr>${cells}</tr>`;
        })
        .join("");

      // Add total row - first cell is "कुल" for serial number column
      const totalCells = `<td><strong>कुल</strong></td>${selectedColumns
        .map((col) => {
          if (
            col === "center_name" ||
            col === "vidhan_sabha_name" ||
            col === "vikas_khand_name" ||
            col === "scheme_name" ||
            col === "source_of_receipt" ||
            col === "investment_name" ||
            col === "sub_investment_name" ||
            col === "unit"
          ) {
            // Unique count for categorical columns
            const uniqueValues = new Set(
              data.map((item) => columnMapping[col].accessor(item, 0)),
            );
            return `<td><strong>${uniqueValues.size}</strong></td>`;
          } else if (
            col === "allocated_quantity" ||
            col === "rate" ||
            col === "amount_of_farmer_share" ||
            col === "amount_of_subsidy" ||
            col === "total_amount"
          ) {
            // Sum for numeric columns
            const sum = data.reduce((total, item) => {
              const value =
                parseFloat(columnMapping[col].accessor(item, 0)) || 0;
              return total + value;
            }, 0);
            return `<td><strong>${sum.toFixed(2)}</strong></td>`;
          } else {
            return `<td></td>`;
          }
        })
        .join("")}`;
      const totalRow = `<tr class="table-total-row">${totalCells}</tr>`;

      const tableHtml = `
        <html>
          <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');
              body {
                font-family: 'Noto Sans', Arial, sans-serif;
                margin: 20px;
                direction: ltr;
              }
              h1 {
                text-align: center;
                font-size: 24px;
                margin-bottom: 30px;
                font-weight: bold;
              }
              .print-button {
                display: block;
                margin: 0 auto 20px auto;
                padding: 10px 20px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
              }
              .print-button:hover {
                background-color: #0056b3;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                font-size: 14px;
              }
              th {
                background-color: #f2f2f2;
                font-weight: bold;
              }
              @media print {
                .no-print { display: none; }
                body { margin: 0; }
                h1 { font-size: 20px; }
                th, td { font-size: 12px; }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <button class="print-button no-print" onclick="window.print()">प्रिंट करें</button>
            <table>
              <thead>
                <tr>${headers}</tr>
              </thead>
              <tbody>
                ${rows}
                ${totalRow}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(tableHtml);
      printWindow.document.close();

      printWindow.onload = function () {
        // PDF is now open for preview
      };
    } catch (e) {
      console.error("Error generating PDF:", e);
      setApiError("PDF generation failed. Please try again.");
    }
  };

  // Refresh function
  const handleRefresh = () => {
    fetchBillingItems();
    setApiResponse(null);
    setApiError(null);
    clearFilters();
    setEditingRowId(null);
    setEditingValues({});
    setSelectedItems([]);
  };

  // Handle multi-select delete
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    const confirmed = window.confirm(
      `क्या आप ${selectedItems.length} चयनित रिकॉर्ड्स को हटाना चाहते हैं?`,
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      const payload = { bill_id: selectedItems };
      await axios.delete(
        "https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/",
        { data: payload },
      );

      // Remove deleted items from state
      setAllBillingItems((prev) =>
        prev.filter((item) => !selectedItems.includes(item.bill_id)),
      );
      setSelectedItems([]);
      setApiResponse({
        message: `${selectedItems.length} रिकॉर्ड सफलतापूर्वक हटाए गए!`,
      });
    } catch (error) {
      console.error("Error deleting items:", error);
      setApiError("रिकॉर्ड हटाने में त्रुटि हुई।");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (billId) => {
    setSelectedItems((prev) => {
      if (prev.includes(billId)) {
        return prev.filter((id) => id !== billId);
      } else {
        return [...prev, billId];
      }
    });
  };

  // Handle select all (filtered items only)
  const handleSelectAll = () => {
    const visibleItems = filteredItems.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
    const visibleBillIds = visibleItems.map((item) => item.bill_id);

    // Check if all visible items are already selected
    const allSelected = visibleBillIds.every((id) =>
      selectedItems.includes(id),
    );

    if (allSelected) {
      // Deselect all visible items
      setSelectedItems((prev) =>
        prev.filter((id) => !visibleBillIds.includes(id)),
      );
    } else {
      // Select all visible items that are not already selected
      const newSelections = visibleBillIds.filter(
        (id) => !selectedItems.includes(id),
      );
      setSelectedItems((prev) => [...prev, ...newSelections]);
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingRowId(item.id);
    // Convert bill_date to YYYY-MM-DD format for HTML date input
    let billDateValue = "";
    if (item.bill_date) {
      // If already in YYYY-MM-DD format, use as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.bill_date)) {
        billDateValue = item.bill_date;
      } else {
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        billDateValue = convertToBackendFormat(item.bill_date);
      }
    }
    setEditingValues({
      center_name: item.center_name || "",
      investment_name: item.investment_name || "",
      sub_investment_name: item.sub_investment_name || "",
      unit: item.unit || "",
      allocated_quantity: item.allocated_quantity || "",
      rate: item.rate || "",
      source_of_receipt: item.source_of_receipt || "",
      scheme_name: item.scheme_name || "",
      vikas_khand_name: item.vikas_khand_name || "",
      vidhan_sabha_name: item.vidhan_sabha_name || "",
      bill_date: billDateValue,
      amount_of_farmer_share: item.amount_of_farmer_share || "",
      amount_of_subsidy: item.amount_of_subsidy || "",
      total_amount: item.total_amount || "",
      farmer_selling_rate: item.farmer_selling_rate || "",
      farmer_subsidy_rate: item.farmer_subsidy_rate || "",
      anudan_name: item.anudan_name || "",
      remark: item.remark || "",
    });
    if (item.investment_name) {
      fetchEditOptions(item.investment_name);
    }
    setApiError(null);
    setApiResponse(null);
  };

  // Handle save edit
  const handleSave = async (item) => {
    try {
      const payload = {
        bill_id: item.bill_id,
        center_name: editingValues.center_name,
        investment_name: editingValues.investment_name,
        sub_investment_name: editingValues.sub_investment_name,
        unit: editingValues.unit,
        allocated_quantity: parseInt(editingValues.allocated_quantity) || 0,
        rate: parseFloat(editingValues.rate) || 0,
        source_of_receipt: editingValues.source_of_receipt,
        scheme_name: editingValues.scheme_name,
        vikas_khand_name: editingValues.vikas_khand_name,
        vidhan_sabha_name: editingValues.vidhan_sabha_name,
        bill_date: editingValues.bill_date || "",
        amount_of_farmer_share:
          parseFloat(editingValues.amount_of_farmer_share) || 0,
        amount_of_subsidy: parseFloat(editingValues.amount_of_subsidy) || 0,
        total_amount: parseFloat(editingValues.total_amount) || 0,
        farmer_selling_rate:
          parseFloat(editingValues.farmer_selling_rate) || 0,
        farmer_subsidy_rate:
          parseFloat(editingValues.farmer_subsidy_rate) || 0,
        anudan_name: editingValues.anudan_name || "",
        remark: editingValues.remark || "",
      };
      const response = await axios.put(BILLING_API_URL, payload);
      setAllBillingItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...payload } : i)),
      );
      setEditingRowId(null);
      setEditingValues({});
      setApiResponse({ message: "आइटम सफलतापूर्वक अपडेट किया गया!" });
    } catch (error) {
      console.error("Error updating item:", error);
      setApiError("आइटम अपडेट करने में त्रुटि हुई।");
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditingRowId(null);
    setEditingValues({});
  };

  // Handle delete
  const handleDelete = async (item) => {
    if (window.confirm("क्या आप इस आइटम को हटाना चाहते हैं?")) {
      try {
        const response = await axios.delete(BILLING_API_URL, {
          data: { bill_id: item.bill_id },
        });
        setAllBillingItems((prev) => prev.filter((i) => i.id !== item.id));
        setApiResponse({ message: "आइटम सफलतापूर्वक हटा दिया गया!" });
      } catch (error) {
        console.error("Error deleting item:", error);
        setApiError("आइटम हटाने में त्रुटि हुई।");
      }
    }
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Generate pagination items
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
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
      </Pagination.Item>,
    );
    if (startPage > 2) {
      paginationItems.push(
        <Pagination.Ellipsis key="start-ellipsis" disabled />,
      );
    }
  }

  for (let number = startPage; number <= endPage; number++) {
    paginationItems.push(
      <Pagination.Item
        key={number}
        active={number === currentPage}
        onClick={() => handlePageChange(number)}
      >
        {number}
      </Pagination.Item>,
    );
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationItems.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    }
    paginationItems.push(
      <Pagination.Item
        key={totalPages}
        onClick={() => handlePageChange(totalPages)}
      >
        {totalPages}
      </Pagination.Item>,
    );
  }

  // Convert Excel date serial number to YYYY-MM-DD format
  const convertExcelDateToISO = (excelDateValue) => {
    if (!excelDateValue) return "";

    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof excelDateValue === "string") {
      // Check if it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(excelDateValue)) {
        return excelDateValue;
      }
      // Try to parse as date string (handles various formats)
      try {
        const date = new Date(excelDateValue);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.error("Error parsing date string:", excelDateValue, e);
      }
    }

    // If it's a number (Excel date serial)
    if (typeof excelDateValue === "number") {
      // Excel date serial: Days since January 0, 1900 (with 1900 leap year bug)
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const date = new Date(
        excelEpoch.getTime() + excelDateValue * 24 * 60 * 60 * 1000,
      );

      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    return "";
  };

  // Validate a single row of data (for bulk upload, vikas_khand and vidhan_sabha are set in backend)
  const validateRow = (rowData, rowIndex) => {
    const errors = [];

    if (!rowData.center_name || !rowData.center_name.toString().trim()) {
      errors.push(`Row ${rowIndex}: केंद्र का नाम आवश्यक है`);
    } else if (rowData.center_name_invalid) {
      errors.push(
        `Row ${rowIndex}: Invalid Kendra Name - entered value: "${rowData.center_name_original || rowData.center_name}"`,
      );
    } else if (rowData.center_name_needs_correction) {
      errors.push(
        `Row ${rowIndex}: Please replace the Kendra name with the correct valid name`,
      );
    }
    if (
      !rowData.investment_name ||
      !rowData.investment_name.toString().trim()
    ) {
      errors.push(`Row ${rowIndex}: निवेश का नाम आवश्यक है`);
    }
    if (!rowData.unit || !rowData.unit.toString().trim()) {
      errors.push(`Row ${rowIndex}: इकाई आवश्यक है`);
    }
    if (
      rowData.allocated_quantity === "" ||
      rowData.allocated_quantity === null ||
      rowData.allocated_quantity === undefined
    ) {
      errors.push(`Row ${rowIndex}: आवंटित मात्रा  आवश्यक है`);
    } else if (isNaN(parseInt(rowData.allocated_quantity))) {
      errors.push(`Row ${rowIndex}: आवंटित मात्रा  एक संख्या होनी चाहिए`);
    }
    if (
      rowData.rate === "" ||
      rowData.rate === null ||
      rowData.rate === undefined
    ) {
      errors.push(`Row ${rowIndex}: दर आवश्यक है`);
    } else if (isNaN(parseFloat(rowData.rate))) {
      errors.push(`Row ${rowIndex}: दर एक संख्या होनी चाहिए`);
    }
    if (
      !rowData.source_of_receipt ||
      !rowData.source_of_receipt.toString().trim()
    ) {
      errors.push(`Row ${rowIndex}: सप्लायर आवश्यक है`);
    }
    if (!rowData.scheme_name || !rowData.scheme_name.toString().trim()) {
      errors.push(`Row ${rowIndex}: योजना का नाम आवश्यक है`);
    }
    // NOTE: vikas_khand_name and vidhan_sabha_name are NOT required for bulk upload - they are set in backend

    return errors;
  };

  const normalizeKendraName = (value) => {
    if (value === null || value === undefined) return "";

    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u200c\u200d]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  };

  // Function to find closest matching center name
  const findClosestCenterName = (inputName) => {
    if (!inputName || !inputName.toString().trim()) {
      return { matched: false, corrected: null, exact: false };
    }

    const input = inputName.toString().trim();
    const normalizedInput = normalizeKendraName(input);

    const exactMatch = validKendraNames.find(
      (option) => normalizeKendraName(option) === normalizedInput,
    );

    if (exactMatch) {
      return { matched: true, corrected: exactMatch, exact: true };
    }

    let closestMatch = null;
    let minDistance = Infinity;
    let bestSimilarity = 0;

    for (const option of validKendraNames) {
      const normalizedOption = normalizeKendraName(option);
      const distance = levenshteinDistance(normalizedInput, normalizedOption);
      const maxLength = Math.max(normalizedInput.length, normalizedOption.length) || 1;
      const similarity = 1 - distance / maxLength;

      if (
        distance < minDistance ||
        (distance === minDistance && similarity > bestSimilarity)
      ) {
        minDistance = distance;
        bestSimilarity = similarity;
        closestMatch = option;
      }
    }

    const shouldAutoCorrect =
      Boolean(closestMatch) &&
      (minDistance <= 2 || bestSimilarity >= 0.85) &&
      normalizedInput.length >= 4;

    if (shouldAutoCorrect) {
      return {
        matched: true,
        corrected: closestMatch,
        exact: false,
        needsCorrection: true,
      };
    }

    return { matched: false, corrected: null, exact: false, needsCorrection: false };
  };

  // Helper function to calculate Levenshtein distance
  const levenshteinDistance = (str1, str2) => {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  };

  // Function to apply center name corrections to parsed rows
  const applyCenterNameCorrections = (rows, corrections, selectedValues = {}) => {
    return rows.map((row) => {
      const correction = corrections.find((c) => c.rowIndex === row.rowIndex);
      if (correction) {
        const selectedValue = selectedValues[row.rowIndex];
        if (selectedValue) {
          return {
            ...row,
            center_name: selectedValue,
            center_name_invalid: false,
            center_name_needs_correction: false,
          };
        }
      }
      return row;
    });
  };

  // Check if a row has any meaningful data (not completely empty)
  const isEmptyRow = (row) => {
    if (!row || typeof row !== "object") return true;
    const values = Object.values(row);
    return values.every(
      (val) =>
        val === null ||
        val === undefined ||
        val === "" ||
        (typeof val === "string" && val.trim() === ""),
    );
  };

  // Handle file change - parse and show preview
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    setApiError(null);
    setApiResponse(null);
    setPreviewData([]);
    setFailedRows([]);
    setIsValidated(false);
    setDuplicateRowIndices([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length <= 1) {
            setApiError("Excel फाइल में कोई डेटा नहीं है");
            return;
          }

          const dataRows = jsonData.slice(1);
          const headers = jsonData[0];

          // Normalize Excel headers. Excel may store line breaks, non-breaking
          // spaces, or other Unicode whitespace differently from the template.
          const normalizeExcelHeader = (header) =>
            String(header ?? "")
              .replace(/\r?\n/g, " ")
              .replace(/[\u00A0\u2000-\u200B]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();

          const headerMapping = {};
          headers.forEach((header, index) => {
            const normalizedHeader = normalizeExcelHeader(header);
            if (normalizedHeader) {
              headerMapping[normalizedHeader] = index;
            }
          });

          const getExcelCell = (row, ...possibleHeaders) => {
            for (const header of possibleHeaders) {
              const index = headerMapping[normalizeExcelHeader(header)];
              if (typeof index !== "undefined") {
                return row[index];
              }
            }
            return "";
          };

          // Determine bill_date column index
          const billDateHeaderKeys = [
            "पंजीकरण तिथि",
            "bill_date",
            "registration_tithi",
            "post_date",
          ];
          let billDateIndex = null;
          for (const key of billDateHeaderKeys) {
            const idx = headerMapping[key.toString().trim().toLowerCase()];
            if (typeof idx !== "undefined") {
              billDateIndex = idx;
              break;
            }
          }
          if (billDateIndex === null) {
            billDateIndex = headers.length - 1;
          }

          // Parse all rows and filter empty ones
          const parsedRows = [];

          dataRows.forEach((row, rowIndex) => {
            const billDateRaw = row[billDateIndex] || "";
            const billDateISO = parseDateFromExcel(billDateRaw);

            const rawCenterName = (
              row[headerMapping["केंद्र का नाम"]] ||
              row[headerMapping["center_name"]] ||
              ""
            )
              .toString()
              .trim();
            const centerNameMatch = rawCenterName
              ? findClosestCenterName(rawCenterName)
              : null;
            const parsedRow = {
              center_name: rawCenterName,
              center_name_original: rawCenterName,
              center_name_invalid: Boolean(
                rawCenterName && centerNameMatch && !centerNameMatch.matched,
              ),
              center_name_needs_correction: Boolean(
                rawCenterName &&
                  centerNameMatch &&
                  centerNameMatch.needsCorrection,
              ),
              center_name_suggested:
                rawCenterName && centerNameMatch && centerNameMatch.needsCorrection
                  ? centerNameMatch.corrected
                  : "",
              vidhan_sabha_name: (
                row[headerMapping["विधानसभा का नाम"]] ||
                row[headerMapping["vidhan_sabha_name"]] ||
                ""
              )
                .toString()
                .trim(),
              vikas_khand_name: (
                row[headerMapping["विकास खंड का नाम"]] ||
                row[headerMapping["vikas_khand_name"]] ||
                ""
              )
                .toString()
                .trim(),
              scheme_name: (
                row[headerMapping["क्रय योजना का नाम"]] ||
                row[headerMapping["योजना का नाम"]] ||
                row[headerMapping["scheme_name"]] ||
                ""
              )
                .toString()
                .trim(),
              source_of_receipt: (
                row[headerMapping["सप्लायर"]] ||
                row[headerMapping["source_of_receipt"]] ||
                ""
              )
                .toString()
                .trim(),
              investment_name: (
                row[headerMapping["मद का नाम"]] ||
                row[headerMapping["निवेश का नाम"]] ||
                row[headerMapping["investment_name"]] ||
                ""
              )
                .toString()
                .trim(),
              sub_investment_name: (
                row[headerMapping["उप-मद का नाम"]] ||
                row[headerMapping["उप-निवेश का नाम"]] ||
                row[headerMapping["sub_investment_name"]] ||
                ""
              )
                .toString()
                .trim(),
              unit: (
                row[headerMapping["इकाई"]] ||
                row[headerMapping["unit"]] ||
                ""
              )
                .toString()
                .trim(),
              allocated_quantity: roundTo2Decimals(
                getExcelCell(
                  row,
                  "आवंटित मात्रा ",
                  "allocated_quantity",
                ),
              ),
              rate: roundTo2Decimals(
                getExcelCell(
                  row,
                  "क्रय दर (प्रति इकाई)",
                  "क्रय दर\n(प्रति इकाई)",
                  "दर",
                  "rate",
                ),
              ),
              farmer_selling_rate: roundTo2Decimals(
                getExcelCell(
                  row,
                  "कृषक विक्रय दर (प्रति इकाई)",
                  "कृषक विक्रय दर\n(प्रति इकाई)",
                  "farmer_selling_rate",
                ),
              ),
              farmer_subsidy_rate: roundTo2Decimals(
                getExcelCell(
                  row,
                  "कृषक अनुदान दर (प्रति इकाई)",
                  "कृषक अनुदान दर\n(प्रति इकाई)",
                  "farmer_subsidy_rate",
                ),
              ),
              amount_of_farmer_share: roundTo2Decimals(
                getExcelCell(
                  row,
                  "कृषक अंश (रु0)",
                  "कृषक अंश\n(रु0)",
                  "किसान का हिस्सा",
                  "amount_of_farmer_share",
                ),
              ),
              amount_of_subsidy: roundTo2Decimals(
                getExcelCell(
                  row,
                  "अनुदान राशि (रु0)",
                  "अनुदान राशि\n(रु0)",
                  "सब्सिडी राशि",
                  "amount_of_subsidy",
                ),
              ),
              total_amount: roundTo2Decimals(
                getExcelCell(
                  row,
                  "कुल राशि (रु0)",
                  "कुल राशि\n(रु0)",
                  "कुल राशि",
                  "total_amount",
                ),
              ),
              anudan_name: (
                row[headerMapping["अनुदान वहन योजना"]] ||
                row[headerMapping["anudan_name"]] ||
                ""
              )
                .toString()
                .trim(),
              remark: (
                row[headerMapping["रिमार्क"]] ||
                row[headerMapping["remark"]] ||
                ""
              )
                .toString()
                .trim(),
              original_bill_date: convertToDisplayFormat(billDateRaw),
              bill_date: billDateISO,
              rowIndex: rowIndex + 2,
              _originalIndex: rowIndex,
            };

            if (!isEmptyRow(parsedRow)) {
              parsedRows.push(parsedRow);
            }
          });

          // Validate rows
          const validationErrors = [];

          parsedRows.forEach((rowData) => {
            const rowErrors = validateRow(rowData, rowData.rowIndex);
            if (rowErrors.length > 0) {
              validationErrors.push({
                rowIndex: rowData.rowIndex,
                errors: rowErrors,
                data: rowData,
                invalidCenterName: rowData.center_name_invalid,
                needsCorrection: rowData.center_name_needs_correction,
              });
            }
          });

          // Fetch existing billing items to check for duplicates
          try {
            const existingResponse = await axios.get(BILLING_API_URL);
            const existingData =
              existingResponse.data && existingResponse.data.data
                ? existingResponse.data.data
                : existingResponse.data;
            const existingItems = Array.isArray(existingData)
              ? existingData
              : [];

            // Detect duplicates with existing system data
            const duplicateIndices = new Set();
            const newValidationErrors = [...validationErrors];

            parsedRows.forEach((row) => {
              // Check if this row matches any existing item
              // Compare only fields that are in the template download
              const isDuplicateWithExisting = existingItems.some((existing) => {
                return (
                  String(existing.center_name || "").trim() ===
                    String(row.center_name || "").trim() &&
                  String(existing.scheme_name || "").trim() ===
                    String(row.scheme_name || "").trim() &&
                  String(existing.source_of_receipt || "").trim() ===
                    String(row.source_of_receipt || "").trim() &&
                  String(existing.investment_name || "").trim() ===
                    String(row.investment_name || "").trim() &&
                  String(existing.sub_investment_name || "").trim() ===
                    String(row.sub_investment_name || "").trim() &&
                  String(existing.unit || "").trim() ===
                    String(row.unit || "").trim() &&
                  parseFloat(existing.allocated_quantity || 0) ===
                    parseFloat(row.allocated_quantity || 0) &&
                  parseFloat(existing.rate || 0) ===
                    parseFloat(row.rate || 0) &&
                  parseFloat(existing.amount_of_farmer_share || 0) ===
                    parseFloat(row.amount_of_farmer_share || 0) &&
                  parseFloat(existing.amount_of_subsidy || 0) ===
                    parseFloat(row.amount_of_subsidy || 0) &&
                  parseFloat(existing.total_amount || 0) ===
                    parseFloat(row.total_amount || 0) &&
                  parseFloat(existing.farmer_selling_rate || 0) ===
                    parseFloat(row.farmer_selling_rate || 0) &&
                  parseFloat(existing.farmer_subsidy_rate || 0) ===
                    parseFloat(row.farmer_subsidy_rate || 0) &&
                  String(existing.anudan_name || "").trim() ===
                    String(row.anudan_name || "").trim() &&
                  String(existing.remark || "").trim() ===
                    String(row.remark || "").trim() &&
                  existing.bill_date === row.bill_date
                );
              });

              if (isDuplicateWithExisting) {
                duplicateIndices.add(row.rowIndex);
                newValidationErrors.push({
                  rowIndex: row.rowIndex,
                  errors: [
                    "यह रिकॉर्ड पहले से सिस्टम में मौजूद है (डुप्लीकेट)",
                  ],
                  data: row,
                });
              }
            });

            // Also check for duplicates within the uploaded rows themselves
            // Compare only fields that are in the template download
            const seenKeys = new Set();
            parsedRows.forEach((row) => {
              const key = `${String(row.center_name || "").trim()}|${String(row.scheme_name || "").trim()}|${String(row.source_of_receipt || "").trim()}|${String(row.investment_name || "").trim()}|${String(row.sub_investment_name || "").trim()}|${String(row.unit || "").trim()}|${parseFloat(row.allocated_quantity || 0)}|${parseFloat(row.rate || 0)}|${parseFloat(row.farmer_selling_rate || 0)}|${parseFloat(row.farmer_subsidy_rate || 0)}|${parseFloat(row.amount_of_farmer_share || 0)}|${parseFloat(row.amount_of_subsidy || 0)}|${parseFloat(row.total_amount || 0)}|${String(row.anudan_name || "").trim()}|${String(row.remark || "").trim()}|${row.bill_date}`;

              if (seenKeys.has(key)) {
                duplicateIndices.add(row.rowIndex);
                // Add error if not already added
                if (
                  !newValidationErrors.some(
                    (err) => err.rowIndex === row.rowIndex,
                  )
                ) {
                  newValidationErrors.push({
                    rowIndex: row.rowIndex,
                    errors: [
                      "इस रिकॉर्ड का डुप्लीकेट उपलब्ध है (एक से अधिक बार)",
                    ],
                    data: row,
                  });
                }
              } else {
                seenKeys.add(key);
              }
            });

            setValidationErrorsList(newValidationErrors);
            setDuplicateRowIndices(Array.from(duplicateIndices));

            const corrections = parsedRows
              .filter(
                (row) =>
                  row.center_name_original &&
                  (row.center_name_invalid || row.center_name_needs_correction),
              )
              .map((row) => ({
                rowIndex: row.rowIndex,
                original: row.center_name_original,
                corrected: row.center_name_suggested || "",
                data: row,
              }));

            if (corrections.length > 0) {
              setCenterNameCorrections(corrections);
              const initialCorrectionValues = {};
              corrections.forEach((correction) => {
                if (correction.corrected) {
                  initialCorrectionValues[correction.rowIndex] = correction.corrected;
                }
              });
              setCenterNameCorrectionValues(initialCorrectionValues);
              setShowCenterNameCorrectionModal(true);
              setPreviewData(parsedRows);
              return;
            }

            if (newValidationErrors.length > 0) {
              setIsValidated(true);
            }
          } catch (dupError) {
            console.error("Error checking duplicates:", dupError);
            // Continue without duplicate check if API fails
            setValidationErrorsList(validationErrors);
            if (validationErrors.length > 0) {
              setIsValidated(true);
            }
          }

          setPreviewData(parsedRows);
          setShowPreviewModal(true);
        } catch (parseError) {
          console.error("Error parsing Excel file:", parseError);
          setApiError(`Excel फाइल पार्सिंग में त्रुटि: ${parseError.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setApiError(`फाइल पढ़ने में त्रुटि: ${error.message}`);
    }
  };

  // Handle confirmed upload from preview
  const handleConfirmUpload = async () => {
    if (previewData.length === 0) return;

    setShowPreviewModal(false);
    setIsUploading(true);
    setApiError(null);
    setApiResponse(null);
    setUploadProgress(0);
    setUploadErrors([]);
    setUploadSuccessCount(0);

    try {
      const validRows = previewData.filter(
        (row) =>
          !validationErrorsList.some((err) => err.rowIndex === row.rowIndex),
      );

      const invalidRows = previewData
        .filter((row) =>
          validationErrorsList.some((err) => err.rowIndex === row.rowIndex),
        )
        .map((row) => ({
          rowIndex: row.rowIndex,
          data: row,
          reason:
            validationErrorsList
              .find((err) => err.rowIndex === row.rowIndex)
              ?.errors.join(", ") || "Validation failed",
        }));

      setUploadTotal(validRows.length);

      let successCount = 0;
      const failedItems = [...invalidRows];

      for (let i = 0; i < validRows.length; i++) {
        try {
          const rowData = validRows[i];
          const { rowIndex, _originalIndex, ...payload } = rowData;

          const response = await axios.post(BILLING_API_URL, payload);

          if (response.status === 200 || response.status === 201) {
            successCount++;
            setAllBillingItems((prev) => [payload, ...prev]);
          } else {
            failedItems.push({
              rowIndex: rowData.rowIndex,
              data: rowData,
              reason: "Upload failed",
            });
          }
        } catch (error) {
          const rowIndex = validRows[i].rowIndex;
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Upload failed";

          failedItems.push({
            rowIndex,
            data: validRows[i],
            reason: errorMsg,
          });
        }

        const progress = Math.round(
          ((i + 1) / Math.max(validRows.length, 1)) * 100,
        );
        setUploadProgress(progress);
      }

      setExcelFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setFailedRows(failedItems);
      setPreviewData([]);

      if (successCount > 0 && failedItems.length === 0) {
        setApiResponse({
          message: `✅ सफलता! ${successCount} रिकॉर्ड सफलतापूर्वक अपलोड किए गए।`,
        });
        fetchBillingItems();
      } else if (successCount > 0 && failedItems.length > 0) {
        setApiError(
          `⚠️ आंशिक अपलोड: ${successCount} सफल, ${failedItems.length} विफल।`,
        );
        fetchBillingItems();
      } else if (failedItems.length > 0) {
        setApiError(`❌ अपलोड विफल: सभी रिकॉर्ड विफल रहे।`);
      }
    } catch (error) {
      console.error("Error during upload:", error);
      setApiError(`अपलोड में त्रुटि: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsValidated(false);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = {
      ...formData,
      [name]: value,
    };

    // Handle "Other" selection - switch to text input mode
    if (value === "Other") {
      setOtherMode((prev) => ({
        ...prev,
        [name]: true,
      }));
      updatedFormData[name] = ""; // Clear the value
    } else {
      // If not "Other", ensure we're in dropdown mode (unless already in other mode)
      if (!otherMode[name]) {
        setOtherMode((prev) => ({
          ...prev,
          [name]: false,
        }));

        // Handle cascading dropdowns only when not in other mode
        if (name === "investment_name" && value) {
          updatedFormData.sub_investment_name = "";
          updatedFormData.unit = "";
          fetchFormFilters(value);
        } else if (
          name === "sub_investment_name" &&
          value &&
          formData.investment_name
        ) {
          // Sub-investment changed
        }

        if (name === "center_name") {
          if (value) {
            fetchVikasKhandData(value);
            updatedFormData.investment_name = "भवन निर्माण";
            updatedFormData.sub_investment_name = "नया भवन";
            updatedFormData.unit = "बैग";
            updatedFormData.allocated_quantity = "100";
            updatedFormData.rate = "450.5";
            updatedFormData.source_of_receipt = "PWD";
            updatedFormData.scheme_name = "MGNREGA";
            updatedFormData.amount_of_farmer_share = "10000";
            updatedFormData.amount_of_subsidy = "20000";
            updatedFormData.total_amount = "30000";
          } else {
            setVikasKhandData(null);
            updatedFormData.vikas_khand_name = "";
            updatedFormData.vidhan_sabha_name = "";
            updatedFormData.investment_name = "";
            updatedFormData.sub_investment_name = "";
            updatedFormData.unit = "";
            updatedFormData.allocated_quantity = "";
            updatedFormData.rate = "";
            updatedFormData.source_of_receipt = "";
            updatedFormData.scheme_name = "";
            updatedFormData.amount_of_farmer_share = "";
            updatedFormData.amount_of_subsidy = "";
            updatedFormData.total_amount = "";
          }
        }
      }
      // If in other mode, just update the value without triggering cascading
    }

    if (name === "amount_of_farmer_share" || name === "amount_of_subsidy") {
      const farmerShare =
        name === "amount_of_farmer_share"
          ? parseFloat(value) || 0
          : parseFloat(formData.amount_of_farmer_share) || 0;
      const subsidy =
        name === "amount_of_subsidy"
          ? parseFloat(value) || 0
          : parseFloat(formData.amount_of_subsidy) || 0;
      updatedFormData.total_amount = (farmerShare + subsidy).toString();
    }

    setFormData(updatedFormData);

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    setApiResponse(null);

    try {
      const payload = {
        center_name: formData.center_name,
        investment_name: formData.investment_name,
        sub_investment_name: formData.sub_investment_name,
        unit: formData.unit,
        allocated_quantity: parseInt(formData.allocated_quantity),
        rate: parseFloat(formData.rate),
        source_of_receipt: formData.source_of_receipt,
        scheme_name: formData.scheme_name,
        vikas_khand_name: formData.vikas_khand_name,
        vidhan_sabha_name: formData.vidhan_sabha_name,
        amount_of_farmer_share: parseFloat(formData.amount_of_farmer_share),
        amount_of_subsidy: parseFloat(formData.amount_of_subsidy),
        total_amount: parseFloat(formData.total_amount),
        farmer_selling_rate: parseFloat(formData.farmer_selling_rate) || 0,
        farmer_subsidy_rate: parseFloat(formData.farmer_subsidy_rate) || 0,
        anudan_name: formData.anudan_name,
        remark: formData.remark,
        bill_date: convertToBackendFormat(formData.bill_date) || "",
      };

      const response = await axios.post(BILLING_API_URL, payload);

      const responseData =
        response.data && response.data.data
          ? response.data.data
          : response.data;
      setApiResponse(responseData);

      setFormData({
        center_name: "",
        investment_name: "",
        sub_investment_name: "",
        unit: "",
        allocated_quantity: "",
        rate: "",
        source_of_receipt: "",
        scheme_name: "",
        vikas_khand_name: "",
        vidhan_sabha_name: "",
        amount_of_farmer_share: "",
        amount_of_subsidy: "",
        total_amount: "",
        farmer_selling_rate: "",
        farmer_subsidy_rate: "",
        anudan_name: "",
        remark: "",
        bill_date: getTodayInDisplayFormat(),
      });

      setVikasKhandData(null);

      setAllBillingItems((prev) => [payload, ...prev]);
    } catch (error) {
      let errorMessage = translations.genericError;
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 400) {
          errorMessage = "डेटा में त्रुटि। कृपया सभी आवश्यक फ़ील्ड भरें।";
        } else if (error.response.status === 500) {
          errorMessage = "सर्वर त्रुटि। कृपया बाद में प्रयास करें।";
        }
      } else if (error.request) {
        errorMessage = "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।";
      }
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.center_name.trim())
      newErrors.center_name = `${translations.centerName} ${translations.required}`;
    if (!formData.investment_name.trim())
      newErrors.investment_name = `${translations.investmentName} ${translations.required}`;
    if (!formData.sub_investment_name.trim())
      newErrors.sub_investment_name = `${translations.subInvestmentName} ${translations.required}`;
    if (!formData.unit.trim())
      newErrors.unit = `${translations.unit} ${translations.required}`;
    if (!formData.allocated_quantity.trim())
      newErrors.allocated_quantity = `${translations.allocatedQuantity} ${translations.required}`;
    if (!formData.rate.trim())
      newErrors.rate = `${translations.rate} ${translations.required}`;
    if (!formData.source_of_receipt.trim())
      newErrors.source_of_receipt = `${translations.sourceOfReceipt} ${translations.required}`;
    if (!formData.scheme_name.trim())
      newErrors.scheme_name = `${translations.schemeName} ${translations.required}`;
    if (!formData.farmer_selling_rate.toString().trim())
      newErrors.farmer_selling_rate = `${translations.farmerSellingRate} ${translations.required}`;
    if (!formData.farmer_subsidy_rate.toString().trim())
      newErrors.farmer_subsidy_rate = `${translations.farmerSubsidyRate} ${translations.required}`;
    if (!formData.amount_of_farmer_share.toString().trim())
      newErrors.amount_of_farmer_share = `${translations.amountOfFarmerShare} ${translations.required}`;
    if (!formData.amount_of_subsidy.toString().trim())
      newErrors.amount_of_subsidy = `${translations.amountOfSubsidy} ${translations.required}`;
    if (!formData.total_amount.toString().trim())
      newErrors.total_amount = `${translations.totalAmount} ${translations.required}`;
    if (!formData.anudan_name.trim())
      newErrors.anudan_name = `${translations.anudanName} ${translations.required}`;
    if (!formData.remark.trim())
      newErrors.remark = `${translations.remark} ${translations.required}`;
    if (!formData.bill_date.trim())
      newErrors.bill_date = `${translations.billDate} ${translations.required}`;
    if (!formData.vikas_khand_name.trim())
      newErrors.vikas_khand_name = `${translations.vikasKhandName} ${translations.required}`;
    if (!formData.vidhan_sabha_name.trim())
      newErrors.vidhan_sabha_name = `${translations.vidhanSabhaName} ${translations.required}`;
    return newErrors;
  };

  return (
    <div>
      <Container fluid className="p-4 ">
        <Row>
          <Col lg={12} md={12} sm={12}>
            <DashBoardHeader />
          </Col>
        </Row>

        <Row className="left-top">
          <Col lg={12} md={12} sm={10}>
            <Container fluid className="dashboard-body-main bg-home">
              <h1 className="page-title">{translations.pageTitle}</h1>

              {/* Progress Bar Section - Displayed at top during upload */}
              {isUploading && uploadTotal > 0 && (
                <Row className="mb-4">
                  <Col xs={12}>
                    <div className="p-3 border rounded bg-light">
                      <div className="mb-3">
                        <h6 className="small-fonts mb-3">
                          📊 अपलोड प्रगति विवरण
                        </h6>
                        <div className="d-flex justify-content-around mb-3">
                          <div className="text-center">
                            <small className="text-dark fw-bold d-block mb-2">
                              ✅ पूर्ण
                            </small>
                            <span
                              className="badge bg-success"
                              style={{ fontSize: "14px", padding: "8px 12px" }}
                            >
                              {Math.round((uploadProgress / 100) * uploadTotal)}
                            </span>
                          </div>
                          <div className="text-center">
                            <small className="text-dark fw-bold d-block mb-2">
                              ⏳ शेष
                            </small>
                            <span
                              className="badge bg-warning text-dark"
                              style={{ fontSize: "14px", padding: "8px 12px" }}
                            >
                              {uploadTotal -
                                Math.round(
                                  (uploadProgress / 100) * uploadTotal,
                                )}
                            </span>
                          </div>
                          <div className="text-center">
                            <small className="text-dark fw-bold d-block mb-2">
                              📁 कुल
                            </small>
                            <span
                              className="badge bg-primary"
                              style={{ fontSize: "14px", padding: "8px 12px" }}
                            >
                              {uploadTotal}
                            </span>
                          </div>
                          <div className="text-center">
                            <small className="text-dark fw-bold d-block mb-2">
                              ⚡ प्रगति
                            </small>
                            <span
                              className="badge bg-info text-white"
                              style={{ fontSize: "14px", padding: "8px 12px" }}
                            >
                              {uploadProgress}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "30px" }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                          role="progressbar"
                          style={{ width: `${uploadProgress}%` }}
                          aria-valuenow={uploadProgress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <small className="fw-bold text-white">
                            {uploadProgress}%
                          </small>
                        </div>
                      </div>
                      <small className="text-muted mt-2 d-block text-center">
                        {uploadProgress > 0 && uploadProgress < 100
                          ? `${Math.round((uploadProgress / 100) * uploadTotal)}/${uploadTotal} रिकॉर्ड अपलोड किए जा रहे हैं...`
                          : "तैयारी..."}
                      </small>
                    </div>
                  </Col>
                </Row>
              )}

              {/* Bulk Upload Section */}
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <Form.Group controlId="excelFile">
                    <Form.Label className="small-fonts fw-bold">
                      {translations.bulkUpload}
                    </Form.Label>
                    <Form.Control
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="compact-input"
                      ref={fileInputRef}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={3} className="d-flex align-items-end">
                  <div className="w-100">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        previewData.length > 0 &&
                        !isUploading &&
                        handleConfirmUpload()
                      }
                      disabled={!excelFile || isUploading}
                      className="compact-submit-btn w-100"
                    >
                      {isUploading
                        ? `अपलोड हो रहा है... ${uploadProgress}%`
                        : previewData.length > 0
                          ? `${previewData.length} रिकॉर्ड अपलोड करें`
                          : translations.uploadButton}
                    </Button>
                  </div>
                </Col>
                <Col xs={12} md={3} className="d-flex align-items-end">
                  <Button
                    variant="info"
                    onClick={downloadSampleTemplate}
                    disabled={isUploading}
                    className="compact-submit-btn w-100"
                  >
                    डाउनलोड टेम्पलेट
                  </Button>
                </Col>
              </Row>

              {apiResponse && (
                <Alert variant="success" className="small-fonts">
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {apiResponse.message}
                  </div>
                </Alert>
              )}
              {apiError && (
                <Alert variant="danger" className="small-fonts">
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      maxHeight: "300px",
                      overflowY: "auto",
                    }}
                  >
                    {apiError}
                  </div>
                </Alert>
              )}
              {uploadErrors.length > 0 && !isUploading && (
                <Alert variant="warning" className="small-fonts">
                  <strong>
                    📋 विस्तृत त्रुटि लॉग ({uploadErrors.length} समस्याएं):
                  </strong>
                  <div
                    style={{
                      maxHeight: "400px",
                      overflowY: "auto",
                      marginTop: "10px",
                    }}
                  >
                    {uploadErrors.map((error, idx) => (
                      <div
                        key={idx}
                        style={{ marginBottom: "5px", fontSize: "12px" }}
                      >
                        • {error}
                      </div>
                    ))}
                  </div>
                </Alert>
              )}

              {/* Excel Upload Instructions */}
              <Alert variant="info" className="small-fonts mb-3">
                <strong>Excel अपलोड निर्देश:</strong>
                <ul className="mb-0">
                  <li>कृपया सही फॉर्मेट में Excel फाइल अपलोड करें</li>
                  <li>
                    <strong>अनिवार्य फ़ील्ड:</strong> केंद्र का नाम, क्रय योजना का नाम, सप्लायर,
                    मद का नाम, उप-मद का नाम, इकाई, आवंटित मात्रा , क्रय दर (प्रति इकाई),
                    कृषक विक्रय दर (प्रति इकाई), कृषक अनुदान दर (प्रति इकाई), कृषक अंश,
                    अनुदान राशि, कुल राशि, अनुदान वहन योजना, रिमार्क, पंजीकरण तिथि
                  </li>
                  <li>
                    <strong>स्वचालित:</strong> विकास खंड और विधानसभा स्वचालित
                    रूप से बैकएंड से सेट किए जाते हैं (Excel में शामिल न करें)
                  </li>
                  <li>
                    आवंटित मात्रा , क्रय दर, कृषक विक्रय दर, कृषक अनुदान दर, कृषक अंश,
                    अनुदान राशि और कुल राशि संख्यात्मक होनी चाहिए
                  </li>
                  <li>डाउनलोड टेम्पलेट बटन का उपयोग करें सही फॉर्मेट के लिए</li>
                </ul>
              </Alert>

              {/* Center Selection - Always visible */}
              <Form.Group className="mb-3" controlId="center_selection">
                <Form.Label className="small-fonts fw-bold">
                  {translations.centerName}
                </Form.Label>
                <Form.Select
                  name="center_name"
                  value={formData.center_name}
                  onChange={handleChange}
                  isInvalid={!!errors.center_name}
                  className="compact-input"
                >
                  <option value="">{translations.selectOption}</option>
                  {centerOptions.map((center, index) => (
                    <option key={index} value={center}>
                      {center}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.center_name}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Billing Form Section - Only show when center is selected */}
              {formData.center_name && (
                <Form
                  onSubmit={handleSubmit}
                  className="registration-form compact-form"
                >
                  <Row>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="investment_name">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.investmentName}
                        </Form.Label>
                        {otherMode.investment_name ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="investment_name"
                              value={formData.investment_name}
                              onChange={handleChange}
                              isInvalid={!!errors.investment_name}
                              className="compact-input"
                              placeholder="निवेश का नाम दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  investment_name: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  investment_name: "",
                                }));
                                // Refetch options
                                fetchFormFilters("", "");
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="investment_name"
                            value={formData.investment_name}
                            onChange={handleChange}
                            isInvalid={!!errors.investment_name}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.investment_name.map((inv, index) => (
                              <option key={index} value={inv}>
                                {inv}
                              </option>
                            ))}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.investment_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="sub_investment_name"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.subInvestmentName}
                        </Form.Label>
                        {otherMode.sub_investment_name ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="sub_investment_name"
                              value={formData.sub_investment_name}
                              onChange={handleChange}
                              isInvalid={!!errors.sub_investment_name}
                              className="compact-input"
                              placeholder="उप-निवेश का नाम दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  sub_investment_name: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  sub_investment_name: "",
                                }));
                                // Refetch options
                                fetchFormFilters(formData.investment_name, "");
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="sub_investment_name"
                            value={formData.sub_investment_name}
                            onChange={handleChange}
                            isInvalid={!!errors.sub_investment_name}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.sub_investment_name.map(
                              (subInv, index) => (
                                <option key={index} value={subInv}>
                                  {subInv}
                                </option>
                              ),
                            )}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.sub_investment_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="unit">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.unit}
                        </Form.Label>
                        {otherMode.unit ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="unit"
                              value={formData.unit}
                              onChange={handleChange}
                              isInvalid={!!errors.unit}
                              className="compact-input"
                              placeholder="इकाई दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  unit: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  unit: "",
                                }));
                                // Refetch options
                                fetchFormFilters(
                                  formData.investment_name,
                                  formData.sub_investment_name,
                                );
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            isInvalid={!!errors.unit}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.unit.map((unit, index) => (
                              <option key={index} value={unit}>
                                {unit}
                              </option>
                            ))}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.unit}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="allocated_quantity"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.allocatedQuantity}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="allocated_quantity"
                          value={formData.allocated_quantity}
                          onChange={handleChange}
                          isInvalid={!!errors.allocated_quantity}
                          className="compact-input"
                          placeholder="आवंटित मात्रा  दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.allocated_quantity}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="rate">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.rate}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="rate"
                          value={formData.rate}
                          onChange={handleChange}
                          isInvalid={!!errors.rate}
                          className="compact-input"
                          placeholder="दर दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.rate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="farmer_selling_rate"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.farmerSellingRate}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          name="farmer_selling_rate"
                          value={formData.farmer_selling_rate}
                          onChange={handleChange}
                          isInvalid={!!errors.farmer_selling_rate}
                          className="compact-input"
                          placeholder="कृषक विक्रय दर दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.farmer_selling_rate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="farmer_subsidy_rate"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.farmerSubsidyRate}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          name="farmer_subsidy_rate"
                          value={formData.farmer_subsidy_rate}
                          onChange={handleChange}
                          isInvalid={!!errors.farmer_subsidy_rate}
                          className="compact-input"
                          placeholder="कृषक अनुदान दर दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.farmer_subsidy_rate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="source_of_receipt"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.sourceOfReceipt}
                        </Form.Label>
                        {otherMode.source_of_receipt ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="source_of_receipt"
                              value={formData.source_of_receipt}
                              onChange={handleChange}
                              isInvalid={!!errors.source_of_receipt}
                              className="compact-input"
                              placeholder="सप्लायर दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  source_of_receipt: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  source_of_receipt: "",
                                }));
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="source_of_receipt"
                            value={formData.source_of_receipt}
                            onChange={handleChange}
                            isInvalid={!!errors.source_of_receipt}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {[
                              ...new Set([
                                ...filterOptions.source_of_receipt,
                                ...sourceOptions,
                              ]),
                            ].map((source, index) => (
                              <option key={index} value={source}>
                                {source}
                              </option>
                            ))}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.source_of_receipt}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="scheme_name">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.schemeName}
                        </Form.Label>
                        {otherMode.scheme_name ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="scheme_name"
                              value={formData.scheme_name}
                              onChange={handleChange}
                              isInvalid={!!errors.scheme_name}
                              className="compact-input"
                              placeholder="योजना का नाम दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  scheme_name: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  scheme_name: "",
                                }));
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="scheme_name"
                            value={formData.scheme_name}
                            onChange={handleChange}
                            isInvalid={!!errors.scheme_name}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {[
                              ...new Set([
                                ...filterOptions.scheme_name,
                                ...schemeOptions,
                              ]),
                            ].map((scheme, index) => (
                              <option key={index} value={scheme}>
                                {scheme}
                              </option>
                            ))}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.scheme_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="vikas_khand_name">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.vikasKhandName}
                        </Form.Label>
                        {isFormFieldsEditMode ? (
                          <Form.Select
                            name="vikas_khand_name"
                            value={tempFormFields.vikas_khand_name}
                            onChange={handleFormFieldsEditChange}
                            className="compact-input"
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.vikas_khand_name.map(
                              (vikasKhand, index) => (
                                <option key={index} value={vikasKhand}>
                                  {vikasKhand}
                                </option>
                              ),
                            )}
                          </Form.Select>
                        ) : (
                          <Form.Control
                            type="text"
                            name="vikas_khand_name"
                            value={formData.vikas_khand_name}
                            onChange={handleChange}
                            isInvalid={!!errors.vikas_khand_name}
                            className="compact-input"
                            disabled
                            placeholder={
                              isFetchingVikasKhand ? "लोड हो रहा है..." : ""
                            }
                          />
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.vikas_khand_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="vidhan_sabha_name"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.vidhanSabhaName}
                        </Form.Label>
                        {isFormFieldsEditMode ? (
                          <Form.Select
                            name="vidhan_sabha_name"
                            value={tempFormFields.vidhan_sabha_name}
                            onChange={handleFormFieldsEditChange}
                            className="compact-input"
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.vidhan_sabha_name.map(
                              (vidhanSabha, index) => (
                                <option key={index} value={vidhanSabha}>
                                  {vidhanSabha}
                                </option>
                              ),
                            )}
                          </Form.Select>
                        ) : (
                          <Form.Control
                            type="text"
                            name="vidhan_sabha_name"
                            value={formData.vidhan_sabha_name}
                            onChange={handleChange}
                            isInvalid={!!errors.vidhan_sabha_name}
                            className="compact-input"
                            disabled
                            placeholder={
                              isFetchingVikasKhand ? "लोड हो रहा है..." : ""
                            }
                          />
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.vidhan_sabha_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2 ">
                        <Form.Label className="small-fonts fw-bold ">
                          {/* Placeholder for alignment */}
                        </Form.Label>
                        {isFormFieldsEditMode ? (
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={handleFormFieldsSaveEdit}
                              className="w-100"
                              title="परिवर्तन सहेजें"
                            >
                              सहेजें
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={handleFormFieldsCancelEdit}
                              className="w-100"
                              title="रद्द करें"
                            >
                              रद्द करें
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleFormFieldsEditStart}
                            className="w-100 d-flex justify-content-center mt-2"
                            disabled={!formData.center_name}
                            title="विधान साभा विकास खंड संपादित करें"
                          >
                            विधान साभा विकास खंड संपादित करें
                          </Button>
                        )}
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="amount_of_farmer_share"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.amountOfFarmerShare}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="amount_of_farmer_share"
                          value={formData.amount_of_farmer_share}
                          onChange={handleChange}
                          isInvalid={!!errors.amount_of_farmer_share}
                          className="compact-input"
                          placeholder="कृषक अंश दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.amount_of_farmer_share}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="amount_of_subsidy"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.amountOfSubsidy}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="amount_of_subsidy"
                          value={formData.amount_of_subsidy}
                          onChange={handleChange}
                          isInvalid={!!errors.amount_of_subsidy}
                          className="compact-input"
                          placeholder="अनुदान राशि दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.amount_of_subsidy}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="total_amount">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.totalAmount}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="total_amount"
                          value={formData.total_amount}
                          onChange={handleChange}
                          isInvalid={!!errors.total_amount}
                          className="compact-input"
                          placeholder="कुल राशि दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.total_amount}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="anudan_name">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.anudanName}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="anudan_name"
                          value={formData.anudan_name}
                          onChange={handleChange}
                          isInvalid={!!errors.anudan_name}
                          className="compact-input"
                          placeholder="अनुदान वहन योजना दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.anudan_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="remark">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.remark}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="remark"
                          value={formData.remark}
                          onChange={handleChange}
                          isInvalid={!!errors.remark}
                          className="compact-input"
                          placeholder="रिमार्क दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.remark}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="bill_date">
                        <Form.Label className="small-fonts fw-bold">
                          {billingTableColumnMapping.bill_date.header}
                        </Form.Label>
                        <Form.Control
                          type="date"
                          name="bill_date"
                          value={formData.bill_date}
                          onChange={handleChange}
                          isInvalid={!!errors.bill_date}
                          className="compact-input"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.bill_date}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col
                      xs={12}
                      sm={6}
                      md={4}
                      className="d-flex align-items-center"
                    >
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting}
                        className="compact-submit-btn w-100"
                      >
                        {isSubmitting
                          ? translations.submitting
                          : translations.submitButton}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              )}
              {/* Table Section */}
              <div className="billing-table-section mt-4">
                <div className="pdf-button-section">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                      {billingItems.length > 0 && (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="tooltip-refresh">रीफ्रेश करें</Tooltip>
                          }
                        >
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="me-2"
                          >
                            <FaSync
                              className={`me-1 ${isLoading ? "fa-spin" : ""}`}
                            />
                            रीफ्रेश
                          </Button>
                        </OverlayTrigger>
                      )}
                      {filteredItems.length > 0 && (
                        <>
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id="tooltip-excel">
                                Excel डाउनलोड करें
                              </Tooltip>
                            }
                          >
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() =>
                                downloadExcel(
                                  filteredItems,
                                  `Billing_Items_${new Date()
                                    .toISOString()
                                    .slice(0, 10)}`,
                                  billingTableColumnMapping,
                                  selectedColumns,
                                )
                              }
                              className="me-2"
                            >
                              <FaFileExcel className="me-1" />
                              Excel
                            </Button>
                          </OverlayTrigger>
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id="tooltip-pdf">
                                PDF डाउनलोड करें
                              </Tooltip>
                            }
                          >
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() =>
                                downloadPdf(
                                  filteredItems,
                                  `Billing_Items_${new Date()
                                    .toISOString()
                                    .slice(0, 10)}`,
                                  billingTableColumnMapping,
                                  selectedColumns,
                                  "बिलिंग आइटम डेटा",
                                )
                              }
                            >
                              <FaFilePdf className="me-1" />
                              PDF
                            </Button>
                          </OverlayTrigger>
                        </>
                      )}
                      {selectedItems.length > 0 && (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id="tooltip-delete">
                              {selectedItems.length} चयनित रिकॉर्ड हटाएं
                            </Tooltip>
                          }
                        >
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={handleDeleteSelected}
                            disabled={isLoading}
                            className="ms-2"
                          >
                            <RiDeleteBinLine className="me-1" />
                            हटाएं ({selectedItems.length})
                          </Button>
                        </OverlayTrigger>
                      )}
                    </div>
                  </div>
                </div>
                {/* Table info with pagination details */}
                {filteredItems.length > 0 && (
                  <div className="table-info mb-2 d-flex justify-content-between align-items-center">
                    <span className="small-fonts">
                      {translations.showing}{" "}
                      {(currentPage - 1) * itemsPerPage + 1} {translations.to}{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredItems.length,
                      )}{" "}
                      {translations.of} {filteredItems.length}{" "}
                      {translations.entries}
                    </span>
                    <div className="d-flex align-items-center">
                      <span className="small-fonts me-2">
                        {translations.itemsPerPage}
                      </span>
                      <span className="badge bg-primary">{itemsPerPage}</span>
                    </div>
                  </div>
                )}

                {/* Column Selection Section */}
                {billingItems.length > 0 && (
                  <ColumnSelection
                    columns={billingTableColumns}
                    selectedColumns={selectedColumns}
                    setSelectedColumns={setSelectedColumns}
                    title="कॉलम चुनें"
                  />
                )}

                {/* New Created At Date Filter Section - Separate from date range filters */}
                {billingItems.length > 0 && (
                  <div className="created-at-filter-section mb-3 p-3 border rounded bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="small-fonts mb-0">
                        तिथि से फ़िल्टर करें (created_at)
                      </h6>
                    </div>
                    <Row>
                      <Col xs={12} md={4}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            तिथि से चुनें
                          </Form.Label>
                          <Form.Select
                            value={createdAtFilter.selectedDate}
                            onChange={(e) =>
                              handleCreatedAtDateSelect(e.target.value)
                            }
                            className="compact-input"
                            disabled={createdAtFilter.showManualPicker}
                          >
                            <option value="">-- तिथि चुनें --</option>
                            {uniqueCreatedAtDates.map((date) => (
                              <option key={date} value={date}>
                                {new Date(date).toLocaleDateString("hi-IN")}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col xs={12} md={4}>
                        <Form.Group className="mb-2 d-flex align-items-end">
                          <Button
                            variant={
                              createdAtFilter.showManualPicker
                                ? "primary"
                                : "outline-secondary"
                            }
                            size="sm"
                            onClick={toggleManualDatePicker}
                            className="mb-2"
                          >
                            {createdAtFilter.showManualPicker
                              ? "मैन्युअल तिथि छुपाएं"
                              : "मैन्युअल तिथि"}
                          </Button>
                        </Form.Group>
                      </Col>
                      {createdAtFilter.showManualPicker && (
                        <Col xs={12} md={4}>
                          <Form.Group className="mb-2">
                            <Form.Label className="small-fonts fw-bold">
                              कैलेंडर से तिथि चुनें
                            </Form.Label>
                            <Form.Control
                              type="date"
                              value={createdAtFilter.manualDate}
                              onChange={(e) =>
                                handleCreatedAtManualDateChange(e.target.value)
                              }
                              className="compact-input"
                            />
                          </Form.Group>
                        </Col>
                      )}
                    </Row>
                    {/* Show selected filter info */}
                    {(createdAtFilter.selectedDate ||
                      createdAtFilter.manualDate) && (
                      <div className="mt-2">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() =>
                            setCreatedAtFilter({
                              selectedDate: "",
                              manualDate: "",
                              showManualPicker: false,
                            })
                          }
                        >
                          तिथि फ़िल्टर साफ़ करें
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-Filter Section */}
                {true && (
                  <div className="filter-section mb-3 p-3 border rounded bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="small-fonts mb-0">फिल्टर</h6>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={clearFilters}
                      >
                        सभी फिल्टर हटाएं
                      </Button>
                    </div>
                    <Row>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.centerName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="center_name"
                            value={filters.center_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                center_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.center_name.map(
                              (option) => ({
                                value: option,
                                label: option,
                              }),
                            )}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.investmentName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="investment_name"
                            value={filters.investment_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                investment_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.investment_name.map(
                              (option) => ({ value: option, label: option }),
                            )}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.subInvestmentName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="sub_investment_name"
                            value={filters.sub_investment_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                sub_investment_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.sub_investment_name.map(
                              (option) => ({ value: option, label: option }),
                            )}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.sourceOfReceipt}
                          </Form.Label>
                          <Select
                            isMulti
                            name="source_of_receipt"
                            value={filters.source_of_receipt.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                source_of_receipt: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={[
                              ...new Set([
                                ...filterOptions.source_of_receipt,
                                ...sourceOptions,
                              ]),
                            ].map((option) => ({
                              value: option,
                              label: option,
                            }))}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.schemeName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="scheme_name"
                            value={filters.scheme_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                scheme_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={[
                              ...new Set([
                                ...filterOptions.scheme_name,
                                ...schemeOptions,
                              ]),
                            ].map((option) => ({
                              value: option,
                              label: option,
                            }))}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.vikasKhandName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="vikas_khand_name"
                            value={filters.vikas_khand_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                vikas_khand_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.vikas_khand_name.map(
                              (option) => ({ value: option, label: option }),
                            )}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.vidhanSabhaName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="vidhan_sabha_name"
                            value={filters.vidhan_sabha_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                vidhan_sabha_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.vidhan_sabha_name.map(
                              (option) => ({ value: option, label: option }),
                            )}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                      {/* Added date range filters */}
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.startDate}
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="start_date"
                            value={filters.start_date}
                            onChange={handleFilterChange}
                            className="compact-input"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.endDate}
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="end_date"
                            value={filters.end_date}
                            onChange={handleFilterChange}
                            className="compact-input"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}

                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">लोड हो रहा है...</span>
                    </div>
                    <p className="mt-2 small-fonts">डेटा लोड हो रहा है...</p>
                  </div>
                ) : billingItems.length === 0 ? (
                  <Alert variant="info" className="text-center">
                    कोई बिलिंग आइटम डेटा उपलब्ध नहीं है।
                  </Alert>
                ) : (
                  <>
                    <Table striped bordered hover className="registration-form">
                      <thead className="table-light">
                        <tr>
                          <th>
                            <Form.Check
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={
                                filteredItems
                                  .slice(
                                    (currentPage - 1) * itemsPerPage,
                                    currentPage * itemsPerPage,
                                  )
                                  .every((item) =>
                                    selectedItems.includes(item.bill_id),
                                  ) &&
                                filteredItems.slice(
                                  (currentPage - 1) * itemsPerPage,
                                  currentPage * itemsPerPage,
                                ).length > 0
                              }
                            />
                          </th>
                          <th>क्र.सं.</th>
                          {selectedColumns.map((col) => (
                            <th key={col} style={{ whiteSpace: "pre-line" }}>
                              {billingTableColumnMapping[col]?.header}
                            </th>
                          ))}
                          <th>कार्रवाई</th>
                        </tr>
                      </thead>
                      <tbody className="tbl-body">
                        {filteredItems
                          .slice(
                            (currentPage - 1) * itemsPerPage,
                            currentPage * itemsPerPage,
                          )
                          .map((item, index) => (
                            <tr key={item.id || index}>
                              <td>
                                <Form.Check
                                  type="checkbox"
                                  checked={selectedItems.includes(item.bill_id)}
                                  onChange={() =>
                                    handleCheckboxChange(item.bill_id)
                                  }
                                />
                              </td>
                              <td>
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </td>
                              {selectedColumns.map((col) => (
                                <td key={col} style={{ whiteSpace: "pre-line" }}>
                                  {renderTableCell(item, col)}
                                </td>
                              ))}
                              <td>
                                {editingRowId === item.id ? (
                                  <div className="d-flex gap-1">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleSave(item)}
                                    >
                                      सहेजें
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={handleCancel}
                                    >
                                      रद्द करें
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="d-flex gap-1">
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={<Tooltip>संपादित करें</Tooltip>}
                                    >
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleEdit(item)}
                                      >
                                        <RiEyeLine />
                                      </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={<Tooltip>हटाएं</Tooltip>}
                                    >
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDelete(item)}
                                      >
                                        <RiDeleteBinLine />
                                      </Button>
                                    </OverlayTrigger>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td></td>
                          <td><strong>कुल</strong></td>
                          {selectedColumns.map((col) => (
                            <td key={col}>
                              <strong>{getColumnTotal(filteredItems, col)}</strong>
                            </td>
                          ))}
                          <td></td>
                        </tr>
                      </tfoot>
                    </Table>

                    {/* Pagination controls */}
                    {filteredItems.length > itemsPerPage && (
                      <div className="mt-3">
                        <div className="small-fonts mb-3 text-center">
                          {translations.page} {currentPage} {translations.of}{" "}
                          {totalPages}
                        </div>
                        <Pagination className="d-flex justify-content-center">
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
                )}
              </div>
            </Container>
          </Col>
        </Row>

        {/* Preview Modal */}
        <Modal
          show={showPreviewModal}
          onHide={() => setShowPreviewModal(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              डेटा पूर्वावलोकन ({previewData.length} रिकॉर्ड)
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {previewData.length === 0 ? (
              <Alert variant="warning">कोई मान्य डेटा नहीं मिला</Alert>
            ) : (
              <>
                <Alert variant="info" className="small-fonts">
                  <strong>निर्देश:</strong> नीचे डेटा की जांच करें। यदि सभी डेटा
                  सही है तो "अपलोड करें" बटन पर क्लिक करें। खाली पंक्तियाँ
                  स्वचालित रूप से छोड़ दी जाएंगी।
                </Alert>
                <Table striped bordered hover size="sm" className="small-fonts">
                  <thead>
                    <tr>
                      <th>क्र.सं.</th>
                      {billingTableColumns.map((col) => (
                        <th key={col.key} style={{ whiteSpace: "pre-line" }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 100).map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: duplicateRowIndices.includes(row.rowIndex)
                            ? "#ffcccc"
                            : "inherit",
                        }}
                      >
                        <td>{idx + 1}</td>
                        {billingTableColumns.map((col) => (
                          <td key={col.key} style={{ whiteSpace: "pre-line" }}>
                            {col.key === "bill_date"
                              ? row.original_bill_date || "-"
                              : billingTableColumnMapping[col.key]?.accessor(row, idx) || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {previewData.length > 100 && (
                  <Alert variant="secondary" className="small-fonts">
                    ... और {previewData.length - 100} रिकॉर्ड
                  </Alert>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="d-flex flex-column">
            {validationErrorsList.length > 0 && (
              <div className="w-100 mb-3">
                <Alert variant="warning" className="small-fonts mb-0">
                  <strong>
                    ⚠️ {validationErrorsList.length} पंक्तियों में त्रुटि:
                  </strong>
                  {validationErrorsList.some((err) => err.invalidCenterName) && (
                    <div className="mt-2">
                      <strong className="text-danger">
                        अमान्य केन्द्र नाम ({validationErrorsList.filter((err) => err.invalidCenterName).length}):
                      </strong>
                      <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                        {validationErrorsList
                          .filter((err) => err.invalidCenterName)
                          .map((err) => (
                            <div key={err.rowIndex} className="mt-1 text-danger">
                              पंक्ति {err.rowIndex - 1}: “{err.data?.center_name_original || err.data?.center_name || "-"}”
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                    {validationErrorsList.slice(0, 10).map((err, errIdx) => (
                      <div key={errIdx} className="mt-1">
                        <span className="badge bg-danger me-1">
                          पंक्ति {err.rowIndex - 1}
                        </span>
                        {err.errors.map((e, i) => (
                          <span key={i} className="d-block text-danger">
                            {e}
                          </span>
                        ))}
                      </div>
                    ))}
                    {validationErrorsList.length > 10 && (
                      <div className="text-muted">
                        ... और {validationErrorsList.length - 10} और त्रुटियां
                      </div>
                    )}
                  </div>
                </Alert>
                {duplicateRowIndices.length > 0 && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const duplicates = previewData.filter((row) =>
                        duplicateRowIndices.includes(row.rowIndex),
                      );
                      setAllDuplicateEntries(duplicates);
                      setShowAllDuplicatesModal(true);
                    }}
                  >
                    सभी डुप्लीकेट देखें ({duplicateRowIndices.length})
                  </Button>
                )}
              </div>
            )}
            <div className="d-flex justify-content-between w-100">
              <Button
                variant="secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                रद्द करें
              </Button>
              {(() => {
                const validCount = previewData.filter(
                  (row) =>
                    !validationErrorsList.some(
                      (err) => err.rowIndex === row.rowIndex,
                    ),
                ).length;
                return (
                  <Button
                    variant="primary"
                    onClick={handleConfirmUpload}
                    disabled={
                      validCount === 0 ||
                      validationErrorsList.some((err) => err.invalidCenterName)
                    }
                  >
                    {validCount > 0
                      ? `${validCount} रिकॉर्ड अपलोड करें`
                      : "कोई मान्य रिकॉर्ड नहीं"}
                  </Button>
                );
              })()}
            </div>
          </Modal.Footer>
        </Modal>

        {/* All Duplicates Modal */}
        <Modal
          show={showAllDuplicatesModal}
          onHide={() => setShowAllDuplicatesModal(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              सभी डुप्लीकेट रिकॉर्ड ({allDuplicateEntries.length})
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {allDuplicateEntries.length === 0 ? (
              <Alert variant="warning">कोई डुप्लीकेट रिकॉर्ड नहीं मिला</Alert>
            ) : (
              <Table striped bordered hover size="sm" className="small-fonts">
                <thead>
                  <tr>
                    <th>क्र.सं. (Excel)</th>
                    {billingTableColumns.map((col) => (
                      <th key={col.key} style={{ whiteSpace: "pre-line" }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allDuplicateEntries.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: "#ffcccc" }}>
                      <td>{row.rowIndex - 1}</td>
                      {billingTableColumns.map((col) => (
                        <td key={col.key} style={{ whiteSpace: "pre-line" }}>
                          {col.key === "bill_date"
                            ? row.original_bill_date || "-"
                            : billingTableColumnMapping[col.key]?.accessor(row, idx) || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowAllDuplicatesModal(false)}
            >
              बंद करें
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Failed Rows Display after Upload */}
        {failedRows.length > 0 && !isUploading && (
          <Alert variant="danger" className="small-fonts">
            <strong>📋 विफल रिकॉर्ड ({failedRows.length}):</strong>
            <Table striped bordered hover size="sm" className="mt-2">
              <thead>
                <tr>
                  <th>क्र.सं.</th>
                  {billingTableColumns.map((col) => (
                    <th key={col.key} style={{ whiteSpace: "pre-line" }}>
                      {col.label}
                    </th>
                  ))}
                  <th>त्रुटि</th>
                </tr>
              </thead>
              <tbody>
                {failedRows.slice(0, 20).map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    {billingTableColumns.map((col) => (
                      <td key={col.key} style={{ whiteSpace: "pre-line" }}>
                        {col.key === "bill_date"
                          ? row.data?.original_bill_date || "-"
                          : billingTableColumnMapping[col.key]?.accessor(row.data || {}, idx) || "-"}
                      </td>
                    ))}
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {failedRows.length > 20 && (
              <div className="text-muted mt-2">
                ... और {failedRows.length - 20} और विफल रिकॉर्ड
              </div>
            )}
          </Alert>
        )}
      </Container>

      {/* Center Name Correction Modal */}
      <Modal
        show={showCenterNameCorrectionModal}
        onHide={() => setShowCenterNameCorrectionModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            केंद्र नाम सुधार ({centerNameCorrections.length} रिकॉर्ड)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Alert variant="warning" className="small-fonts">
            <strong>सिस्टम द्वारा सुझाया गया सही नाम पहले से चुना गया है; यदि चाहें तो इसे ड्रॉपडाउन से बदल सकते हैं:</strong>
            <br />
            इनमें से कोई भी नाम सही नहीं होने पर अपलोड नहीं होगा।
          </Alert>
          <Table striped bordered hover size="sm" className="small-fonts">
            <thead>
              <tr>
                <th>क्र.सं. (Excel)</th>
                <th>मूल केंद्र नाम</th>
                <th>सुझावित/चयनित नाम</th>
              </tr>
            </thead>
            <tbody>
              {centerNameCorrections.map((correction, idx) => (
                <tr key={idx}>
                  <td>{correction.rowIndex}</td>
                  <td style={{ color: "red" }}>{correction.original}</td>
                  <td>
                    <Form.Select
                      value={
                        centerNameCorrectionValues[correction.rowIndex] ?? correction.corrected ?? ""
                      }
                      onChange={(e) => {
                        setCenterNameCorrectionValues((prev) => ({
                          ...prev,
                          [correction.rowIndex]: e.target.value,
                        }));
                      }}
                    >
                      <option value="">सुझावित/नया नाम चुनें</option>
                      {validKendraNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              const correctedRows = applyCenterNameCorrections(
                previewData,
                centerNameCorrections,
                centerNameCorrectionValues,
              );
              const correctedRowIndices = new Set(
                centerNameCorrections.map((correction) => correction.rowIndex),
              );
              const updatedValidationErrorsList = validationErrorsList.filter(
                (error) => {
                  if (!correctedRowIndices.has(error.rowIndex)) return true;
                  const correctedRow = correctedRows.find(
                    (row) => row.rowIndex === error.rowIndex,
                  );
                  if (!correctedRow) return true;
                  const rowErrors = validateRow(correctedRow, correctedRow.rowIndex);
                  return rowErrors.length > 0;
                },
              );
              setValidationErrorsList(updatedValidationErrorsList);
              setPreviewData(correctedRows);
              setShowCenterNameCorrectionModal(false);
              setShowPreviewModal(true);
            }}
          >
            सुझाए गए या चुने गए नाम से बदलें
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowCenterNameCorrectionModal(false);
              setShowPreviewModal(true);
            }}
          >
            बाद में ठीक करूंगा
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Registration;
