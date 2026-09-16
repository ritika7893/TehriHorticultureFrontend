import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { FaFileExcel, FaFilePdf, FaSync } from "react-icons/fa";
import { RiDeleteBinLine } from "react-icons/ri";
import axios from "axios";
import * as XLSX from "xlsx";

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
const BENEFICIARIES_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/beneficiaries-registration/";
const VIKAS_KHAND_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/get-vikas-khand-by-center/";
const FORM_FILTERS_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/beneficiaries-registration/";

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

// Updated center options with exact names from your list
const centerOptions = [
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
const staticCategoryOptions = [
  "सामान्य",
  "अनुसूचित जाति",
  "अनुसूचित जनजाति",
  "अन्य पिछड़ा वर्ग",
];

const staticUnitOptions = ["नग", "किलोग्राम", "लीटर", "मीटर", "बैग"];

// Available columns for table (excluding sno which is always shown)
// Unit moved to just before quantity column
const beneficiariesTableColumns = [
  { key: "center_name", label: "केंद्र का नाम" },
  { key: "vidhan_sabha_name", label: "विधानसभा का नाम" },
  { key: "vikas_khand_name", label: "विकास खंड का नाम" },
  { key: "scheme_name", label: "योजना का नाम" },
  { key: "supplied_item_name", label: "आपूर्ति की गई वस्तु का नाम" },
  { key: "farmer_name", label: "किसान का नाम" },
  { key: "father_name", label: "पिता का नाम" },
  { key: "category", label: "श्रेणी" },
  { key: "address", label: "पता" },
  { key: "mobile_number", label: "मोबाइल नंबर" },
  { key: "aadhaar_number", label: "आधार नंबर" },
  { key: "bank_account_number", label: "बैंक खाता नंबर" },
  { key: "ifsc_code", label: "IFSC कोड" },
  { key: "unit", label: "इकाई" },
  { key: "quantity", label: "मात्रा" },
  { key: "rate", label: "दर" },
  { key: "amount", label: "देय अनुदान राशि" },
  { key: "beneficiary_reg_date", label: "पंजीकरण तिथि" },
];

// Column mapping for data access - Unit moved to just before quantity
const beneficiariesTableColumnMapping = {
  sno: { header: "क्र.सं.", accessor: (item, index) => index + 1 },
  center_name: {
    header: "केंद्र का नाम",
    accessor: (item) => item.center_name,
  },
  vidhan_sabha_name: {
    header: "विधानसभा का नाम",
    accessor: (item) => item.vidhan_sabha_name,
  },
  vikas_khand_name: {
    header: "विकास खंड का नाम",
    accessor: (item) => item.vikas_khand_name,
  },
  scheme_name: { header: "योजना का नाम", accessor: (item) => item.scheme_name },
  supplied_item_name: {
    header: "आपूर्ति की गई वस्तु का नाम",
    accessor: (item) => item.supplied_item_name,
  },
  farmer_name: { header: "किसान का नाम", accessor: (item) => item.farmer_name },
  father_name: { header: "पिता का नाम", accessor: (item) => item.father_name },
  category: { header: "श्रेणी", accessor: (item) => item.category },
  address: { header: "पता", accessor: (item) => item.address },
  mobile_number: {
    header: "मोबाइल नंबर",
    accessor: (item) => item.mobile_number,
  },
  aadhaar_number: {
    header: "आधार नंबर",
    accessor: (item) => item.aadhaar_number,
  },
  bank_account_number: {
    header: "बैंक खाता नंबर",
    accessor: (item) => item.bank_account_number,
  },
  ifsc_code: { header: "IFSC कोड", accessor: (item) => item.ifsc_code },
  quantity: { header: "मात्रा", accessor: (item) => item.quantity },
  unit: { header: "इकाई", accessor: (item) => item.unit },
  rate: { header: "दर", accessor: (item) => item.rate },
  amount: { header: "देय अनुदान राशि", accessor: (item) => item.amount },
  beneficiary_reg_date: {
    header: "पंजीकरण तिथि",
    accessor: (item) => convertToDisplayFormat(item.beneficiary_reg_date) || "",
  },
};

// Helper function to calculate financial year dates (April 1 to March 31)
const getFinancialYearDates = () => ({
  start_date: "2026-04-01",
  end_date: "2027-03-31",
});

// Hindi translations for form
const translations = {
  pageTitle: "कृषि डेटा एंट्री",
  farmerName: "किसान का नाम",
  fatherName: "पिता का नाम",
  address: "पता",
  centerName: "केंद्र का नाम",
  suppliedItemName: "आपूर्ति की गई वस्तु का नाम",
  unit: "इकाई",
  quantity: "मात्रा",
  rate: "दर",
  amount: "देय अनुदान राशि",
  aadhaarNumber: "आधार नंबर",
  bankAccountNumber: "बैंक खाता नंबर",
  ifscCode: "IFSC कोड",
  mobileNumber: "मोबाइल नंबर",
  category: "श्रेणी",
  schemeName: "योजना का नाम",
  vikasKhandName: "विकास खंड का नाम",
  vidhanSabhaName: "विधानसभा का नाम",
  startDate: "कब से",
  endDate: "कब तक",
  submitButton: "जमा करें",
  submitting: "जमा कर रहे हैं...",
  successMessage: "लाभार्थी सफलतापूर्वक जोड़ा गया!",
  bulkUpload: "बल्क अपलोड (Excel)",
  uploadFile: "फाइल चुनें",
  uploadButton: "अपलोड करें",
  required: "यह फ़ील्ड आवश्यक है",
  selectOption: "चुनें",
  genericError:
    "प्रस्तुत करते समय एक त्रुटि हुई। कृपया बाद में पुन: प्रयास करें।",
  showing: "दिखा रहे हैं",
  to: "से",
  of: "का",
  entries: "प्रविष्टियां",
  page: "पृष्ठ",
  itemsPerPage: "प्रति पृष्ठ आइटम",
  editBeneficiary: "लाभार्थी संपादित करें",
  saveChanges: "परिवर्तन सहेजें",
  cancel: "रद्द करें",
  beneficiaryRegDate: "पंजीकरण तिथि",
};

const KrishiRegistration = () => {
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
    farmer_name: "",
    father_name: "",
    address: "",
    center_name: "",
    supplied_item_name: "",
    unit: "",
    quantity: "",
    rate: "",
    amount: "",
    aadhaar_number: "",
    bank_account_number: "",
    ifsc_code: "",
    mobile_number: "",
    category: "",
    scheme_name: "",
    vikas_khand_name: "",
    vidhan_sabha_name: "",
    beneficiary_reg_date: getTodayInDisplayFormat(),
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);
  const [failedRows, setFailedRows] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
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
    beneficiariesTableColumns.map((col) => col.key),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [vikasKhandData, setVikasKhandData] = useState(null);
  const [isFetchingVikasKhand, setIsFetchingVikasKhand] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [selectedSummaryModal, setSelectedSummaryModal] = useState(null);

  // State to track transposed cross tables
  const [transposedTables, setTransposedTables] = useState({});

  // Toggle transpose for a specific table
  const toggleTableTranspose = (tableKey) => {
    setTransposedTables((prev) => ({
      ...prev,
      [tableKey]: !prev[tableKey],
    }));
  };

  // Dynamic form options - initialized with static values
  const [formOptions, setFormOptions] = useState({
    supplied_item_name: [],
    unit: staticUnitOptions,
    category: staticCategoryOptions,
    scheme_name: [],
  });

  // Track which fields are in "Other" mode (text input instead of dropdown)
  const [otherMode, setOtherMode] = useState({
    supplied_item_name: false,
    unit: false,
    category: false,
    scheme_name: false,
  });

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // State for multi-select delete
  const [selectedItems, setSelectedItems] = useState([]);

  // State for inline editing
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [editingOtherMode, setEditingOtherMode] = useState({
    supplied_item_name: false,
    unit: false,
    category: false,
    scheme_name: false,
  });
  const [editingVikasKhandData, setEditingVikasKhandData] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({
    farmer_name: [],
    center_name: [],
    supplied_item_name: [],
    category: [],
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
    farmer_name: [],
    center_name: [],
    supplied_item_name: [],
    category: [],
    scheme_name: [],
    vikas_khand_name: [],
    vidhan_sabha_name: [],
  });

  // Function to merge static options with dynamic options from API
  const mergeStaticAndDynamicOptions = (
    staticOptions,
    dynamicOptions,
    existingData,
  ) => {
    // Create a Set to store unique values
    const mergedOptions = new Set(staticOptions);

    // Add dynamic options from API
    if (dynamicOptions && Array.isArray(dynamicOptions)) {
      dynamicOptions.forEach((option) => {
        if (option && typeof option === "string") {
          mergedOptions.add(option);
        }
      });
    }

    // Add existing values from table data
    if (existingData && Array.isArray(existingData)) {
      existingData.forEach((item) => {
        if (item && typeof item === "string") {
          mergedOptions.add(item);
        }
      });
    }

    // Convert Set back to Array and sort
    return Array.from(mergedOptions).sort();
  };

  // Check device width

  // Fetch beneficiaries data
  const fetchBeneficiaries = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      const response = await axios.get(BENEFICIARIES_API_URL);
      const data =
        response.data && response.data.data
          ? response.data.data
          : response.data;
      const items = Array.isArray(data) ? data : [];
      setBeneficiaries(items);
      setAllBeneficiaries(items);

      // Update form options with existing data
      updateFormOptionsWithExistingData(items);
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
      setApiError("डेटा लोड करने में त्रुटि हुई।");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update form options with existing data from table
  const updateFormOptionsWithExistingData = (data) => {
    if (!data || !Array.isArray(data)) return;

    // Extract unique values from existing data
    const suppliedItems = [
      ...new Set(data.map((item) => item.supplied_item_name).filter(Boolean)),
    ];
    const units = [...new Set(data.map((item) => item.unit).filter(Boolean))];
    const categories = [
      ...new Set(data.map((item) => item.category).filter(Boolean)),
    ];
    const schemes = [
      ...new Set(data.map((item) => item.scheme_name).filter(Boolean)),
    ];

    // Update form options with merged static and dynamic values
    setFormOptions((prev) => ({
      ...prev,
      supplied_item_name: mergeStaticAndDynamicOptions([], suppliedItems, []),
      unit: mergeStaticAndDynamicOptions(staticUnitOptions, units, []),
      category: mergeStaticAndDynamicOptions(
        staticCategoryOptions,
        categories,
        [],
      ),
      scheme_name: mergeStaticAndDynamicOptions([], schemes, []),
    }));
  };

  // Improved fetch vikas khand data function
  const fetchVikasKhandData = async (centerName, isEditMode = false) => {
    if (!centerName) {
      // Clear the relevant fields if no center is selected
      if (isEditMode) {
        setEditingVikasKhandData(null);
        setEditingValues((prev) => ({
          ...prev,
          vikas_khand_name: "",
          vidhan_sabha_name: "",
        }));
      } else {
        setVikasKhandData(null);
        setFormData((prev) => ({
          ...prev,
          vikas_khand_name: "",
          vidhan_sabha_name: "",
        }));
      }
      return;
    }

    try {
      if (isEditMode) {
        setIsFetchingVikasKhand(true);
      }

      // Log the exact center name being sent
      console.log("Fetching vikas khand for center:", centerName);

      const response = await axios.get(
        `${VIKAS_KHAND_API_URL}?center_name=${encodeURIComponent(centerName)}`,
      );

      console.log("API response status:", response.status);
      console.log("API response data:", response.data);

      // Handle different response structures
      let vikasData = null;

      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          vikasData = response.data[0];
        }
      } else if (response.data && typeof response.data === "object") {
        if (response.data.vikas_khand_name || response.data.vidhan_sabha_name) {
          vikasData = response.data;
        } else if (response.data.data && response.data.data.vikas_khand_name) {
          vikasData = response.data.data;
        }
      }

      if (vikasData) {
        if (isEditMode) {
          setEditingVikasKhandData(vikasData);
          setEditingValues((prev) => ({
            ...prev,
            vikas_khand_name: vikasData.vikas_khand_name || "",
            vidhan_sabha_name: vikasData.vidhan_sabha_name || "",
          }));
        } else {
          setVikasKhandData(vikasData);
          setFormData((prev) => ({
            ...prev,
            vikas_khand_name: vikasData.vikas_khand_name || "",
            vidhan_sabha_name: vikasData.vidhan_sabha_name || "",
          }));
        }
        console.log("Successfully fetched vikas khand data:", vikasData);
      } else {
        console.warn("No vikas khand data found for center:", centerName);
        // Clear fields when no data is found
        if (isEditMode) {
          setEditingVikasKhandData(null);
          setEditingValues((prev) => ({
            ...prev,
            vikas_khand_name: "",
            vidhan_sabha_name: "",
          }));
        } else {
          setVikasKhandData(null);
          setFormData((prev) => ({
            ...prev,
            vikas_khand_name: "",
            vidhan_sabha_name: "",
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching vikas khand data:", error);
      // Show user-friendly error message
      if (isEditMode) {
        setApiError(`Failed to fetch Vikas Khand data: ${error.message}`);
      } else {
        setApiError(`Failed to fetch Vikas Khand data: ${error.message}`);
      }

      // Clear fields on error
      if (isEditMode) {
        setEditingVikasKhandData(null);
        setEditingValues((prev) => ({
          ...prev,
          vikas_khand_name: "",
          vidhan_sabha_name: "",
        }));
      } else {
        setVikasKhandData(null);
        setFormData((prev) => ({
          ...prev,
          vikas_khand_name: "",
          vidhan_sabha_name: "",
        }));
      }
    } finally {
      if (isEditMode) {
        setIsFetchingVikasKhand(false);
      }
    }
  };

  // Function to manually refresh Vikas Khand data
  const refreshVikasKhandData = () => {
    if (formData.center_name) {
      fetchVikasKhandData(formData.center_name);
    }
  };

  // Function to manually refresh form options
  const refreshFormOptions = () => {
    if (formData.center_name) {
      fetchFormFilters("", "", formData.center_name);
    } else {
      fetchFormFilters();
    }
  };

  // Updated fetch form filters function to accept center_name parameter
  const fetchFormFilters = async (
    suppliedItemName = "",
    category = "",
    centerName = "",
  ) => {
    try {
      setIsLoadingFilters(true);
      let url = FORM_FILTERS_API_URL;
      const params = [];

      // Add center_name parameter if provided
      if (centerName) {
        params.push(`center_name=${encodeURIComponent(centerName)}`);
      }

      if (suppliedItemName)
        params.push(
          `supplied_item_name=${encodeURIComponent(suppliedItemName)}`,
        );
      if (category) params.push(`category=${encodeURIComponent(category)}`);
      if (params.length > 0) url += "?" + params.join("&");

      console.log("Fetching filters from:", url);
      const response = await axios.get(url);
      const data = response.data;
      console.log("API response:", data);

      // Get existing data from beneficiaries
      const existingData = allBeneficiaries.filter(
        (item) => !centerName || item.center_name === centerName,
      );

      // Extract dynamic options from API response
      let dynamicSuppliedItems = [];
      let dynamicUnits = [];
      let dynamicCategories = [];
      let dynamicSchemes = [];

      // Handle different response structures
      if (data && typeof data === "object") {
        if (data.success && data.data) {
          // If response has success and data properties
          if (Array.isArray(data.data)) {
            // If data.data is an array, extract values from each item
            data.data.forEach((item) => {
              if (item.supplied_item_name)
                dynamicSuppliedItems.push(item.supplied_item_name);
              if (item.unit) dynamicUnits.push(item.unit);
              if (item.category) dynamicCategories.push(item.category);
              if (item.scheme_name) dynamicSchemes.push(item.scheme_name);
            });
          } else {
            // If data.data is an object, extract values directly
            dynamicSuppliedItems = data.data.supplied_item_name || [];
            dynamicUnits = data.data.unit || [];
            dynamicCategories = data.data.category || [];
            dynamicSchemes = data.data.scheme_name || [];
          }
        } else if (Array.isArray(data)) {
          // If response is an array, extract values directly
          data.forEach((item) => {
            if (item.supplied_item_name || item.name)
              dynamicSuppliedItems.push(item.supplied_item_name || item.name);
            if (item.unit) dynamicUnits.push(item.unit);
            if (item.category) dynamicCategories.push(item.category);
            if (item.scheme_name || item.name)
              dynamicSchemes.push(item.scheme_name || item.name);
          });
        } else {
          // If response is an object, extract values from properties
          dynamicSuppliedItems = data.supplied_item_name || [];
          dynamicUnits = data.unit || [];
          dynamicCategories = data.category || [];
          dynamicSchemes = data.scheme_name || [];
        }
      }

      console.log("Dynamic options extracted:", {
        suppliedItems: dynamicSuppliedItems,
        units: dynamicUnits,
        categories: dynamicCategories,
        schemes: dynamicSchemes,
      });

      // Update form options with merged static and dynamic values
      setFormOptions((prev) => ({
        ...prev,
        supplied_item_name: mergeStaticAndDynamicOptions(
          [],
          dynamicSuppliedItems,
          existingData.map((item) => item.supplied_item_name).filter(Boolean),
        ),
        unit: mergeStaticAndDynamicOptions(
          staticUnitOptions,
          dynamicUnits,
          existingData.map((item) => item.unit).filter(Boolean),
        ),
        category: mergeStaticAndDynamicOptions(
          staticCategoryOptions,
          dynamicCategories,
          existingData.map((item) => item.category).filter(Boolean),
        ),
        scheme_name: mergeStaticAndDynamicOptions(
          [],
          dynamicSchemes,
          existingData.map((item) => item.scheme_name).filter(Boolean),
        ),
      }));
    } catch (error) {
      console.error("Error fetching form filters:", error);
      setApiError(`Failed to fetch form options: ${error.message}`);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  // Add a new function to fetch supplied items for a center
  const fetchSuppliedItemsForCenter = async (centerName) => {
    if (!centerName) return;

    try {
      setIsLoadingFilters(true);
      console.log("Fetching supplied items for center:", centerName);

      // Try different API endpoints
      let response;
      try {
        // First try with the existing endpoint
        response = await axios.get(
          `${FORM_FILTERS_API_URL}?center_name=${encodeURIComponent(centerName)}`,
        );
      } catch (error) {
        console.log("Failed with existing endpoint, trying alternative...");
        // Try an alternative endpoint
        response = await axios.get(
          `${FORM_FILTERS_API_URL}supplied-items/?center_name=${encodeURIComponent(centerName)}`,
        );
      }

      console.log("Supplied items response:", response.data);

      // Get existing data from beneficiaries for this center
      const existingData = allBeneficiaries.filter(
        (item) => item.center_name === centerName,
      );

      // Extract the supplied items from the response
      let suppliedItems = [];
      if (response.data && response.data.success && response.data.data) {
        if (Array.isArray(response.data.data)) {
          response.data.data.forEach((item) => {
            if (item.supplied_item_name || item.name)
              suppliedItems.push(item.supplied_item_name || item.name);
          });
        } else {
          suppliedItems = response.data.data.supplied_item_name || [];
        }
      } else if (response.data && Array.isArray(response.data)) {
        response.data.forEach((item) => {
          if (item.name || item.supplied_item_name)
            suppliedItems.push(item.name || item.supplied_item_name);
        });
      } else if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        response.data.data.forEach((item) => {
          if (item.name || item.supplied_item_name)
            suppliedItems.push(item.name || item.supplied_item_name);
        });
      }

      // Update form options with merged static and dynamic values
      setFormOptions((prev) => ({
        ...prev,
        supplied_item_name: mergeStaticAndDynamicOptions(
          [],
          suppliedItems,
          existingData.map((item) => item.supplied_item_name).filter(Boolean),
        ),
      }));

      console.log("Updated supplied items:", formOptions.supplied_item_name);
    } catch (error) {
      console.error("Error fetching supplied items for center:", error);
      setApiError(`Failed to fetch supplied items: ${error.message}`);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  // Fetch data on component mount and set default financial year filters
  useEffect(() => {
    const { start_date, end_date } = getFinancialYearDates();
    setFilters((prev) => ({
      ...prev,
      start_date,
      end_date,
    }));
    fetchBeneficiaries();
    fetchFormFilters();
  }, []);

  // Fetch filters when center changes
  useEffect(() => {
    if (formData.center_name) {
      fetchFormFilters("", "", formData.center_name);
    }
  }, [formData.center_name]);

  // Populate filter options from all beneficiaries
  useEffect(() => {
    if (allBeneficiaries.length > 0) {
      setFilterOptions({
        farmer_name: [
          ...new Set(
            allBeneficiaries.map((item) => item.farmer_name).filter(Boolean),
          ),
        ],
        center_name: [
          ...new Set(
            allBeneficiaries.map((item) => item.center_name).filter(Boolean),
          ),
        ],
        supplied_item_name: [
          ...new Set(
            allBeneficiaries
              .map((item) => item.supplied_item_name)
              .filter(Boolean),
          ),
        ],
        category: [
          ...new Set(
            allBeneficiaries.map((item) => item.category).filter(Boolean),
          ),
        ],
        scheme_name: [
          ...new Set(
            allBeneficiaries.map((item) => item.scheme_name).filter(Boolean),
          ),
        ],
        vikas_khand_name: [
          ...new Set(
            allBeneficiaries
              .map((item) => item.vikas_khand_name)
              .filter(Boolean),
          ),
        ],
        vidhan_sabha_name: [
          ...new Set(
            allBeneficiaries
              .map((item) => item.vidhan_sabha_name)
              .filter(Boolean),
          ),
        ],
      });

      // Extract unique created_at dates for the new date filter
      const createdAtDates = allBeneficiaries
        .map((item) =>
          item.created_at
            ? new Date(item.created_at).toISOString().split("T")[0]
            : null,
        )
        .filter(Boolean);
      const uniqueDates = [...new Set(createdAtDates)].sort().reverse();
      setUniqueCreatedAtDates(uniqueDates);
    }
  }, [allBeneficiaries]);

  // Apply local filtering when filters change
  useEffect(() => {
    let filtered = allBeneficiaries;

    const hasFilters = Object.keys(filters).some((key) =>
      Array.isArray(filters[key])
        ? filters[key].length > 0
        : filters[key].trim(),
    );
    if (hasFilters) {
      filtered = allBeneficiaries.filter((item) => {
        // Check all other filters
        for (const key in filters) {
          if (key === "start_date" || key === "end_date") continue; // Skip date filters for now
          if (filters[key].length > 0 && !filters[key].includes(item[key])) {
            return false;
          }
        }

        // Check date range filters
        if (filters.start_date || filters.end_date) {
          if (!item.beneficiary_reg_date) return false; // Skip if no date field

          const itemDate = new Date(item.beneficiary_reg_date);
          const startDate = filters.start_date
            ? new Date(filters.start_date)
            : null;
          const endDate = filters.end_date ? new Date(filters.end_date) : null;

          // Set end date to end of day for inclusive comparison
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

    setBeneficiaries(filtered);
  }, [filters, allBeneficiaries, createdAtFilter]);

  const getMostFrequentValue = (list = []) => {
    const counts = list.reduce((acc, value) => {
      const key = value ? String(value).trim() : "";
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    let topValue = "";
    let topCount = 0;
    Object.entries(counts).forEach(([key, count]) => {
      if (count > topCount) {
        topCount = count;
        topValue = key;
      }
    });

    return {
      label: topValue || "N/A",
      count: topCount,
    };
  };

  const getGroupedSummary = (key) => {
    const groups = {};
    const items = beneficiaries || [];

    items.forEach((item) => {
      const label = item[key] ? String(item[key]).trim() : "अन्य";
      if (!groups[label]) {
        groups[label] = { count: 0, quantity: 0, amount: 0 };
      }
      groups[label].count += 1;
      const quantity = parseFloat(item.quantity);
      const amount = parseFloat(item.amount);
      groups[label].quantity += Number.isFinite(quantity) ? quantity : 0;
      groups[label].amount += Number.isFinite(amount) ? amount : 0;
    });

    return Object.entries(groups)
      .map(([label, data]) => ({
        label,
        count: data.count,
        quantity: roundTo2Decimals(data.quantity),
        amount: roundTo2Decimals(data.amount),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getCrossSummary = (
    groupByKey,
    filterKey = null,
    filterValue = null,
  ) => {
    const groups = {};
    const items = beneficiaries || [];
    const filteredItems =
      filterKey && filterValue
        ? items.filter(
            (item) =>
              String(item[filterKey]).trim() === String(filterValue).trim(),
          )
        : items;

    filteredItems.forEach((item) => {
      const label = item[groupByKey] ? String(item[groupByKey]).trim() : "अन्य";
      if (!groups[label]) {
        groups[label] = { count: 0, quantity: 0, amount: 0 };
      }
      groups[label].count += 1;
      const quantity = parseFloat(item.quantity);
      const amount = parseFloat(item.amount);
      groups[label].quantity += Number.isFinite(quantity) ? quantity : 0;
      groups[label].amount += Number.isFinite(amount) ? amount : 0;
    });

    return Object.entries(groups)
      .map(([label, data]) => ({
        label,
        count: data.count,
        quantity: roundTo2Decimals(data.quantity),
        amount: roundTo2Decimals(data.amount),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const crossSummaries = useMemo(() => {
    return {
      byVidhan: getCrossSummary("vidhan_sabha_name"),
      byScheme: getCrossSummary("scheme_name"),
      bySuppliedItem: getCrossSummary("supplied_item_name"),
      byCenter: getCrossSummary("center_name"),
      byVikas: getCrossSummary("vikas_khand_name"),
      byAddress: getCrossSummary("address"),
    };
  }, [beneficiaries]);

  const getCrossTabSummary = (rowKey, colKey) => {
    const groups = {};
    const items = beneficiaries || [];
    items.forEach((item) => {
      const rowLabel = item[rowKey] ? String(item[rowKey]).trim() : "अन्य";
      const colLabel = item[colKey] ? String(item[colKey]).trim() : "अन्य";
      const key = `${rowLabel}||${colLabel}`;
      if (!groups[key]) {
        groups[key] = {
          row: rowLabel,
          col: colLabel,
          count: 0,
          quantity: 0,
          amount: 0,
        };
      }
      groups[key].count += 1;
      const quantity = parseFloat(item.quantity);
      const amount = parseFloat(item.amount);
      groups[key].quantity += Number.isFinite(quantity) ? quantity : 0;
      groups[key].amount += Number.isFinite(amount) ? amount : 0;
    });
    return Object.values(groups).map((g) => ({
      ...g,
      quantity: roundTo2Decimals(g.quantity),
      amount: roundTo2Decimals(g.amount),
    }));
  };

  const vidhanByScheme = useMemo(
    () => getCrossTabSummary("vidhan_sabha_name", "scheme_name"),
    [beneficiaries],
  );
  const vidhanBySuppliedItem = useMemo(
    () => getCrossTabSummary("vidhan_sabha_name", "supplied_item_name"),
    [beneficiaries],
  );
  const vidhanByVikas = useMemo(
    () => getCrossTabSummary("vidhan_sabha_name", "vikas_khand_name"),
    [beneficiaries],
  );
  const vidhanByCenter = useMemo(
    () => getCrossTabSummary("vidhan_sabha_name", "center_name"),
    [beneficiaries],
  );

  const schemeByVidhan = useMemo(
    () => getCrossTabSummary("scheme_name", "vidhan_sabha_name"),
    [beneficiaries],
  );
  const schemeByVikas = useMemo(
    () => getCrossTabSummary("scheme_name", "vikas_khand_name"),
    [beneficiaries],
  );
  const schemeBySuppliedItem = useMemo(
    () => getCrossTabSummary("scheme_name", "supplied_item_name"),
    [beneficiaries],
  );
  const schemeByCenter = useMemo(
    () => getCrossTabSummary("scheme_name", "center_name"),
    [beneficiaries],
  );

  const vikasByVidhan = useMemo(
    () => getCrossTabSummary("vikas_khand_name", "vidhan_sabha_name"),
    [beneficiaries],
  );
  const vikasByScheme = useMemo(
    () => getCrossTabSummary("vikas_khand_name", "scheme_name"),
    [beneficiaries],
  );
  const vikasBySuppliedItem = useMemo(
    () => getCrossTabSummary("vikas_khand_name", "supplied_item_name"),
    [beneficiaries],
  );
  const vikasByCenter = useMemo(
    () => getCrossTabSummary("vikas_khand_name", "center_name"),
    [beneficiaries],
  );

  const centerByScheme = useMemo(
    () => getCrossTabSummary("center_name", "scheme_name"),
    [beneficiaries],
  );
  const vikasByAddress = useMemo(
    () => getCrossTabSummary("vikas_khand_name", "address"),
    [beneficiaries],
  );
  const vidhanByAddress = useMemo(
    () => getCrossTabSummary("vidhan_sabha_name", "address"),
    [beneficiaries],
  );
  const centerByAddress = useMemo(
    () => getCrossTabSummary("center_name", "address"),
    [beneficiaries],
  );
  const schemeByAddress = useMemo(
    () => getCrossTabSummary("scheme_name", "address"),
    [beneficiaries],
  );
  const suppliedByAddress = useMemo(
    () => getCrossTabSummary("supplied_item_name", "address"),
    [beneficiaries],
  );

  const addressByVidhan = useMemo(
    () => getCrossTabSummary("address", "vidhan_sabha_name"),
    [beneficiaries],
  );
  const addressByScheme = useMemo(
    () => getCrossTabSummary("address", "scheme_name"),
    [beneficiaries],
  );
  const addressByVikas = useMemo(
    () => getCrossTabSummary("address", "vikas_khand_name"),
    [beneficiaries],
  );
  const addressByCenter = useMemo(
    () => getCrossTabSummary("address", "center_name"),
    [beneficiaries],
  );
  const centerByVidhan = useMemo(
    () => getCrossTabSummary("center_name", "vidhan_sabha_name"),
    [beneficiaries],
  );
  const centerByVikas = useMemo(
    () => getCrossTabSummary("center_name", "vikas_khand_name"),
    [beneficiaries],
  );
  const centerBySuppliedItem = useMemo(
    () => getCrossTabSummary("center_name", "supplied_item_name"),
    [beneficiaries],
  );

  const suppliedByScheme = useMemo(
    () => getCrossTabSummary("supplied_item_name", "scheme_name"),
    [beneficiaries],
  );
  const suppliedByVidhan = useMemo(
    () => getCrossTabSummary("supplied_item_name", "vidhan_sabha_name"),
    [beneficiaries],
  );
  const suppliedByVikas = useMemo(
    () => getCrossTabSummary("supplied_item_name", "vikas_khand_name"),
    [beneficiaries],
  );
  const suppliedByCenter = useMemo(
    () => getCrossTabSummary("supplied_item_name", "center_name"),
    [beneficiaries],
  );

  const renderCrossTabTable = (data, rowKey, colKey, title, tableKey) => {
    const rows = [...new Set(data.map((d) => d.row))];
    const cols = [...new Set(data.map((d) => d.col))];
    const rowLabel = rowKey
      .replace("_name", "")
      .replace("vidhan_sabha", "विधानसभा")
      .replace("scheme", "योजना")
      .replace("vikas_khand", "विकास खंड")
      .replace("supplied_item", "वस्तु")
      .replace("center", "केंद्र");
    const colLabel = colKey
      .replace("_name", "")
      .replace("vidhan_sabha", "विधानसभा")
      .replace("scheme", "योजना")
      .replace("vikas_khand", "विकास खंड")
      .replace("supplied_item", "वस्तु")
      .replace("center", "केंद्र");

    // Determine if table is transposed
    const isTransposed = transposedTables[tableKey];

    // Use rows or cols based on transposition
    const primaryKeys = isTransposed ? cols : rows;
    const secondaryKeys = isTransposed ? rows : cols;
    const primaryLabel = isTransposed ? colLabel : rowLabel;

    const totalByPrimary = {};
    primaryKeys.forEach((key) => {
      const filterKey = isTransposed ? "col" : "row";
      totalByPrimary[key] = data
        .filter((d) => d[filterKey] === key)
        .reduce(
          (sum, d) => ({
            count: sum.count + d.count,
            quantity: sum.quantity + d.quantity,
            amount: sum.amount + d.amount,
          }),
          { count: 0, quantity: 0, amount: 0 },
        );
    });

    // Calculate grand totals
    const grandTotal = data.reduce(
      (sum, d) => ({
        count: sum.count + d.count,
        quantity: sum.quantity + d.quantity,
        amount: sum.amount + d.amount,
      }),
      { count: 0, quantity: 0, amount: 0 },
    );

    // Calculate secondary totals
    const totalBySecondary = {};
    secondaryKeys.forEach((key) => {
      const filterKey = isTransposed ? "row" : "col";
      totalBySecondary[key] = data
        .filter((d) => d[filterKey] === key)
        .reduce(
          (sum, d) => ({
            count: sum.count + d.count,
            quantity: sum.quantity + d.quantity,
            amount: sum.amount + d.amount,
          }),
          { count: 0, quantity: 0, amount: 0 },
        );
    });

    // CSS for sticky table layout
    const stickyHeaderStyle = {
      position: "sticky",
      top: 0,
      zIndex: 13,
      backgroundColor: "#212529",
      color: "white",
    };

    const stickyFirstColHeaderStyle = {
      position: "sticky",
      left: 0,
      top: 0,
      zIndex: 14,
      backgroundColor: "#212529",
      color: "white",
      verticalAlign: "middle",
      minWidth: "120px",
      maxWidth: "150px",
    };

    const stickyFirstColBodyStyle = {
      position: "sticky",
      left: 0,
      zIndex: 12,
      backgroundColor: "#f8f9fa",
      borderRight: "2px solid #dee2e6",
      fontWeight: "bold",
      minWidth: "120px",
      maxWidth: "150px",
    };

    const stickyFirstColTotalStyle = {
      position: "sticky",
      left: 0,
      zIndex: 12,
      backgroundColor: "#d4edda",
      borderRight: "2px solid #dee2e6",
      fontWeight: "bold",
      minWidth: "120px",
      maxWidth: "150px",
    };

    return (
      <div className="mb-4 p-3 border rounded">
        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
          <h6 className="text-info mb-0">{title}</h6>
          <button
            onClick={() => toggleTableTranspose(tableKey)}
            className="btn btn-sm btn-outline-info"
            title="टेबल को घुमाएं (Transpose Table)"
            style={{ padding: "4px 12px", fontSize: "12px" }}
          >
            <FaSync
              style={{
                marginRight: "4px",
                transform: "rotate(90deg)",
                display: "inline-block",
              }}
            />
            {isTransposed ? "सामान्य" : "घुमाएं"}
          </button>
        </div>
        <div
          style={{
            maxHeight: "500px",
            overflowY: "auto",
            overflowX: "auto",
            border: "1px solid #dee2e6",
            borderRadius: "4px",
          }}
        >
          <Table
            striped
            bordered
            hover
            responsive={false}
            size="sm"
            className="mb-0"
            style={{ width: "100%" }}
          >
            <thead className="table-dark">
              <tr>
                <th rowSpan="2" style={stickyFirstColHeaderStyle}>
                  {primaryLabel}
                </th>
                <th
                  rowSpan="2"
                  style={{
                    ...stickyHeaderStyle,
                    verticalAlign: "middle",
                    minWidth: "80px",
                  }}
                >
                  लाभार्थी
                </th>
                <th
                  rowSpan="2"
                  style={{
                    ...stickyHeaderStyle,
                    verticalAlign: "middle",
                    minWidth: "90px",
                  }}
                >
                  कुल मात्रा
                </th>
                <th
                  rowSpan="2"
                  style={{
                    ...stickyHeaderStyle,
                    verticalAlign: "middle",
                    minWidth: "100px",
                  }}
                >
                  कुल देय अनुदान राशि (₹)
                </th>
                {secondaryKeys.map((key) => (
                  <th
                    key={key}
                    colSpan="3"
                    className="text-center"
                    style={{ ...stickyHeaderStyle, minWidth: "150px" }}
                  >
                    {key}
                  </th>
                ))}
              </tr>
              <tr style={stickyHeaderStyle}>
                {secondaryKeys.map((key) => (
                  <React.Fragment key={key}>
                    <th
                      className="text-center"
                      style={{ ...stickyHeaderStyle, minWidth: "50px" }}
                    >
                      लाभार्थी
                    </th>
                    <th
                      className="text-center"
                      style={{ ...stickyHeaderStyle, minWidth: "60px" }}
                    >
                      मात्रा
                    </th>
                    <th
                      className="text-center"
                      style={{ ...stickyHeaderStyle, minWidth: "70px" }}
                    >
                      देय अनुदान राशि (₹)
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {primaryKeys.map((primaryKey) => (
                <tr key={primaryKey}>
                  <td style={stickyFirstColBodyStyle}>{primaryKey}</td>
                  <td className="text-center" style={{ minWidth: "80px" }}>
                    {totalByPrimary[primaryKey].count}
                  </td>
                  <td className="text-center" style={{ minWidth: "90px" }}>
                    {totalByPrimary[primaryKey].quantity.toFixed(2)}
                  </td>
                  <td className="text-center" style={{ minWidth: "100px" }}>
                    ₹{totalByPrimary[primaryKey].amount.toFixed(0)}
                  </td>
                  {secondaryKeys.map((secondaryKey) => {
                    const cell = isTransposed
                      ? data.find(
                          (d) => d.col === primaryKey && d.row === secondaryKey,
                        )
                      : data.find(
                          (d) => d.row === primaryKey && d.col === secondaryKey,
                        );
                    return (
                      <React.Fragment key={secondaryKey}>
                        <td
                          className="text-center"
                          style={{ minWidth: "50px" }}
                        >
                          {cell ? cell.count : "-"}
                        </td>
                        <td
                          className="text-center"
                          style={{ minWidth: "60px" }}
                        >
                          {cell ? cell.quantity.toFixed(2) : "-"}
                        </td>
                        <td
                          className="text-center"
                          style={{ minWidth: "70px" }}
                        >
                          {cell ? `₹${cell.amount.toFixed(0)}` : "-"}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ backgroundColor: "#d4edda", fontWeight: "bold" }}>
                <td style={stickyFirstColTotalStyle}>कुल</td>
                <td className="text-center" style={{ minWidth: "80px" }}>
                  {grandTotal.count}
                </td>
                <td className="text-center" style={{ minWidth: "90px" }}>
                  {grandTotal.quantity.toFixed(2)}
                </td>
                <td className="text-center" style={{ minWidth: "100px" }}>
                  ₹{grandTotal.amount.toFixed(0)}
                </td>
                {secondaryKeys.map((key) => (
                  <React.Fragment key={key}>
                    <td className="text-center" style={{ minWidth: "50px" }}>
                      {totalBySecondary[key].count}
                    </td>
                    <td className="text-center" style={{ minWidth: "60px" }}>
                      {totalBySecondary[key].quantity.toFixed(2)}
                    </td>
                    <td className="text-center" style={{ minWidth: "70px" }}>
                      ₹{totalBySecondary[key].amount.toFixed(0)}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </Table>
        </div>
      </div>
    );
  };

  const summaryStats = useMemo(() => {
    const items = beneficiaries || [];
    const unique = (key) =>
      new Set(items.map((item) => item[key]).filter(Boolean)).size;

    const vikas = getMostFrequentValue(
      items.map((item) => item.vikas_khand_name),
    );
    const vidhan = getMostFrequentValue(
      items.map((item) => item.vidhan_sabha_name),
    );
    const suppliedItem = getMostFrequentValue(
      items.map((item) => item.supplied_item_name),
    );
    const center = getMostFrequentValue(items.map((item) => item.center_name));
    const scheme = getMostFrequentValue(items.map((item) => item.scheme_name));
    const address = getMostFrequentValue(items.map((item) => item.address));

    const totalQuantity = items.reduce((sum, item) => {
      const value = parseFloat(item.quantity);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const totalAmount = items.reduce((sum, item) => {
      const value = parseFloat(item.amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return {
      vikas: {
        uniqueCount: unique("vikas_khand_name"),
        topLabel: vikas.label,
        topCount: vikas.count,
        totalBeneficiaries: items.length,
        breakdown: getGroupedSummary("vikas_khand_name"),
      },
      vidhan: {
        uniqueCount: unique("vidhan_sabha_name"),
        topLabel: vidhan.label,
        topCount: vidhan.count,
        totalBeneficiaries: items.length,
        breakdown: getGroupedSummary("vidhan_sabha_name"),
      },
      suppliedItem: {
        uniqueCount: unique("supplied_item_name"),
        topLabel: suppliedItem.label,
        totalQuantity: roundTo2Decimals(totalQuantity),
        totalAmount: roundTo2Decimals(totalAmount),
        breakdown: getGroupedSummary("supplied_item_name"),
      },
      center: {
        uniqueCount: unique("center_name"),
        topLabel: center.label,
        totalRecords: items.length,
        breakdown: getGroupedSummary("center_name"),
      },
      scheme: {
        uniqueCount: unique("scheme_name"),
        topLabel: scheme.label,
        totalAmount: roundTo2Decimals(totalAmount),
        breakdown: getGroupedSummary("scheme_name"),
      },
      address: {
        uniqueCount: unique("address"),
        topLabel: address.label,
        topCount: address.count,
        totalBeneficiaries: items.length,
        breakdown: getGroupedSummary("address"),
      },
      overall: {
        totalQuantity: roundTo2Decimals(totalQuantity),
        totalAmount: roundTo2Decimals(totalAmount),
        totalBeneficiaries: items.length,
      },
    };
  }, [beneficiaries]);

  const openSummaryModal = (type) => {
    setSelectedSummaryModal(type);
  };

  const closeSummaryModal = () => {
    setSelectedSummaryModal(null);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Clear all filters - Reset to financial year dates
  const clearFilters = () => {
    const { start_date, end_date } = getFinancialYearDates();
    setFilters({
      farmer_name: [],
      center_name: [],
      supplied_item_name: [],
      category: [],
      scheme_name: [],
      vikas_khand_name: [],
      vidhan_sabha_name: [],
      start_date,
      end_date,
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

  // Download Excel function
  const downloadExcel = (data, filename, columnMapping, selectedColumns) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Prepare data for Excel export based on selected columns
      const excelData = data.map((item, index) => {
        const row = {};
        // Add serial number column
        row["क्र.सं."] = index + 1;
        selectedColumns.forEach((col) => {
          if (col === "beneficiary_reg_date") {
            row[columnMapping[col].header] =
              columnMapping[col].accessor(item, index) ||
              convertToDisplayFormat(today);
          } else {
            row[columnMapping[col].header] = columnMapping[col].accessor(
              item,
              index,
            );
          }
        });
        return row;
      });

      // Add total row
      const totalRow = {};
      // Add serial number column with "कुल" label
      totalRow["क्र.सं."] = "कुल";
      selectedColumns.forEach((col) => {
        if (columnMapping[col]) {
          if (col === "farmer_name") {
            totalRow[columnMapping[col].header] = data.length;
          } else if (
            [
              "center_name",
              "vidhan_sabha_name",
              "vikas_khand_name",
              "scheme_name",
              "supplied_item_name",
              "category",
              "unit",
            ].includes(col)
          ) {
            totalRow[columnMapping[col].header] = [
              ...new Set(data.map((item) => columnMapping[col].accessor(item))),
            ].filter(Boolean).length;
          } else if (["quantity", "rate", "amount"].includes(col)) {
            const sum = data.reduce((total, item) => {
              const val = parseFloat(columnMapping[col].accessor(item)) || 0;
              return total + val;
            }, 0);
            totalRow[columnMapping[col].header] = parseFloat(sum.toFixed(2));
          } else {
            totalRow[columnMapping[col].header] = "";
          }
        }
      });
      excelData.push(totalRow);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths based on the new column order
      const colWidths = [
        { wch: 10 }, // क्र.सं.
        { wch: 20 }, // केंद्र का नाम
        { wch: 20 }, // विधानसभा का नाम
        { wch: 20 }, // विकास खंड का नाम
        { wch: 20 }, // योजना का नाम
        { wch: 30 }, // आपूर्ति की गई वस्तु का नाम
        { wch: 20 }, // किसान का नाम
        { wch: 20 }, // पिता का नाम
        { wch: 15 }, // श्रेणी
        { wch: 40 }, // पता
        { wch: 15 }, // मोबाइल नंबर
        { wch: 15 }, // आधार नंबर
        { wch: 20 }, // बैंक खाता नंबर
        { wch: 15 }, // IFSC कोड
        { wch: 10 }, // इकाई
        { wch: 10 }, // मात्रा
        { wch: 10 }, // दर
        { wch: 10 }, // राशि
        { wch: 15 }, // पंजीकरण तिथि
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error("Error generating Excel file:", e);
      setApiError("Excel file generation failed. Please try again.");
    }
  };

  // Download sample Excel template - Updated to match the new column order
  const downloadSampleTemplate = () => {
    try {
      const today = getTodayInDisplayFormat();
      const sampleData = [
        {
          "केंद्र का नाम": "कोटद्वार",
          "योजना का नाम": "MGNREGA",
          "आपूर्ति की गई वस्तु का नाम": "बीज",
          "किसान का नाम": "रामेश कुमार",
          "पिता का नाम": "सुरेश कुमार",
          श्रेणी: "सामान्य",
          पता: "ग्राम रामपुर, पोस्ट रामपुर, जिला सीतापुर, उत्तर प्रदेश",
          "मोबाइल नंबर": "9876543210",
          "आधार नंबर": "123456789012",
          "बैंक खाता नंबर": "12345678901234",
          "IFSC कोड": "SBIN0001234",
          इकाई: "नग",
          मात्रा: 50,
          दर: 25,
          "देय अनुदान राशि": 1250,
          "पंजीकरण तिथि": today,
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleData);

      // Set column widths based on the new column order
      const colWidths = [
        { wch: 20 }, // केंद्र का नाम
        { wch: 20 }, // योजना का नाम
        { wch: 30 }, // आपूर्ति की गई वस्तु का नाम
        { wch: 20 }, // किसान का नाम
        { wch: 20 }, // पिता का नाम
        { wch: 15 }, // श्रेणी
        { wch: 40 }, // पता
        { wch: 15 }, // मोबाइल नंबर
        { wch: 15 }, // आधार नंबर
        { wch: 20 }, // बैंक खाता नंबर
        { wch: 15 }, // IFSC कोड
        { wch: 10 }, // इकाई
        { wch: 10 }, // मात्रा
        { wch: 10 }, // दर
        { wch: 10 }, // राशि
        { wch: 15 }, // पंजीकरण तिथि
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "SampleTemplate");
      XLSX.writeFile(wb, `Beneficiaries_Registration_Template.xlsx`);
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
              (col) =>
                `<td>${columnMapping[col]?.accessor(item, index) || ""}</td>`,
            )
            .join("")}`;
          return `<tr>${cells}</tr>`;
        })
        .join("");

      const totalCells = `<td><strong>कुल</strong></td>${selectedColumns
        .map((col) => {
          if (!columnMapping[col]) return "<td></td>";

          let val = "";
          if (col === "farmer_name") {
            val = data.length;
          } else if (
            [
              "center_name",
              "vidhan_sabha_name",
              "vikas_khand_name",
              "scheme_name",
              "supplied_item_name",
              "category",
              "unit",
            ].includes(col)
          ) {
            val = [
              ...new Set(data.map((item) => columnMapping[col].accessor(item))),
            ].filter(Boolean).length;
          } else if (["quantity", "rate", "amount"].includes(col)) {
            val = data
              .reduce((total, item) => {
                const v = parseFloat(columnMapping[col].accessor(item)) || 0;
                return total + v;
              }, 0)
              .toFixed(2);
          }

          return `<td><strong>${val}</strong></td>`;
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

      printWindow.onload = function () {};
    } catch (e) {
      console.error("Error generating PDF:", e);
      setApiError("PDF generation failed. Please try again.");
    }
  };

  // Refresh function
  const handleRefresh = () => {
    fetchBeneficiaries();
    setApiResponse(null);
    setApiError(null);
    clearFilters();
    setOtherMode({
      supplied_item_name: false,
      unit: false,
      category: false,
      scheme_name: false,
    });
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
      const payload = { beneficiary_id: selectedItems };
      await axios.delete(
        "https://mahadevaaya.com/govbillingsystem/backend/api/beneficiaries-registration/",
        { data: payload },
      );

      // Remove deleted items from state
      setAllBeneficiaries((prev) =>
        prev.filter((item) => !selectedItems.includes(item.beneficiary_id)),
      );
      setBeneficiaries((prev) =>
        prev.filter((item) => !selectedItems.includes(item.beneficiary_id)),
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
  const handleCheckboxChange = (beneficiaryId) => {
    setSelectedItems((prev) => {
      if (prev.includes(beneficiaryId)) {
        return prev.filter((id) => id !== beneficiaryId);
      } else {
        return [...prev, beneficiaryId];
      }
    });
  };

  // Handle select all (filtered items only)
  const handleSelectAll = () => {
    const visibleItems = beneficiaries.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
    const visibleBeneficiaryIds = visibleItems.map(
      (item) => item.beneficiary_id,
    );

    // Check if all visible items are already selected
    const allSelected = visibleBeneficiaryIds.every((id) =>
      selectedItems.includes(id),
    );

    if (allSelected) {
      // Deselect all visible items
      setSelectedItems((prev) =>
        prev.filter((id) => !visibleBeneficiaryIds.includes(id)),
      );
    } else {
      // Select all visible items that are not already selected
      const newSelections = visibleBeneficiaryIds.filter(
        (id) => !selectedItems.includes(id),
      );
      setSelectedItems((prev) => [...prev, ...newSelections]);
    }
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Handle inline edit
  const handleEdit = (item) => {
    setEditingRowId(item.beneficiary_id);
    // Convert beneficiary_reg_date to YYYY-MM-DD format for HTML date input
    let regDateValue = "";
    if (item.beneficiary_reg_date) {
      // If already in YYYY-MM-DD format, use as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.beneficiary_reg_date)) {
        regDateValue = item.beneficiary_reg_date;
      } else {
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        regDateValue = convertToBackendFormat(item.beneficiary_reg_date);
      }
    }
    setEditingValues({
      farmer_name: item.farmer_name || "",
      father_name: item.father_name || "",
      address: item.address || "",
      center_name: item.center_name || "",
      supplied_item_name: item.supplied_item_name || "",
      unit: item.unit || "",
      quantity: item.quantity || "",
      rate: item.rate || "",
      amount: item.amount || "",
      aadhaar_number: item.aadhaar_number || "",
      bank_account_number: item.bank_account_number || "",
      ifsc_code: item.ifsc_code || "",
      mobile_number: item.mobile_number || "",
      category: item.category || "",
      scheme_name: item.scheme_name || "",
      vikas_khand_name: item.vikas_khand_name || "",
      vidhan_sabha_name: item.vidhan_sabha_name || "",
      beneficiary_reg_date: regDateValue,
    });

    // Fetch vikas khand data for this center if available
    if (item.center_name) {
      fetchVikasKhandData(item.center_name, true);
    }

    setApiError(null);
    setApiResponse(null);
  };

  // Handle edit form field changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let updatedValues = {
      ...editingValues,
      [name]: value,
    };

    // Handle "Other" selection - switch to text input mode
    if (value === "Other") {
      setEditingOtherMode((prev) => ({
        ...prev,
        [name]: true,
      }));
      updatedValues[name] = ""; // Clear the value
    } else {
      // If not "Other", ensure we're in dropdown mode (unless already in other mode)
      if (!editingOtherMode[name]) {
        setEditingOtherMode((prev) => ({
          ...prev,
          [name]: false,
        }));

        // Handle cascading dropdowns only when not in other mode
        if (name === "supplied_item_name" && value) {
          // Reset dependent fields
          updatedValues.unit = "";
          updatedValues.category = "";
          updatedValues.scheme_name = "";
          setEditingOtherMode((prev) => ({
            ...prev,
            unit: false,
            category: false,
            scheme_name: false,
          }));
          // Fetch unit options with center_name
          fetchFormFilters(value, "", editingValues.center_name);
        } else if (
          name === "category" &&
          value &&
          editingValues.supplied_item_name
        ) {
          // Reset dependent fields
          updatedValues.scheme_name = "";
          setEditingOtherMode((prev) => ({
            ...prev,
            scheme_name: false,
          }));
          // Fetch scheme options with center_name
          fetchFormFilters(
            editingValues.supplied_item_name,
            value,
            editingValues.center_name,
          );
        }

        // If center changes, fetch vikas khand data and reset related fields
        if (name === "center_name") {
          if (value) {
            fetchVikasKhandData(value, true);
            // Fetch supplied item options for this center
            fetchSuppliedItemsForCenter(value);
          } else {
            setEditingVikasKhandData(null);
            updatedValues.vikas_khand_name = "";
            updatedValues.vidhan_sabha_name = "";
            // Reset form options to defaults
            fetchFormFilters();
          }
        }
      }
      // If in other mode, just update the value without triggering cascading
    }

    // Auto-calculate amount when quantity and rate change
    if (name === "quantity" || name === "rate") {
      const quantity = parseFloat(value) || 0;
      const rate =
        parseFloat(name === "quantity" ? editingValues.rate : value) || 0;
      updatedValues.amount = roundTo2Decimals(quantity * rate).toString();
    }

    setEditingValues(updatedValues);
  };

  // Handle save edit - UPDATED VERSION
  const handleSave = async (item) => {
    try {
      // Prepare payload with the required fields
      const payload = {
        beneficiary_id: item.beneficiary_id,
        farmer_name: editingValues.farmer_name,
        father_name: editingValues.father_name,
        address: editingValues.address,
        center_name: editingValues.center_name,
        supplied_item_name: editingValues.supplied_item_name,
        unit: editingValues.unit,
        quantity: parseFloat(editingValues.quantity) || 0,
        rate: parseFloat(editingValues.rate) || 0,
        amount: parseFloat(editingValues.amount) || 0,
        aadhaar_number: editingValues.aadhaar_number,
        bank_account_number: editingValues.bank_account_number,
        ifsc_code: editingValues.ifsc_code,
        mobile_number: editingValues.mobile_number,
        category: editingValues.category,
        scheme_name: editingValues.scheme_name,
        vikas_khand_name: editingValues.vikas_khand_name,
        vidhan_sabha_name: editingValues.vidhan_sabha_name,
        beneficiary_reg_date: editingValues.beneficiary_reg_date,
      };

      // Make the PUT request to update the beneficiary
      const response = await axios.put(BENEFICIARIES_API_URL, payload);

      // Check if the response is successful (status 200-299)
      if (response.status >= 200 && response.status < 300) {
        // Update the item in the local state
        setAllBeneficiaries((prev) =>
          prev.map((i) =>
            i.beneficiary_id === item.beneficiary_id ? { ...i, ...payload } : i,
          ),
        );
        setBeneficiaries((prev) =>
          prev.map((i) =>
            i.beneficiary_id === item.beneficiary_id ? { ...i, ...payload } : i,
          ),
        );
        setEditingRowId(null);
        setEditingValues({});
        setApiResponse({ message: "लाभार्थी सफलतापूर्वक अपडेट किया गया!" });
      } else {
        // Handle unexpected response status
        setApiError(`अप्रत्याशित प्रतिक्रिया स्थिति: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating item:", error);
      // Check if it's a network error or server error
      if (error.response) {
        setApiError(
          `सर्वर त्रुटि: ${error.response.status} - ${error.response.data?.message || "अज्ञात त्रुटि"}`,
        );
      } else if (error.request) {
        setApiError("नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।");
      } else {
        setApiError("लाभार्थी अपडेट करने में त्रुटि हुई।");
      }
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditingRowId(null);
    setEditingValues({});
    setEditingOtherMode({
      supplied_item_name: false,
      unit: false,
      category: false,
      scheme_name: false,
    });
  };

  // Handle delete
  const handleDelete = async (item) => {
    if (window.confirm("क्या आप इस लाभार्थी को हटाना चाहते हैं?")) {
      try {
        // Prepare payload with beneficiary_id
        const payload = {
          beneficiary_id: item.beneficiary_id,
        };

        // Send DELETE request with payload in the body
        const response = await axios.delete(BENEFICIARIES_API_URL, {
          data: payload,
        });

        // Check if the response is successful (status 200-299)
        if (response.status >= 200 && response.status < 300) {
          // Remove the item from the local state
          setAllBeneficiaries((prev) =>
            prev.filter((i) => i.beneficiary_id !== item.beneficiary_id),
          );
          setBeneficiaries((prev) =>
            prev.filter((i) => i.beneficiary_id !== item.beneficiary_id),
          );
          setApiResponse({ message: "लाभार्थी सफलतापूर्वक हटा दिया गया!" });
        } else {
          // Handle unexpected response status
          setApiError(`अप्रत्याशित प्रतिक्रिया स्थिति: ${response.status}`);
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        // Check if it's a network error or server error
        if (error.response) {
          setApiError(
            `सर्वर त्रुटि: ${error.response.status} - ${error.response.data?.message || "अज्ञात त्रुटि"}`,
          );
        } else if (error.request) {
          setApiError("नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।");
        } else {
          setApiError("लाभार्थी हटाने में त्रुटि हुई।");
        }
      }
    }
  };

  // Generate pagination items similar to MainDashboard.js
  const totalPages = Math.ceil(beneficiaries.length / itemsPerPage);
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

  const validateRow = (rowData, rowIndex) => {
    const errors = [];

    if (rowData.center_name_invalid) {
      errors.push(
        `Row ${rowIndex}: Invalid Kendra Name - entered value: "${rowData.center_name_original || rowData.center_name}"`,
      );
    } else if (rowData.center_name_needs_correction) {
      errors.push(
        `Row ${rowIndex}: Please replace the Kendra name with the correct valid name`,
      );
    }

    // Check if row is completely empty
    const isRowEmpty =
      !rowData.farmer_name ||
      (!rowData.farmer_name.toString().trim() &&
        !rowData.father_name?.toString().trim() &&
        !rowData.address?.toString().trim() &&
        !rowData.center_name?.toString().trim() &&
        !rowData.supplied_item_name?.toString().trim() &&
        !rowData.unit?.toString().trim() &&
        !rowData.quantity?.toString().trim() &&
        !rowData.rate?.toString().trim() &&
        !rowData.amount?.toString().trim() &&
        !rowData.category?.toString().trim() &&
        !rowData.scheme_name?.toString().trim());

    // If row is completely empty, skip validation
    if (isRowEmpty) {
      return errors;
    }

    // Only validate numeric fields if they are provided
    if (
      rowData.quantity !== "" &&
      rowData.quantity !== null &&
      rowData.quantity !== undefined
    ) {
      if (isNaN(parseFloat(rowData.quantity))) {
        errors.push(`Row ${rowIndex}: मात्रा एक संख्या होनी चाहिए`);
      }
    }
    if (
      rowData.rate !== "" &&
      rowData.rate !== null &&
      rowData.rate !== undefined
    ) {
      if (isNaN(parseFloat(rowData.rate))) {
        errors.push(`Row ${rowIndex}: दर एक संख्या होनी चाहिए`);
      }
    }
    if (
      rowData.amount !== "" &&
      rowData.amount !== null &&
      rowData.amount !== undefined
    ) {
      if (isNaN(parseFloat(rowData.amount))) {
        errors.push(`Row ${rowIndex}: देय अनुदान राशि एक संख्या होनी चाहिए`);
      }
    }

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

  // Handle file change
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
      reader.onload = async (f) => {
        try {
          const data = new Uint8Array(f.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length <= 1) {
            setApiError("Excel file contains no data");
            return;
          }

          const dataRows = jsonData.slice(1).filter((row) =>
            Array.isArray(row) &&
            row.some(
              (cell) =>
                cell !== null &&
                cell !== undefined &&
                String(cell).trim() !== "",
            ),
          );
          const headers = jsonData[0];

          const headerMapping = {};
          headers.forEach((header, index) => {
            if (header) {
              const key = header.toString().trim();
              headerMapping[key] = index;
              headerMapping[key.toLowerCase()] = index;
              headerMapping[key.replace(/\s+/g, "").toLowerCase()] = index;
            }
          });

          const getCell = (row, names) => {
            for (const name of names) {
              if (!name) continue;
              const keysToTry = [
                name,
                name.toLowerCase(),
                name.replace(/\s+/g, ""),
                name.replace(/\s+/g, "").toLowerCase(),
              ];
              for (const k of keysToTry) {
                if (typeof headerMapping[k] !== "undefined") {
                  return row[headerMapping[k]];
                }
              }
            }
            return undefined;
          };

          const today = getTodayInBackendFormat();
          const parsedRows = dataRows
            .map((row, rowIndex) => {
              const regDateRaw =
                getCell(row, ["पंजीकरण तिथि", "beneficiary_reg_date"]) || today;
              const rawCenterName =
                getCell(row, ["केंद्र का नाम", "center_name"]) || "";
              const centerNameMatch = rawCenterName
                ? findClosestCenterName(rawCenterName)
                : null;
              return {
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
                vidhan_sabha_name:
                  getCell(row, ["विधानसभा का नाम", "vidhan_sabha_name"]) || "",
                vikas_khand_name:
                  getCell(row, ["विकास खंड का नाम", "vikas_khand_name"]) || "",
                scheme_name:
                  getCell(row, ["योजना का नाम", "scheme_name"]) || "",
                unit: getCell(row, ["इकाई", "unit"]) || "",
                supplied_item_name:
                  getCell(row, [
                    "आपूर्ति की गई वस्तु का नाम",
                    "supplied_item_name",
                  ]) || "",
                farmer_name:
                  getCell(row, ["किसान का नाम", "farmer_name"]) || "",
                father_name: getCell(row, ["पिता का नाम", "father_name"]) || "",
                category: getCell(row, ["श्रेणी", "category"]) || "",
                address: getCell(row, ["पता", "address"]) || "",
                mobile_number:
                  getCell(row, ["मोबाइल नंबर", "mobile_number"]) || "",
                aadhaar_number:
                  getCell(row, ["आधार नंबर", "aadhaar_number"]) || "",
                bank_account_number:
                  getCell(row, ["बैंक खाता नंबर", "bank_account_number"]) || "",
                ifsc_code:
                  getCell(row, ["IFSC कोड", "ifsc_code"]) ||
                  getCell(row, ["ifsc कोड"]) ||
                  "",
                quantity: Number.isFinite(
                  Number(getCell(row, ["मात्रा", "quantity"]) || 0),
                )
                  ? roundTo2Decimals(getCell(row, ["मात्रा", "quantity"]) || 0)
                  : 0,
                rate: Number.isFinite(Number(getCell(row, ["दर", "rate"]) || 0))
                  ? roundTo2Decimals(getCell(row, ["दर", "rate"]) || 0)
                  : 0,
                amount: Number.isFinite(
                  Number(getCell(row, ["देय अनुदान राशि", "amount"]) || 0),
                )
                  ? roundTo2Decimals(
                      getCell(row, ["देय अनुदान राशि", "amount"]) || 0,
                    )
                  : 0,
                original_beneficiary_reg_date:
                  convertToDisplayFormat(regDateRaw),
                beneficiary_reg_date: parseDateFromExcel(regDateRaw),
                rowIndex: rowIndex + 2,
                _originalIndex: rowIndex,
              };
            })
            .filter((row) => !isEmptyRow(row));

          const validRows = [];
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
            } else {
              validRows.push(rowData);
            }
          });

          // Fetch existing beneficiaries to check for duplicates
          try {
            const existingResponse = await axios.get(BENEFICIARIES_API_URL);
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
                  String(existing.unit || "").trim() ===
                    String(row.unit || "").trim() &&
                  String(existing.supplied_item_name || "").trim() ===
                    String(row.supplied_item_name || "").trim() &&
                  String(existing.farmer_name || "").trim() ===
                    String(row.farmer_name || "").trim() &&
                  String(existing.father_name || "").trim() ===
                    String(row.father_name || "").trim() &&
                  String(existing.category || "").trim() ===
                    String(row.category || "").trim() &&
                  String(existing.address || "").trim() ===
                    String(row.address || "").trim() &&
                  String(existing.mobile_number || "").trim() ===
                    String(row.mobile_number || "").trim() &&
                  String(existing.aadhaar_number || "").trim() ===
                    String(row.aadhaar_number || "").trim() &&
                  String(existing.bank_account_number || "").trim() ===
                    String(row.bank_account_number || "").trim() &&
                  String(existing.ifsc_code || "").trim() ===
                    String(row.ifsc_code || "").trim() &&
                  parseFloat(existing.quantity || 0) ===
                    parseFloat(row.quantity || 0) &&
                  parseFloat(existing.rate || 0) ===
                    parseFloat(row.rate || 0) &&
                  parseFloat(existing.amount || 0) ===
                    parseFloat(row.amount || 0) &&
                  existing.beneficiary_reg_date === row.beneficiary_reg_date
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
              const key = `${String(row.center_name || "").trim()}|${String(row.scheme_name || "").trim()}|${String(row.unit || "").trim()}|${String(row.supplied_item_name || "").trim()}|${String(row.farmer_name || "").trim()}|${String(row.father_name || "").trim()}|${String(row.category || "").trim()}|${String(row.address || "").trim()}|${String(row.mobile_number || "").trim()}|${String(row.aadhaar_number || "").trim()}|${String(row.bank_account_number || "").trim()}|${String(row.ifsc_code || "").trim()}|${parseFloat(row.quantity || 0)}|${parseFloat(row.rate || 0)}|${parseFloat(row.amount || 0)}|${row.beneficiary_reg_date}`;

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

            // Check for center name corrections needed
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
          setApiError("Error parsing Excel file: " + parseError.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setApiError("Error reading file: " + error.message);
    }
  };

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
          const payload = {
            farmer_name: rowData.farmer_name || "",
            father_name: rowData.father_name || "",
            address: rowData.address || "",
            center_name: rowData.center_name || "",
            supplied_item_name: rowData.supplied_item_name || "",
            unit: rowData.unit || "",
            quantity: Number.isFinite(Number(rowData.quantity))
              ? parseFloat(rowData.quantity)
              : 0,
            rate: Number.isFinite(Number(rowData.rate))
              ? parseFloat(rowData.rate)
              : 0,
            amount: Number.isFinite(Number(rowData.amount))
              ? parseFloat(rowData.amount)
              : 0,
            aadhaar_number: rowData.aadhaar_number || "",
            bank_account_number: rowData.bank_account_number || "",
            ifsc_code: rowData.ifsc_code || "",
            mobile_number: rowData.mobile_number || "",
            category: rowData.category || "",
            scheme_name: rowData.scheme_name || "",
            vikas_khand_name: rowData.vikas_khand_name || "",
            vidhan_sabha_name: rowData.vidhan_sabha_name || "",
            beneficiary_reg_date: rowData.beneficiary_reg_date || "",
          };

          const response = await axios.post(BENEFICIARIES_API_URL, payload);

          if (response.status === 200 || response.status === 201) {
            const returned =
              response.data && response.data.data
                ? response.data.data
                : response.data;
            const itemToAdd = returned || payload;
            const normalized = {
              beneficiary_id: itemToAdd.beneficiary_id || null,
              center_name: itemToAdd.center_name || "",
              vidhan_sabha_name: itemToAdd.vidhan_sabha_name || "",
              vikas_khand_name: itemToAdd.vikas_khand_name || "",
              scheme_name: itemToAdd.scheme_name || "",
              unit: itemToAdd.unit || "",
              supplied_item_name: itemToAdd.supplied_item_name || "",
              farmer_name: itemToAdd.farmer_name || "",
              father_name: itemToAdd.father_name || "",
              category: itemToAdd.category || "",
              address: itemToAdd.address || "",
              mobile_number: itemToAdd.mobile_number || "",
              aadhaar_number: itemToAdd.aadhaar_number || "",
              bank_account_number: itemToAdd.bank_account_number || "",
              ifsc_code: itemToAdd.ifsc_code || "",
              quantity: itemToAdd.quantity || 0,
              rate: itemToAdd.rate || 0,
              amount: itemToAdd.amount || 0,
              beneficiary_reg_date: itemToAdd.beneficiary_reg_date || "",
            };
            setAllBeneficiaries((prev) => [normalized, ...prev]);
            setBeneficiaries((prev) => [normalized, ...prev]);
            successCount++;
          } else {
            failedItems.push({
              rowIndex: rowData.rowIndex,
              data: rowData,
              reason: `Server error: ${response.status}`,
            });
          }
        } catch (error) {
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Upload failed";
          failedItems.push({
            rowIndex: validRows[i].rowIndex,
            data: validRows[i],
            reason: errorMsg,
          });
        }

        setUploadProgress(
          Math.round(((i + 1) / Math.max(validRows.length, 1)) * 100),
        );
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
      } else if (successCount > 0 && failedItems.length > 0) {
        setApiError(
          `⚠️ आंशिक अपलोड: ${successCount} सफल, ${failedItems.length} विफल।`,
        );
      } else if (failedItems.length > 0) {
        setApiError(`❌ अपलोड विफल: सभी रिकॉर्ड विफल रहे।`);
      }
    } catch (error) {
      console.error("Error during upload:", error);
      setApiError("अपलोड में त्रुटि: " + error.message);
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
        if (name === "supplied_item_name" && value) {
          // Reset dependent fields
          updatedFormData.unit = "";
          updatedFormData.category = "";
          updatedFormData.scheme_name = "";
          setOtherMode((prev) => ({
            ...prev,
            unit: false,
            category: false,
            scheme_name: false,
          }));
          // Fetch unit options with center_name
          fetchFormFilters(value, "", formData.center_name);
        } else if (
          name === "category" &&
          value &&
          formData.supplied_item_name
        ) {
          // Reset dependent fields
          updatedFormData.scheme_name = "";
          setOtherMode((prev) => ({
            ...prev,
            scheme_name: false,
          }));
          // Fetch scheme options with center_name
          fetchFormFilters(
            formData.supplied_item_name,
            value,
            formData.center_name,
          );
        }

        // If center changes, fetch vikas khand data and reset related fields
        if (name === "center_name") {
          if (value) {
            fetchVikasKhandData(value);
            // Fetch supplied item options for this center
            fetchSuppliedItemsForCenter(value);
          } else {
            setVikasKhandData(null);
            updatedFormData.vikas_khand_name = "";
            updatedFormData.vidhan_sabha_name = "";
            // Reset form options to defaults
            fetchFormFilters();
          }
        }
      }
      // If in other mode, just update the value without triggering cascading
    }

    // Auto-calculate amount when quantity and rate change
    if (name === "quantity" || name === "rate") {
      const quantity = parseFloat(value) || 0;
      const rate = parseFloat(name === "quantity" ? formData.rate : value) || 0;
      updatedFormData.amount = roundTo2Decimals(quantity * rate).toString();
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
      // Prepare payload to match API requirements
      // Use today's date if beneficiary_reg_date is empty
      const today = getTodayInBackendFormat();
      const payload = {
        farmer_name: formData.farmer_name,
        father_name: formData.father_name,
        address: formData.address,
        center_name: formData.center_name,
        supplied_item_name: formData.supplied_item_name,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        rate: parseFloat(formData.rate),
        amount: parseFloat(formData.amount),
        beneficiary_reg_date:
          convertToBackendFormat(formData.beneficiary_reg_date) || today,
        aadhaar_number: formData.aadhaar_number,
        bank_account_number: formData.bank_account_number,
        ifsc_code: formData.ifsc_code,
        mobile_number: formData.mobile_number,
        category: formData.category,
        scheme_name: formData.scheme_name,
        vikas_khand_name: formData.vikas_khand_name,
        vidhan_sabha_name: formData.vidhan_sabha_name,
      };

      const response = await axios.post(BENEFICIARIES_API_URL, payload);

      // Handle both possible response structures
      const responseData =
        response.data && response.data.data
          ? response.data.data
          : response.data;
      setApiResponse(responseData);

      // Reset form after successful submission
      setFormData({
        farmer_name: "",
        father_name: "",
        address: "",
        center_name: "",
        supplied_item_name: "",
        unit: "",
        quantity: "",
        rate: "",
        amount: "",
        aadhaar_number: "",
        bank_account_number: "",
        ifsc_code: "",
        mobile_number: "",
        category: "",
        scheme_name: "",
        vikas_khand_name: "",
        vidhan_sabha_name: "",
        beneficiary_reg_date: "",
      });

      // Clear errors and API states
      setErrors({});
      setApiError(null);

      // Clear vikas khand data and other mode
      setVikasKhandData(null);
      setOtherMode({
        supplied_item_name: false,
        unit: false,
        category: false,
        scheme_name: false,
      });

      // Add to table
      const addedItem =
        responseData && Object.keys(responseData).length
          ? responseData
          : payload;
      // Normalize fields to avoid undefined values causing blank cells
      const normalized = {
        beneficiary_id: addedItem.beneficiary_id || null,
        center_name: addedItem.center_name || "",
        vidhan_sabha_name: addedItem.vidhan_sabha_name || "",
        vikas_khand_name: addedItem.vikas_khand_name || "",
        scheme_name: addedItem.scheme_name || "",
        unit: addedItem.unit || "",
        supplied_item_name: addedItem.supplied_item_name || "",
        farmer_name: addedItem.farmer_name || "",
        father_name: addedItem.father_name || "",
        category: addedItem.category || "",
        address: addedItem.address || "",
        mobile_number: addedItem.mobile_number || "",
        aadhaar_number: addedItem.aadhaar_number || "",
        bank_account_number: addedItem.bank_account_number || "",
        ifsc_code: addedItem.ifsc_code || "",
        quantity: addedItem.quantity || 0,
        rate: addedItem.rate || 0,
        amount: addedItem.amount || 0,
        beneficiary_reg_date: addedItem.beneficiary_reg_date || "",
        scheme_name: addedItem.scheme_name || "",
        vikas_khand_name: addedItem.vikas_khand_name || "",
        vidhan_sabha_name: addedItem.vidhan_sabha_name || "",
      };

      setAllBeneficiaries((prev) => [normalized, ...prev]);
      setBeneficiaries((prev) => [normalized, ...prev]);

      // If server didn't return an ID (created resource not returned), refresh list to get server-side data
      if (!normalized.beneficiary_id) {
        await fetchBeneficiaries();
      }
    } catch (error) {
      // Handle different error response formats
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
    // Helper to check if value is valid (not empty, null, undefined)
    const isValid = (value) => value && String(value).trim();

    // For single form entry, only require farmer_name
    // All other fields are optional - user can enter whatever they have
    if (!isValid(formData.farmer_name))
      newErrors.farmer_name = `${translations.farmerName} ${translations.required}`;

    // Optional fields - only validate if they have a value
    if (formData.quantity && isNaN(parseFloat(formData.quantity)))
      newErrors.quantity = `${translations.quantity} एक संख्या होनी चाहिए`;
    if (formData.rate && isNaN(parseFloat(formData.rate)))
      newErrors.rate = `${translations.rate} एक संख्या होनी चाहिए`;
    if (formData.amount && isNaN(parseFloat(formData.amount)))
      newErrors.amount = `${translations.amount} एक संख्या होनी चाहिए`;

    return newErrors;
  };

  return (
    <div>
      <Container fluid className="p-4">
        <Row>
          <Col lg={12} md={12} sm={12}>
            <DashBoardHeader />
          </Col>
        </Row>

        <Row className="left-top">
          {/* <Col lg={2} md={2} sm={12}>
            <LeftNav />
          </Col> */}

          <Col lg={12} md={12} sm={12}>
            <Container fluid className="dashboard-body-main bg-home">
              <h1 className="page-title">{translations.pageTitle}</h1>

              {/* Bulk Upload Section */}
              <Row className="mb-3">
                <Col sm={12} md={6} lg={6}>
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

              {apiResponse && (
                <Alert variant="success" className="small-fonts">
                  {translations.successMessage}
                </Alert>
              )}
              {apiError && (
                <Alert variant="danger" className="small-fonts">
                  {apiError}
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

              {failedRows.length > 0 && !isUploading && (
                <Alert variant="danger" className="small-fonts">
                  <strong>📋 विफल रिकॉर्ड ({failedRows.length}):</strong>
                  <Table striped bordered hover size="sm" className="mt-2">
                    <thead>
                      <tr>
                        <th>क्र.सं.</th>
                        <th>केंद्र का नाम</th>
                        <th>विधानसभा का नाम</th>
                        <th>विकास खंड का नाम</th>
                        <th>योजना का नाम</th>
                        <th>आपूर्ति की गई वस्तु का नाम</th>
                        <th>किसान का नाम</th>
                        <th>पिता का नाम</th>
                        <th>श्रेणी</th>
                        <th>पता</th>
                        <th>मोबाइल नंबर</th>
                        <th>आधार नंबर</th>
                        <th>बैंक खाता नंबर</th>
                        <th>IFSC कोड</th>
                        <th>इकाई</th>
                        <th>मात्रा</th>
                        <th>दर</th>
                        <th>देय अनुदान राशि</th>
                        <th>पंजीकरण तिथि</th>
                        <th>त्रुटि</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedRows.slice(0, 20).map((row, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{row.data?.center_name || "-"}</td>
                          <td>{row.data?.vidhan_sabha_name || "-"}</td>
                          <td>{row.data?.vikas_khand_name || "-"}</td>
                          <td>{row.data?.scheme_name || "-"}</td>
                          <td>{row.data?.supplied_item_name || "-"}</td>
                          <td>{row.data?.farmer_name || "-"}</td>
                          <td>{row.data?.father_name || "-"}</td>
                          <td>{row.data?.category || "-"}</td>
                          <td>{row.data?.address || "-"}</td>
                          <td>{row.data?.mobile_number || "-"}</td>
                          <td>{row.data?.aadhaar_number || "-"}</td>
                          <td>{row.data?.bank_account_number || "-"}</td>
                          <td>{row.data?.ifsc_code || "-"}</td>
                          <td>{row.data?.unit || "-"}</td>
                          <td>{row.data?.quantity || "-"}</td>
                          <td>{row.data?.rate || "-"}</td>
                          <td>{row.data?.amount || "-"}</td>
                          <td
                            style={{
                              backgroundColor: row.reason?.includes("तिथि")
                                ? "#ffcccc"
                                : "inherit",
                            }}
                          >
                            {row.data?.original_beneficiary_reg_date || "-"}
                          </td>
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
                        <strong>निर्देश:</strong> नीचे डेटा की जांच करें। यदि
                        सभी डेटा सही है तो "अपलोड करें" बटन पर क्लिक करें। खाली
                        पंक्तियाँ स्वचालित रूप से छोड़ दी जाएंगी।
                      </Alert>
                      <Table
                        striped
                        bordered
                        hover
                        size="sm"
                        className="small-fonts"
                      >
                        <thead>
                          <tr>
                            <th>क्र.सं.</th>
                            <th>केंद्र का नाम</th>
                            <th>विधानसभा का नाम</th>
                            <th>विकास खंड का नाम</th>
                            <th>योजना का नाम</th>
                            <th>आपूर्ति की गई वस्तु का नाम</th>
                            <th>किसान का नाम</th>
                            <th>पिता का नाम</th>
                            <th>श्रेणी</th>
                            <th>पता</th>
                            <th>मोबाइल नंबर</th>
                            <th>आधार नंबर</th>
                            <th>बैंक खाता नंबर</th>
                            <th>IFSC कोड</th>
                            <th>इकाई</th>
                            <th>मात्रा</th>
                            <th>दर</th>
                            <th>देय अनुदान राशि</th>
                            <th>पंजीकरण तिथि</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 100).map((row, idx) => (
                            <tr
                              key={idx}
                              style={{
                                backgroundColor: duplicateRowIndices.includes(
                                  row.rowIndex,
                                )
                                  ? "#ffcccc"
                                  : "inherit",
                              }}
                            >
                              <td>{idx + 1}</td>
                              <td
                                style={{
                                  backgroundColor: !row.center_name
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.center_name || "-"}
                              </td>
                              <td>{row.vidhan_sabha_name || "-"}</td>
                              <td>{row.vikas_khand_name || "-"}</td>
                              <td>{row.scheme_name || "-"}</td>
                              <td
                                style={{
                                  backgroundColor: !row.supplied_item_name
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.supplied_item_name || "-"}
                              </td>
                              <td>{row.farmer_name || "-"}</td>
                              <td>{row.father_name || "-"}</td>
                              <td
                                style={{
                                  backgroundColor: !row.category
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.category || "-"}
                              </td>
                              <td>{row.address || "-"}</td>
                              <td>{row.mobile_number || "-"}</td>
                              <td>{row.aadhaar_number || "-"}</td>
                              <td>{row.bank_account_number || "-"}</td>
                              <td>{row.ifsc_code || "-"}</td>
                              <td
                                style={{
                                  backgroundColor: !row.unit
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.unit || "-"}
                              </td>
                              <td
                                style={{
                                  backgroundColor: isNaN(
                                    parseFloat(row.quantity),
                                  )
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.quantity || "-"}
                              </td>
                              <td
                                style={{
                                  backgroundColor: isNaN(parseFloat(row.rate))
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.rate || "-"}
                              </td>
                              <td
                                style={{
                                  backgroundColor: isNaN(parseFloat(row.amount))
                                    ? "#ffcccc"
                                    : "inherit",
                                }}
                              >
                                {row.amount || "-"}
                              </td>
                              <td
                                style={{
                                  backgroundColor:
                                    !/^\d{2}\/\d{2}\/\d{4}$/.test(
                                      row.original_beneficiary_reg_date,
                                    )
                                      ? "#ffcccc"
                                      : "inherit",
                                }}
                              >
                                {row.original_beneficiary_reg_date || "-"}
                              </td>
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
                          {validationErrorsList
                            .slice(0, 10)
                            .map((err, errIdx) => (
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
                              ... और {validationErrorsList.length - 10} और
                              त्रुटियां
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
                    <Alert variant="warning">
                      कोई डुप्लीकेट रिकॉर्ड नहीं मिला
                    </Alert>
                  ) : (
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="small-fonts"
                    >
                      <thead>
                        <tr>
                          <th>क्र.सं. (Excel)</th>
                          <th>केंद्र का नाम</th>
                          <th>विधानसभा का नाम</th>
                          <th>विकास खंड का नाम</th>
                          <th>योजना का नाम</th>
                          <th>आपूर्ति की गई वस्तु का नाम</th>
                          <th>किसान का नाम</th>
                          <th>पिता का नाम</th>
                          <th>श्रेणी</th>
                          <th>पता</th>
                          <th>मोबाइल नंबर</th>
                          <th>आधार नंबर</th>
                          <th>बैंक खाता नंबर</th>
                          <th>IFSC कोड</th>
                          <th>इकाई</th>
                          <th>मात्रा</th>
                          <th>दर</th>
                          <th>देय अनुदान राशि</th>
                          <th>पंजीकरण तिथि</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDuplicateEntries.map((row, idx) => (
                          <tr key={idx} style={{ backgroundColor: "#ffcccc" }}>
                            <td>{row.rowIndex - 1}</td>
                            <td>{row.center_name || "-"}</td>
                            <td>{row.vidhan_sabha_name || "-"}</td>
                            <td>{row.vikas_khand_name || "-"}</td>
                            <td>{row.scheme_name || "-"}</td>
                            <td>{row.supplied_item_name || "-"}</td>
                            <td>{row.farmer_name || "-"}</td>
                            <td>{row.father_name || "-"}</td>
                            <td>{row.category || "-"}</td>
                            <td>{row.address || "-"}</td>
                            <td>{row.mobile_number || "-"}</td>
                            <td>{row.aadhaar_number || "-"}</td>
                            <td>{row.bank_account_number || "-"}</td>
                            <td>{row.ifsc_code || "-"}</td>
                            <td>{row.unit || "-"}</td>
                            <td>{row.quantity || "-"}</td>
                            <td>{row.rate || "-"}</td>
                            <td>{row.amount || "-"}</td>
                            <td>{row.original_beneficiary_reg_date || "-"}</td>
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
                    <strong>
                      सिस्टम द्वारा सुझाया गया सही नाम पहले से चुना गया है; यदि चाहें तो इसे ड्रॉपडाउन से बदल सकते हैं:
                    </strong>
                    <br />
                    इनमें से कोई भी नाम सही नहीं होने पर अपलोड नहीं होगा।
                  </Alert>
                  <Table
                    striped
                    bordered
                    hover
                    size="sm"
                    className="small-fonts"
                  >
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
                          <td style={{ color: "red" }}>
                            {correction.original}
                          </td>
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

              {/* Excel Upload Instructions */}
              <Alert variant="info" className="small-fonts mb-3">
                <strong>Excel अपलोड निर्देश:</strong>
                <ul className="mb-0">
                  <li>कृपया सही फॉर्मेट में Excel फाइल अपलोड करें</li>
                  <li>
                    अनिवार्य फ़ील्ड: केंद्र का नाम, योजना का नाम, आपूर्ति की गई
                    वस्तु का नाम, किसान का नाम, पिता का नाम, श्रेणी, पता, मोबाइल
                    नंबर, आधार नंबर, बैंक खाता नंबर, IFSC कोड, इकाई, मात्रा, दर,
                    देय अनुदान राशि
                  </li>
                  <li>मात्रा, दर और देय अनुदान राशि संख्यात्मक होनी चाहिए</li>
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

              {/* Beneficiaries Form Section - Only show when center is selected */}
              {formData.center_name && (
                <Form
                  onSubmit={handleSubmit}
                  className="registration-form compact-form"
                >
                  <Row>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="farmer_name">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.farmerName}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="farmer_name"
                          value={formData.farmer_name}
                          onChange={handleChange}
                          isInvalid={!!errors.farmer_name}
                          className="compact-input"
                          placeholder="किसान का नाम दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.farmer_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="father_name">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.fatherName}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="father_name"
                          value={formData.father_name}
                          onChange={handleChange}
                          isInvalid={!!errors.father_name}
                          className="compact-input"
                          placeholder="पिता का नाम दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.father_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="address">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.address}
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          isInvalid={!!errors.address}
                          className="compact-input"
                          placeholder="पता दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.address}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="supplied_item_name"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.suppliedItemName}
                        </Form.Label>
                        {otherMode.supplied_item_name ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="supplied_item_name"
                              value={formData.supplied_item_name}
                              onChange={handleChange}
                              isInvalid={!!errors.supplied_item_name}
                              className="compact-input"
                              placeholder="आपूर्ति की गई वस्तु का नाम दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  supplied_item_name: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  supplied_item_name: "",
                                }));
                                // Refetch options
                                fetchFormFilters("", "", formData.center_name);
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="supplied_item_name"
                            value={formData.supplied_item_name}
                            onChange={handleChange}
                            isInvalid={!!errors.supplied_item_name}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.supplied_item_name.map(
                              (item, index) => (
                                <option key={index} value={item}>
                                  {item}
                                </option>
                              ),
                            )}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.supplied_item_name}
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
                                setFormData((prev) => ({ ...prev, unit: "" }));
                                // Refetch base options
                                fetchFormFilters("", "", formData.center_name);
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
                      <Form.Group className="mb-2" controlId="quantity">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.quantity}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleChange}
                          isInvalid={!!errors.quantity}
                          className="compact-input"
                          placeholder="मात्रा दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.quantity}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
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
                      <Form.Group className="mb-2" controlId="amount">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.amount}
                        </Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          isInvalid={!!errors.amount}
                          className="compact-input"
                          placeholder="देय अनुदान राशि दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.amount}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="aadhaar_number">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.aadhaarNumber}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="aadhaar_number"
                          value={formData.aadhaar_number}
                          onChange={handleChange}
                          isInvalid={!!errors.aadhaar_number}
                          className="compact-input"
                          placeholder="आधार नंबर दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.aadhaar_number}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="bank_account_number"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.bankAccountNumber}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="bank_account_number"
                          value={formData.bank_account_number}
                          onChange={handleChange}
                          isInvalid={!!errors.bank_account_number}
                          className="compact-input"
                          placeholder="बैंक खाता नंबर दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.bank_account_number}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="ifsc_code">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.ifscCode}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={handleChange}
                          isInvalid={!!errors.ifsc_code}
                          className="compact-input"
                          placeholder="IFSC कोड दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.ifsc_code}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="mobile_number">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.mobileNumber}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="mobile_number"
                          value={formData.mobile_number}
                          onChange={handleChange}
                          isInvalid={!!errors.mobile_number}
                          className="compact-input"
                          placeholder="मोबाइल नंबर दर्ज करें"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.mobile_number}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-2" controlId="category">
                        <Form.Label className="small-fonts fw-bold">
                          {translations.category}
                        </Form.Label>
                        {otherMode.category ? (
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="category"
                              value={formData.category}
                              onChange={handleChange}
                              isInvalid={!!errors.category}
                              className="compact-input"
                              placeholder="श्रेणी दर्ज करें"
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="ms-1"
                              onClick={() => {
                                setOtherMode((prev) => ({
                                  ...prev,
                                  category: false,
                                }));
                                setFormData((prev) => ({
                                  ...prev,
                                  category: "",
                                }));
                                // Refetch base options
                                fetchFormFilters("", "", formData.center_name);
                              }}
                              title="विकल्प दिखाएं"
                            >
                              ↺
                            </Button>
                          </div>
                        ) : (
                          <Form.Select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            isInvalid={!!errors.category}
                            className="compact-input"
                            disabled={isLoadingFilters}
                          >
                            <option value="">
                              {translations.selectOption}
                            </option>
                            {formOptions.category.map((cat, index) => (
                              <option key={index} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="Other">अन्य</option>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.category}
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
                                // Refetch base options
                                fetchFormFilters("", "", formData.center_name);
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
                            {formOptions.scheme_name.map((scheme, index) => (
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
                        <div className="d-flex">
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
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={refreshVikasKhandData}
                            disabled={
                              !formData.center_name || isFetchingVikasKhand
                            }
                            className="ms-1"
                            title="Refresh Vikas Khand Data"
                          >
                            <FaSync
                              className={isFetchingVikasKhand ? "fa-spin" : ""}
                            />
                          </Button>
                        </div>
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
                        <Form.Control.Feedback type="invalid">
                          {errors.vidhan_sabha_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group
                        className="mb-2"
                        controlId="beneficiary_reg_date"
                      >
                        <Form.Label className="small-fonts fw-bold">
                          {translations.beneficiaryRegDate}
                        </Form.Label>
                        <Form.Control
                          type="date"
                          name="beneficiary_reg_date"
                          value={formData.beneficiary_reg_date}
                          onChange={handleChange}
                          className="compact-input"
                        />
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

              {/* Refresh Form Options Button */}
              {formData.center_name && (
                <div className="d-flex justify-content-end mb-3">
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={refreshFormOptions}
                    disabled={isLoadingFilters}
                    className="me-2"
                    title="Refresh Form Options"
                  >
                    <FaSync className={isLoadingFilters ? "fa-spin" : ""} />
                    Refresh Options
                  </Button>
                </div>
              )}

              {/* Table Section */}
              <div className="billing-table-section mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="small-fonts mb-0">लाभार्थी डेटा</h3>
                  <div className="d-flex align-items-center">
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
                    {beneficiaries.length > 0 && (
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
                                beneficiaries,
                                `Beneficiaries_${new Date()
                                  .toISOString()
                                  .slice(0, 10)}`,
                                beneficiariesTableColumnMapping,
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
                            <Tooltip id="tooltip-pdf">PDF डाउनलोड करें</Tooltip>
                          }
                        >
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() =>
                              downloadPdf(
                                beneficiaries,
                                `Beneficiaries_${new Date()
                                  .toISOString()
                                  .slice(0, 10)}`,
                                beneficiariesTableColumnMapping,
                                selectedColumns,
                                "लाभार्थी डेटा",
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

                {/* Table info with pagination details */}
                {beneficiaries.length > 0 && (
                  <div className="table-info mb-2 d-flex justify-content-between align-items-center">
                    <span className="small-fonts">
                      {translations.showing}{" "}
                      {(currentPage - 1) * itemsPerPage + 1} {translations.to}{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        beneficiaries.length,
                      )}{" "}
                      {translations.of} {beneficiaries.length}{" "}
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
                {beneficiaries.length > 0 && (
                  <ColumnSelection
                    columns={beneficiariesTableColumns}
                    selectedColumns={selectedColumns}
                    setSelectedColumns={setSelectedColumns}
                    title="कॉलम चुनें"
                  />
                )}

                {/* New Created At Date Filter Section - Separate from date range filters */}
                {beneficiaries.length > 0 && (
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
                            {translations.farmerName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="farmer_name"
                            value={filters.farmer_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                farmer_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.farmer_name.map(
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
                            {translations.suppliedItemName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="supplied_item_name"
                            value={filters.supplied_item_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                supplied_item_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.supplied_item_name.map(
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
                            {translations.category}
                          </Form.Label>
                          <Select
                            isMulti
                            name="category"
                            value={filters.category.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                category: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.category.map((option) => ({
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
                            options={filterOptions.scheme_name.map(
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

                {/* Summary Cards Section */}
                {beneficiaries.length > 0 && (
                  <div className="summary-cards mb-4">
                    <Row className="gy-3">
                      <Col xs={12} sm={6} lg={4} xl={2}>
                        <div
                          className="summary-card p-3 h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => openSummaryModal("vikas")}
                        >
                          <h5>विकास खंड सारांश</h5>
                          <div className="mt-3">
                            <p>
                              <strong>कुल विकास खंड:</strong>{" "}
                              {summaryStats.vikas.uniqueCount}
                            </p>
                            <p>
                              <strong>शीर्ष ब्लॉक:</strong>{" "}
                              {summaryStats.vikas.topLabel}{" "}
                              {summaryStats.vikas.topCount > 0
                                ? `(${summaryStats.vikas.topCount})`
                                : ""}
                            </p>
                            <p>
                              <strong>कुल लाभार्थी:</strong>{" "}
                              {summaryStats.vikas.totalBeneficiaries}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col xs={12} sm={6} lg={4} xl={2}>
                        <div
                          className="summary-card p-3 h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => openSummaryModal("vidhan")}
                        >
                          <h5>विधानसभा सारांश</h5>
                          <div className="mt-3">
                            <p>
                              <strong>कुल विधानसभा:</strong>{" "}
                              {summaryStats.vidhan.uniqueCount}
                            </p>
                            <p>
                              <strong>शीर्ष विधानसभा:</strong>{" "}
                              {summaryStats.vidhan.topLabel}{" "}
                              {summaryStats.vidhan.topCount > 0
                                ? `(${summaryStats.vidhan.topCount})`
                                : ""}
                            </p>
                            <p>
                              <strong>कुल लाभार्थी:</strong>{" "}
                              {summaryStats.vidhan.totalBeneficiaries}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col xs={12} sm={6} lg={4} xl={2}>
                        <div
                          className="summary-card p-3 h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => openSummaryModal("supplied")}
                        >
                          <h5>आपूर्ति वस्तु सारांश</h5>
                          <div className="mt-3">
                            <p>
                              <strong>कुल वस्तुएँ:</strong>{" "}
                              {summaryStats.suppliedItem.uniqueCount}
                            </p>
                            <p>
                              <strong>कुल मात्रा:</strong>{" "}
                              {summaryStats.suppliedItem.totalQuantity}
                            </p>
                            <p>
                              <strong>कुल देय अनुदान राशि:</strong> ₹
                              {summaryStats.suppliedItem.totalAmount}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col xs={12} sm={6} lg={4} xl={2}>
                        <div
                          className="summary-card p-3 h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => openSummaryModal("center")}
                        >
                          <h5>केंद्र सारांश</h5>
                          <div className="mt-3">
                            <p>
                              <strong>कुल केंद्र:</strong>{" "}
                              {summaryStats.center.uniqueCount}
                            </p>
                            <p>
                              <strong>सबसे सक्रिय केंद्र:</strong>{" "}
                              {summaryStats.center.topLabel}
                            </p>
                            <p>
                              <strong>कुल रिकॉर्ड:</strong>{" "}
                              {summaryStats.center.totalRecords}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col xs={12} sm={6} lg={4} xl={2}>
                        <div
                          className="summary-card p-3 h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => openSummaryModal("scheme")}
                        >
                          <h5>योजना सारांश</h5>
                          <div className="mt-3">
                            <p>
                              <strong>कुल योजना:</strong>{" "}
                              {summaryStats.scheme.uniqueCount}
                            </p>
                            <p>
                              <strong>सबसे अधिक उपयोग:</strong>{" "}
                              {summaryStats.scheme.topLabel}
                            </p>
                            <p>
                              <strong>कुल वितरित देय अनुदान राशि:</strong> ₹
                              {summaryStats.scheme.totalAmount}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col xs={12} sm={6} lg={4} xl={2}>
                        <div
                          className="summary-card p-3 h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => openSummaryModal("address")}
                        >
                          <h5>पता सारांश</h5>
                          <div className="mt-3">
                            <p>
                              <strong>कुल स्थान:</strong>{" "}
                              {summaryStats.address.uniqueCount}
                            </p>
                            <p>
                              <strong>शीर्ष स्थान:</strong>{" "}
                              {summaryStats.address.topLabel}{" "}
                              {summaryStats.address.topCount > 0
                                ? `(${summaryStats.address.topCount})`
                                : ""}
                            </p>
                            <p>
                              <strong>कुल लाभार्थी:</strong>{" "}
                              {summaryStats.address.totalBeneficiaries}
                            </p>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}

                <Modal
                  show={!!selectedSummaryModal}
                  onHide={closeSummaryModal}
                  fullscreen={true}
                  scrollable
                >
                  <Modal.Header closeButton className="bg-light">
                    <Modal.Title>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <span>
                          {selectedSummaryModal === "vikas" &&
                            "विकास खंड सारांश विवरण"}
                          {selectedSummaryModal === "vidhan" &&
                            "विधानसभा सारांश विवरण"}
                          {selectedSummaryModal === "supplied" &&
                            "आपूर्ति वस्तु सारांश विवरण"}
                          {selectedSummaryModal === "center" &&
                            "केंद्र सारांश विवरण"}
                          {selectedSummaryModal === "scheme" &&
                            "योजना सारांश विवरण"}
                          {selectedSummaryModal === "address" &&
                            "पता सारांश विवरण"}
                        </span>
                      </div>
                    </Modal.Title>
                  </Modal.Header>
                  <Modal.Body style={{ padding: "20px" }}>
                    {selectedSummaryModal === "vikas" && (
                      <>
                        <div className="mb-4 p-3 border rounded bg-light">
                          <h6 className="text-primary mb-3 border-bottom pb-2">
                            📊 मुख्य सारांश - विकास खंड अनुसार
                          </h6>
                          <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                          >
                            <Table
                              striped
                              bordered
                              hover
                              responsive
                              size="sm"
                              className="mb-2"
                            >
                              <thead>
                                <tr className="table-primary">
                                  <th>विकास खंड</th>
                                  <th>लाभार्थी</th>
                                  <th>देय अनुदान राशि (₹)</th>
                                  <th>मात्रा</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summaryStats.vikas.breakdown.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td>{item.label}</td>
                                      <td>{item.count}</td>
                                      <td>{item.amount.toFixed(2)}</td>
                                      <td>{item.quantity}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td>कुल</td>
                                  <td>
                                    {summaryStats.vikas.breakdown.reduce(
                                      (sum, item) => sum + item.count,
                                      0,
                                    )}
                                  </td>
                                  <td>
                                    ₹
                                    {summaryStats.vikas.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.amount,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td>
                                    {summaryStats.vikas.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🔷 इस विकास खंड में विधानसभा अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विधानसभा</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVidhan.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVidhan.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVidhan
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVidhan
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📋 इस विकास खंड में योजना अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>योजना</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byScheme.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byScheme.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byScheme
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byScheme
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏢 केंद्र अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>केंद्र</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byCenter.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byCenter.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byCenter
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        {renderCrossTabTable(
                          vikasByVidhan,
                          "vikas_khand_name",
                          "vidhan_sabha_name",
                          "🏗️ विकास खंड × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "vikasVidhan",
                        )}
                        {renderCrossTabTable(
                          vikasByScheme,
                          "vikas_khand_name",
                          "scheme_name",
                          "🏗️ विकास खंड × 📋 योजना (लाभार्थी, मात्रा व राशि)",
                          "vikasScheme",
                        )}
                        {renderCrossTabTable(
                          vikasBySuppliedItem,
                          "vikas_khand_name",
                          "supplied_item_name",
                          "🏗️ विकास खंड × 📦 वस्तु (लाभार्थी, मात्रा व राशि)",
                          "vikasSupplied",
                        )}
                        {renderCrossTabTable(
                          vikasByCenter,
                          "vikas_khand_name",
                          "center_name",
                          "🏗️ विकास खंड × 🏢 केंद्र (लाभार्थी, मात्रा व राशि)",
                          "vikasCenter",
                        )}
                        {renderCrossTabTable(
                          vikasByAddress,
                          "vikas_khand_name",
                          "address",
                          "🏗️ विकास खंड × 📍 पता (लाभार्थी, मात्रा व राशि)",
                          "vikasAddress",
                        )}
                        {renderCrossTabTable(
                          vidhanByVikas,
                          "vidhan_sabha_name",
                          "vikas_khand_name",
                          "🔷 विधानसभा × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "vidhanVikas",
                        )}
                        {renderCrossTabTable(
                          schemeByVikas,
                          "scheme_name",
                          "vikas_khand_name",
                          "📋 योजना × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "schemeVikas",
                        )}
                        {renderCrossTabTable(
                          suppliedByVikas,
                          "supplied_item_name",
                          "vikas_khand_name",
                          "📦 वस्तु × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "suppliedVikas",
                        )}
                        {renderCrossTabTable(
                          centerByVikas,
                          "center_name",
                          "vikas_khand_name",
                          "🏢 केंद्र × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "centerVikas",
                        )}
                      </>
                    )}
                    {selectedSummaryModal === "vidhan" && (
                      <>
                        <div className="mb-4 p-3 border rounded bg-light">
                          <h6 className="text-primary mb-3 border-bottom pb-2">
                            📊 मुख्य सारांश - विधानसभा अनुसार
                          </h6>
                          <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                          >
                            <Table
                              striped
                              bordered
                              hover
                              responsive
                              size="sm"
                              className="mb-2"
                            >
                              <thead>
                                <tr className="table-primary">
                                  <th>विधानसभा</th>
                                  <th>लाभार्थी</th>
                                  <th>देय अनुदान राशि (₹)</th>
                                  <th>मात्रा</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summaryStats.vidhan.breakdown.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td>{item.label}</td>
                                      <td>{item.count}</td>
                                      <td>{item.amount.toFixed(2)}</td>
                                      <td>{item.quantity}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td>कुल</td>
                                  <td>
                                    {summaryStats.vidhan.breakdown.reduce(
                                      (sum, item) => sum + item.count,
                                      0,
                                    )}
                                  </td>
                                  <td>
                                    ₹
                                    {summaryStats.vidhan.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.amount,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td>
                                    {summaryStats.vidhan.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📋 योजना अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>योजना</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byScheme.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byScheme.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byScheme
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byScheme
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📦 वस्तु अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>वस्तु</th>
                                <th>मात्रा</th>
                                <th>राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.bySuppliedItem.map(
                                (item, index) => (
                                  <tr key={index}>
                                    <td>{item.label}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.amount.toFixed(2)}</td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.bySuppliedItem
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.bySuppliedItem
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏗️ विकास खंड अनुसार
                          </h6>

                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विकास खंड</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>

                            <tbody>
                              {crossSummaries.byCenter.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity?.toFixed(2) || "0.00"}</td>
                                  <td>₹{item.amount?.toFixed(2) || "0.00"}</td>
                                </tr>
                              ))}
                            </tbody>

                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>

                                <td>
                                  {crossSummaries.byCenter.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>

                                <td>
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + (item.quantity || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>

                                <td>
                                  ₹
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + (item.amount || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏢 केंद्र अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>केंद्र</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byCenter.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byCenter.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byCenter
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        {renderCrossTabTable(
                          vidhanByScheme,
                          "vidhan_sabha_name",
                          "scheme_name",
                          "🔷 विधानसभा × 📋 योजना (लाभार्थी, मात्रा व राशि)",
                          "vidhanScheme",
                        )}
                        {renderCrossTabTable(
                          vidhanBySuppliedItem,
                          "vidhan_sabha_name",
                          "supplied_item_name",
                          "🔷 विधानसभा × 📦 वस्तु (लाभार्थी, मात्रा व राशि)",
                          "vidhanSupplied",
                        )}
                        {renderCrossTabTable(
                          vidhanByVikas,
                          "vidhan_sabha_name",
                          "vikas_khand_name",
                          "🔷 विधानसभा × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "vidhanVikas",
                        )}
                        {renderCrossTabTable(
                          vidhanByCenter,
                          "vidhan_sabha_name",
                          "center_name",
                          "🔷 विधानसभा × 🏢 केंद्र (लाभार्थी, मात्रा व राशि)",
                          "vidhanCenter",
                        )}
                        {renderCrossTabTable(
                          schemeByVidhan,
                          "scheme_name",
                          "vidhan_sabha_name",
                          "📋 योजना × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "schemeVidhan",
                        )}
                        {renderCrossTabTable(
                          suppliedByVidhan,
                          "supplied_item_name",
                          "vidhan_sabha_name",
                          "📦 वस्तु × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "suppliedVidhan",
                        )}
                        {renderCrossTabTable(
                          centerByVidhan,
                          "center_name",
                          "vidhan_sabha_name",
                          "🏢 केंद्र × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "centerVidhan",
                        )}
                        {renderCrossTabTable(
                          vikasByVidhan,
                          "vikas_khand_name",
                          "vidhan_sabha_name",
                          "🏗️ विकास खंड × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "vikasVidhan",
                        )}
                      </>
                    )}
                    {selectedSummaryModal === "supplied" && (
                      <>
                        <div className="mb-4 p-3 border rounded bg-light">
                          <h6 className="text-primary mb-3 border-bottom pb-2">
                            📊 मुख्य सारांश - आपूर्ति वस्तु अनुसार
                          </h6>
                          <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                          >
                            <Table
                              striped
                              bordered
                              hover
                              responsive
                              size="sm"
                              className="mb-2"
                            >
                              <thead>
                                <tr className="table-primary">
                                  <th>वस्तु</th>
                                  <th>लाभार्थी</th>
                                  <th>मात्रा</th>
                                  <th>देय अनुदान राशि (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summaryStats.suppliedItem.breakdown.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td>{item.label}</td>
                                      <td>{item.count}</td>
                                      <td>{item.quantity}</td>
                                      <td>{item.amount.toFixed(2)}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td>कुल</td>
                                  <td>
                                    {summaryStats.suppliedItem.breakdown.reduce(
                                      (sum, item) => sum + item.count,
                                      0,
                                    )}
                                  </td>
                                  <td>
                                    {summaryStats.suppliedItem.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td>
                                    ₹
                                    {summaryStats.suppliedItem.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.amount,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📋 किस योजना में उपयोग हुआ
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>योजना</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byScheme.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byScheme.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byScheme
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byScheme
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🔷 किस विधानसभा में उपयोग हुआ
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विधानसभा</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVikas.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVikas.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVikas
                                    .slice(0, 8)
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVikas
                                    .slice(0, 8)
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏗️ किस विकास खंड में उपयोग हुआ
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विकास खंड</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVikas.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVikas.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVikas
                                    .slice(0, 8)
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVikas
                                    .slice(0, 8)
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏢 किस केंद्र में उपयोग हुआ
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>केंद्र</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byCenter.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byCenter.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byCenter
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        {renderCrossTabTable(
                          suppliedByScheme,
                          "supplied_item_name",
                          "scheme_name",
                          "📦 वस्तु × 📋 योजना (लाभार्थी, मात्रा व राशि)",
                          "suppliedScheme",
                        )}
                        {renderCrossTabTable(
                          suppliedByVidhan,
                          "supplied_item_name",
                          "vidhan_sabha_name",
                          "📦 वस्तु × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "suppliedVidhan",
                        )}
                        {renderCrossTabTable(
                          suppliedByVikas,
                          "supplied_item_name",
                          "vikas_khand_name",
                          "📦 वस्तु × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "suppliedVikas",
                        )}
                        {renderCrossTabTable(
                          suppliedByCenter,
                          "supplied_item_name",
                          "center_name",
                          "📦 वस्तु × 🏢 केंद्र (लाभार्थी, मात्रा व राशि)",
                          "suppliedCenter",
                        )}
                      </>
                    )}
                    {selectedSummaryModal === "center" && (
                      <>
                        <div className="mb-4 p-3 border rounded bg-light">
                          <h6 className="text-primary mb-3 border-bottom pb-2">
                            📊 मुख्य सारांश - केंद्र अनुसार
                          </h6>
                          <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                          >
                            <Table
                              striped
                              bordered
                              hover
                              responsive
                              size="sm"
                              className="mb-2"
                            >
                              <thead>
                                <tr className="table-primary">
                                  <th>केंद्र</th>
                                  <th>लाभार्थी</th>
                                  <th>मात्रा</th>
                                  <th>देय अनुदान राशि (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summaryStats.center.breakdown.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td>{item.label}</td>
                                      <td>{item.count}</td>
                                      <td>{item.quantity}</td>
                                      <td>{item.amount.toFixed(2)}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td>कुल</td>
                                  <td>
                                    {summaryStats.center.breakdown.reduce(
                                      (sum, item) => sum + item.count,
                                      0,
                                    )}
                                  </td>
                                  <td>
                                    {summaryStats.center.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td>
                                    ₹
                                    {summaryStats.center.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.amount,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📋 योजना अनुसार
                          </h6>

                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>योजना</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>

                            <tbody>
                              {crossSummaries.byScheme.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity?.toFixed(2) || "0.00"}</td>
                                  <td>₹{item.amount?.toFixed(2) || "0.00"}</td>
                                </tr>
                              ))}
                            </tbody>

                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>

                                <td>
                                  {crossSummaries.byScheme.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>

                                <td>
                                  {crossSummaries.byScheme
                                    .reduce(
                                      (sum, item) => sum + (item.quantity || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>

                                <td>
                                  ₹
                                  {crossSummaries.byScheme
                                    .reduce(
                                      (sum, item) => sum + (item.amount || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>
                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🔷 विधानसभा अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विधानसभा</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVidhan.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVidhan.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVidhan
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVidhan
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏗️ विकास खंड अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विकास खंड</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVidhan.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVidhan.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVidhan
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVidhan
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📦 वस्तु अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>वस्तु</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.bySuppliedItem
                                .slice(0, 8)
                                .map((item, index) => (
                                  <tr key={index}>
                                    <td>{item.label}</td>
                                    <td>{item.count}</td>
                                    <td>{item.quantity.toFixed(2)}</td>
                                    <td>{item.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.bySuppliedItem
                                    .slice(0, 8)
                                    .reduce((sum, item) => sum + item.count, 0)}
                                </td>
                                <td>
                                  {crossSummaries.bySuppliedItem
                                    .slice(0, 8)
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.bySuppliedItem
                                    .slice(0, 8)
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        {renderCrossTabTable(
                          addressByVidhan,
                          "address",
                          "vidhan_sabha_name",
                          "📍 पता × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "addressVidhan",
                        )}
                        {renderCrossTabTable(
                          addressByScheme,
                          "address",
                          "scheme_name",
                          "📍 पता × 📋 योजना (लाभार्थी, मात्रा व राशि)",
                          "addressScheme",
                        )}
                        {renderCrossTabTable(
                          addressByVikas,
                          "address",
                          "vikas_khand_name",
                          "📍 पता × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "addressVikas",
                        )}
                        {renderCrossTabTable(
                          addressByCenter,
                          "address",
                          "center_name",
                          "📍 पता × 🏢 केंद्र (लाभार्थी, मात्रा व राशि)",
                          "addressCenter",
                        )}

                        {renderCrossTabTable(
                          centerByScheme,
                          "center_name",
                          "scheme_name",
                          "🏢 केंद्र × 📋 योजना (लाभार्थी, मात्रा व राशि)",
                          "centerScheme",
                        )}
                        {renderCrossTabTable(
                          centerByVidhan,
                          "center_name",
                          "vidhan_sabha_name",
                          "🏢 केंद्र × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "centerVidhan",
                        )}
                        {renderCrossTabTable(
                          centerByVikas,
                          "center_name",
                          "vikas_khand_name",
                          "🏢 केंद्र × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "centerVikas",
                        )}
                        {renderCrossTabTable(
                          centerBySuppliedItem,
                          "center_name",
                          "supplied_item_name",
                          "🏢 केंद्र × 📦 वस्तु (लाभार्थी, मात्रा व राशि)",
                          "centerSupplied",
                        )}
                        {renderCrossTabTable(
                          centerByAddress,
                          "center_name",
                          "address",
                          "🏢 केंद्र × 📍 पता (लाभार्थी, मात्रा व राशि)",
                          "centerAddress",
                        )}
                      </>
                    )}
                    {selectedSummaryModal === "address" && (
                      <>
                        <div className="mb-4 p-3 border rounded bg-light">
                          <h6 className="text-primary mb-3 border-bottom pb-2">
                            📊 मुख्य सारांश - पता अनुसार
                          </h6>
                          <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                          >
                            <Table
                              striped
                              bordered
                              hover
                              responsive
                              size="sm"
                              className="mb-2"
                            >
                              <thead>
                                <tr className="table-primary">
                                  <th>पता</th>
                                  <th>लाभार्थी</th>
                                  <th>देय अनुदान राशि (₹)</th>
                                  <th>मात्रा</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summaryStats.address.breakdown.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td>{item.label}</td>
                                      <td>{item.count}</td>
                                      <td>{item.amount.toFixed(2)}</td>
                                      <td>{item.quantity}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td>कुल</td>
                                  <td>
                                    {summaryStats.address.breakdown.reduce(
                                      (sum, item) => sum + item.count,
                                      0,
                                    )}
                                  </td>
                                  <td>
                                    ₹
                                    {summaryStats.address.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.amount,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td>
                                    {summaryStats.address.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>

                        {renderCrossTabTable(
                          addressByVidhan,
                          "address",
                          "vidhan_sabha_name",
                          "📍 पता × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "addressVidhan",
                        )}
                        {renderCrossTabTable(
                          addressByScheme,
                          "address",
                          "scheme_name",
                          "📍 पता × 📋 योजना (लाभार्थी, मात्रा व राशि)",
                          "addressScheme",
                        )}
                        {renderCrossTabTable(
                          addressByVikas,
                          "address",
                          "vikas_khand_name",
                          "📍 पता × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "addressVikas",
                        )}
                        {renderCrossTabTable(
                          addressByCenter,
                          "address",
                          "center_name",
                          "📍 पता × 🏢 केंद्र (लाभार्थी, मात्रा व राशि)",
                          "addressCenter",
                        )}
                      </>
                    )}
                    {selectedSummaryModal === "scheme" && (
                      <>
                        <div className="mb-4 p-3 border rounded bg-light">
                          <h6 className="text-primary mb-3 border-bottom pb-2">
                            📊 मुख्य सारांश - योजना अनुसार
                          </h6>
                          <div className="table-responsive">
                            <Table
                              striped
                              bordered
                              hover
                              responsive
                              size="sm"
                              className="mb-2"
                            >
                              <thead>
                                <tr className="table-primary">
                                  <th>योजना</th>
                                  <th>लाभार्थी</th>
                                  <th>मात्रा</th>
                                  <th>देय अनुदान राशि (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summaryStats.scheme.breakdown.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td>{item.label}</td>
                                      <td>{item.count}</td>
                                      <td>{item.quantity}</td>
                                      <td>{item.amount.toFixed(2)}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td>कुल</td>
                                  <td>
                                    {summaryStats.scheme.breakdown.reduce(
                                      (sum, item) => sum + item.count,
                                      0,
                                    )}
                                  </td>
                                  <td>
                                    {summaryStats.scheme.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td>
                                    ₹
                                    {summaryStats.scheme.breakdown
                                      .reduce(
                                        (sum, item) => sum + item.amount,
                                        0,
                                      )
                                      .toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🔷 विधानसभा अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विधानसभा</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVikas.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVikas.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVikas
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVikas
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏗️ विकास खंड अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>विकास खंड</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.byVikas.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity.toFixed(2)}</td>
                                  <td>{item.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.byVikas.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.byVikas
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.byVikas
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            📦 वस्तु अनुसार
                          </h6>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>वस्तु</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crossSummaries.bySuppliedItem.map(
                                (item, index) => (
                                  <tr key={index}>
                                    <td>{item.label}</td>
                                    <td>{item.count}</td>
                                    <td>{item.quantity.toFixed(2)}</td>
                                    <td>{item.amount.toFixed(2)}</td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>
                                <td>
                                  {crossSummaries.bySuppliedItem.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>
                                <td>
                                  {crossSummaries.bySuppliedItem
                                    .reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                                <td>
                                  ₹
                                  {crossSummaries.bySuppliedItem
                                    .reduce((sum, item) => sum + item.amount, 0)
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mb-4 p-3 border rounded">
                          <h6 className="text-success mb-3 border-bottom pb-2">
                            🏢 केंद्र अनुसार
                          </h6>

                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr className="table-secondary">
                                <th>केंद्र</th>
                                <th>लाभार्थी</th>
                                <th>मात्रा</th>
                                <th>देय अनुदान राशि (₹)</th>
                              </tr>
                            </thead>

                            <tbody>
                              {crossSummaries.byCenter.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.label}</td>
                                  <td>{item.count}</td>
                                  <td>{item.quantity?.toFixed(2) || "0.00"}</td>
                                  <td>₹{item.amount?.toFixed(2) || "0.00"}</td>
                                </tr>
                              ))}
                            </tbody>

                            <tfoot>
                              <tr className="table-warning fw-bold">
                                <td>कुल</td>

                                <td>
                                  {crossSummaries.byCenter.reduce(
                                    (sum, item) => sum + item.count,
                                    0,
                                  )}
                                </td>

                                <td>
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + (item.quantity || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>

                                <td>
                                  ₹
                                  {crossSummaries.byCenter
                                    .reduce(
                                      (sum, item) => sum + (item.amount || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>

                        {renderCrossTabTable(
                          vidhanByAddress,
                          "vidhan_sabha_name",
                          "address",
                          "🔷 विधानसभा × 📍 पता (लाभार्थी, मात्रा व राशि)",
                          "vidhanAddress",
                        )}
                        {renderCrossTabTable(
                          schemeByAddress,
                          "scheme_name",
                          "address",
                          "📋 योजना × 📍 पता (लाभार्थी, मात्रा व राशि)",
                          "schemeAddress",
                        )}
                        {renderCrossTabTable(
                          suppliedByAddress,
                          "supplied_item_name",
                          "address",
                          "📦 वस्तु × 📍 पता (लाभार्थी, मात्रा व राशि)",
                          "suppliedAddress",
                        )}

                        {renderCrossTabTable(
                          schemeByVidhan,
                          "scheme_name",
                          "vidhan_sabha_name",
                          "📋 योजना × 🔷 विधानसभा (लाभार्थी, मात्रा व राशि)",
                          "schemeVidhan",
                        )}
                        {renderCrossTabTable(
                          schemeByVikas,
                          "scheme_name",
                          "vikas_khand_name",
                          "📋 योजना × 🏗️ विकास खंड (लाभार्थी, मात्रा व राशि)",
                          "schemeVikas",
                        )}
                        {renderCrossTabTable(
                          schemeBySuppliedItem,
                          "scheme_name",
                          "supplied_item_name",
                          "📋 योजना × 📦 वस्तु (लाभार्थी, मात्रा व राशि)",
                          "schemeSupplied",
                        )}
                        {renderCrossTabTable(
                          schemeByCenter,
                          "scheme_name",
                          "center_name",
                          "📋 योजना × 🏢 केंद्र (लाभार्थी, मात्रा व राशि)",
                          "schemeCenter",
                        )}
                      </>
                    )}

                    <div className="mt-4 pt-3 border-top">
                      <div className="mb-3">
                        <p className="mb-1">
                          <strong>कुल मात्रा:</strong>{" "}
                          {summaryStats.overall.totalQuantity}
                        </p>
                        <p className="text-muted small">
                          {summaryStats[selectedSummaryModal]?.breakdown
                            ?.length > 0
                            ? summaryStats[selectedSummaryModal].breakdown
                                .map((item) => item.quantity)
                                .join(" + ")
                            : ""}
                        </p>
                      </div>
                      <div className="mb-3">
                        <p className="mb-1">
                          <strong>कुल राशि:</strong> ₹
                          {summaryStats.overall.totalAmount}
                        </p>
                        <p className="text-muted small">
                          {summaryStats[selectedSummaryModal]?.breakdown
                            ?.length > 0
                            ? summaryStats[selectedSummaryModal].breakdown
                                .map((item) => `₹${item.amount}`)
                                .join(" + ")
                            : ""}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0">
                          <strong>कुल लाभार्थी:</strong>{" "}
                          {summaryStats.overall.totalBeneficiaries}
                        </p>
                      </div>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={closeSummaryModal}>
                      बंद करें
                    </Button>
                  </Modal.Footer>
                </Modal>

                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">लोड हो रहा है...</span>
                    </div>
                    <p className="mt-2 small-fonts">डेटा लोड हो रहा है...</p>
                  </div>
                ) : beneficiaries.length === 0 ? (
                  <Alert variant="info" className="text-center">
                    कोई लाभार्थी डेटा उपलब्ध नहीं है।
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
                                beneficiaries
                                  .slice(
                                    (currentPage - 1) * itemsPerPage,
                                    currentPage * itemsPerPage,
                                  )
                                  .every((item) =>
                                    selectedItems.includes(item.beneficiary_id),
                                  ) &&
                                beneficiaries.slice(
                                  (currentPage - 1) * itemsPerPage,
                                  currentPage * itemsPerPage,
                                ).length > 0
                              }
                            />
                          </th>
                          <th>क्र.सं.</th>
                          {/* Updated column order to match the requested sequence */}
                          {selectedColumns.includes("center_name") && (
                            <th>{translations.centerName}</th>
                          )}
                          {selectedColumns.includes("vidhan_sabha_name") && (
                            <th>{translations.vidhanSabhaName}</th>
                          )}
                          {selectedColumns.includes("vikas_khand_name") && (
                            <th>{translations.vikasKhandName}</th>
                          )}
                          {selectedColumns.includes("scheme_name") && (
                            <th>{translations.schemeName}</th>
                          )}
                          {selectedColumns.includes("supplied_item_name") && (
                            <th>{translations.suppliedItemName}</th>
                          )}
                          {selectedColumns.includes("farmer_name") && (
                            <th>{translations.farmerName}</th>
                          )}
                          {selectedColumns.includes("father_name") && (
                            <th>{translations.fatherName}</th>
                          )}
                          {selectedColumns.includes("category") && (
                            <th>{translations.category}</th>
                          )}
                          {selectedColumns.includes("address") && (
                            <th>{translations.address}</th>
                          )}
                          {selectedColumns.includes("mobile_number") && (
                            <th>{translations.mobileNumber}</th>
                          )}
                          {selectedColumns.includes("aadhaar_number") && (
                            <th>{translations.aadhaarNumber}</th>
                          )}
                          {selectedColumns.includes("bank_account_number") && (
                            <th>{translations.bankAccountNumber}</th>
                          )}
                          {selectedColumns.includes("ifsc_code") && (
                            <th>{translations.ifscCode}</th>
                          )}
                          {selectedColumns.includes("unit") && (
                            <th>{translations.unit}</th>
                          )}
                          {selectedColumns.includes("quantity") && (
                            <th>{translations.quantity}</th>
                          )}
                          {selectedColumns.includes("rate") && (
                            <th>{translations.rate}</th>
                          )}
                          {selectedColumns.includes("amount") && (
                            <th>{translations.amount}</th>
                          )}
                          {selectedColumns.includes("beneficiary_reg_date") && (
                            <th>{translations.beneficiaryRegDate}</th>
                          )}
                          <th>कार्रवाई</th>
                        </tr>
                      </thead>
                      <tbody className="tbl-body">
                        {beneficiaries
                          .slice(
                            (currentPage - 1) * itemsPerPage,
                            currentPage * itemsPerPage,
                          )
                          .map((item, index) => (
                            <tr key={item.beneficiary_id || index}>
                              <td>
                                <Form.Check
                                  type="checkbox"
                                  checked={selectedItems.includes(
                                    item.beneficiary_id,
                                  )}
                                  onChange={() =>
                                    handleCheckboxChange(item.beneficiary_id)
                                  }
                                />
                              </td>
                              <td>
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </td>
                              {/* Updated column order to match the requested sequence */}
                              {selectedColumns.includes("center_name") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Select
                                      name="center_name"
                                      value={editingValues.center_name}
                                      onChange={handleEditChange}
                                      size="sm"
                                    >
                                      <option value="">
                                        {translations.selectOption}
                                      </option>
                                      {centerOptions.map((center, index) => (
                                        <option key={index} value={center}>
                                          {center}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  ) : (
                                    item.center_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes(
                                "vidhan_sabha_name",
                              ) && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="vidhan_sabha_name"
                                      value={editingValues.vidhan_sabha_name}
                                      onChange={handleEditChange}
                                      size="sm"
                                      disabled
                                    />
                                  ) : (
                                    item.vidhan_sabha_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("vikas_khand_name") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="vikas_khand_name"
                                      value={editingValues.vikas_khand_name}
                                      onChange={handleEditChange}
                                      size="sm"
                                      disabled
                                    />
                                  ) : (
                                    item.vikas_khand_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("scheme_name") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    editingOtherMode.scheme_name ? (
                                      <div className="d-flex">
                                        <Form.Control
                                          type="text"
                                          name="scheme_name"
                                          value={editingValues.scheme_name}
                                          onChange={handleEditChange}
                                          size="sm"
                                        />
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-1"
                                          onClick={() => {
                                            setEditingOtherMode((prev) => ({
                                              ...prev,
                                              scheme_name: false,
                                            }));
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              scheme_name: "",
                                            }));
                                            // Refetch base options
                                            fetchFormFilters(
                                              "",
                                              "",
                                              editingValues.center_name,
                                            );
                                          }}
                                          title="विकल्प दिखाएं"
                                        >
                                          ↺
                                        </Button>
                                      </div>
                                    ) : (
                                      <Form.Select
                                        name="scheme_name"
                                        value={editingValues.scheme_name}
                                        onChange={handleEditChange}
                                        size="sm"
                                      >
                                        <option value="">
                                          {translations.selectOption}
                                        </option>
                                        {formOptions.scheme_name.map(
                                          (scheme, index) => (
                                            <option key={index} value={scheme}>
                                              {scheme}
                                            </option>
                                          ),
                                        )}
                                        <option value="Other">अन्य</option>
                                      </Form.Select>
                                    )
                                  ) : (
                                    item.scheme_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes(
                                "supplied_item_name",
                              ) && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    editingOtherMode.supplied_item_name ? (
                                      <div className="d-flex">
                                        <Form.Control
                                          type="text"
                                          name="supplied_item_name"
                                          value={
                                            editingValues.supplied_item_name
                                          }
                                          onChange={handleEditChange}
                                          size="sm"
                                        />
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-1"
                                          onClick={() => {
                                            setEditingOtherMode((prev) => ({
                                              ...prev,
                                              supplied_item_name: false,
                                            }));
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              supplied_item_name: "",
                                            }));
                                            // Refetch options
                                            fetchFormFilters(
                                              "",
                                              "",
                                              editingValues.center_name,
                                            );
                                          }}
                                          title="विकल्प दिखाएं"
                                        >
                                          ↺
                                        </Button>
                                      </div>
                                    ) : (
                                      <Form.Select
                                        name="supplied_item_name"
                                        value={editingValues.supplied_item_name}
                                        onChange={handleEditChange}
                                        size="sm"
                                      >
                                        <option value="">
                                          {translations.selectOption}
                                        </option>
                                        {formOptions.supplied_item_name.map(
                                          (item, index) => (
                                            <option key={index} value={item}>
                                              {item}
                                            </option>
                                          ),
                                        )}
                                        <option value="Other">अन्य</option>
                                      </Form.Select>
                                    )
                                  ) : (
                                    item.supplied_item_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("farmer_name") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="farmer_name"
                                      value={editingValues.farmer_name}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.farmer_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("father_name") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="father_name"
                                      value={editingValues.father_name}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.father_name
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("category") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    editingOtherMode.category ? (
                                      <div className="d-flex">
                                        <Form.Control
                                          type="text"
                                          name="category"
                                          value={editingValues.category}
                                          onChange={handleEditChange}
                                          size="sm"
                                        />
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-1"
                                          onClick={() => {
                                            setEditingOtherMode((prev) => ({
                                              ...prev,
                                              category: false,
                                            }));
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              category: "",
                                            }));
                                            // Refetch base options
                                            fetchFormFilters(
                                              "",
                                              "",
                                              editingValues.center_name,
                                            );
                                          }}
                                          title="विकल्प दिखाएं"
                                        >
                                          ↺
                                        </Button>
                                      </div>
                                    ) : (
                                      <Form.Select
                                        name="category"
                                        value={editingValues.category}
                                        onChange={handleEditChange}
                                        size="sm"
                                      >
                                        <option value="">
                                          {translations.selectOption}
                                        </option>
                                        {formOptions.category.map(
                                          (cat, index) => (
                                            <option key={index} value={cat}>
                                              {cat}
                                            </option>
                                          ),
                                        )}
                                        <option value="Other">अन्य</option>
                                      </Form.Select>
                                    )
                                  ) : (
                                    item.category
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("address") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      as="textarea"
                                      rows={2}
                                      name="address"
                                      value={editingValues.address}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.address
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("mobile_number") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="mobile_number"
                                      value={editingValues.mobile_number}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.mobile_number
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("aadhaar_number") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="aadhaar_number"
                                      value={editingValues.aadhaar_number}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.aadhaar_number
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes(
                                "bank_account_number",
                              ) && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="bank_account_number"
                                      value={editingValues.bank_account_number}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.bank_account_number
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("ifsc_code") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="text"
                                      name="ifsc_code"
                                      value={editingValues.ifsc_code}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.ifsc_code
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("unit") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    editingOtherMode.unit ? (
                                      <div className="d-flex">
                                        <Form.Control
                                          type="text"
                                          name="unit"
                                          value={editingValues.unit}
                                          onChange={handleEditChange}
                                          size="sm"
                                        />
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-1"
                                          onClick={() => {
                                            setEditingOtherMode((prev) => ({
                                              ...prev,
                                              unit: false,
                                            }));
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              unit: "",
                                            }));
                                            // Refetch base options
                                            fetchFormFilters(
                                              "",
                                              "",
                                              editingValues.center_name,
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
                                        value={editingValues.unit}
                                        onChange={handleEditChange}
                                        size="sm"
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
                                    )
                                  ) : (
                                    item.unit
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("quantity") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="number"
                                      name="quantity"
                                      value={editingValues.quantity}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("rate") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="number"
                                      step="0.01"
                                      name="rate"
                                      value={editingValues.rate}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.rate
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes("amount") && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="number"
                                      step="0.01"
                                      name="amount"
                                      value={editingValues.amount}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    item.amount
                                  )}
                                </td>
                              )}
                              {selectedColumns.includes(
                                "beneficiary_reg_date",
                              ) && (
                                <td>
                                  {editingRowId === item.beneficiary_id ? (
                                    <Form.Control
                                      type="date"
                                      name="beneficiary_reg_date"
                                      value={editingValues.beneficiary_reg_date}
                                      onChange={handleEditChange}
                                      size="sm"
                                    />
                                  ) : (
                                    convertToDisplayFormat(
                                      item.beneficiary_reg_date,
                                    ) || ""
                                  )}
                                </td>
                              )}
                              <td>
                                {editingRowId === item.beneficiary_id ? (
                                  <>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() => handleSave(item)}
                                      className="me-1"
                                    >
                                      सहेजें
                                    </Button>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={handleCancel}
                                    >
                                      रद्द करें
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <div className="d-flex justify-content-between">
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleEdit(item)}
                                        className="me-1 gov-edit-btn"
                                      >
                                        संपादित करें
                                      </Button>
                                      <Button
                                        className="gov-delete-btn"
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDelete(item)}
                                      >
                                        हटाएं
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-total-row">
                          <td></td>
                          <td>
                            <strong>कुल</strong>
                          </td>
                          {selectedColumns.includes("center_name") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.center_name)
                                      set.add(item.center_name);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("vidhan_sabha_name") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.vidhan_sabha_name)
                                      set.add(item.vidhan_sabha_name);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("vikas_khand_name") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.vikas_khand_name)
                                      set.add(item.vikas_khand_name);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("scheme_name") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.scheme_name)
                                      set.add(item.scheme_name);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("supplied_item_name") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.supplied_item_name)
                                      set.add(item.supplied_item_name);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("farmer_name") && (
                            <td>
                              <strong>{beneficiaries.length}</strong>
                            </td>
                          )}
                          {selectedColumns.includes("father_name") && <td></td>}
                          {selectedColumns.includes("category") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.category) set.add(item.category);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("address") && <td></td>}
                          {selectedColumns.includes("mobile_number") && (
                            <td></td>
                          )}
                          {selectedColumns.includes("aadhaar_number") && (
                            <td></td>
                          )}
                          {selectedColumns.includes("bank_account_number") && (
                            <td></td>
                          )}
                          {selectedColumns.includes("ifsc_code") && <td></td>}
                          {selectedColumns.includes("unit") && (
                            <td>
                              <strong>
                                {
                                  beneficiaries.reduce((unique, item) => {
                                    const set = new Set(unique);
                                    if (item.unit) set.add(item.unit);
                                    return Array.from(set);
                                  }, []).length
                                }
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("quantity") && (
                            <td>
                              <strong>
                                {beneficiaries
                                  .reduce((sum, item) => {
                                    const qty = parseFloat(item.quantity) || 0;
                                    return sum + qty;
                                  }, 0)
                                  .toFixed(2)}
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("rate") && (
                            <td>
                              <strong>
                                {beneficiaries
                                  .reduce((sum, item) => {
                                    const rate = parseFloat(item.rate) || 0;
                                    return sum + rate;
                                  }, 0)
                                  .toFixed(2)}
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("amount") && (
                            <td>
                              <strong>
                                {beneficiaries
                                  .reduce((sum, item) => {
                                    const amount = parseFloat(item.amount) || 0;
                                    return sum + amount;
                                  }, 0)
                                  .toFixed(2)}
                              </strong>
                            </td>
                          )}
                          {selectedColumns.includes("beneficiary_reg_date") && (
                            <td></td>
                          )}
                          <td></td>
                        </tr>
                      </tfoot>
                    </Table>

                    {/* Pagination controls */}
                    {beneficiaries.length > itemsPerPage && (
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
      </Container>
    </div>
  );
};

export default KrishiRegistration;
