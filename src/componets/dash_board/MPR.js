import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Container, Form, Button, Alert, Row, Col, Card, Spinner, Badge, Pagination, Collapse, ProgressBar } from "react-bootstrap";
import Select from 'react-select';
import axios from "axios";
import * as XLSX from 'xlsx';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import "../../assets/css/registration.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/table.css";
import DashBoardHeader from "./DashBoardHeader";
import LeftNav from "./LeftNav";

// API URLs
const YEARLY_DATA_URL = "https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/";
const MONTHLY_DATA_URL = "https://mahadevaaya.com/govbillingsystem/backend/api/report-billing-items/";

// Helper function to format numbers as currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Helper to convert field key to a readable title (Hindi)
const formatFieldTitle = (fieldKey) => {
  const titles = {
    center_name: 'केंद्र का नाम',
    investment_name: 'निवेश का नाम',
    unit: 'इकाई',
    source_of_receipt: 'सप्लायर',
    scheme_name: 'योजना का नाम'
  };
  return titles[fieldKey] || fieldKey;
};

// Column mappings for main table
const mainTableColumnMapping = {
  sno: { header: 'क्र.सं.', accessor: (item, index, currentPage, itemsPerPage) => (currentPage - 1) * itemsPerPage + index + 1 },
  reportId: { header: 'रिपोर्ट आईडी', accessor: (item) => item.bill_report_id || '-' },
  centerName: { header: 'केंद्र का नाम', accessor: (item) => item.center_name },
  sourceOfReceipt: { header: 'सप्लायर', accessor: (item) => item.source_of_receipt },
  reportDate: { header: 'रिपोर्ट तारीख', accessor: (item) => item.billing_date ? new Date(item.billing_date).toLocaleDateString('hi-IN') : 'N/A' },
  status: { header: 'स्थिति', accessor: (item) => item.status === 'accepted' ? 'स्वीकृत' : item.status === 'cancelled' ? 'रद्द' : 'लंबित' },
  totalItems: { header: 'कुल आइटम', accessor: (item) => item.component_data ? item.component_data.length : 0 },
  totalAmount: { header: 'कुल राशि', accessor: (item) => item.total_amount }
};

// Column mappings for component table
const componentColumnMapping = {
  reportId: { 
    header: 'रिपोर्ट आईडी', 
    accessor: (item, index, currentPage, itemsPerPage, parentReport) => {
      // If parentReport is provided, use its bill_report_id
      if (parentReport) {
        return parentReport.bill_report_id;
      }
      // Otherwise, try to get it from the item itself, or return a default
      return item.bill_report_id || '-';
    }
  },
  investment_name: { header: 'निवेश का नाम', accessor: (item) => item.investment_name },
  unit: { header: 'इकाई', accessor: (item) => item.unit },
  allocated_quantity: { header: 'आवंटित मात्रा ', accessor: (item) => item.allocated_quantity },
  updated_quantity: { header: 'अपडेट की गई मात्रा', accessor: (item) => item.updated_quantity || '-' },
  rate: { header: 'दर', accessor: (item) => `₹${item.rate}` },
  buyAmount: { header: 'खरीद राशि', accessor: (item) => `₹${item.buy_amount}` },
  soldAmount: { header: 'बेची गई राशि', accessor: (item) => `₹${item.sold_amount}` },
  scheme_name: { header: 'योजना का नाम', accessor: (item) => item.scheme_name },
  total_amount: { header: 'कुल राशि', accessor: (item) => `₹${item.total_amount?.toFixed(2) || '0.00'}` }
};

// Available columns for main table download
const availableColumns = [
  { key: 'sno', label: 'क्र.सं.' },
  { key: 'reportId', label: 'रिपोर्ट आईडी' },
  { key: 'centerName', label: 'केंद्र का नाम' },
  { key: 'sourceOfReceipt', label: 'सप्लायर' },
  { key: 'reportDate', label: 'रिपोर्ट तारीख' },
  { key: 'status', label: 'स्थिति' },
  { key: 'totalItems', label: 'कुल आइटम' },
  { key: 'totalAmount', label: 'कुल राशि' }
];

// Available columns for component tables
const availableComponentColumns = [
  { key: 'reportId', label: 'रिपोर्ट आईडी' },
  { key: 'investment_name', label: 'निवेश का नाम' },
  { key: 'unit', label: 'इकाई' },
  { key: 'allocated_quantity', label: 'आवंटित मात्रा ' },
  { key: 'updated_quantity', label: 'अपडेट की गई मात्रा' },
  { key: 'rate', label: 'दर' },
  { key: 'buyAmount', label: 'खरीद राशि' },
  { key: 'soldAmount', label: 'बेची गई राशि' },
  { key: 'scheme_name', label: 'योजना का नाम' },
  { key: 'total_amount', label: 'कुल राशि' }
];

// Hindi translations
const translations = {
  pageTitle: "मासिक प्रगति रिपोर्ट (MPR)",
  filters: "फिल्टर",
  clearAllFilters: "सभी फिल्टर हटाएं",
  centerName: "केंद्र का नाम",
  sourceOfReceipt: "सप्लायर",
  investmentName: "निवेश का नाम",
  schemeName: "योजना का नाम",
  fromDate: "आरंभ तिथि",
  toDate: "अंतिम तिथि",
  selectedDates: "चयनित तिथियां (कॉमा से अलग) YYYY-DD-MM",
  month: "महीना",
  year: "वर्ष",
  viewReport: "रिपोर्ट देखें",
  loading: "लोड हो रहा है...",
  noDataFound: "कोई डेटा नहीं मिला।",
  clearAllFilters: "सभी फिल्टर हटाएं",
  sno: "क्र.सं.",
  reportId: "रिपोर्ट आईडी",
  investmentName: "निवेश का नाम",
  unit: "इकाई",
  allocatedQuantity: "आवंटित मात्रा ",
  updatedQuantity: "अपडेट की गई मात्रा",
  rate: "दर",
  buyAmount: "खरीद राशि",
  soldAmount: "बेची गई राशि",
  totalAmount: "कुल राशि",
  monthlyProgress: "मासिक प्रगति",
  yearlyProgress: "वार्षिक प्रगति",
  monthlyProgressReport: "मासिक प्रगति रिपोर्ट",
  comparison: "तुलना",
  acceptReport: "रिपोर्ट स्वीकार करें",
  rejectReport: "रिपोर्ट अस्वीकार करें",
  status: "स्थिति",
  pending: "लंबित",
  accepted: "स्वीकृत",
  cancelled: "रद्द",
  allCenters: "सभी केंद्र",
  allSources: "सभी स्रोत",
  total: "कुल",
  showing: "दिखा रहे हैं",
  to: "से",
  of: "का",
  entries: "प्रविष्टियां",
  page: "पृष्ठ",
  itemsPerPage: "प्रति पृष्ठ आइटम:",
  error: "त्रुटि",
  fetchError: "डेटा लाने में विफल। कृपया बाद में पुन: प्रयास करें।",
  networkError: "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।",
  serverError: "सर्वर त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  dataError: "डेटा प्रोसेस करने में त्रुटि।",
  retry: "पुनः प्रयास करें",
  filterSeparator: " > ",
  billId: "बिल आईडी",
  updatedQuantity: "अपडेट की गई मात्रा",
  cutQuantity: "कटी हुई मात्रा",
  quantityLeft: "शेष मात्रा",
  submitUpdates: "अपडेट सबमिट करें",
  billing: "बिलिंग",
  billingDataUpdated: "बिलिंग डेटा सफलतापूर्वक अपडेट किया गया!",
  statusUpdateSuccess: "रिपोर्ट स्थिति सफलतापूर्वक अपडेट की गई।",
  statusUpdateError: "रिपोर्ट स्थिति अपडेट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।",
  confirmAccept: "क्या आप वाकई इस रिपोर्ट को स्वीकार करना चाहते हैं?",
  confirmReject: "क्या आप वाकई इस रिपोर्ट को अस्वीकार करना चाहते हैं?",
  yes: "हाँ",
  no: "नहीं",
  percentage: "प्रतिशत",
  progressPercentage: "प्रगति प्रतिशत",
  viewDetails: "विवरण देखें",
  viewReceipt: "रसीद देखें",
  schemeName: "योजना का नाम",
  totalItems: "कुल आइटम",
  reportDate: "रिपोर्ट तारीख",
  expand: "विस्तार",
  collapse: "संक्षिप्त",
  progress: "प्रगति",
  allocated: "आवंटित",
  updated: "अपडेट",
  originalAllocation: "मूल आवंटन (वार्षिक)",
  updatedAllocation: "अपडेट आवंटन (वार्षिक)",
  soldAmountMonthly: "बेची गई राशि (मासिक)",
  selectColumns: "कॉलम चुनें",
  selectAll: "सभी चुनें",
  deselectAll: "सभी हटाएं"
};

// Month options for dropdown
const monthOptions = [
  { value: 1, label: "जनवरी" },
  { value: 2, label: "फरवरी" },
  { value: 3, label: "मार्च" },
  { value: 4, label: "अप्रैल" },
  { value: 5, label: "मई" },
  { value: 6, label: "जून" },
  { value: 7, label: "जुलाई" },
  { value: 8, label: "अगस्त" },
  { value: 9, label: "सितंबर" },
  { value: 10, label: "अक्टूबर" },
  { value: 11, label: "नवंबर" },
  { value: 12, label: "दिसंबर" }
];

// Year options for dropdown
const yearOptions = Array.from({ length: 11 }, (_, i) => ({ value: 2020 + i, label: (2020 + i).toString() }));

// Custom styles for react-select components
const customSelectStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: '#3b82f6',
    },
    minHeight: '32px', // Smaller height for compact layout
    fontSize: '14px',
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    zIndex: 9999,
    position: 'absolute',
    fontSize: '14px',
  }),
  menuList: (baseStyles) => ({
    ...baseStyles,
    maxHeight: '200px',
    overflowY: 'auto',
    fontSize: '14px',
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: '#6b7280',
    fontSize: '14px',
  }),
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
            {translations.selectAll}
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleDeselectAll}>
            {translations.deselectAll}
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

const MPR = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // State for filters
  const [filters, setFilters] = useState({
    center_name: [],
    source_of_receipt: [],
    investment_name: [],
    scheme_name: [],
    from_date: '',
    to_date: '',
    selected_dates: '',
    month: null,
    year: null
  });
  
  // Local state for selected_dates input to prevent auto-fetch on every keystroke
  const [selectedDatesInput, setSelectedDatesInput] = useState('');
  
  // State for data
  const [yearlyData, setYearlyData] = useState([]);
  const [originalYearlyData, setOriginalYearlyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // State for status update
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reportToUpdate, setReportToUpdate] = useState(null);
  const [updateAction, setUpdateAction] = useState(null); // 'accept' or 'reject'
  
  // State for tracking which reports are expanded
  const [expandedReports, setExpandedReports] = useState({});

  // State for selected columns for main table
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map(col => col.key));

  // State for selected columns for component tables
  const [selectedComponentColumns, setSelectedComponentColumns] = useState(availableComponentColumns.map(col => col.key));

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

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [filters]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  // Fetch yearly and monthly data
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Only fetch yearly data if we don't have it yet
      let originalData = originalYearlyData.length > 0 ? originalYearlyData : (await axios.get(YEARLY_DATA_URL)).data;
      
      // Only update original data if we fetched new data
      if (originalYearlyData.length === 0) {
        setOriginalYearlyData(originalData);
      }
      
      let filteredYearlyData = originalData;
      
      // Apply year filter to yearly data
      if (filters.year) {
        filteredYearlyData = filteredYearlyData.filter(item => item.billing_date && new Date(item.billing_date).getFullYear() === filters.year);
      }
      
      // Apply month filter to yearly data
      if (filters.month) {
        filteredYearlyData = filteredYearlyData.filter(item => item.billing_date && new Date(item.billing_date).getMonth() + 1 === filters.month);
      }

      // Apply filters to yearly data
      if (filters.center_name && filters.center_name.length > 0) {
        const selectedCenters = filters.center_name.map(c => c.value);
        filteredYearlyData = filteredYearlyData.filter(item => selectedCenters.includes(item.center_name));
      }
      if (filters.source_of_receipt && filters.source_of_receipt.length > 0) {
        const selectedSources = filters.source_of_receipt.map(s => s.value);
        filteredYearlyData = filteredYearlyData.filter(item => selectedSources.includes(item.source_of_receipt));
      }
      if (filters.investment_name && filters.investment_name.length > 0) {
        const selectedInvestments = filters.investment_name.map(i => i.value);
        filteredYearlyData = filteredYearlyData.filter(item => selectedInvestments.includes(item.investment_name));
      }
      if (filters.scheme_name && filters.scheme_name.length > 0) {
        const selectedSchemes = filters.scheme_name.map(s => s.value);
        filteredYearlyData = filteredYearlyData.filter(item => selectedSchemes.includes(item.scheme_name));
      }
      if (filters.from_date && filters.to_date) {
        const fromDate = new Date(filters.from_date);
        const toDate = new Date(filters.to_date);
        filteredYearlyData = filteredYearlyData.filter(item => {
          if (!item.billing_date) return false;
          const itemDate = new Date(item.billing_date);
          return itemDate >= fromDate && itemDate <= toDate;
        });
      }
      if (filters.selected_dates) {
        const selectedDates = filters.selected_dates.split(',').map(d => d.trim());
        filteredYearlyData = filteredYearlyData.filter(item => {
          if (!item.billing_date) return false;
          const itemDateStr = new Date(item.billing_date).toISOString().split('T')[0];
          return selectedDates.includes(itemDateStr);
        });
      }

      // Calculate total amount for each item
      filteredYearlyData = filteredYearlyData.map(item => ({
        ...item,
        total_amount: parseFloat(item.allocated_quantity) * parseFloat(item.rate)
      }));
      
      setYearlyData(filteredYearlyData);
      
      // Fetch monthly data
      let monthlyUrl = MONTHLY_DATA_URL;
      const params = [];
      
      // Add year parameter if selected
      if (filters.year) {
        params.push(`year=${filters.year}`);
      }
      
      // Add month parameter if selected (works independently of year)
      if (filters.month) {
        params.push(`month=${filters.month}`);
      }
      
      // Build the URL with all selected parameters
      if (params.length > 0) {
        monthlyUrl += `?${params.join('&')}`;
      }

      // Don't add center_id filter to API URL - we'll filter locally for consistency
      // This ensures the center filter works the same way regardless of how many centers are selected

      const monthlyResponse = await axios.get(monthlyUrl);
      let filteredMonthlyData = monthlyResponse.data;

      // Apply additional filters to monthly data
      if (filters.center_name && filters.center_name.length > 0) {
        const selectedCenters = filters.center_name.map(c => c.value);
        filteredMonthlyData = filteredMonthlyData.filter(item => selectedCenters.includes(item.center_name));
      }
      if (filters.source_of_receipt && filters.source_of_receipt.length > 0) {
        const selectedSources = filters.source_of_receipt.map(s => s.value);
        filteredMonthlyData = filteredMonthlyData.filter(item => selectedSources.includes(item.source_of_receipt));
      }
      if (filters.investment_name && filters.investment_name.length > 0) {
        const selectedInvestments = filters.investment_name.map(i => i.value);
        filteredMonthlyData = filteredMonthlyData.filter(item =>
          item.component_data && item.component_data.some(comp => selectedInvestments.includes(comp.investment_name))
        );
      }
      if (filters.scheme_name && filters.scheme_name.length > 0) {
        const selectedSchemes = filters.scheme_name.map(s => s.value);
        filteredMonthlyData = filteredMonthlyData.filter(item =>
          item.component_data && item.component_data.some(comp => selectedSchemes.includes(comp.scheme_name))
        );
      }
      if (filters.from_date && filters.to_date) {
        const fromDate = new Date(filters.from_date);
        const toDate = new Date(filters.to_date);
        filteredMonthlyData = filteredMonthlyData.filter(item => {
          if (!item.billing_date) return false;
          const itemDate = new Date(item.billing_date);
          return itemDate >= fromDate && itemDate <= toDate;
        });
      }
      if (filters.selected_dates) {
        const selectedDates = filters.selected_dates.split(',').map(d => d.trim());
        filteredMonthlyData = filteredMonthlyData.filter(item => {
          if (!item.billing_date) return false;
          const itemDateStr = new Date(item.billing_date).toISOString().split('T')[0];
          return selectedDates.includes(itemDateStr);
        });
      }
      
      // Calculate total amount for each report and component
      filteredMonthlyData = filteredMonthlyData.map(report => {
        const componentData = report.component_data ? report.component_data.map(component => ({
          ...component,
          total_amount: parseFloat(component.sold_amount) || (parseFloat(component.updated_quantity) * parseFloat(component.rate))
        })) : [];

        const reportTotal = componentData.reduce((sum, component) => sum + component.total_amount, 0);

        return {
          ...report,
          component_data: componentData,
          total_amount: report.status === 'cancelled' ? 0 : reportTotal
        };
      });
      
      setMonthlyData(filteredMonthlyData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    // Check if this is a multi-select filter (array) or single-select (object)
    if (Array.isArray(value) && value.some(v => v.value === 'select_all')) {
      // Select all options except 'select_all' for multi-select filters
      const allOptions = filterOptions[filterName].filter(opt => opt.value !== 'select_all');
      setFilters(prev => ({
        ...prev,
        [filterName]: allOptions
      }));
    } else if (value === null || (Array.isArray(value) && value.length === 0)) {
      // Clear the filter
      setFilters(prev => ({
        ...prev,
        [filterName]: []
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [filterName]: value
      }));
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      center_name: [],
      source_of_receipt: [],
      investment_name: [],
      scheme_name: [],
      from_date: '',
      to_date: '',
      selected_dates: '',
      month: null,
      year: null
    });
    setSelectedDatesInput('');
  };
  
  // Calculate totals for main table
  const calculateMainTableTotals = (data) => {
    return data.reduce((acc, item) => {
      acc.allocated += parseFloat(item.allocated_quantity || 0) * parseFloat(item.rate || 0);
      acc.updated += parseFloat(item.updated_quantity || 0) * parseFloat(item.rate || 0);
      acc.allocatedQuantity += parseFloat(item.allocated_quantity || 0);
      acc.updatedQuantity += parseFloat(item.updated_quantity || 0);
      return acc;
    }, { allocated: 0, updated: 0, allocatedQuantity: 0, updatedQuantity: 0 });
  };
  
  // Generic download Excel function that works with any table
const downloadExcel = (data, filename, columnMapping, selectedColumns, includeTotals = true, parentReport = null) => {
  try {
    // Prepare data for Excel export based on selected columns
    const excelData = data.map((item, index) => {
      const row = {};
      selectedColumns.forEach(col => {
        // Pass parentReport to accessor function if available
        row[columnMapping[col].header] = columnMapping[col].accessor(item, index, currentPage, itemsPerPage, parentReport);
      });
      return row;
    });
    
    // Calculate totals if includeTotals is true
    let totals = null;
    if (includeTotals) {
      if (parentReport) {
        // Component table totals
        totals = data.reduce((acc, item) => {
          acc.allocatedQuantity += parseFloat(item.allocated_quantity || 0);
          acc.updatedQuantity += parseFloat(item.updated_quantity || 0);
          acc.buyAmount += parseFloat(item.buy_amount || 0);
          acc.soldAmount += parseFloat(item.sold_amount || 0);
          acc.totalAmount += parseFloat(item.total_amount || 0);
          return acc;
        }, { 
          allocatedQuantity: 0, 
          updatedQuantity: 0, 
          buyAmount: 0, 
          soldAmount: 0, 
          totalAmount: 0 
        });
      } else {
        // Main table totals
        totals = data.reduce((acc, item) => {
          acc.totalReports += 1;
          acc.totalAmount += parseFloat(item.total_amount || 0);
          acc.totalItems += item.component_data ? item.component_data.length : 0;
          return acc;
        }, { 
          totalReports: 0,
          totalAmount: 0, 
          totalItems: 0
        });
      }
      
      // Add totals row
      const totalsRow = {};
      selectedColumns.forEach(col => {
        if (parentReport) {
          // Component table totals
          if (col === 'reportId') {
            totalsRow[columnMapping[col].header] = "कुल";
          } else if (col === 'investment_name' || 
                     col === 'unit' || col === 'scheme_name') {
            totalsRow[columnMapping[col].header] = "";
          } else if (col === 'allocated_quantity') {
            totalsRow[columnMapping[col].header] = totals.allocatedQuantity.toFixed(2);
          } else if (col === 'updated_quantity') {
            totalsRow[columnMapping[col].header] = totals.updatedQuantity.toFixed(2);
          } else if (col === 'rate') {
            totalsRow[columnMapping[col].header] = "-";
          } else if (col === 'buyAmount') {
            totalsRow[columnMapping[col].header] = `₹${totals.buyAmount.toFixed(2)}`;
          } else if (col === 'soldAmount') {
            totalsRow[columnMapping[col].header] = `₹${totals.soldAmount.toFixed(2)}`;
          } else if (col === 'total_amount') {
            totalsRow[columnMapping[col].header] = `₹${totals.totalAmount.toFixed(2)}`;
          }
        } else {
          // Main table totals
          if (col === 'sno') {
            totalsRow[columnMapping[col].header] = "कुल";
          } else if (col === 'reportId') {
            totalsRow[columnMapping[col].header] = totals.totalReports;
          } else if (col === 'centerName' || col === 'sourceOfReceipt' || 
                     col === 'reportDate' || col === 'status') {
            totalsRow[columnMapping[col].header] = "";
          } else if (col === 'totalItems') {
            totalsRow[columnMapping[col].header] = totals.totalItems;
          } else if (col === 'totalAmount') {
            totalsRow[columnMapping[col].header] = `₹${totals.totalAmount.toFixed(2)}`;
          }
        }
      });
      
      excelData.push(totalsRow);
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = selectedColumns.map(() => ({ wch: 15 }));
    ws['!cols'] = colWidths;
    
    // Style the totals row if it exists
    if (includeTotals && excelData.length > 0) {
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
    
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (e) {
    console.error("Error generating Excel file:", e);
    setError("Excel file generation failed. Please try again.");
  }
};
  
  // Generic download PDF function for main table
  const downloadMainTablePdf = (data, filename, selectedColumns, title, includeTotals = true) => {
    try {
      // Create headers and rows based on selected columns
      const headers = selectedColumns.map(col => `<th>${mainTableColumnMapping[col].header}</th>`).join('');
      const rows = data.map((item, index) => {
        const cells = selectedColumns.map(col => `<td>${mainTableColumnMapping[col].accessor(item, index, currentPage, itemsPerPage)}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      
      // Create totals row if requested
      let totalsRow = '';
      if (includeTotals) {
        const totals = data.reduce((acc, item) => {
          acc.totalReports += 1;
          acc.totalAmount += parseFloat(item.total_amount || 0);
          acc.totalItems += item.component_data ? item.component_data.length : 0;
          return acc;
        }, { 
          totalReports: 0,
          totalAmount: 0, 
          totalItems: 0
        });
        
        const totalsCells = selectedColumns.map(col => {
          if (col === 'sno') {
            return `<td class="text-end fw-bold">कुल</td>`;
          } else if (col === 'reportId') {
            return `<td>${totals.totalReports}</td>`;
          } else if (col === 'centerName' || col === 'sourceOfReceipt' || 
                     col === 'reportDate' || col === 'status') {
            return `<td></td>`;
          } else if (col === 'totalItems') {
            return `<td>${totals.totalItems}</td>`;
          } else if (col === 'totalAmount') {
            return `<td class="fw-bold">${formatCurrency(totals.totalAmount)}</td>`;
          }
          return `<td></td>`;
        }).join('');
        
        totalsRow = `<tr style="background-color: #e3f2fd; font-weight: bold;">${totalsCells}</tr>`;
      }

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
              p { text-align: center; font-weight: bold; }
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
              .totals-row { 
                background-color: #e3f2fd; 
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
            <table>
              <thead>
                <tr>${headers}</tr>
              </thead>
              <tbody>
                ${rows}
                ${totalsRow}
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 1000);
      };
    } catch (e) {
      console.error("Error generating PDF:", e);
      setError("PDF generation failed. Please try again.");
    }
  };

  // Generic download PDF function for component tables
  const downloadComponentTablePdf = (data, filename, selectedColumns, title, parentReport = null) => {
    try {
      // Create headers and rows based on selected columns
      const headers = selectedColumns.map(col => `<th>${componentColumnMapping[col].header}</th>`).join('');
      const rows = data.map((item, index) => {
        const cells = selectedColumns.map(col => `<td>${componentColumnMapping[col].accessor(item, index, currentPage, itemsPerPage, parentReport)}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      
      // Calculate totals for the component data
      const totals = data.reduce((acc, item) => {
        acc.allocatedQuantity += parseFloat(item.allocated_quantity || 0);
        acc.updatedQuantity += parseFloat(item.updated_quantity || 0);
        acc.buyAmount += parseFloat(item.buy_amount || 0);
        acc.soldAmount += parseFloat(item.sold_amount || 0);
        acc.totalAmount += parseFloat(item.total_amount || 0);
        return acc;
      }, { 
        allocatedQuantity: 0, 
        updatedQuantity: 0, 
        buyAmount: 0, 
        soldAmount: 0, 
        totalAmount: 0 
      });
      
      // Create totals row
      let totalsRow = '';
      const totalsCells = selectedColumns.map(col => {
        if (col === 'reportId') {
          return `<td class="fw-bold">कुल</td>`; // Only show "कुल" in Report ID column
        } else if (col === 'investment_name' || 
                   col === 'unit' || col === 'scheme_name') {
          return `<td></td>`; // Empty cells for text columns
        } else if (col === 'allocated_quantity') {
          return `<td>${totals.allocatedQuantity.toFixed(2)}</td>`;
        } else if (col === 'updated_quantity') {
          return `<td>${totals.updatedQuantity.toFixed(2)}</td>`;
        } else if (col === 'rate') {
          return `<td>-</td>`;
        } else if (col === 'buyAmount') {
          return `<td>₹${totals.buyAmount.toFixed(2)}</td>`;
        } else if (col === 'soldAmount') {
          return `<td>₹${totals.soldAmount.toFixed(2)}</td>`;
        } else if (col === 'total_amount') {
          return `<td class="fw-bold">₹${totals.totalAmount.toFixed(2)}</td>`;
        }
        return `<td></td>`;
      }).join('');
      
      totalsRow = `<tr style="background-color: #e8f5e8; font-weight: bold;">${totalsCells}</tr>`;
      
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
                .totals-row { 
                  background-color: #e8f5e8; 
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
              <table>
                <thead>
                  <tr>${headers}</tr>
                </thead>
                <tbody>
                  ${rows}
                  ${totalsRow}
                </tbody>
              </table>
            </body>
          </html>
        `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 1000);
      };
    } catch (e) {
      console.error("Error generating PDF:", e);
      setError("PDF generation failed. Please try again.");
    }
  };

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!originalYearlyData || originalYearlyData.length === 0) {
      return {
        center_name: [],
        source_of_receipt: [],
        investment_name: [],
        scheme_name: []
      };
    }

    return {
      center_name: [{ value: 'select_all', label: 'सभी चुनें' }, ...[...new Set(originalYearlyData.map(item => item.center_name))].map(name => ({ value: name, label: name }))],
      source_of_receipt: [{ value: 'select_all', label: 'सभी चुनें' }, ...[...new Set(originalYearlyData.map(item => item.source_of_receipt))].map(name => ({ value: name, label: name }))],
      investment_name: [{ value: 'select_all', label: 'सभी चुनें' }, ...[...new Set(originalYearlyData.map(item => item.investment_name))].map(name => ({ value: name, label: name }))],
      scheme_name: [{ value: 'select_all', label: 'सभी चुनें' }, ...[...new Set(originalYearlyData.map(item => item.scheme_name))].map(name => ({ value: name, label: name }))],
      dates: [...new Set(originalYearlyData.filter(item => item.billing_date).map(item => new Date(item.billing_date).toISOString().split('T')[0]))].sort().map(date => ({ value: date, label: date }))
    };
  }, [originalYearlyData]);
  
  // Calculate paginated data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedData = monthlyData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(monthlyData.length / itemsPerPage);
  
  // Function to handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  // Build pagination items
  const paginationItems = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // Add first page and ellipsis if needed
  if (startPage > 1) {
    paginationItems.push(<Pagination.Item key={1} onClick={() => handlePageChange(1)}>1</Pagination.Item>);
    if (startPage > 2) {
      paginationItems.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
    }
  }
  
  // Add page numbers
  for (let number = startPage; number <= endPage; number++) {
    paginationItems.push(
      <Pagination.Item 
        key={number} 
        active={number === currentPage}
        onClick={() => handlePageChange(number)}
      >
        {number}
      </Pagination.Item>
    );
  }
  
  // Add ellipsis and last page if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationItems.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    }
    paginationItems.push(<Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>{totalPages}</Pagination.Item>);
  }
  
  // Get status badge variant based on status
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'warning';
    }
  };
  
  // Calculate total amounts
  const yearlyTotal = yearlyData.reduce((sum, item) => sum + item.total_amount, 0);
  const monthlyTotal = monthlyData.reduce((sum, item) => sum + item.total_amount, 0);
  const progressPercentage = yearlyTotal > 0 ? (monthlyTotal / yearlyTotal * 100).toFixed(2) : 0;
  
  // Calculate comparison totals
  const allocatedTotal = yearlyTotal; // allocated * rate
  const updatedTotal = yearlyData.reduce((sum, item) => sum + (parseFloat(item.updated_quantity || item.allocated_quantity) * parseFloat(item.rate)), 0);
  const soldTotal = monthlyTotal;
  
  // Toggle report details
  const toggleReportDetails = (reportId) => {
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };
  
  // Handle report status update
  const handleStatusUpdate = async () => {
    try {
      setUpdatingStatus(reportToUpdate.id);
      setStatusUpdateError(null);
      setStatusUpdateSuccess(false);
      
      // Create payload for API request
      const payload = {
        bill_report_id: reportToUpdate.bill_report_id,
        status: updateAction
      };
      
      // Use PUT method to update status
      await axios.put(YEARLY_DATA_URL, payload);
      
      // Update local state to reflect status change
      setMonthlyData(prevData => 
        prevData.map(item => 
          item.id === reportToUpdate.id ? { ...item, status: updateAction } : item
        )
      );
      
      setStatusUpdateSuccess(true);
      setShowConfirmDialog(false);
      setReportToUpdate(null);
      setUpdateAction(null);
    } catch (e) {
      setStatusUpdateError(e.message);
    } finally {
      setUpdatingStatus(null);
    }
  };
  
  // Show confirmation dialog before updating status
  const confirmStatusUpdate = (report, action) => {
    setReportToUpdate(report);
    setUpdateAction(action);
    setShowConfirmDialog(true);
  };
  
  // Cancel confirmation dialog
  const cancelConfirmation = () => {
    setShowConfirmDialog(false);
    setReportToUpdate(null);
    setUpdateAction(null);
  };
  
  // View receipt file
  const viewReceipt = (receiptPath) => {
    if (receiptPath) {
      const fullUrl = `https://mahadevaaya.com/govbillingsystem/backend${receiptPath}`;
      window.open(fullUrl, '_blank');
    }
  };

  // Render loading state
  if (loading && yearlyData.length === 0 && monthlyData.length === 0) {
    return (
      <div className="dashboard-container">
        <LeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
        <div className="main-content d-flex justify-content-center align-items-center">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  // Render error state
  if (error && yearlyData.length === 0 && monthlyData.length === 0) {
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
     
        <Row>
           <Col lg={12} md={12} sm={12}>
                      <DashBoardHeader
                        sidebarOpen={sidebarOpen}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                      />
                    </Col>
        </Row>
         <Row className="left-top">
                  {/* <Col lg={2} md={2} sm={12}>
                    <LeftNav />
                  </Col> */}
        
                  <Col lg={12} md={12} sm={12}>
                   <div className="dashboard-container">
  <Container fluid className="dashboard-body">
            <h1 className="page-title small-fonts">{translations.pageTitle}</h1>
            
            {statusUpdateSuccess && (
              <Alert variant="success" dismissible onClose={() => setStatusUpdateSuccess(false)}>
                {translations.statusUpdateSuccess}
              </Alert>
            )}
            
            {statusUpdateError && (
              <Alert variant="danger" dismissible onClose={() => setStatusUpdateError(null)}>
                {translations.error}: {statusUpdateError}
              </Alert>
            )}
            
            {/* Filters Section */}
            <Card className="mb-4 p-3">
              <Row className="mb-3">
                <Col md={12} className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 small-fonts">{translations.filters}</h5>
                  <Button variant="outline-secondary" size="sm" onClick={clearFilters} className="small-fonts">
                    {translations.clearAllFilters}
                  </Button>
                </Col>
              </Row>
              
              <Row>
                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.centerName}</Form.Label>
                    <Select
                      value={filters.center_name}
                      onChange={(value) => handleFilterChange('center_name', value)}
                      options={filterOptions.center_name}
                      isMulti
                      isClearable
                      placeholder={translations.allCenters}
                      styles={customSelectStyles}
                      className="compact-input small-fonts filter-dropdown"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.sourceOfReceipt}</Form.Label>
                    <Select
                      value={filters.source_of_receipt}
                      onChange={(value) => handleFilterChange('source_of_receipt', value)}
                      options={filterOptions.source_of_receipt}
                      isMulti
                      isClearable
                      placeholder={translations.allSources}
                      styles={customSelectStyles}
                      className="compact-input small-fonts filter-dropdown"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.investmentName}</Form.Label>
                    <Select
                      value={filters.investment_name}
                      onChange={(value) => handleFilterChange('investment_name', value)}
                      options={filterOptions.investment_name}
                      isMulti
                      isClearable
                      placeholder="सभी निवेश"
                      styles={customSelectStyles}
                      className="compact-input small-fonts filter-dropdown"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.schemeName}</Form.Label>
                    <Select
                      value={filters.scheme_name}
                      onChange={(value) => handleFilterChange('scheme_name', value)}
                      options={filterOptions.scheme_name}
                      isMulti
                      isClearable
                      placeholder="सभी योजनाएं"
                      styles={customSelectStyles}
                      className="compact-input small-fonts filter-dropdown"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.fromDate}</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.from_date}
                      onChange={(e) => handleFilterChange('from_date', e.target.value)}
                      className="compact-input small-fonts"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.toDate}</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.to_date}
                      onChange={(e) => handleFilterChange('to_date', e.target.value)}
                      className="compact-input small-fonts"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.selectedDates}</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedDatesInput}
                      onChange={(e) => setSelectedDatesInput(e.target.value)}
                      onBlur={() => setFilters(prev => ({ ...prev, selected_dates: selectedDatesInput }))}
                      placeholder="2025-01-01,2025-01-02"
                      className="compact-input small-fonts"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.month}</Form.Label>
                    <Select
                      value={monthOptions.find(option => option.value === filters.month)}
                      onChange={(value) => handleFilterChange('month', value ? value.value : null)}
                      options={monthOptions}
                      styles={customSelectStyles}
                      className="compact-input small-fonts filter-dropdown"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="mb-2">
                  <Form.Group>
                    <Form.Label className="small-fonts fw-bold">{translations.year}</Form.Label>
                    <Select
                      value={yearOptions.find(option => option.value === filters.year)}
                      onChange={(value) => handleFilterChange('year', value ? value.value : null)}
                      options={yearOptions}
                      styles={customSelectStyles}
                      className="compact-input small-fonts filter-dropdown"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row>
                <Col md={12} className="d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    onClick={fetchData}
                    disabled={loading}
                    className="small-fonts"
                  >
                    {loading ? <Spinner as="span" animation="border" size="sm" /> : null}
                    {translations.viewReport}
                  </Button>
                </Col>
              </Row>
            </Card>
            
            {/* Summary Cards */}
            <Row className="mb-4">
              <Col md={4}>
                <Card className="summary-card">
                  <Card.Body>
                    <Card.Title className="total-card">{translations.yearlyProgress}</Card.Title>
                    <Card.Text className="display-6 small-fonts">₹{yearlyTotal.toFixed(2)}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="summary-card">
                  <Card.Body>
                    <Card.Title className="total-card">{translations.monthlyProgress}</Card.Title>
                    <Card.Text className="display-6 small-fonts">₹{monthlyTotal.toFixed(2)}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="summary-card">
                  <Card.Body>
                    <Card.Title className="total-card">{translations.progressPercentage}</Card.Title>
                    <Card.Text className="display-6 small-fonts">{progressPercentage}%</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Comparison Table */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0 small-fonts">{translations.comparison}</h5>
              </Card.Header>
              <Card.Body>
                <table className="table table-bordered small-fonts">
                  <thead>
                    <tr>
                      <th>{translations.investmentName}</th>
                      <th>{translations.totalAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{translations.originalAllocation}</td>
                      <td>₹{allocatedTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>{translations.updatedAllocation}</td>
                      <td>₹{updatedTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>{translations.soldAmountMonthly}</td>
                      <td>₹{soldTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
            
            {/* Monthly Report Table */}
            <Card className="p-3">
              <h2 className="section-title small-fonts mb-3">
                {translations.monthlyProgress}{filters.year ? (filters.month ? ` - ${monthOptions.find(m => m.value === filters.month)?.label} ${filters.year}` : ` - ${filters.year}`) : (filters.month ? ` - ${monthOptions.find(m => m.value === filters.month)?.label}` : '')}
              </h2>
              
              {monthlyData.length > 0 ? (
                <>
                  <div className="table-info mb-2 d-flex justify-content-between align-items-center">
                    <span className="small-fonts">
                      {translations.showing} {indexOfFirstItem + 1} {translations.to} {Math.min(indexOfLastItem, monthlyData.length)} {translations.of} {monthlyData.length} {translations.entries}
                    </span>
                    <div className="d-flex align-items-center">
                      <span className="small-fonts me-2">{translations.itemsPerPage}</span>
                      <span className="badge bg-primary">{itemsPerPage}</span>
                    </div>
                  </div>
                  
                  {/* Column Selection Section for Main Table */}
                  <ColumnSelection
                    columns={availableColumns}
                    selectedColumns={selectedColumns}
                    setSelectedColumns={setSelectedColumns}
                    title={translations.selectColumns}
                  />
                  
                  <div className="d-flex justify-content-end mb-2">
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => downloadExcel(
                        monthlyData, 
                        `MPR_${filters.month || 'All'}_${filters.year || 'All'}_${new Date().toISOString().slice(0, 10)}`, 
                        mainTableColumnMapping, 
                        selectedColumns,
                        true, // Include totals
                        null // No parent report for main table
                      )}
                      className="me-2"
                    >
                      <FaFileExcel className="me-1" />Excel
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => downloadMainTablePdf(monthlyData, `MPR_${filters.month || 'All'}_${filters.year || 'All'}_${new Date().toISOString().slice(0, 10)}`, selectedColumns, "मासिक प्रगति रिपोर्ट")}
                    >
                      <FaFilePdf className="me-1" />PDF
                    </Button>
                  </div>
                  
                  <div className="table-wrapper">
                    <table className="responsive-table small-fonts">
                      <thead>
                        <tr>
                          {selectedColumns.includes('sno') && <th>{translations.sno}</th>}
                          {selectedColumns.includes('reportId') && <th>{translations.reportId}</th>}
                          {selectedColumns.includes('centerName') && <th>{translations.centerName}</th>}
                          {selectedColumns.includes('sourceOfReceipt') && <th>{translations.sourceOfReceipt}</th>}
                          {selectedColumns.includes('reportDate') && <th>{translations.reportDate}</th>}
                          {selectedColumns.includes('status') && <th>{translations.status}</th>}
                          {selectedColumns.includes('totalItems') && <th>{translations.totalItems}</th>}
                          {selectedColumns.includes('totalAmount') && <th>{translations.totalAmount}</th>}
                          <th>{translations.viewDetails}</th>
                          <th>{translations.viewReceipt}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((item, index) => (
                          <React.Fragment key={item.id}>
                            <tr>
                              {selectedColumns.includes('sno') && <td data-label={translations.sno}>{indexOfFirstItem + index + 1}</td>}
                              {selectedColumns.includes('reportId') && <td data-label={translations.reportId}>{item.bill_report_id || '-'}</td>}
                              {selectedColumns.includes('centerName') && <td data-label={translations.centerName}>{item.center_name}</td>}
                              {selectedColumns.includes('sourceOfReceipt') && <td data-label={translations.sourceOfReceipt}>{item.source_of_receipt}</td>}
                              {selectedColumns.includes('reportDate') && <td data-label={translations.reportDate}>{item.billing_date ? new Date(item.billing_date).toLocaleDateString('hi-IN') : 'N/A'}</td>}
                              {selectedColumns.includes('status') && (
                                <td data-label={translations.status}>
                                  <Badge bg={getStatusBadgeVariant(item.status)}>
                                    {item.status === 'accepted' ? translations.accepted : 
                                     item.status === 'cancelled' ? translations.cancelled : 
                                     translations.pending}
                                  </Badge>
                                </td>
                              )}
                              {selectedColumns.includes('totalItems') && (
                                <td data-label={translations.totalItems}>
                                  <Badge bg="info">{item.component_data ? item.component_data.length : 0}</Badge>
                                </td>
                              )}
                              {selectedColumns.includes('totalAmount') && (
                                <td data-label={translations.totalAmount}>
                                  {formatCurrency(item.total_amount || 0)}
                                </td>
                              )}
                              <td data-label={translations.viewDetails}>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  onClick={() => toggleReportDetails(item.id)}
                                  className="small-fonts"
                                >
                                  {translations.viewDetails}
                                </Button>
                              </td>
                              <td data-label={translations.viewReceipt}>
                                <Button 
                                  variant="outline-success" 
                                  size="sm" 
                                  onClick={() => viewReceipt(item.recipt_file)}
                                  className="small-fonts"
                                >
                                  {translations.viewReceipt}
                                </Button>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={`${selectedColumns.length + 2}`} className="p-0">
                                <Collapse in={expandedReports[item.id]}>
                                  <div className="p-3 bg-light">
                                    <h5 className="mb-3">{translations.investmentName}</h5>

                                    {/* Column Selection for Component Table */}
                                    <ColumnSelection
                                      columns={availableComponentColumns}
                                      selectedColumns={selectedComponentColumns}
                                      setSelectedColumns={setSelectedComponentColumns}
                                      title={`${translations.investmentName} ${translations.selectColumns}`}
                                    />

                                    <div className="d-flex justify-content-end mb-2">
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadExcel(
                                          item.component_data, 
                                          `Component_${item.bill_report_id}_${new Date().toISOString().slice(0, 10)}`, 
                                          componentColumnMapping, 
                                          selectedComponentColumns,
                                          true, // Include totals
                                          item // Pass the parent report as the last parameter
                                        )}
                                        className="me-2"
                                      >
                                        <FaFileExcel className="me-1" />Excel
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => downloadComponentTablePdf(item.component_data, `Component_${item.bill_report_id}_${new Date().toISOString().slice(0, 10)}`, selectedComponentColumns, `${translations.investmentName} ${translations.viewDetails}`, item)}
                                        className="me-2"
                                      >
                                        <FaFilePdf className="me-1" />PDF
                                      </Button>
                                    </div>

                                    {item.component_data && item.component_data.length > 0 ? (
                                      <table className="table table-sm table-bordered">
                                        <thead>
                                          <tr>
                                            {selectedComponentColumns.map(col => {
                                              if (col === 'reportId') return <th key={col}>{translations.reportId}</th>;
                                              if (col === 'investment_name') return <th key={col}>{translations.investmentName}</th>;
                                              if (col === 'unit') return <th key={col}>{translations.unit}</th>;
                                              if (col === 'allocated_quantity') return <th key={col}>{translations.allocatedQuantity}</th>;
                                              if (col === 'updated_quantity') return <th key={col}>{translations.updatedQuantity}</th>;
                                              if (col === 'rate') return <th key={col}>{translations.rate}</th>;
                                              if (col === 'buyAmount') return <th key={col}>{translations.buyAmount}</th>;
                                              if (col === 'soldAmount') return <th key={col}>{translations.soldAmount}</th>;
                                              if (col === 'scheme_name') return <th key={col}>{translations.schemeName}</th>;
                                              if (col === 'total_amount') return <th key={col}>{translations.totalAmount}</th>;
                                              return null;
                                            })}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {item.component_data.map((component, compIndex) => (
                                            <tr key={compIndex}>
                                              {selectedComponentColumns.map(col => {
                                                if (col === 'reportId') return <td key={col}>{item.bill_report_id}</td>;
                                                if (col === 'investment_name') return <td key={col}>{component.investment_name}</td>;
                                                if (col === 'unit') return <td key={col}>{component.unit}</td>;
                                                if (col === 'allocated_quantity') return <td key={col}>{component.allocated_quantity}</td>;
                                                if (col === 'updated_quantity') return <td key={col}>{component.updated_quantity || '-'}</td>;
                                                if (col === 'rate') return <td key={col}>₹{component.rate}</td>;
                                                if (col === 'buyAmount') return <td key={col}>₹{component.buy_amount}</td>;
                                                if (col === 'soldAmount') return <td key={col}>₹{component.sold_amount}</td>;
                                                if (col === 'scheme_name') return <td key={col}>{component.scheme_name}</td>;
                                                if (col === 'total_amount') return <td key={col}>₹{component.total_amount?.toFixed(2) || '0.00'}</td>;
                                                return null;
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr className="font-weight-bold">
                                            {selectedComponentColumns.map(col => {
                                              if (col === 'reportId') {
                                                return <td key={col}>{translations.total}</td>; // Show "कुल" only in Report ID column
                                              } else if (col === 'investment_name' || 
                                                         col === 'unit' || col === 'scheme_name') {
                                                return <td key={col}></td>; // Empty cells for text columns
                                              } else if (col === 'allocated_quantity') {
                                                return <td key={col}>{item.component_data.reduce((sum, comp) => sum + parseFloat(comp.allocated_quantity || 0), 0).toFixed(2)}</td>;
                                              } else if (col === 'updated_quantity') {
                                                return <td key={col}>{item.component_data.reduce((sum, comp) => sum + parseFloat(comp.updated_quantity || 0), 0).toFixed(2)}</td>;
                                              } else if (col === 'rate') {
                                                return <td key={col}></td>;
                                              } else if (col === 'buyAmount') {
                                                return <td key={col}>₹{item.component_data.reduce((sum, comp) => sum + parseFloat(comp.buy_amount || 0), 0).toFixed(2)}</td>;
                                              } else if (col === 'soldAmount') {
                                                return <td key={col}>₹{item.component_data.reduce((sum, comp) => sum + parseFloat(comp.sold_amount || 0), 0).toFixed(2)}</td>;
                                              } else if (col === 'total_amount') {
                                                return <td key={col}>₹{item.component_data.reduce((sum, comp) => sum + (parseFloat(comp.total_amount) || 0), 0).toFixed(2)}</td>;
                                              }
                                              return <td key={col}></td>;
                                            })}
                                          </tr>
                                        </tfoot>
                                      </table>
                                    ) : (
                                      <Alert variant="info">No component data available</Alert>
                                    )}
                                  </div>
                                </Collapse>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-primary fw-bold">
                          {selectedColumns.map(col => {
                            if (col === 'sno') {
                              return <td key={col} className="text-end">{translations.total}</td>;
                            } else if (col === 'reportId') {
                              return <td key={col}>{monthlyData.length}</td>;
                            } else if (col === 'centerName' || col === 'sourceOfReceipt' || 
                                       col === 'reportDate' || col === 'status') {
                              return <td key={col}></td>;
                            } else if (col === 'totalItems') {
                              return <td key={col}>{monthlyData.reduce((sum, item) => sum + (item.component_data ? item.component_data.length : 0), 0)}</td>;
                            } else if (col === 'totalAmount') {
                              return <td key={col}>{formatCurrency(monthlyData.reduce((sum, item) => sum + (item.total_amount || 0), 0))}</td>;
                            }
                            return <td key={col}></td>;
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="mt-2">
                      <div className="small-fonts mb-3 text-center">
                        {translations.page} {currentPage} {translations.of} {totalPages}
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
              ) : (
                <Alert variant="info">
                  {translations.noDataFound}
                </Alert>
              )}
            </Card>
          </Container>
        </div>
    
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirmation-dialog-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-dialog-content">
              <h5>
                {updateAction === 'accepted' ? translations.confirmAccept : translations.confirmReject}
              </h5>
              <div className="confirmation-dialog-buttons">
                <Button 
                  variant={updateAction === 'accepted' ? 'success' : 'danger'} 
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus === reportToUpdate?.id}
                >
                  {updatingStatus === reportToUpdate?.id ? 
                    <Spinner as="span" animation="border" size="sm" /> : null}
                  {translations.yes}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={cancelConfirmation}
                >
                  {translations.no}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


       
                 
    
      </Col>
      </Row>
    </div>
     
    </>
  );
};

export default MPR;