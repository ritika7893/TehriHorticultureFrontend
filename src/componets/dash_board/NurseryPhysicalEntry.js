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
  Dropdown,
  FormCheck,
  Navbar,
  Nav,
} from "react-bootstrap";
import { FaFileExcel, FaFilePdf, FaSync } from "react-icons/fa";
import {
  RiFilePdfLine,
  RiFileExcelLine,
  RiDeleteBinLine,
} from "react-icons/ri";
import axios from "axios";
import * as XLSX from "xlsx";
import Select from "react-select";
import "../../assets/css/registration.css";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import DashBoardHeader from "./DashBoardHeader";

// API URLs
const NURSERY_PHYSICAL_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/nursery-physical/";
const NURSERY_PHYSICAL_RECIPIENTS_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/nursery-physical-recipients/";

// Utility function to round numbers to 2 decimal places
const roundTo2Decimals = (value) => {
  const num = parseFloat(value) || 0;
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

// Table columns
const nurseryPhysicalTableColumns = [
  { key: "nursery_name", label: "नर्सरी का नाम" },
  { key: "crop_name", label: "फसल का नाम" },
  { key: "unit", label: "इकाई" },
  { key: "allocated_quantity", label: "उपलब्ध मात्रा" },
  { key: "allocated_amount", label: "धनराशि" },
];

// Recipient table columns
const recipientTableColumns = [
  { key: "recipient_name", label: "प्राप्तकर्ता का नाम" },
  { key: "recipient_quantity", label: "वितरण मात्रा" },
  { key: "recipient_amount", label: "वितरित धनराशि" },
  { key: "bill_number", label: "बिल नंबर" },
  { key: "bill_date", label: "बिल तिथि" },
];

// Column mapping for data access
const nurseryPhysicalColumnMapping = {
  sno: { header: "क्र.सं.", accessor: (item, index) => index + 1 },
  nursery_name: {
    header: "नर्सरी का नाम",
    accessor: (item) => item.nursery_name,
  },
  crop_name: {
    header: "फसल का नाम",
    accessor: (item) => item.crop_name,
  },
  unit: {
    header: "इकाई",
    accessor: (item) => item.unit,
  },
  allocated_quantity: {
    header: "उपलब्ध मात्रा",
    accessor: (item) => parseFloat(item.allocated_quantity) || 0,
  },
  allocated_amount: {
    header: "धनराशि",
    accessor: (item) => parseFloat(item.allocated_amount) || 0,
  },
  created_at: {
    header: "निर्माण तिथि",
    accessor: (item) => {
      if (!item.created_at) return "";
      const date = new Date(item.created_at);
      return date.toLocaleDateString("hi-IN");
    },
  },
};

const recipientColumnMapping = {
  sno: { header: "क्र.सं.", accessor: (item, index) => index + 1 },
  recipient_name: {
    header: "प्राप्तकर्ता का नाम",
    accessor: (item) => item.recipient_name,
  },
  recipient_quantity: {
    header: "वितरण मात्रा",
    accessor: (item) => parseFloat(item.recipient_quantity) || 0,
  },
  recipient_amount: {
    header: "वितरित धनराशि",
    accessor: (item) => parseFloat(item.recipient_amount) || 0,
  },
  bill_number: {
    header: "बिल नंबर",
    accessor: (item) => item.bill_number,
  },
  bill_date: {
    header: "बिल तिथि",
    accessor: (item) => {
      if (!item.bill_date) return "";
      const date = new Date(item.bill_date);
      return date.toLocaleDateString("hi-IN");
    },
  },
};

// Hindi translations for form
const translations = {
  pageTitle: "नर्सरी भौतिक प्रविष्टि",
  nurseryName: "नर्सरी का नाम",
  cropName: "फसल का नाम",
  unit: "इकाई",
  allocatedQuantity: "उपलब्ध मात्रा",
  allocatedAmount: "धनराशि",
  recipientName: "प्राप्तकर्ता का नाम",
  recipientQuantity: "वितरण मात्रा",
  recipientAmount: "वितरित धनराशि",
  billNumber: "बिल नंबर",
  billDate: "बिल तिथि",
  fromDate: "से तिथि",
  toDate: "तक तिथि",
  submitButton: "जमा करें",
  submitting: "जमा कर रहे हैं...",
  successMessage: "नर्सरी भौतिक डेटा सफलतापूर्वक जोड़ा गया!",
  updateSuccessMessage: "नर्सरी भौतिक डेटा सफलतापूर्वक अपडेट किया गया!",
  recipientSuccessMessage: "प्राप्तकर्ता डेटा सफलतापूर्वक जोड़ा गया!",
  recipientUpdateSuccessMessage:
    "प्राप्तकर्ता डेटा सफलतापूर्वक अपडेट किया गया!",
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
  manageRecipients: "प्राप्तकर्ता",
  addRecipient: "प्राप्तकर्ता जोड़ें",
  close: "बंद करें",
  save: "सहेजें",
  cancel: "रद्द करें",
  edit: "संपादित करें",
  delete: "हटाएं",
};

// Unit options
const unitOptions = [
  "संख्या",
  "किलोग्राम",
  "लीटर",
  "मीटर",
  "बोरी",
  "डिब्बा",
  "अन्य",
];

// Helper function to get the default financial year dates
const getFinancialYearDates = () => ({
  from_date: "2026-04-01",
  to_date: "2027-03-31",
});

const NurseryPhysicalEntry = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && user.loginType === "admin";

  // Nursery Navigation Component
  const NurseryNavigation = () => {
    const handleLogout = () => {
      logout();
      navigate("/", { replace: true });
    };

    return (
      <Navbar
        expand="lg"
        className="bg-body-tertiary"
        style={{ marginBottom: "20px" }}
      >
        <Container fluid>
          <Navbar.Brand as={Link} to="/Dashboard" className="fw-bold">
            <span style={{ color: "#333" }}>नर्सरी एंट्री सिस्टम</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="nursery-nav" />
          <Navbar.Collapse id="nursery-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/NurseryPhysicalEntry" className="me-3">
                भौतिक प्रविष्टि
              </Nav.Link>
              <Nav.Link as={Link} to="/NurseryFinancialEntry" className="me-3">
                वित्तीय प्रविष्टि
              </Nav.Link>
            </Nav>
            <Nav className="ms-auto">
              <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                लॉगआउट
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  };

  // Column Selection Component
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

  // State for form data
  const [formData, setFormData] = useState({
    nursery_name: "",
    crop_name: "",
    unit: "",
    allocated_quantity: "",
    allocated_amount: "",
  });

  // State for recipient form data
  const [recipientFormData, setRecipientFormData] = useState({
    nursery_physical: "",
    recipient_name: "",
    recipient_quantity: "",
    recipient_amount: "",
    bill_number: "",
    bill_date: new Date().toISOString().split("T")[0],
  });

  // State for form fields in "other" mode (text input instead of dropdown)
  const [otherMode, setOtherMode] = useState({
    nursery_name: false,
    crop_name: false,
    unit: false,
  });
  const [modalApiResponse, setModalApiResponse] = useState(null);
  const [modalApiError, setModalApiError] = useState(null);
  const [errors, setErrors] = useState({});
  const [recipientErrors, setRecipientErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecipientSubmitting, setIsRecipientSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [nurseryPhysicalItems, setNurseryPhysicalItems] = useState([]);
  const [allNurseryPhysicalItems, setAllNurseryPhysicalItems] = useState([]);
  const [recipientItems, setRecipientItems] = useState([]);
  const [allRecipientItems, setAllRecipientItems] = useState([]);
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
  const fileInputRef = useRef(null);
  const [selectedColumns, setSelectedColumns] = useState(
    nurseryPhysicalTableColumns.map((col) => col.key),
  );
  const [selectedRecipientColumns, setSelectedRecipientColumns] = useState(
    recipientTableColumns.map((col) => col.key),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRecipientLoading, setIsRecipientLoading] = useState(true);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedNurseryPhysical, setSelectedNurseryPhysical] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    nursery_name: [],
    crop_name: [],
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
    nursery_name: [],
    crop_name: [],
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  // State for recipient pagination
  const [recipientCurrentPage, setRecipientCurrentPage] = useState(1);

  const [editingRowId, setEditingRowId] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [editingRecipientRowId, setEditingRecipientRowId] = useState(null);
  const [editingRecipientValues, setEditingRecipientValues] = useState({});

  // State for multi-select
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  // Fetch data on component mount and set default financial year filters
  useEffect(() => {
    const financialYearDates = getFinancialYearDates();
    setFilters({
      from_date: financialYearDates.from_date,
      to_date: financialYearDates.to_date,
      nursery_name: [],
      crop_name: [],
    });
    fetchNurseryPhysicalItems();
    fetchRecipientItems();
  }, []);

  // Populate filter options from all items
  useEffect(() => {
    if (allNurseryPhysicalItems.length > 0) {
      setFilterOptions({
        nursery_name: [
          ...new Set(
            allNurseryPhysicalItems
              .map((item) => item.nursery_name)
              .filter(Boolean),
          ),
        ].sort(),
        crop_name: [
          ...new Set(
            allNurseryPhysicalItems
              .map((item) => item.crop_name)
              .filter(Boolean),
          ),
        ].sort(),
      });

      // Extract unique created_at dates for the new date filter
      const createdAtDates = allNurseryPhysicalItems
        .map((item) =>
          item.created_at
            ? new Date(item.created_at).toISOString().split("T")[0]
            : null,
        )
        .filter(Boolean);
      const uniqueDates = [...new Set(createdAtDates)].sort().reverse();
      setUniqueCreatedAtDates(uniqueDates);
    }
  }, [allNurseryPhysicalItems]);

  // Apply local filtering when filters change (based on created_at field)
  useEffect(() => {
    // Only apply filters when both dates are selected
    if (filters.from_date && filters.to_date) {
      let filtered = allNurseryPhysicalItems;

      filtered = allNurseryPhysicalItems.filter((item) => {
        // Filter by created_at date field
        if (!item.created_at) {
          return false;
        }

        const createdAt = new Date(item.created_at);
        const fromDate = new Date(filters.from_date);
        const toDate = new Date(filters.to_date);
        toDate.setHours(23, 59, 59, 999); // Set to end of day

        const isDateInRange = createdAt >= fromDate && createdAt <= toDate;

        if (!isDateInRange) {
          return false;
        }

        // Other filters (nursery_name, crop_name)
        for (const key in filters) {
          if (key === "from_date" || key === "to_date") {
            continue;
          }
          if (filters[key].length > 0 && !filters[key].includes(item[key])) {
            return false;
          }
        }

        return true;
      });

      // Apply created_at filter on top of other filters
      if (createdAtFilter.selectedDate || createdAtFilter.manualDate) {
        const { selectedDate, manualDate } = createdAtFilter;
        const filterDate = selectedDate || manualDate;

        filtered = filtered.filter((item) => {
          if (!item.created_at) return false;
          const itemDate = new Date(item.created_at)
            .toISOString()
            .split("T")[0];
          return itemDate === filterDate;
        });
      }

      setNurseryPhysicalItems(filtered);
    } else {
      // If no date range selected, show all data
      setNurseryPhysicalItems(allNurseryPhysicalItems);
    }
  }, [filters, allNurseryPhysicalItems, createdAtFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds([]);
    setSelectAllChecked(false);
  }, [filters]);

  // Fetch data when date filters change
  useEffect(() => {
    if (filters.from_date && filters.to_date) {
      fetchNurseryPhysicalItems(filters);
      fetchRecipientItems();
    }
  }, [filters.from_date, filters.to_date]);

  // Fetch nursery physical items data
  const fetchNurseryPhysicalItems = async (appliedFilters = {}) => {
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
        }
      });
      const response = await axios.get(NURSERY_PHYSICAL_API_URL, { params });

      // Handle the response correctly - the data is directly in response.data as an array
      const data = response.data;
      const items = Array.isArray(data) ? data : [];

      setNurseryPhysicalItems(items);
      if (Object.keys(params).length === 0) {
        setAllNurseryPhysicalItems(items);
      }
    } catch (error) {
      console.error("Error fetching nursery physical items:", error);
      setApiError("डेटा लोड करने में त्रुटि हुई।");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recipient items data
  const fetchRecipientItems = async () => {
    try {
      setIsRecipientLoading(true);
      const response = await axios.get(NURSERY_PHYSICAL_RECIPIENTS_API_URL);
      const data = response.data;
      const items = Array.isArray(data) ? data : [];
      setRecipientItems(items);
      setAllRecipientItems(items);
    } catch (error) {
      console.error("Error fetching recipient items:", error);
      setApiError("प्राप्तकर्ता डेटा लोड करने में त्रुटि हुई।");
    } finally {
      setIsRecipientLoading(false);
    }
  };

  // Clear all filters and reset to financial year
  const clearFilters = () => {
    const financialYearDates = getFinancialYearDates();
    setFilters({
      from_date: financialYearDates.from_date,
      to_date: financialYearDates.to_date,
      nursery_name: [],
      crop_name: [],
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

  // Filtered items - Apply date range filtering
  const filteredItems = (() => {
    // Only show items if both date range filters are selected
    if (!filters.from_date || !filters.to_date) {
      return [];
    }

    // Filter items by date range
    return nurseryPhysicalItems.filter((item) => {
      const itemDate = new Date(item.created_at);
      const fromDate = new Date(filters.from_date);
      const toDate = new Date(filters.to_date);
      toDate.setHours(23, 59, 59, 999); // Set to end of day

      return itemDate >= fromDate && itemDate <= toDate;
    });
  })();

  const filteredRecipientItems = recipientItems.filter((item) => {
    // Filter by selected nursery physical
    if (
      !selectedNurseryPhysical ||
      item.nursery_physical !== selectedNurseryPhysical.id
    ) {
      return false;
    }

    // Filter by date range - only show recipients with bill date in selected range
    if (filters.from_date && filters.to_date && item.bill_date) {
      const billDate = new Date(item.bill_date);
      const fromDate = new Date(filters.from_date);
      const toDate = new Date(filters.to_date);
      toDate.setHours(23, 59, 59, 999);

      return billDate >= fromDate && billDate <= toDate;
    }

    // If no date filters are set, show all
    return filters.from_date && filters.to_date;
  });

  // Helper function to expand data with recipients for export
  const expandDataWithRecipients = (items, selectedRecipientCols) => {
    const hasRecipientColumns =
      selectedRecipientCols && selectedRecipientCols.length > 0;

    if (!hasRecipientColumns) {
      return items;
    }

    const expandedData = [];
    items.forEach((item) => {
      // Filter recipients by nursery_physical ID and date range (bill_date within financial year)
      const itemRecipients = recipientItems.filter((r) => {
        if (r.nursery_physical !== item.id) {
          return false;
        }

        // Only include recipients with bill_date in the selected date range
        if (filters.from_date && filters.to_date && r.bill_date) {
          const billDate = new Date(r.bill_date);
          const fromDate = new Date(filters.from_date);
          const toDate = new Date(filters.to_date);
          toDate.setHours(23, 59, 59, 999);

          return billDate >= fromDate && billDate <= toDate;
        }

        return filters.from_date && filters.to_date;
      });

      if (itemRecipients.length > 0) {
        itemRecipients.forEach((recipient, idx) => {
          expandedData.push({
            ...item,
            _recipient: recipient,
            _isRecipientRow: true,
            _isFirstRecipient: idx === 0,
            _isSubtotalRow: false,
          });
        });

        // Add subtotal row for this nursery
        const totalQuantity = itemRecipients.reduce(
          (sum, r) => sum + (parseFloat(r.recipient_quantity) || 0),
          0,
        );
        const totalAmount = itemRecipients.reduce(
          (sum, r) => sum + (parseFloat(r.recipient_amount) || 0),
          0,
        );

        expandedData.push({
          ...item,
          _recipient: {
            recipient_quantity: totalQuantity,
            recipient_amount: totalAmount,
          },
          _isSubtotalRow: true,
          _nurserySubtotal: true,
          _subtotalLabel: `${item.nursery_name} - उप-योग`,
        });
      } else {
        expandedData.push({
          ...item,
          _recipient: null,
          _isRecipientRow: false,
          _isSubtotalRow: false,
        });
      }
    });

    // Add grand total row
    const grandTotalQuantity = items.reduce((sum, item) => {
      const itemRecipients = recipientItems.filter((r) => {
        if (r.nursery_physical !== item.id) {
          return false;
        }

        // Only include recipients with bill_date in the selected date range
        if (filters.from_date && filters.to_date && r.bill_date) {
          const billDate = new Date(r.bill_date);
          const fromDate = new Date(filters.from_date);
          const toDate = new Date(filters.to_date);
          toDate.setHours(23, 59, 59, 999);

          return billDate >= fromDate && billDate <= toDate;
        }

        return filters.from_date && filters.to_date;
      });
      return (
        sum +
        itemRecipients.reduce(
          (qSum, r) => qSum + (parseFloat(r.recipient_quantity) || 0),
          0,
        )
      );
    }, 0);

    const grandTotalAmount = items.reduce((sum, item) => {
      const itemRecipients = recipientItems.filter((r) => {
        if (r.nursery_physical !== item.id) {
          return false;
        }

        // Only include recipients with bill_date in the selected date range
        if (filters.from_date && filters.to_date && r.bill_date) {
          const billDate = new Date(r.bill_date);
          const fromDate = new Date(filters.from_date);
          const toDate = new Date(filters.to_date);
          toDate.setHours(23, 59, 59, 999);

          return billDate >= fromDate && billDate <= toDate;
        }

        return filters.from_date && filters.to_date;
      });
      return (
        sum +
        itemRecipients.reduce(
          (aSum, r) => aSum + (parseFloat(r.recipient_amount) || 0),
          0,
        )
      );
    }, 0);

    expandedData.push({
      _isGrandTotalRow: true,
      _recipient: {
        recipient_quantity: grandTotalQuantity,
        recipient_amount: grandTotalAmount,
      },
    });

    return expandedData;
  };

  // Download Excel function
  const downloadExcel = (
    data,
    filename,
    columnMapping,
    selectedColumns,
    selectedRecipientCols,
    withRecipients = true,
  ) => {
    try {
      const expandedData = withRecipients
        ? expandDataWithRecipients(data, selectedRecipientCols)
        : data;

      let nurserySerialNumber = 0; // Track serial number based on nursery groups
      const excelData = expandedData.map((item, index) => {
        const row = {};

        // Calculate serial number - increment for first recipient of each nursery or items without recipients
        if (
          item._isFirstRecipient ||
          (!item._isRecipientRow &&
            !item._isSubtotalRow &&
            !item._isGrandTotalRow)
        ) {
          nurserySerialNumber++;
        }

        // Handle subtotal rows
        if (item._isSubtotalRow) {
          row["क्र.सं."] = ""; // No serial number for subtotal
          selectedColumns.forEach((col) => {
            if (col === "nursery_name") {
              row[columnMapping[col].header] = item._subtotalLabel || "उप-योग";
            } else {
              row[columnMapping[col].header] = "";
            }
          });

          // Add recipient totals
          if (selectedRecipientCols) {
            selectedRecipientCols.forEach((col) => {
              if (col === "recipient_quantity") {
                row[recipientColumnMapping.recipient_quantity.header] =
                  parseFloat(item._recipient.recipient_quantity).toFixed(2);
              } else if (col === "recipient_amount") {
                row[recipientColumnMapping.recipient_amount.header] =
                  parseFloat(item._recipient.recipient_amount).toFixed(2);
              } else {
                row[recipientColumnMapping[col].header] = "";
              }
            });
          }

          return row;
        }

        // Handle grand total row
        if (item._isGrandTotalRow) {
          row["क्र.सं."] = ""; // No serial number for grand total
          selectedColumns.forEach((col) => {
            if (col === "nursery_name") {
              row[columnMapping[col].header] = "कुल योग";
            } else {
              row[columnMapping[col].header] = "";
            }
          });

          // Add grand total values
          if (selectedRecipientCols) {
            selectedRecipientCols.forEach((col) => {
              if (col === "recipient_quantity") {
                row[recipientColumnMapping.recipient_quantity.header] =
                  parseFloat(item._recipient.recipient_quantity).toFixed(2);
              } else if (col === "recipient_amount") {
                row[recipientColumnMapping.recipient_amount.header] =
                  parseFloat(item._recipient.recipient_amount).toFixed(2);
              } else {
                row[recipientColumnMapping[col].header] = "";
              }
            });
          }

          return row;
        }

        // Handle regular rows - show serial number only for first recipient or items without recipients
        if (item._isFirstRecipient || !item._isRecipientRow) {
          row["क्र.सं."] = nurserySerialNumber;
        } else {
          row["क्र.सं."] = ""; // Empty for non-first recipients (rowspan effect)
        }

        // Add nursery columns only for first recipient or items without recipients (rowspan effect)
        selectedColumns.forEach((col) => {
          if (item._isFirstRecipient || !item._isRecipientRow) {
            row[columnMapping[col].header] = columnMapping[col].accessor(
              item,
              index,
            );
          } else {
            // Leave empty for non-first recipients (rowspan effect)
            row[columnMapping[col].header] = "";
          }
        });

        // Add recipient columns if available
        if (
          item._recipient &&
          selectedRecipientCols &&
          !item._isSubtotalRow &&
          !item._isGrandTotalRow
        ) {
          if (selectedRecipientCols.includes("recipient_name")) {
            row[recipientColumnMapping.recipient_name.header] =
              item._recipient.recipient_name || "-";
          }
          if (selectedRecipientCols.includes("recipient_quantity")) {
            row[recipientColumnMapping.recipient_quantity.header] =
              parseFloat(item._recipient.recipient_quantity).toFixed(2) || "-";
          }
          if (selectedRecipientCols.includes("recipient_amount")) {
            row[recipientColumnMapping.recipient_amount.header] =
              parseFloat(item._recipient.recipient_amount).toFixed(2) || "-";
          }
          if (selectedRecipientCols.includes("bill_number")) {
            row[recipientColumnMapping.bill_number.header] =
              item._recipient.bill_number || "-";
          }
          if (selectedRecipientCols.includes("bill_date")) {
            row[recipientColumnMapping.bill_date.header] =
              item._recipient.bill_date || "-";
          }
        } else if (
          selectedRecipientCols &&
          !item._isSubtotalRow &&
          !item._isGrandTotalRow
        ) {
          // Add empty recipient columns
          selectedRecipientCols.forEach((col) => {
            row[recipientColumnMapping[col].header] = "-";
          });
        }

        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = Array(
        selectedColumns.length +
          (selectedRecipientCols ? selectedRecipientCols.length : 0),
      ).fill({ wch: 15 });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error("Error generating Excel file:", e);
      setApiError("Excel file generation failed. Please try again.");
    }
  };

  // Download sample Excel template
  const downloadSampleTemplate = () => {
    try {
      const sampleData = [
        {
          "नर्सरी का नाम": "राजकीय पौधशाला कुम्भीचौड़",
          "फसल का नाम": "आम",
          इकाई: "संख्या",
          "उपलब्ध मात्रा": "3000.00",
          धनराशि: "3987.00",
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleData);

      const colWidths = [
        { wch: 25 }, // नर्सरी का नाम
        { wch: 20 }, // फसल का नाम
        { wch: 15 }, // इकाई
        { wch: 15 }, // उपलब्ध मात्रा
        { wch: 15 }, // धनराशि
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "SampleTemplate");
      XLSX.writeFile(wb, `NurseryPhysicalEntry_Template.xlsx`);
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
    selectedRecipientCols,
    title,
    withRecipients = true,
  ) => {
    try {
      const expandedData = withRecipients
        ? expandDataWithRecipients(data, selectedRecipientCols)
        : data;

      let headers = `<th>क्र.सं.</th>${selectedColumns
        .map((col) => `<th>${columnMapping[col].header}</th>`)
        .join("")}`;

      // Add recipient column headers if selected
      if (selectedRecipientCols) {
        selectedRecipientCols.forEach((col) => {
          headers += `<th>${recipientColumnMapping[col].header}</th>`;
        });
      }

      // Create rows with proper serial number tracking
      let nurserySerialNumber = 0;
      const rowsHtml = (() => {
        return expandedData
          .map((item, index) => {
            // Calculate serial number - increment for first recipient of each nursery or items without recipients
            if (
              item._isFirstRecipient ||
              (!item._isRecipientRow &&
                !item._isSubtotalRow &&
                !item._isGrandTotalRow)
            ) {
              nurserySerialNumber++;
            }

            // Subtotal/grand total handling
            if (item._isSubtotalRow) {
              let cells = `<td></td>`;
              selectedColumns.forEach((col) => {
                cells +=
                  col === "nursery_name"
                    ? `<td><strong>${item._subtotalLabel}</strong></td>`
                    : `<td></td>`;
              });
              if (selectedRecipientCols) {
                selectedRecipientCols.forEach((col) => {
                  if (col === "recipient_quantity") {
                    cells += `<td><strong>${parseFloat(item._recipient.recipient_quantity).toFixed(2)}</strong></td>`;
                  } else if (col === "recipient_amount") {
                    cells += `<td><strong>${parseFloat(item._recipient.recipient_amount).toFixed(2)}</strong></td>`;
                  } else {
                    cells += `<td></td>`;
                  }
                });
              }
              return `<tr style="background-color: #f9f9f9; font-weight: bold;">${cells}</tr>`;
            }
            if (item._isGrandTotalRow) {
              let cells = `<td></td>`;
              selectedColumns.forEach((col) => {
                cells +=
                  col === "nursery_name"
                    ? `<td><strong>कुल योग</strong></td>`
                    : `<td></td>`;
              });
              if (selectedRecipientCols) {
                selectedRecipientCols.forEach((col) => {
                  if (col === "recipient_quantity") {
                    cells += `<td><strong>${parseFloat(item._recipient.recipient_quantity).toFixed(2)}</strong></td>`;
                  } else if (col === "recipient_amount") {
                    cells += `<td><strong>${parseFloat(item._recipient.recipient_amount).toFixed(2)}</strong></td>`;
                  } else {
                    cells += `<td></td>`;
                  }
                });
              }
              return `<tr style="background-color: #e8e8e8; font-weight: bold;">${cells}</tr>`;
            }
            // Regular row - show serial number only for first recipient or items without recipients (rowspan effect)
            let cells = `<td>${item._isFirstRecipient || !item._isRecipientRow ? nurserySerialNumber : ""}</td>`;

            // Add nursery columns only for first recipient or items without recipients (rowspan effect)
            selectedColumns.forEach((col) => {
              if (item._isFirstRecipient || !item._isRecipientRow) {
                cells += `<td>${columnMapping[col].accessor(item, index)}</td>`;
              } else {
                // Empty for non-first recipients (rowspan effect)
                cells += `<td></td>`;
              }
            });

            // Add recipient column data if available
            if (item._recipient && selectedRecipientCols) {
              selectedRecipientCols.forEach((col) => {
                let cellValue = "-";
                if (col === "recipient_name")
                  cellValue = item._recipient.recipient_name || "-";
                else if (col === "recipient_quantity")
                  cellValue =
                    parseFloat(item._recipient.recipient_quantity).toFixed(2) ||
                    "-";
                else if (col === "recipient_amount")
                  cellValue =
                    parseFloat(item._recipient.recipient_amount).toFixed(2) ||
                    "-";
                else if (col === "bill_number")
                  cellValue = item._recipient.bill_number || "-";
                else if (col === "bill_date")
                  cellValue = item._recipient.bill_date || "-";
                cells += `<td>${cellValue}</td>`;
              });
            } else if (selectedRecipientCols) {
              // Add empty cells for recipient columns when no recipient
              selectedRecipientCols.forEach(() => {
                cells += `<td>-</td>`;
              });
            }

            return `<tr>${cells}</tr>`;
          })
          .join("");
      })();

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
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(tableHtml);
      printWindow.document.close();
    } catch (e) {
      console.error("Error generating PDF:", e);
      setApiError("PDF generation failed. Please try again.");
    }
  };

  // Refresh function
  const handleRefresh = () => {
    fetchNurseryPhysicalItems();
    fetchRecipientItems();
    setApiResponse(null);
    setApiError(null);
    clearFilters();
    setEditingRowId(null);
    setEditingValues({});
    setEditingRecipientRowId(null);
    setEditingRecipientValues({});
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingRowId(item.id);
    setEditingValues({
      nursery_name: item.nursery_name || "",
      crop_name: item.crop_name || "",
      unit: item.unit || "",
      allocated_quantity: item.allocated_quantity || "",
      allocated_amount: item.allocated_amount || "",
    });
    setApiError(null);
    setApiResponse(null);
  };

  // Handle save edit
  const handleSave = async (item) => {
    try {
      const payload = {
        id: item.id,
        nursery_name: editingValues.nursery_name,
        crop_name: editingValues.crop_name,
        unit: editingValues.unit,
        allocated_quantity: parseFloat(editingValues.allocated_quantity) || 0,
        allocated_amount: parseFloat(editingValues.allocated_amount) || 0,
      };
      const response = await axios.put(NURSERY_PHYSICAL_API_URL, payload);
      setAllNurseryPhysicalItems((prev) =>
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
        const response = await axios.delete(NURSERY_PHYSICAL_API_URL, {
          data: { id: item.id },
        });
        setAllNurseryPhysicalItems((prev) =>
          prev.filter((i) => i.id !== item.id),
        );
        setApiResponse({ message: "आइटम सफलतापूर्वक हटा दिया गया!" });
      } catch (error) {
        console.error("Error deleting item:", error);
        setApiError("आइटम हटाने में त्रुटि हुई।");
      }
    }
  };

  // Handle select individual checkbox
  const handleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
    setSelectAllChecked(false);
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedIds([]);
      setSelectAllChecked(false);
    } else {
      const allIds = filteredItems.map((item) => item.id);
      setSelectedIds(allIds);
      setSelectAllChecked(true);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      setApiError("कृपया हटाने के लिए कम से कम एक आइटम चुनें।");
      return;
    }
    if (
      window.confirm(
        `क्या आप ${selectedIds.length} चयनित आइटम्स को हटाना चाहते हैं?`,
      )
    ) {
      try {
        const response = await axios.delete(NURSERY_PHYSICAL_API_URL, {
          data: { id: selectedIds },
        });
        setAllNurseryPhysicalItems((prev) =>
          prev.filter((item) => !selectedIds.includes(item.id)),
        );
        setSelectedIds([]);
        setSelectAllChecked(false);
        setApiResponse({
          message: `${selectedIds.length} आइटम सफलतापूर्वक हटा दिए गए!`,
        });
      } catch (error) {
        console.error("Error deleting items:", error);
        setApiError("आइटम हटाने में त्रुटि हुई।");
      }
    }
  };
  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Handle recipient page change
  const handleRecipientPageChange = (pageNumber) => {
    setRecipientCurrentPage(pageNumber);
  };

  // Handle manage recipients
  const handleManageRecipients = (item) => {
    setSelectedNurseryPhysical(item);
    setRecipientFormData({
      nursery_physical: item.id,
      recipient_name: "",
      recipient_quantity: "",
      recipient_amount: "",
      bill_number: "",
      bill_date: new Date().toISOString().split("T")[0],
    });
    setShowRecipientModal(true);
  };

  // Handle recipient edit
  const handleRecipientEdit = (item) => {
    setEditingRecipientRowId(item.id);
    setEditingRecipientValues({
      nursery_physical: item.nursery_physical,
      recipient_name: item.recipient_name || "",
      recipient_quantity: item.recipient_quantity || "",
      recipient_amount: item.recipient_amount || "",
      bill_number: item.bill_number || "",
      bill_date: item.bill_date || new Date().toISOString().split("T")[0],
    });
    setModalApiError(null);
    setModalApiResponse(null);
  };
  // Handle save recipient edit
  const handleSaveRecipient = async (item) => {
    try {
      const payload = {
        id: item.id,
        nursery_physical:
          editingRecipientValues.nursery_physical || item.nursery_physical,
        recipient_name: editingRecipientValues.recipient_name,
        recipient_quantity:
          parseFloat(editingRecipientValues.recipient_quantity) || 0,
        recipient_amount:
          parseFloat(editingRecipientValues.recipient_amount) || 0,
        bill_number: editingRecipientValues.bill_number,
        bill_date: editingRecipientValues.bill_date,
      };

      await axios.put(NURSERY_PHYSICAL_RECIPIENTS_API_URL, payload);

      setEditingRecipientRowId(null);
      setEditingRecipientValues({});
      setModalApiResponse({
        message: "प्राप्तकर्ता डेटा सफलतापूर्वक अपडेट किया गया!",
      });

      // Automatically fetch the latest recipient data from the server
      await fetchRecipientItems();
    } catch (error) {
      console.error("Error updating recipient item:", error);
      setModalApiError("प्राप्तकर्ता आइटम अपडेट करने में त्रुटि हुई।");
    }
  };
  // Handle cancel recipient edit
  const handleCancelRecipient = () => {
    setEditingRecipientRowId(null);
    setEditingRecipientValues({});
  };

  // Handle delete recipient
  const handleDeleteRecipient = async (item) => {
    if (window.confirm("क्या आप इस प्राप्तकर्ता आइटम को हटाना चाहते हैं?")) {
      try {
        await axios.delete(NURSERY_PHYSICAL_RECIPIENTS_API_URL, {
          data: { id: item.id },
        });

        setModalApiResponse({
          message: "प्राप्तकर्ता आइटम सफलतापूर्वक हटा दिया गया!",
        });

        // Automatically fetch the latest recipient data from the server
        await fetchRecipientItems();
      } catch (error) {
        console.error("Error deleting recipient item:", error);
        setModalApiError("प्राप्तकर्ता आइटम हटाने में त्रुटि हुई।");
      }
    }
  };
  // Validate a single row of data (for bulk upload)
  const validateRow = (rowData, rowIndex) => {
    const errors = [];

    if (!rowData.nursery_name || !rowData.nursery_name.toString().trim()) {
      errors.push(`Row ${rowIndex}: नर्सरी का नाम आवश्यक है`);
    }
    if (!rowData.crop_name || !rowData.crop_name.toString().trim()) {
      errors.push(`Row ${rowIndex}: फसल का नाम आवश्यक है`);
    }
    if (!rowData.unit || !rowData.unit.toString().trim()) {
      errors.push(`Row ${rowIndex}: इकाई आवश्यक है`);
    }
    if (
      rowData.allocated_quantity === "" ||
      rowData.allocated_quantity === null ||
      rowData.allocated_quantity === undefined
    ) {
      errors.push(`Row ${rowIndex}: उपलब्ध मात्रा आवश्यक है`);
    } else if (isNaN(parseFloat(rowData.allocated_quantity))) {
      errors.push(`Row ${rowIndex}: उपलब्ध मात्रा एक संख्या होनी चाहिए`);
    }
    if (
      rowData.allocated_amount === "" ||
      rowData.allocated_amount === null ||
      rowData.allocated_amount === undefined
    ) {
      errors.push(`Row ${rowIndex}: धनराशि आवश्यक है`);
    } else if (isNaN(parseFloat(rowData.allocated_amount))) {
      errors.push(`Row ${rowIndex}: धनराशि एक संख्या होनी चाहिए`);
    }

    return errors;
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

          const headerMapping = {};
          headers.forEach((header, index) => {
            if (header) {
              headerMapping[header.toString().trim().toLowerCase()] = index;
            }
          });

          // Parse all rows and filter empty ones
          const parsedRows = [];

          dataRows.forEach((row, rowIndex) => {
            const parsedRow = {
              nursery_name: (
                row[headerMapping["नर्सरी का नाम"]] ||
                row[headerMapping["nursery_name"]] ||
                ""
              )
                .toString()
                .trim(),
              crop_name: (
                row[headerMapping["फसल का नाम"]] ||
                row[headerMapping["crop_name"]] ||
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
                row[headerMapping["उपलब्ध मात्रा"]] ||
                  row[headerMapping["allocated_quantity"]] ||
                  0,
              ),
              allocated_amount: roundTo2Decimals(
                row[headerMapping["धनराशि"]] ||
                  row[headerMapping["allocated_amount"]] ||
                  0,
              ),
              rowIndex: rowIndex + 2,
              _originalIndex: rowIndex,
            };

            if (!isEmptyRow(parsedRow)) {
              parsedRows.push(parsedRow);
            }
          });

          // Validate rows
          const validRows = [];
          const validationErrors = [];

          parsedRows.forEach((rowData) => {
            const rowErrors = validateRow(rowData, rowData.rowIndex);
            if (rowErrors.length > 0) {
              validationErrors.push({
                rowIndex: rowData.rowIndex,
                errors: rowErrors,
                data: rowData,
              });
            } else {
              validRows.push(rowData);
            }
          });

          // Fetch existing nursery physical data to check for duplicates
          try {
            const existingResponse = await axios.get(NURSERY_PHYSICAL_API_URL);
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
                  String(existing.nursery_name || "").trim() ===
                    String(row.nursery_name || "").trim() &&
                  String(existing.crop_name || "").trim() ===
                    String(row.crop_name || "").trim() &&
                  String(existing.unit || "").trim() ===
                    String(row.unit || "").trim() &&
                  parseFloat(existing.allocated_quantity || 0) ===
                    parseFloat(row.allocated_quantity || 0) &&
                  parseFloat(existing.allocated_amount || 0) ===
                    parseFloat(row.allocated_amount || 0)
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
              const key = `${String(row.nursery_name || "").trim()}|${String(row.crop_name || "").trim()}|${String(row.unit || "").trim()}|${parseFloat(row.allocated_quantity || 0)}|${parseFloat(row.allocated_amount || 0)}`;

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

          const response = await axios.post(NURSERY_PHYSICAL_API_URL, payload);

          if (response.status === 200 || response.status === 201) {
            successCount++;
            setAllNurseryPhysicalItems((prev) => [payload, ...prev]);
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
            rowIndex: rowIndex,
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
      } else if (successCount > 0 && failedItems.length > 0) {
        setApiError(
          `⚠️ आंशिक अपलोड: ${successCount} सफल, ${failedItems.length} विफल।`,
        );
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

    // Clear otherMode only when selecting an existing option from the dropdown (not when typing in text input)
    if (
      name === "nursery_name" &&
      value !== "अन्य" &&
      otherMode.nursery_name &&
      e.target.tagName === "SELECT"
    ) {
      setOtherMode((prev) => ({ ...prev, nursery_name: false }));
    }

    // Same for crop_name
    if (
      name === "crop_name" &&
      value !== "अन्य" &&
      otherMode.crop_name &&
      e.target.tagName === "SELECT"
    ) {
      setOtherMode((prev) => ({ ...prev, crop_name: false }));
    }

    // Same for unit
    if (
      name === "unit" &&
      value !== "अन्य" &&
      otherMode.unit &&
      e.target.tagName === "SELECT"
    ) {
      setOtherMode((prev) => ({ ...prev, unit: false }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  // Handle recipient form field changes
  const handleRecipientChange = (e) => {
    const { name, value } = e.target;

    // Auto-calculate recipient_amount based on recipient_quantity if it's changed
    if (name === "recipient_quantity" && selectedNurseryPhysical) {
      const quantity = parseFloat(value) || 0;
      const allocatedQty =
        parseFloat(selectedNurseryPhysical.allocated_quantity) || 0;
      const allocatedAmt =
        parseFloat(selectedNurseryPhysical.allocated_amount) || 0;

      // Calculate remaining quantity
      const distributedQty = recipientItems
        .filter((r) => r.nursery_physical === selectedNurseryPhysical.id)
        .reduce((sum, r) => sum + (parseFloat(r.recipient_quantity) || 0), 0);
      const remainingQty = allocatedQty - distributedQty;

      // Prevent entering more than remaining quantity
      if (quantity > remainingQty && value !== "") {
        setRecipientErrors((prev) => ({
          ...prev,
          recipient_quantity: `केवल ${remainingQty.toFixed(2)} ${selectedNurseryPhysical.unit} उपलब्ध है। अधिक प्रविष्टि करना संभव नहीं है।`,
        }));
        // Don't update the value if it exceeds remaining - show error instead
        return;
      } else {
        setRecipientErrors((prev) => ({
          ...prev,
          recipient_quantity: null,
        }));
      }

      // Calculate proportional amount
      let calculatedAmount = 0;
      if (allocatedQty > 0 && quantity > 0) {
        calculatedAmount = (quantity / allocatedQty) * allocatedAmt;
      }

      setRecipientFormData((prev) => ({
        ...prev,
        [name]: value,
        recipient_amount: calculatedAmount.toFixed(2),
      }));
    } else {
      setRecipientFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (recipientErrors[name]) {
        setRecipientErrors({
          ...recipientErrors,
          [name]: null,
        });
      }
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
        nursery_name: formData.nursery_name,
        crop_name: formData.crop_name,
        unit: formData.unit,
        allocated_quantity: parseFloat(formData.allocated_quantity),
        allocated_amount: parseFloat(formData.allocated_amount),
      };

      const response = await axios.post(NURSERY_PHYSICAL_API_URL, payload);

      const responseData = response.data;
      setApiResponse(responseData);

      setFormData({
        nursery_name: "",
        crop_name: "",
        unit: "",
        allocated_quantity: "",
        allocated_amount: "",
      });

      setAllNurseryPhysicalItems((prev) => [payload, ...prev]);
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

  // Handle recipient form submission
  const handleRecipientSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateRecipientForm();
    if (Object.keys(formErrors).length > 0) {
      setRecipientErrors(formErrors);
      return;
    }

    setIsRecipientSubmitting(true);
    setModalApiError(null);
    setModalApiResponse(null);

    try {
      const payload = {
        nursery_physical: parseInt(recipientFormData.nursery_physical),
        recipient_name: recipientFormData.recipient_name,
        recipient_quantity: parseFloat(recipientFormData.recipient_quantity),
        recipient_amount: parseFloat(recipientFormData.recipient_amount),
        bill_number: recipientFormData.bill_number,
        bill_date: recipientFormData.bill_date,
      };

      const response = await axios.post(
        NURSERY_PHYSICAL_RECIPIENTS_API_URL,
        payload,
      );

      setModalApiResponse({
        message: "प्राप्तकर्ता डेटा सफलतापूर्वक जोड़ा गया!",
      });

      setRecipientFormData({
        nursery_physical: selectedNurseryPhysical.id,
        recipient_name: "",
        recipient_quantity: "",
        recipient_amount: "",
        bill_number: "",
        bill_date: new Date().toISOString().split("T")[0],
      });

      // Automatically fetch the latest recipient data from the server
      await fetchRecipientItems();

      // Reset pagination to show the new item on page 1
      setRecipientCurrentPage(1);
      setRecipientErrors({});
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
      setModalApiError(errorMessage);
    } finally {
      setIsRecipientSubmitting(false);
    }
  };
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.nursery_name.trim())
      newErrors.nursery_name = `${translations.nurseryName} ${translations.required}`;
    if (!formData.crop_name.trim())
      newErrors.crop_name = `${translations.cropName} ${translations.required}`;
    if (!formData.unit.trim())
      newErrors.unit = `${translations.unit} ${translations.required}`;
    if (!formData.allocated_quantity.trim())
      newErrors.allocated_quantity = `${translations.allocatedQuantity} ${translations.required}`;
    if (!formData.allocated_amount.trim())
      newErrors.allocated_amount = `${translations.allocatedAmount} ${translations.required}`;
    return newErrors;
  };

  // Recipient form validation
  const validateRecipientForm = () => {
    const newErrors = {};
    if (!recipientFormData.recipient_name.trim())
      newErrors.recipient_name = `${translations.recipientName} ${translations.required}`;
    if (!recipientFormData.recipient_quantity.trim())
      newErrors.recipient_quantity = `${translations.recipientQuantity} ${translations.required}`;
    else if (selectedNurseryPhysical) {
      const enteredQty = parseFloat(recipientFormData.recipient_quantity) || 0;
      const allocatedQty =
        parseFloat(selectedNurseryPhysical.allocated_quantity) || 0;
      const distributedQty = recipientItems
        .filter((r) => r.nursery_physical === selectedNurseryPhysical.id)
        .reduce((sum, r) => sum + (parseFloat(r.recipient_quantity) || 0), 0);
      const remainingQty = allocatedQty - distributedQty;

      if (enteredQty > remainingQty) {
        newErrors.recipient_quantity = `उपलब्ध मात्रा से अधिक नहीं हो सकता। शेष उपलब्ध: ${remainingQty.toFixed(2)} ${selectedNurseryPhysical.unit}`;
      }
    }
    if (!recipientFormData.recipient_amount.trim())
      newErrors.recipient_amount = `${translations.recipientAmount} ${translations.required}`;
    if (!recipientFormData.bill_number.trim())
      newErrors.bill_number = `${translations.billNumber} ${translations.required}`;
    if (!recipientFormData.bill_date.trim())
      newErrors.bill_date = `${translations.billDate} ${translations.required}`;
    return newErrors;
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

  // Generate recipient pagination items
  const recipientTotalPages = Math.ceil(
    filteredRecipientItems.length / itemsPerPage,
  );
  const recipientPaginationItems = [];
  let recipientStartPage = Math.max(
    1,
    recipientCurrentPage - Math.floor(maxVisiblePages / 2),
  );
  let recipientEndPage = Math.min(
    recipientTotalPages,
    recipientStartPage + maxVisiblePages - 1,
  );

  if (recipientEndPage - recipientStartPage < maxVisiblePages - 1) {
    recipientStartPage = Math.max(1, recipientEndPage - maxVisiblePages + 1);
  }

  if (recipientStartPage > 1) {
    recipientPaginationItems.push(
      <Pagination.Item key={1} onClick={() => handleRecipientPageChange(1)}>
        1
      </Pagination.Item>,
    );
    if (recipientStartPage > 2) {
      recipientPaginationItems.push(
        <Pagination.Ellipsis key="recipient-start-ellipsis" disabled />,
      );
    }
  }

  for (let number = recipientStartPage; number <= recipientEndPage; number++) {
    recipientPaginationItems.push(
      <Pagination.Item
        key={number}
        active={number === recipientCurrentPage}
        onClick={() => handleRecipientPageChange(number)}
      >
        {number}
      </Pagination.Item>,
    );
  }

  if (recipientEndPage < recipientTotalPages) {
    if (recipientEndPage < recipientTotalPages - 1) {
      recipientPaginationItems.push(
        <Pagination.Ellipsis key="recipient-end-ellipsis" disabled />,
      );
    }
    recipientPaginationItems.push(
      <Pagination.Item
        key={recipientTotalPages}
        onClick={() => handleRecipientPageChange(recipientTotalPages)}
      >
        {recipientTotalPages}
      </Pagination.Item>,
    );
  }

  return (
    <div>
      {isAdmin && <DashBoardHeader />}
      {!isAdmin && <NurseryNavigation />}
      <Container
        fluid
        className={isAdmin ? "p-4" : "p-0"}
        style={isAdmin ? {} : { marginTop: "70px", paddingTop: "15px" }}
      >
        <Row className={isAdmin ? "left-top" : "w-100 m-0"}>
          <Col lg={12} md={12} sm={12} className={isAdmin ? "p-0" : "p-3"}>
            <Container
              fluid
              className={
                isAdmin
                  ? "dashboard-body-main bg-home"
                  : "dashboard-body-main bg-home"
              }
              style={isAdmin ? {} : { paddingTop: "10px" }}
            >
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

              {/* Failed Rows Display after Upload */}
              {failedRows.length > 0 && !isUploading && (
                <Alert variant="danger" className="small-fonts">
                  <strong>📋 विफल रिकॉर्ड ({failedRows.length}):</strong>
                  <Table striped bordered hover size="sm" className="mt-2">
                    <thead>
                      <tr>
                        <th>क्र.सं.</th>
                        <th>नर्सरी का नाम</th>
                        <th>फसल का नाम</th>
                        <th>इकाई</th>
                        <th>उपलब्ध मात्रा</th>
                        <th>धनराशि</th>
                        <th>त्रुटि</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedRows.slice(0, 20).map((row, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{row.data?.nursery_name || "-"}</td>
                          <td>{row.data?.crop_name || "-"}</td>
                          <td>{row.data?.unit || "-"}</td>
                          <td>{row.data?.allocated_quantity || "-"}</td>
                          <td>{row.data?.allocated_amount || "-"}</td>
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
                            <th>नर्सरी का नाम</th>
                            <th>फसल का नाम</th>
                            <th>इकाई</th>
                            <th>उपलब्ध मात्रा</th>
                            <th>धनराशि</th>
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
                              <td>{row.nursery_name}</td>
                              <td>{row.crop_name}</td>
                              <td>{row.unit}</td>
                              <td>{row.allocated_quantity}</td>
                              <td>{row.allocated_amount}</td>
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
                    <Button
                      variant="primary"
                      onClick={handleConfirmUpload}
                      disabled={previewData.length === 0}
                    >
                      {previewData.length} रिकॉर्ड अपलोड करें
                    </Button>
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
                          <th>नर्सरी का नाम</th>
                          <th>फसल का नाम</th>
                          <th>इकाई</th>
                          <th>उपलब्ध मात्रा</th>
                          <th>धनराशि</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDuplicateEntries.map((row, idx) => (
                          <tr key={idx} style={{ backgroundColor: "#ffcccc" }}>
                            <td>{row.rowIndex - 1}</td>
                            <td>{row.nursery_name || "-"}</td>
                            <td>{row.crop_name || "-"}</td>
                            <td>{row.unit || "-"}</td>
                            <td>{row.allocated_quantity || "-"}</td>
                            <td>{row.allocated_amount || "-"}</td>
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

              {/* Excel Upload Instructions */}
              <Alert variant="info" className="small-fonts mb-3">
                <strong>Excel अपलोड निर्देश:</strong>
                <ul className="mb-0">
                  <li>कृपया सही फॉर्मेट में Excel फाइल अपलोड करें</li>
                  <li>
                    <strong>अनिवार्य फ़ील्ड:</strong> नर्सरी का नाम, फसल का नाम,
                    इकाई, उपलब्ध मात्रा, धनराशि
                  </li>
                  <li>उपलब्ध मात्रा और धनराशि संख्यात्मक होनी चाहिए</li>
                  <li>डाउनलोड टेम्पलेट बटन का उपयोग करें सही फॉर्मेट के लिए</li>
                </ul>
              </Alert>

              {/* Entry Form Section */}
              <Form
                onSubmit={handleSubmit}
                className="registration-form compact-form"
              >
                <Row>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="nursery_name">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.nurseryName}
                      </Form.Label>
                      {otherMode.nursery_name ? (
                        <div className="d-flex">
                          <Form.Control
                            type="text"
                            name="nursery_name"
                            value={formData.nursery_name}
                            onChange={handleChange}
                            isInvalid={!!errors.nursery_name}
                            className="compact-input"
                            placeholder="नर्सरी का नाम दर्ज करें"
                            autoFocus
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setOtherMode((prev) => ({
                                ...prev,
                                nursery_name: false,
                              }));
                              setFormData((prev) => ({
                                ...prev,
                                nursery_name: "",
                              }));
                            }}
                            className="ms-1"
                            title="वापस सूची में जाएं"
                          >
                            ↺
                          </Button>
                        </div>
                      ) : (
                        <Form.Select
                          name="nursery_name"
                          value={formData.nursery_name}
                          onChange={(e) => {
                            if (e.target.value === "अन्य") {
                              setOtherMode((prev) => ({
                                ...prev,
                                nursery_name: true,
                              }));
                              setFormData((prev) => ({
                                ...prev,
                                nursery_name: "",
                              }));
                            } else {
                              handleChange(e);
                            }
                          }}
                          isInvalid={!!errors.nursery_name}
                          className="compact-input"
                        >
                          <option value="">{translations.selectOption}</option>
                          {filterOptions.nursery_name.map((item, index) => (
                            <option key={index} value={item}>
                              {item}
                            </option>
                          ))}
                          <option value="अन्य">अन्य (नया जोड़ें)</option>
                        </Form.Select>
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.nursery_name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="crop_name">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.cropName}
                      </Form.Label>
                      {otherMode.crop_name ? (
                        <div className="d-flex">
                          <Form.Control
                            type="text"
                            name="crop_name"
                            value={formData.crop_name}
                            onChange={handleChange}
                            isInvalid={!!errors.crop_name}
                            className="compact-input"
                            placeholder="फसल का नाम दर्ज करें"
                            autoFocus
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setOtherMode((prev) => ({
                                ...prev,
                                crop_name: false,
                              }));
                              setFormData((prev) => ({
                                ...prev,
                                crop_name: "",
                              }));
                            }}
                            className="ms-1"
                            title="वापस सूची में जाएं"
                          >
                            ↺
                          </Button>
                        </div>
                      ) : (
                        <Form.Select
                          name="crop_name"
                          value={formData.crop_name}
                          onChange={(e) => {
                            if (e.target.value === "अन्य") {
                              setOtherMode((prev) => ({
                                ...prev,
                                crop_name: true,
                              }));
                              setFormData((prev) => ({
                                ...prev,
                                crop_name: "",
                              }));
                            } else {
                              handleChange(e);
                            }
                          }}
                          isInvalid={!!errors.crop_name}
                          className="compact-input"
                        >
                          <option value="">{translations.selectOption}</option>
                          {filterOptions.crop_name.map((item, index) => (
                            <option key={index} value={item}>
                              {item}
                            </option>
                          ))}
                          <option value="अन्य">अन्य (नया जोड़ें)</option>
                        </Form.Select>
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.crop_name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
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
                            autoFocus
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setOtherMode((prev) => ({
                                ...prev,
                                unit: false,
                              }));
                              setFormData((prev) => ({ ...prev, unit: "" }));
                            }}
                            className="ms-1"
                            title="वापस सूची में जाएं"
                          >
                            ↺
                          </Button>
                        </div>
                      ) : (
                        <Form.Select
                          name="unit"
                          value={formData.unit}
                          onChange={(e) => {
                            if (e.target.value === "अन्य") {
                              setOtherMode((prev) => ({ ...prev, unit: true }));
                              setFormData((prev) => ({ ...prev, unit: "" }));
                            } else {
                              handleChange(e);
                            }
                          }}
                          isInvalid={!!errors.unit}
                          className="compact-input"
                        >
                          <option value="">{translations.selectOption}</option>
                          {unitOptions.map((item, index) => (
                            <option key={index} value={item}>
                              {item}
                            </option>
                          ))}
                          <option value="अन्य">अन्य (नया जोड़ें)</option>
                        </Form.Select>
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.unit}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="allocated_quantity">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.allocatedQuantity}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="allocated_quantity"
                        value={formData.allocated_quantity}
                        onChange={handleChange}
                        isInvalid={!!errors.allocated_quantity}
                        className="compact-input"
                        placeholder="उपलब्ध मात्रा दर्ज करें"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.allocated_quantity}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="allocated_amount">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.allocatedAmount}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="allocated_amount"
                        value={formData.allocated_amount}
                        onChange={handleChange}
                        isInvalid={!!errors.allocated_amount}
                        className="compact-input"
                        placeholder="धनराशि दर्ज करें"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.allocated_amount}
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

              {/* Table Section */}
              <div className="billing-table-section mt-4">
                <div className="pdf-button-section">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                      {nurseryPhysicalItems.length > 0 && (
                        <>
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id="tooltip-refresh">
                                रीफ्रेश करें
                              </Tooltip>
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
                          {selectedIds.length > 0 && (
                            <OverlayTrigger
                              placement="top"
                              overlay={
                                <Tooltip id="tooltip-delete">
                                  चयनित हटाएं
                                </Tooltip>
                              }
                            >
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="me-2"
                              >
                                <RiDeleteBinLine className="me-1" />
                                {selectedIds.length} हटाएं
                              </Button>
                            </OverlayTrigger>
                          )}
                        </>
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
                                  `NurseryPhysicalEntry_${new Date()
                                    .toISOString()
                                    .slice(0, 10)}`,
                                  nurseryPhysicalColumnMapping,
                                  selectedColumns,
                                  selectedRecipientColumns,
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
                                  `NurseryPhysicalEntry_${new Date()
                                    .toISOString()
                                    .slice(0, 10)}`,
                                  nurseryPhysicalColumnMapping,
                                  selectedColumns,
                                  selectedRecipientColumns,
                                  "नर्सरी भौतिक प्रविष्टि डेटा",
                                )
                              }
                            >
                              <FaFilePdf className="me-1" />
                              PDF
                            </Button>
                          </OverlayTrigger>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column Selection Section */}
                <div className="row">
                  <div className="col-md-6">
                    <ColumnSelection
                      columns={nurseryPhysicalTableColumns}
                      selectedColumns={selectedColumns}
                      setSelectedColumns={setSelectedColumns}
                      title="नर्सरी कॉलम चुनें"
                    />
                  </div>
                  <div className="col-md-6">
                    <ColumnSelection
                      columns={recipientTableColumns}
                      selectedColumns={selectedRecipientColumns}
                      setSelectedColumns={setSelectedRecipientColumns}
                      title="प्राप्तकर्ता कॉलम चुनें"
                    />
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

                {/* New Created At Date Filter Section - Separate from date range filters */}
                {nurseryPhysicalItems.length > 0 && (
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
                            {translations.fromDate}
                          </Form.Label>
                          <Form.Control
                            type="date"
                            value={filters.from_date}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                from_date: e.target.value,
                              }))
                            }
                            className="compact-input"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.toDate}
                          </Form.Label>
                          <Form.Control
                            type="date"
                            value={filters.to_date}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                to_date: e.target.value,
                              }))
                            }
                            className="compact-input"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small-fonts fw-bold">
                            {translations.nurseryName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="nursery_name"
                            value={filters.nursery_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                nursery_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.nursery_name.map(
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
                            {translations.cropName}
                          </Form.Label>
                          <Select
                            isMulti
                            name="crop_name"
                            value={filters.crop_name.map((val) => ({
                              value: val,
                              label: val,
                            }))}
                            onChange={(selected) => {
                              setFilters((prev) => ({
                                ...prev,
                                crop_name: selected
                                  ? selected.map((s) => s.value)
                                  : [],
                              }));
                            }}
                            options={filterOptions.crop_name.map((option) => ({
                              value: option,
                              label: option,
                            }))}
                            className="compact-input"
                            placeholder="चुनें"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* Table is only visible when date range is selected */}
                {!filters.from_date || !filters.to_date ? (
                  <Alert variant="info" className="text-center">
                    कृपया तिथि रेंज चुनें ताकि डेटा दिखाई दे
                  </Alert>
                ) : isLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">लोड हो रहा है...</span>
                    </div>
                    <p className="mt-2 small-fonts">डेटा लोड हो रहा है...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <Alert variant="info" className="text-center">
                    चयनित तिथि रेंज में कोई नर्सरी भौतिक डेटा उपलब्ध नहीं है।
                  </Alert>
                ) : (
                  <>
                    <Table striped bordered hover className="registration-form">
                      <thead className="table-light">
                        <tr>
                          <th>
                            <Form.Check
                              type="checkbox"
                              checked={selectAllChecked}
                              onChange={handleSelectAll}
                              title="सभी चुनें"
                            />
                          </th>
                          <th>क्र.सं.</th>
                          {selectedColumns.includes("nursery_name") && (
                            <th>{translations.nurseryName}</th>
                          )}
                          {selectedColumns.includes("crop_name") && (
                            <th>{translations.cropName}</th>
                          )}
                          {selectedColumns.includes("unit") && (
                            <th>{translations.unit}</th>
                          )}
                          {selectedColumns.includes("allocated_quantity") && (
                            <th>{translations.allocatedQuantity}</th>
                          )}
                          {selectedColumns.includes("allocated_amount") && (
                            <th>{translations.allocatedAmount}</th>
                          )}
                          {selectedRecipientColumns.includes(
                            "recipient_name",
                          ) && <th>{translations.recipientName}</th>}
                          {selectedRecipientColumns.includes(
                            "recipient_quantity",
                          ) && <th>{translations.recipientQuantity}</th>}
                          {selectedRecipientColumns.includes(
                            "recipient_amount",
                          ) && <th>{translations.recipientAmount}</th>}
                          {selectedRecipientColumns.includes("bill_number") && (
                            <th>{translations.billNumber}</th>
                          )}
                          {selectedRecipientColumns.includes("bill_date") && (
                            <th>{translations.billDate}</th>
                          )}
                          <th>कार्रवाई</th>
                        </tr>
                      </thead>
                      <tbody className="tbl-body">
                        {(() => {
                          // Get expanded data with subtotals and grand total for current page items
                          const pageItems = filteredItems.slice(
                            (currentPage - 1) * itemsPerPage,
                            currentPage * itemsPerPage,
                          );
                          const expandedPageData = expandDataWithRecipients(
                            pageItems,
                            selectedRecipientColumns,
                          );

                          // Track serial numbers for nursery items on this page
                          const pageStartIndex =
                            (currentPage - 1) * itemsPerPage;
                          const nurserySerialMap = new Map();
                          pageItems.forEach((item, idx) => {
                            nurserySerialMap.set(
                              item.id,
                              pageStartIndex + idx + 1,
                            );
                          });

                          // Filter expandedPageData to exclude grand total if not on last page
                          const isLastPage = currentPage === totalPages;
                          const displayData = expandedPageData.filter(
                            (item) => {
                              if (item._isGrandTotalRow && !isLastPage) {
                                return false;
                              }
                              return true;
                            },
                          );

                          return displayData.map((item, index) => {
                            // Handle subtotal row
                            if (item._isSubtotalRow) {
                              return (
                                <tr
                                  key={`subtotal-${item.id}-${index}`}
                                  style={{
                                    backgroundColor: "#f9f9f9",
                                    fontWeight: "bold",
                                  }}
                                >
                                  <td></td>
                                  <td colSpan={1}></td>
                                  {selectedColumns.includes("nursery_name") && (
                                    <td colSpan={1}>{item._subtotalLabel}</td>
                                  )}
                                  {selectedColumns.includes("crop_name") && (
                                    <td colSpan={1}></td>
                                  )}
                                  {selectedColumns.includes("unit") && (
                                    <td colSpan={1}></td>
                                  )}
                                  {selectedColumns.includes(
                                    "allocated_quantity",
                                  ) && <td colSpan={1}></td>}
                                  {selectedColumns.includes(
                                    "allocated_amount",
                                  ) && <td colSpan={1}></td>}
                                  {selectedRecipientColumns.includes(
                                    "recipient_name",
                                  ) && <td colSpan={1}></td>}
                                  {selectedRecipientColumns.includes(
                                    "recipient_quantity",
                                  ) && (
                                    <td>
                                      {item._recipient?.recipient_quantity
                                        ? parseFloat(
                                            item._recipient.recipient_quantity,
                                          ).toFixed(2)
                                        : "-"}
                                    </td>
                                  )}
                                  {selectedRecipientColumns.includes(
                                    "recipient_amount",
                                  ) && (
                                    <td>
                                      {item._recipient?.recipient_amount
                                        ? parseFloat(
                                            item._recipient.recipient_amount,
                                          ).toFixed(2)
                                        : "-"}
                                    </td>
                                  )}
                                  {selectedRecipientColumns.includes(
                                    "bill_number",
                                  ) && <td colSpan={1}></td>}
                                  {selectedRecipientColumns.includes(
                                    "bill_date",
                                  ) && <td colSpan={1}></td>}
                                  <td colSpan={1}></td>
                                </tr>
                              );
                            }

                            // Handle grand total row
                            if (item._isGrandTotalRow) {
                              return (
                                <tr
                                  key={`grand-total-${index}`}
                                  style={{
                                    backgroundColor: "#e8e8e8",
                                    fontWeight: "bold",
                                  }}
                                >
                                  <td></td>
                                  <td colSpan={1}></td>
                                  {selectedColumns.includes("nursery_name") && (
                                    <td colSpan={1}>कुल योग</td>
                                  )}
                                  {selectedColumns.includes("crop_name") && (
                                    <td></td>
                                  )}
                                  {selectedColumns.includes("unit") && (
                                    <td></td>
                                  )}
                                  {selectedColumns.includes(
                                    "allocated_quantity",
                                  ) && <td></td>}
                                  {selectedColumns.includes(
                                    "allocated_amount",
                                  ) && <td></td>}
                                  {selectedRecipientColumns.includes(
                                    "recipient_name",
                                  ) && <td></td>}
                                  {selectedRecipientColumns.includes(
                                    "recipient_quantity",
                                  ) && (
                                    <td>
                                      {item._recipient?.recipient_quantity
                                        ? parseFloat(
                                            item._recipient.recipient_quantity,
                                          ).toFixed(2)
                                        : "-"}
                                    </td>
                                  )}
                                  {selectedRecipientColumns.includes(
                                    "recipient_amount",
                                  ) && (
                                    <td>
                                      {item._recipient?.recipient_amount
                                        ? parseFloat(
                                            item._recipient.recipient_amount,
                                          ).toFixed(2)
                                        : "-"}
                                    </td>
                                  )}
                                  {selectedRecipientColumns.includes(
                                    "bill_number",
                                  ) && <td></td>}
                                  {selectedRecipientColumns.includes(
                                    "bill_date",
                                  ) && <td></td>}
                                  <td></td>
                                  <td></td>
                                </tr>
                              );
                            }

                            // Handle regular row (could be original item or recipient row)
                            const originalItem = item;
                            const recipient = item._recipient;
                            // For items without recipients, treat as first recipient
                            const isFirstRecipient =
                              item._isFirstRecipient || !item._isRecipientRow;
                            const itemRecipients = recipientItems.filter(
                              (r) => r.nursery_physical === originalItem.id,
                            );
                            const recipientRowCount = Math.max(
                              itemRecipients.length,
                              1,
                            );
                            const serialNumber = nurserySerialMap.get(
                              originalItem.id,
                            );

                            return (
                              <tr
                                key={`${originalItem.id}-${recipient?.id || "no-recipient"}`}
                              >
                                <td>
                                  {isFirstRecipient && (
                                    <Form.Check
                                      type="checkbox"
                                      checked={selectedIds.includes(
                                        originalItem.id,
                                      )}
                                      onChange={() =>
                                        handleSelectItem(originalItem.id)
                                      }
                                    />
                                  )}
                                </td>
                                <td>{isFirstRecipient ? serialNumber : ""}</td>
                                {selectedColumns.includes("nursery_name") && (
                                  <td>
                                    {isFirstRecipient ? (
                                      editingRowId === originalItem.id ? (
                                        <Form.Control
                                          type="text"
                                          value={editingValues.nursery_name}
                                          onChange={(e) =>
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              nursery_name: e.target.value,
                                            }))
                                          }
                                          size="sm"
                                        />
                                      ) : (
                                        originalItem.nursery_name
                                      )
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                )}
                                {selectedColumns.includes("crop_name") && (
                                  <td>
                                    {isFirstRecipient ? (
                                      editingRowId === originalItem.id ? (
                                        <Form.Control
                                          type="text"
                                          value={editingValues.crop_name}
                                          onChange={(e) =>
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              crop_name: e.target.value,
                                            }))
                                          }
                                          size="sm"
                                        />
                                      ) : (
                                        originalItem.crop_name
                                      )
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                )}
                                {selectedColumns.includes("unit") && (
                                  <td>
                                    {isFirstRecipient ? (
                                      editingRowId === originalItem.id ? (
                                        <Form.Select
                                          value={editingValues.unit}
                                          onChange={(e) =>
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              unit: e.target.value,
                                            }))
                                          }
                                          size="sm"
                                        >
                                          <option value="">चुनें</option>
                                          {unitOptions.map((opt, idx) => (
                                            <option key={idx} value={opt}>
                                              {opt}
                                            </option>
                                          ))}
                                        </Form.Select>
                                      ) : (
                                        originalItem.unit
                                      )
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                )}
                                {selectedColumns.includes(
                                  "allocated_quantity",
                                ) && (
                                  <td>
                                    {isFirstRecipient ? (
                                      editingRowId === originalItem.id ? (
                                        <Form.Control
                                          type="number"
                                          step="0.01"
                                          value={
                                            editingValues.allocated_quantity
                                          }
                                          onChange={(e) =>
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              allocated_quantity:
                                                e.target.value,
                                            }))
                                          }
                                          size="sm"
                                        />
                                      ) : (
                                        parseFloat(
                                          originalItem.allocated_quantity,
                                        ).toFixed(2)
                                      )
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                )}
                                {selectedColumns.includes(
                                  "allocated_amount",
                                ) && (
                                  <td>
                                    {isFirstRecipient ? (
                                      editingRowId === originalItem.id ? (
                                        <Form.Control
                                          type="number"
                                          step="0.01"
                                          value={editingValues.allocated_amount}
                                          onChange={(e) =>
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              allocated_amount: e.target.value,
                                            }))
                                          }
                                          size="sm"
                                        />
                                      ) : (
                                        parseFloat(
                                          originalItem.allocated_amount,
                                        ).toFixed(2)
                                      )
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                )}
                                {/* Recipient columns */}
                                {selectedRecipientColumns.includes(
                                  "recipient_name",
                                ) && (
                                  <td>{recipient?.recipient_name || "-"}</td>
                                )}
                                {selectedRecipientColumns.includes(
                                  "recipient_quantity",
                                ) && (
                                  <td>
                                    {recipient?.recipient_quantity
                                      ? parseFloat(
                                          recipient.recipient_quantity,
                                        ).toFixed(2)
                                      : "-"}
                                  </td>
                                )}
                                {selectedRecipientColumns.includes(
                                  "recipient_amount",
                                ) && (
                                  <td>
                                    {recipient?.recipient_amount
                                      ? parseFloat(
                                          recipient.recipient_amount,
                                        ).toFixed(2)
                                      : "-"}
                                  </td>
                                )}
                                {selectedRecipientColumns.includes(
                                  "bill_number",
                                ) && <td>{recipient?.bill_number || "-"}</td>}
                                {selectedRecipientColumns.includes(
                                  "bill_date",
                                ) && <td>{recipient?.bill_date || "-"}</td>}
                                <td>
                                  {isFirstRecipient ? (
                                    editingRowId === originalItem.id ? (
                                      <div className="d-flex gap-1">
                                        <Button
                                          variant="outline-success"
                                          size="sm"
                                          onClick={() =>
                                            handleSave(originalItem)
                                          }
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
                                      </div>
                                    ) : (
                                      <div className="d-flex gap-1">
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() =>
                                            handleEdit(originalItem)
                                          }
                                        >
                                          संपादित करें
                                        </Button>
                                        <Button
                                          variant="outline-info"
                                          size="sm"
                                          onClick={() =>
                                            handleManageRecipients(originalItem)
                                          }
                                        >
                                          प्राप्तकर्ता
                                        </Button>
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() =>
                                            handleDelete(originalItem)
                                          }
                                        >
                                          <RiDeleteBinLine />
                                        </Button>
                                      </div>
                                    )
                                  ) : (
                                    ""
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <Pagination>
                          <Pagination.Prev
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          />
                          {paginationItems}
                          <Pagination.Next
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
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

      {/* Recipient Management Modal */}
      <Modal
        show={showRecipientModal}
        onHide={() => setShowRecipientModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedNurseryPhysical && (
              <span>
                {translations.manageRecipients} -{" "}
                {selectedNurseryPhysical.nursery_name} (
                {selectedNurseryPhysical.crop_name})
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedNurseryPhysical && (
            <>
              {/* Display success message in the modal */}
              {modalApiResponse && (
                <Alert variant="success" className="small-fonts">
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {modalApiResponse.message}
                  </div>
                </Alert>
              )}

              {/* Display error message in the modal */}
              {modalApiError && (
                <Alert variant="danger" className="small-fonts">
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      maxHeight: "300px",
                      overflowY: "auto",
                    }}
                  >
                    {modalApiError}
                  </div>
                </Alert>
              )}

              {/* Allocated Allocation Info at Top */}
              {selectedNurseryPhysical && (
                <div
                  className="alert alert-info mb-4"
                  style={{
                    backgroundColor: "#e7f3ff",
                    borderLeft: "4px solid #2196F3",
                  }}
                >
                  <Row className="align-items-center">
                    <Col md={6}>
                      <h6 className="mb-2 small-fonts fw-bold">
                        📊 आवंटित जानकारी
                      </h6>
                      <div className="small-fonts">
                        <p className="mb-1">
                          <strong>फसल:</strong>{" "}
                          {selectedNurseryPhysical.crop_name} (
                          {selectedNurseryPhysical.unit})
                        </p>
                        <p className="mb-1">
                          <strong>कुल उपलब्ध मात्रा:</strong>{" "}
                          <span className="badge bg-primary">
                            {parseFloat(
                              selectedNurseryPhysical.allocated_quantity,
                            ).toFixed(2)}
                          </span>
                        </p>
                        <p className="mb-0">
                          <strong>कुल धनराशि:</strong>{" "}
                          <span className="badge bg-success">
                            ₹
                            {parseFloat(
                              selectedNurseryPhysical.allocated_amount,
                            ).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <h6 className="mb-2 small-fonts fw-bold">
                        📈 वितरण स्थिति
                      </h6>
                      <div className="small-fonts">
                        <p className="mb-1">
                          <strong>अब तक वितरित:</strong>{" "}
                          <span className="badge bg-warning text-dark">
                            {(() => {
                              const distributed = recipientItems
                                .filter(
                                  (r) =>
                                    r.nursery_physical ===
                                    selectedNurseryPhysical.id,
                                )
                                .reduce(
                                  (sum, r) =>
                                    sum +
                                    (parseFloat(r.recipient_quantity) || 0),
                                  0,
                                );
                              return parseFloat(distributed).toFixed(2);
                            })()}
                          </span>
                        </p>
                        <p className="mb-1">
                          <strong>शेष उपलब्ध:</strong>{" "}
                          <span className="badge bg-danger">
                            {(() => {
                              const allocated =
                                parseFloat(
                                  selectedNurseryPhysical.allocated_quantity,
                                ) || 0;
                              const distributed = recipientItems
                                .filter(
                                  (r) =>
                                    r.nursery_physical ===
                                    selectedNurseryPhysical.id,
                                )
                                .reduce(
                                  (sum, r) =>
                                    sum +
                                    (parseFloat(r.recipient_quantity) || 0),
                                  0,
                                );
                              const remaining = allocated - distributed;
                              return (remaining >= 0 ? remaining : 0).toFixed(
                                2,
                              );
                            })()}
                          </span>
                        </p>
                        <p className="mb-0">
                          <strong>प्रति इकाई दर:</strong>{" "}
                          <span className="badge bg-info">
                            ₹
                            {(() => {
                              const allocated =
                                parseFloat(
                                  selectedNurseryPhysical.allocated_quantity,
                                ) || 0;
                              const amount =
                                parseFloat(
                                  selectedNurseryPhysical.allocated_amount,
                                ) || 0;
                              return allocated > 0
                                ? (amount / allocated).toFixed(2)
                                : "0.00";
                            })()}
                          </span>
                        </p>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Recipient Form */}
              <Form
                onSubmit={handleRecipientSubmit}
                className="registration-form compact-form mb-4"
              >
                {/* Hidden input for nursery_physical ID */}
                <Form.Control
                  type="hidden"
                  name="nursery_physical"
                  value={recipientFormData.nursery_physical}
                  onChange={handleRecipientChange}
                />

                <Row>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="recipient_name">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.recipientName}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="recipient_name"
                        value={recipientFormData.recipient_name}
                        onChange={handleRecipientChange}
                        isInvalid={!!recipientErrors.recipient_name}
                        className="compact-input"
                        placeholder="प्राप्तकर्ता का नाम दर्ज करें"
                      />
                      <Form.Control.Feedback type="invalid">
                        {recipientErrors.recipient_name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="recipient_quantity">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.recipientQuantity}
                        {selectedNurseryPhysical && (
                          <span className="ms-2 badge bg-info small">
                            अधिकतम:{" "}
                            {(() => {
                              const allocated =
                                parseFloat(
                                  selectedNurseryPhysical.allocated_quantity,
                                ) || 0;
                              const distributed = recipientItems
                                .filter(
                                  (r) =>
                                    r.nursery_physical ===
                                    selectedNurseryPhysical.id,
                                )
                                .reduce(
                                  (sum, r) =>
                                    sum +
                                    (parseFloat(r.recipient_quantity) || 0),
                                  0,
                                );
                              const remaining = allocated - distributed;
                              return (remaining >= 0 ? remaining : 0).toFixed(
                                2,
                              );
                            })()}
                          </span>
                        )}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="recipient_quantity"
                        value={recipientFormData.recipient_quantity}
                        onChange={handleRecipientChange}
                        isInvalid={!!recipientErrors.recipient_quantity}
                        className="compact-input"
                        placeholder="वितरण मात्रा दर्ज करें"
                        max={
                          selectedNurseryPhysical
                            ? (() => {
                                const allocated =
                                  parseFloat(
                                    selectedNurseryPhysical.allocated_quantity,
                                  ) || 0;
                                const distributed = recipientItems
                                  .filter(
                                    (r) =>
                                      r.nursery_physical ===
                                      selectedNurseryPhysical.id,
                                  )
                                  .reduce(
                                    (sum, r) =>
                                      sum +
                                      (parseFloat(r.recipient_quantity) || 0),
                                    0,
                                  );
                                return allocated - distributed;
                              })()
                            : undefined
                        }
                      />
                      <Form.Control.Feedback type="invalid">
                        {recipientErrors.recipient_quantity}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="recipient_amount">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.recipientAmount}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="recipient_amount"
                        value={recipientFormData.recipient_amount}
                        onChange={handleRecipientChange}
                        isInvalid={!!recipientErrors.recipient_amount}
                        className="compact-input"
                        placeholder="वितरित धनराशि दर्ज करें"
                      />
                      <Form.Control.Feedback type="invalid">
                        {recipientErrors.recipient_amount}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="bill_number">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.billNumber}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="bill_number"
                        value={recipientFormData.bill_number}
                        onChange={handleRecipientChange}
                        isInvalid={!!recipientErrors.bill_number}
                        className="compact-input"
                        placeholder="बिल नंबर दर्ज करें"
                      />
                      <Form.Control.Feedback type="invalid">
                        {recipientErrors.bill_number}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-2" controlId="bill_date">
                      <Form.Label className="small-fonts fw-bold">
                        {translations.billDate}
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="bill_date"
                        value={recipientFormData.bill_date}
                        onChange={handleRecipientChange}
                        isInvalid={!!recipientErrors.bill_date}
                        className="compact-input"
                      />
                      <Form.Control.Feedback type="invalid">
                        {recipientErrors.bill_date}
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
                      disabled={isRecipientSubmitting}
                      className="compact-submit-btn w-100"
                    >
                      {isRecipientSubmitting
                        ? translations.submitting
                        : translations.addRecipient}
                    </Button>
                  </Col>
                </Row>
              </Form>

              {/* Column Selection Section for Recipients */}
              <ColumnSelection
                columns={recipientTableColumns}
                selectedColumns={selectedRecipientColumns}
                setSelectedColumns={setSelectedRecipientColumns}
                title="प्राप्तकर्ता कॉलम चुनें"
              />

              {/* Recipient Table */}
              {isRecipientLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">लोड हो रहा है...</span>
                  </div>
                  <p className="mt-2 small-fonts">
                    प्राप्तकर्ता डेटा लोड हो रहा है...
                  </p>
                </div>
              ) : filteredRecipientItems.length === 0 ? (
                <Alert variant="info" className="text-center">
                  कोई प्राप्तकर्ता डेटा उपलब्ध नहीं है।
                </Alert>
              ) : (
                <>
                  <Table striped bordered hover className="registration-form">
                    <thead className="table-light">
                      <tr>
                        <th>क्र.सं.</th>
                        {selectedRecipientColumns.includes(
                          "recipient_name",
                        ) && <th>{translations.recipientName}</th>}
                        {selectedRecipientColumns.includes(
                          "recipient_quantity",
                        ) && <th>{translations.recipientQuantity}</th>}
                        {selectedRecipientColumns.includes(
                          "recipient_amount",
                        ) && <th>{translations.recipientAmount}</th>}
                        {selectedRecipientColumns.includes("bill_number") && (
                          <th>{translations.billNumber}</th>
                        )}
                        {selectedRecipientColumns.includes("bill_date") && (
                          <th>{translations.billDate}</th>
                        )}
                        <th>कार्रवाई</th>
                      </tr>
                    </thead>
                    <tbody className="tbl-body">
                      {filteredRecipientItems
                        .slice(
                          (recipientCurrentPage - 1) * itemsPerPage,
                          recipientCurrentPage * itemsPerPage,
                        )
                        .map((item, index) => (
                          <tr key={item.id || index}>
                            <td>
                              {(recipientCurrentPage - 1) * itemsPerPage +
                                index +
                                1}
                            </td>
                            {selectedRecipientColumns.includes(
                              "recipient_name",
                            ) && (
                              <td>
                                {editingRecipientRowId === item.id ? (
                                  <Form.Control
                                    type="text"
                                    value={
                                      editingRecipientValues.recipient_name
                                    }
                                    onChange={(e) =>
                                      setEditingRecipientValues((prev) => ({
                                        ...prev,
                                        recipient_name: e.target.value,
                                      }))
                                    }
                                    size="sm"
                                  />
                                ) : (
                                  item.recipient_name
                                )}
                              </td>
                            )}
                            {selectedRecipientColumns.includes(
                              "recipient_quantity",
                            ) && (
                              <td>
                                {editingRecipientRowId === item.id ? (
                                  <Form.Control
                                    type="number"
                                    step="0.01"
                                    value={
                                      editingRecipientValues.recipient_quantity
                                    }
                                    onChange={(e) =>
                                      setEditingRecipientValues((prev) => ({
                                        ...prev,
                                        recipient_quantity: e.target.value,
                                      }))
                                    }
                                    size="sm"
                                  />
                                ) : (
                                  parseFloat(item.recipient_quantity).toFixed(2)
                                )}
                              </td>
                            )}
                            {selectedRecipientColumns.includes(
                              "recipient_amount",
                            ) && (
                              <td>
                                {editingRecipientRowId === item.id ? (
                                  <Form.Control
                                    type="number"
                                    step="0.01"
                                    value={
                                      editingRecipientValues.recipient_amount
                                    }
                                    onChange={(e) =>
                                      setEditingRecipientValues((prev) => ({
                                        ...prev,
                                        recipient_amount: e.target.value,
                                      }))
                                    }
                                    size="sm"
                                  />
                                ) : (
                                  parseFloat(item.recipient_amount).toFixed(2)
                                )}
                              </td>
                            )}
                            {selectedRecipientColumns.includes(
                              "bill_number",
                            ) && (
                              <td>
                                {editingRecipientRowId === item.id ? (
                                  <Form.Control
                                    type="text"
                                    value={editingRecipientValues.bill_number}
                                    onChange={(e) =>
                                      setEditingRecipientValues((prev) => ({
                                        ...prev,
                                        bill_number: e.target.value,
                                      }))
                                    }
                                    size="sm"
                                  />
                                ) : (
                                  item.bill_number
                                )}
                              </td>
                            )}
                            {selectedRecipientColumns.includes("bill_date") && (
                              <td>
                                {editingRecipientRowId === item.id ? (
                                  <Form.Control
                                    type="date"
                                    value={editingRecipientValues.bill_date}
                                    onChange={(e) =>
                                      setEditingRecipientValues((prev) => ({
                                        ...prev,
                                        bill_date: e.target.value,
                                      }))
                                    }
                                    size="sm"
                                  />
                                ) : item.bill_date ? (
                                  new Date(item.bill_date).toLocaleDateString(
                                    "hi-IN",
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>
                            )}
                            <td>
                              {editingRecipientRowId === item.id ? (
                                <div className="d-flex gap-1">
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleSaveRecipient(item)}
                                  >
                                    सहेजें
                                  </Button>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={handleCancelRecipient}
                                  >
                                    रद्द करें
                                  </Button>
                                </div>
                              ) : (
                                <div className="d-flex gap-1">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleRecipientEdit(item)}
                                  >
                                    संपादित करें
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteRecipient(item)}
                                  >
                                    <RiDeleteBinLine />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>

                  {/* Recipient Pagination */}
                  {recipientTotalPages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                      <Pagination>
                        <Pagination.Prev
                          onClick={() =>
                            handleRecipientPageChange(recipientCurrentPage - 1)
                          }
                          disabled={recipientCurrentPage === 1}
                        />
                        {recipientPaginationItems}
                        <Pagination.Next
                          onClick={() =>
                            handleRecipientPageChange(recipientCurrentPage + 1)
                          }
                          disabled={
                            recipientCurrentPage === recipientTotalPages
                          }
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setModalApiResponse(null); // Clear modal messages when closing
              setModalApiError(null);
              setShowRecipientModal(false);
            }}
          >
            {translations.close}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default NurseryPhysicalEntry;
