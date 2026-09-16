import React, { useState, useEffect } from "react";
import {
  Container,
  Alert,
  Table,
  Spinner,
  Pagination,
  Button,
  Form,
  Row,
  Col
} from "react-bootstrap";
import axios from "axios";
import DemandNavigation from "./DemandNavigation";
import { useCenter } from "./all_login/CenterContext";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import Select from "react-select";
import { convertToDisplayFormat } from "../utils/dateUtils";

// API URL
const BENEFICIARIES_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/beneficiaries-registration/";

// Available columns for table (excluding sno which is always shown)
const beneficiariesTableColumns = [
  { key: "scheme_name", label: "योजना का नाम" },
  { key: "unit", label: "इकाई" },
  { key: "supplied_item_name", label: "आपूर्ति की गई वस्तु का नाम" },
  { key: "farmer_name", label: "किसान का नाम" },
  { key: "father_name", label: "पिता का नाम" },
  { key: "category", label: "श्रेणी" },
  { key: "address", label: "पता" },
  { key: "mobile_number", label: "मोबाइल नंबर" },
  { key: "aadhaar_number", label: "आधार नंबर" },
  { key: "bank_account_number", label: "बैंक खाता नंबर" },
  { key: "ifsc_code", label: "IFSC कोड" },
  { key: "quantity", label: "मात्रा" },
  { key: "rate", label: "दर" },
  { key: "amount", label: "राशि" },
  { key: "beneficiary_reg_date", label: "पंजीकरण तिथि" },
];

// Column mapping for data access
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
  unit: { header: "इकाई", accessor: (item) => item.unit },
  quantity: { header: "मात्रा", accessor: (item) => item.quantity },
  rate: { header: "दर", accessor: (item) => item.rate },
  amount: { header: "राशि", accessor: (item) => item.amount },
  beneficiary_reg_date: {
    header: "पंजीकरण तिथि",
    accessor: (item) => convertToDisplayFormat(item.beneficiary_reg_date) || "",
  },
};

// Helper function to calculate financial year dates (April 1 to March 31)
const getFinancialYearDates = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  let fromDate, toDate;
  
  // If current month is April (3) or later, FY is current year April to next year March
  // If current month is before April (Jan-Mar), FY is previous year April to current year March
  if (currentMonth >= 3) {
    fromDate = new Date(currentYear, 3, 1); // April 1 of current year
    toDate = new Date(currentYear + 1, 2, 31); // March 31 of next year
  } else {
    fromDate = new Date(currentYear - 1, 3, 1); // April 1 of previous year
    toDate = new Date(currentYear, 2, 31); // March 31 of current year
  }
  
  return {
    fromDate: fromDate.toISOString().split('T')[0],
    toDate: toDate.toISOString().split('T')[0],
  };
};

const DemandKrishiwiseEntry = () => {
  const { centerData } = useCenter();
  
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

  const [selectedColumns, setSelectedColumns] = useState(
    beneficiariesTableColumns.map((col) => col.key)
  );
  
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [centerDetails, setCenterDetails] = useState({
    center_name: "",
    vidhan_sabha_name: "",
    vikas_khand_name: "",
  });
  
  // State for filters
  const [dateRange, setDateRange] = useState({
    fromDate: "",
    toDate: ""
  });
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [selectedSuppliedItems, setSelectedSuppliedItems] = useState([]);
  const [farmerName, setFarmerName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [schemeOptions, setSchemeOptions] = useState([]);
  const [suppliedItemOptions, setSuppliedItemOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tableVisible, setTableVisible] = useState(false);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
      
      console.log("Fetched beneficiaries:", items);
      console.log("Center data from context:", centerData);
      
      // Check all center names in API response
      const allCenterNames = items.map(item => item.center_name);
      console.log("All center names in API response:", allCenterNames);
      
      // Filter items by center name client-side with robust comparison
      const filteredItems = items.filter(item => {
        const apiCenterName = item.center_name ? item.center_name.trim().normalize('NFKD') : '';
        const contextCenterName = centerData.centerName ? centerData.centerName.trim().normalize('NFKD') : '';
        
        console.log("Comparing:", apiCenterName, "vs", contextCenterName);
        
        return apiCenterName === contextCenterName;
      });
      
      console.log("Filtered beneficiaries:", filteredItems);
      
      setBeneficiaries(filteredItems);
      
      // Set center details from first item
      if (filteredItems.length > 0) {
        const firstItem = filteredItems[0];
        setCenterDetails({
          center_name: firstItem.center_name,
          vidhan_sabha_name: firstItem.vidhan_sabha_name,
          vikas_khand_name: firstItem.vikas_khand_name,
        });
      }
      
      // Extract unique scheme, supplied item, and category options
      const schemes = [...new Set(filteredItems.map(item => item.scheme_name))].filter(Boolean);
      const suppliedItems = [...new Set(filteredItems.map(item => item.supplied_item_name))].filter(Boolean);
      const categories = [...new Set(filteredItems.map(item => item.category))].filter(Boolean);
      setSchemeOptions(schemes);
      setSuppliedItemOptions(suppliedItems);
      setCategoryOptions(categories);
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
      setApiError("डेटा लोड करने में त्रुटि हुई।");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize component and set financial year dates by default
  useEffect(() => {
    const { fromDate, toDate } = getFinancialYearDates();
    setDateRange({
      fromDate,
      toDate
    });
    fetchBeneficiaries();
  }, []);

  // Auto-apply financial year filter when data is loaded
  useEffect(() => {
    if (beneficiaries.length > 0 && dateRange.fromDate && dateRange.toDate && !tableVisible) {
      applyDateRangeFilter();
    }
  }, [beneficiaries]);

  // Re-apply date range filter when date range changes while table is visible
  useEffect(() => {
    if (tableVisible && beneficiaries.length > 0 && dateRange.fromDate && dateRange.toDate) {
      applyDateRangeFilter();
    }
  }, [dateRange.fromDate, dateRange.toDate, tableVisible]);

  // Handle date range change
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply date range filter and show table
  const applyDateRangeFilter = () => {
    if (!dateRange.fromDate || !dateRange.toDate) {
      alert("कृपया तारीख सीमा चुनें");
      return;
    }

    const startDate = new Date(dateRange.fromDate);
    const endDate = new Date(dateRange.toDate);
    endDate.setHours(23, 59, 59, 999);

    const filtered = beneficiaries.filter(item => {
      if (!item.beneficiary_reg_date) return false;
      const itemDate = new Date(item.beneficiary_reg_date);
      return itemDate >= startDate && itemDate <= endDate;
    });

    setFilteredBeneficiaries(filtered);
    setTableVisible(true);

    // Update scheme, supplied item, and category options based on date range
    const schemes = [...new Set(filtered.map(item => item.scheme_name))].filter(Boolean);
    const suppliedItems = [...new Set(filtered.map(item => item.supplied_item_name))].filter(Boolean);
    const categories = [...new Set(filtered.map(item => item.category))].filter(Boolean);
    setSchemeOptions(schemes);
    setSuppliedItemOptions(suppliedItems);
    setCategoryOptions(categories);
    setSelectedSchemes([]);
    setSelectedSuppliedItems([]);
    setFarmerName("");
    setSelectedCategories([]);
    setAadhaarNumber("");
  };

  // Handle scheme change (react-select)
  const handleSchemeChange = (selectedOptions) => {
    const selectedValues = selectedOptions.map(opt => opt.value);
    setSelectedSchemes(selectedValues);
  };

  // Handle supplied item change (react-select)
  const handleSuppliedItemChange = (selectedOptions) => {
    const selectedValues = selectedOptions.map(opt => opt.value);
    setSelectedSuppliedItems(selectedValues);
  };

  // Handle farmer name change
  const handleFarmerNameChange = (e) => {
    setFarmerName(e.target.value);
  };

  // Handle category change (react-select)
  const handleCategoryChange = (selectedOptions) => {
    const selectedValues = selectedOptions.map(opt => opt.value);
    setSelectedCategories(selectedValues);
  };

  // Handle Aadhaar number change
  const handleAadhaarNumberChange = (e) => {
    setAadhaarNumber(e.target.value);
  };

  // Apply filters to the table data
  const getFilteredData = () => {
    let data = filteredBeneficiaries;

    if (selectedSchemes.length > 0) {
      data = data.filter(item => selectedSchemes.includes(item.scheme_name));
    }

    if (selectedSuppliedItems.length > 0) {
      data = data.filter(item => selectedSuppliedItems.includes(item.supplied_item_name));
    }

    if (farmerName) {
      data = data.filter(item => item.farmer_name.toLowerCase().includes(farmerName.toLowerCase()));
    }

    if (selectedCategories.length > 0) {
      data = data.filter(item => selectedCategories.includes(item.category));
    }

    if (aadhaarNumber) {
      data = data.filter(item => item.aadhaar_number && item.aadhaar_number.toString().includes(aadhaarNumber));
    }

    return data;
  };

  // Initialize component
  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  // Pagination logic
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Download Excel function
  const downloadExcel = (data, filename, columnMapping, selectedColumns) => {
    try {
      const excelData = data.map((item, index) => {
        const row = {};
        row["क्र.सं."] = index + 1;
        selectedColumns.forEach((col) => {
          row[columnMapping[col].header] = columnMapping[col].accessor(
            item,
            index
          );
        });
        return row;
      });

      const totalRow = {};
      totalRow["क्र.सं."] = "कुल";
      selectedColumns.forEach((col) => {
        if (col === "scheme_name" || col === "unit" || col === "supplied_item_name" || col === "category") {
          const uniqueValues = new Set(data.map(item => columnMapping[col].accessor(item, 0)));
          totalRow[columnMapping[col].header] = uniqueValues.size;
        } else if (col === "quantity" || col === "amount") {
          const sum = data.reduce((total, item) => {
            const value = parseFloat(columnMapping[col].accessor(item, 0)) || 0;
            return total + value;
          }, 0);
          totalRow[columnMapping[col].header] = sum;
        } else {
          totalRow[columnMapping[col].header] = "";
        }
      });
      excelData.push(totalRow);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = selectedColumns.map(() => ({ wch: 15 }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error("Error generating Excel file:", e);
    }
  };

  // Download PDF function
  const downloadPdf = (
    data,
    filename,
    columnMapping,
    selectedColumns,
    title
  ) => {
    try {
      const headers = `<th>क्र.सं.</th>${selectedColumns
        .map((col) => `<th>${columnMapping[col].header}</th>`)
        .join("")}`;
      
      const rows = data
        .map((item, index) => {
          const cells = `<td>${index + 1}</td>${selectedColumns
            .map(
              (col) => `<td>${columnMapping[col].accessor(item, index)}</td>`
            )
            .join("")}`;
          return `<tr>${cells}</tr>`;
        })
        .join("");

      const totalCells = `<td><strong>कुल</strong></td>${selectedColumns
        .map((col) => {
          if (col === "scheme_name" || col === "unit" || col === "supplied_item_name" || col === "category") {
            const uniqueValues = new Set(data.map(item => columnMapping[col].accessor(item, 0)));
            return `<td><strong>${uniqueValues.size}</strong></td>`;
          } else if (col === "quantity" || col === "amount") {
            const sum = data.reduce((total, item) => {
              const value = parseFloat(columnMapping[col].accessor(item, 0)) || 0;
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
    }
  };

  // Generate pagination items
  const getPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <Pagination.First key="first" onClick={() => setCurrentPage(1)} />
      );
      items.push(<Pagination.Ellipsis key="ellipsis1" />);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      items.push(<Pagination.Ellipsis key="ellipsis2" />);
      items.push(
        <Pagination.Last key="last" onClick={() => setCurrentPage(totalPages)} />
      );
    }

    return items;
  };

  return (
    <Container fluid className="px-3" style={{ paddingTop: '60px' }}>
      <div className="mb-3">
        <DemandNavigation />
      </div>
      <h4 className="mb-4">{centerData.centerName} - कृषिवाइज एंट्री</h4>
      
      {apiError && <Alert variant="danger">{apiError}</Alert>}
      
      {isLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">डेटा लोड हो रहा है...</p>
        </div>
      )}
      
      {/* No data message when no beneficiaries available for the center */}
      {!isLoading && beneficiaries.length === 0 && (
        <Alert variant="info" className="text-center">
          इस केंद्र के लिए कोई कृषि एंट्री डेटा उपलब्ध नहीं है।
        </Alert>
      )}
      
      {!isLoading && beneficiaries.length > 0 && (
        <div className="mb-4">
          <h5>सेंटर विवरण:</h5>
          <div className="d-flex gap-4 flex-wrap">
            <div className="d-flex flex-column">
              <span className="fw-bold">केंद्र का नाम:</span>
              <span>{centerDetails.center_name}</span>
            </div>
            <div className="d-flex flex-column">
              <span className="fw-bold">विधानसभा का नाम:</span>
              <span>{centerDetails.vidhan_sabha_name}</span>
            </div>
            <div className="d-flex flex-column">
              <span className="fw-bold">विकास खंड का नाम:</span>
              <span>{centerDetails.vikas_khand_name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      {!isLoading && beneficiaries.length > 0 && !tableVisible && (
        <div className="mb-4 p-4 border rounded bg-light">
          <h5 className="mb-3">तारीख सीमा चुनें:</h5>
          <Row className="align-items-end">
            <Col md={4} className="mb-3">
              <Form.Group controlId="fromDate">
                <Form.Label>से</Form.Label>
                <Form.Control
                  type="date"
                  name="fromDate"
                  value={dateRange.fromDate}
                  onChange={handleDateRangeChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4} className="mb-3">
              <Form.Group controlId="toDate">
                <Form.Label>तक</Form.Label>
                <Form.Control
                  type="date"
                  name="toDate"
                  value={dateRange.toDate}
                  onChange={handleDateRangeChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4} className="mb-3">
              <Button
                variant="primary"
                onClick={applyDateRangeFilter}
                className="w-100"
              >
                डेटा दिखाएं
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {/* Filters and Table */}
      {tableVisible && (
        <>
          <div className="mb-4 p-4 border rounded bg-light">
            <h5 className="mb-3">फिल्टर्स:</h5>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group controlId="fromDate">
                  <Form.Label>कब से</Form.Label>
                  <Form.Control
                    type="date"
                    name="fromDate"
                    value={dateRange.fromDate}
                    onChange={handleDateRangeChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="toDate">
                  <Form.Label>कब तक</Form.Label>
                  <Form.Control
                    type="date"
                    name="toDate"
                    value={dateRange.toDate}
                    onChange={handleDateRangeChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="mb-3">
                <Form.Group controlId="schemeName">
                  <Form.Label>योजना का नाम</Form.Label>
                  <Select
                    isMulti
                    value={schemeOptions.filter(opt => selectedSchemes.includes(opt)).map(opt => ({ value: opt, label: opt }))}
                    options={schemeOptions.map(opt => ({ value: opt, label: opt }))}
                    onChange={handleSchemeChange}
                    placeholder="योजना का नाम चुनें"
                    className="mb-2"
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="mb-3">
                <Form.Group controlId="suppliedItemName">
                  <Form.Label>आपूर्ति की गई वस्तु का नाम</Form.Label>
                  <Select
                    isMulti
                    value={suppliedItemOptions.filter(opt => selectedSuppliedItems.includes(opt)).map(opt => ({ value: opt, label: opt }))}
                    options={suppliedItemOptions.map(opt => ({ value: opt, label: opt }))}
                    onChange={handleSuppliedItemChange}
                    placeholder="आपूर्ति की गई वस्तु का नाम चुनें"
                    className="mb-2"
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="mb-3">
                <Form.Group controlId="category">
                  <Form.Label>श्रेणी</Form.Label>
                  <Select
                    isMulti
                    value={categoryOptions.filter(opt => selectedCategories.includes(opt)).map(opt => ({ value: opt, label: opt }))}
                    options={categoryOptions.map(opt => ({ value: opt, label: opt }))}
                    onChange={handleCategoryChange}
                    placeholder="श्रेणी चुनें"
                    className="mb-2"
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="farmerName">
                  <Form.Label>किसान का नाम</Form.Label>
                  <Form.Control
                    type="text"
                    value={farmerName}
                    onChange={handleFarmerNameChange}
                    placeholder="किसान का नाम डालें"
                    className="mb-2"
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="aadhaarNumber">
                  <Form.Label>आधार नंबर</Form.Label>
                  <Form.Control
                    type="number"
                    value={aadhaarNumber}
                    onChange={handleAadhaarNumberChange}
                    placeholder="आधार नंबर डालें"
                    className="mb-2"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <ColumnSelection
            columns={beneficiariesTableColumns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            title="स्तंभ चयन करें"
          />

          <div className="mb-3 d-flex gap-2">
            <Button
              variant="success"
              onClick={() => downloadExcel(filteredData, "KrishiwiseEntry", beneficiariesTableColumnMapping, selectedColumns)}
              className="d-flex align-items-center gap-2"
            >
              <FaFileExcel /> Excel डाउनलोड करें
            </Button>
            <Button
              variant="danger"
              onClick={() => downloadPdf(filteredData, "KrishiwiseEntry", beneficiariesTableColumnMapping, selectedColumns, `${centerData.centerName} - कृषिवाइज एंट्री`)}
              className="d-flex align-items-center gap-2"
            >
              <FaFilePdf /> PDF डाउनलोड करें
            </Button>
          </div>
          
          <Table striped bordered hover className="registration-form">
            <thead className="table-light">
              <tr>
                <th>क्र.सं.</th>
                {beneficiariesTableColumns.filter(col => selectedColumns.includes(col.key)).map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tbl-body">
              {currentItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td>
                    {indexOfFirstItem + index + 1}
                  </td>
                  {beneficiariesTableColumns.filter(col => selectedColumns.includes(col.key)).map((col) => (
                    <td key={col.key}>
                      {beneficiariesTableColumnMapping[col.key].accessor(item, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-total-row">
                <td><strong>कुल</strong></td>
                {beneficiariesTableColumns.filter(col => selectedColumns.includes(col.key)).map((col) => {
                  if (col.key === "quantity" || col.key === "amount") {
                    const sum = filteredData.reduce((acc, item) => {
                      const value = parseFloat(item[col.key]) || 0;
                      return acc + value;
                    }, 0);
                    return (
                      <td key={col.key}>
                        <strong>{sum.toFixed(2)}</strong>
                      </td>
                    );
                  } else if (col.key === "scheme_name" || col.key === "unit" || col.key === "supplied_item_name" || col.key === "category") {
                    const uniqueValues = new Set(filteredData.map(item => item[col.key])).size;
                    return (
                      <td key={col.key}>
                        <strong>{uniqueValues}</strong>
                      </td>
                    );
                  } else {
                    return <td key={col.key}></td>;
                  }
                })}
              </tr>
            </tfoot>
          </Table>
          
          {/* Pagination controls */}
          {filteredData.length > itemsPerPage && (
            <div className="mt-3">
              <div className="small-fonts mb-3 text-center">
                पृष्ठ {currentPage} का {totalPages}
              </div>
              <Pagination className="d-flex justify-content-center">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {getPaginationItems()}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* No data message when table is visible but no data matches filters */}
      {tableVisible && filteredData.length === 0 && (
        <Alert variant="info" className="text-center">
          कोई कृषि एंट्री डेटा उपलब्ध नहीं है।
        </Alert>
      )}
    </Container>
  );
};

export default DemandKrishiwiseEntry;
