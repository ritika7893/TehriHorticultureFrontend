import React, { useState, useEffect } from "react";
import { Card, Form, Button, Collapse, Spinner } from "react-bootstrap";
import axios from "axios";
import "../../assets/css/dashboard.css";
import "../../assets/css/LeftNav.css";
import { FaAngleUp, FaAngleDown } from "react-icons/fa";

const LeftNav = ({ 
  onApply = () => {}, 
  options = {}, 
  setShowMainCards = () => {} 
}) => {
  const [filters, setFilters] = useState({
    vidhanSabha: [],
    vikasKhand: [],
    center: [],
    scheme: [],
    source: [],
    component: [],
    investment: [],
  });

  // State to manage the open/closed state of each filter section
  const [openSections, setOpenSections] = useState({
    vidhanSabha: false,
    vikasKhand: false,
    center: false,
    scheme: false,
    source: false,
    component: false,
    investment: false,
  });

  // State for API data and loading
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State to track if any filters are applied
  const [hasFilters, setHasFilters] = useState(false);

  // Fetch data from API
  // const fetchApiData = async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const response = await axios.get(
  //       "https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/"
  //     );
  //     setApiData(response.data);
      
  //     // Extract unique values for each filter from API data
  //     const uniqueValues = {
  //       vidhanSabha: [...new Set(response.data.map(item => item.vidhan_sabha_name).filter(Boolean))],
  //       vikasKhand: [...new Set(response.data.map(item => item.vikas_khand_name).filter(Boolean))],
  //       center: [...new Set(response.data.map(item => item.center_name).filter(Boolean))],
  //       scheme: [...new Set(response.data.map(item => item.scheme_name).filter(Boolean))],
  //       source: [...new Set(response.data.map(item => item.source_of_receipt).filter(Boolean))],
  //       component: [...new Set(response.data.map(item => item.component).filter(Boolean))],
  //       investment: [...new Set(response.data.map(item => item.investment_name).filter(Boolean))],
  //     };
      
  //     setFilterOptions(uniqueValues);
  //   } catch (err) {
  //     setError("Failed to fetch data from API");
  //     console.error("Error fetching API data:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // State for filter options populated from API
  const [filterOptions, setFilterOptions] = useState({
    vidhanSabha: [],
    vikasKhand: [],
    center: [],
    scheme: [],
    source: [],
    component: [],
    investment: [],
  });

  // Load data on component mount
  // useEffect(() => {
  //   fetchApiData();
  // }, []);

  const handleChange = (e) => {
    const { name } = e.target;
    const values = Array.from(e.target.selectedOptions).map(option => option.value);

    setFilters(prev => ({
      ...prev,
      [name]: values
    }));

    // Check if any filters are applied
    const newFilters = { ...filters, [name]: values };
    const hasActiveFilters = Object.values(newFilters).some(filterArray => filterArray.length > 0);
    setHasFilters(hasActiveFilters);
    
    // Hide main dashboard cards if any filter is applied
    setShowMainCards(!hasActiveFilters);
  };

  // Function to toggle a specific section
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleApply = () => {
    // Filter the API data based on selected filters
    let filteredData = apiData;

    // Apply filters in sequence
    if (filters.vidhanSabha.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.vidhanSabha.includes(item.vidhan_sabha_name)
      );
    }

    if (filters.vikasKhand.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.vikasKhand.includes(item.vikas_khand_name)
      );
    }

    if (filters.center.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.center.includes(item.center_name)
      );
    }

    if (filters.scheme.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.scheme.includes(item.scheme_name)
      );
    }

    if (filters.source.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.source.includes(item.source_of_receipt)
      );
    }

    if (filters.component.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.component.includes(item.component)
      );
    }

    if (filters.investment.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.investment.includes(item.investment_name)
      );
    }



    // Send filtered data to parent component only if onApply is provided
    if (typeof onApply === 'function') {
      onApply({
        filters,
        filteredData,
        totalData: apiData,
        recordCount: filteredData.length
      });
    } else {
      // Fallback: log the filtered data for debugging
      console.log('Filtered Data:', {
        filters,
        filteredData,
        totalData: apiData,
        recordCount: filteredData.length
      });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      vidhanSabha: [],
      vikasKhand: [],
      center: [],
      scheme: [],
      source: [],
      component: [],
      investment: [],
    });
    setHasFilters(false);
    
    // Show main dashboard cards when filters are cleared
    setShowMainCards(true);
  };

  if (loading) {
    return (
      <Card className="filter-sidebar shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <Spinner animation="border" />
            <span className="ms-2">Loading filters...</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="filter-sidebar shadow-sm">
        <Card.Body>
          <div className="alert alert-danger">
            {error}
            <Button 
              variant="outline-danger" 
              size="sm" 
              className="ms-2"
              // onClick={fetchApiData}
            >
              Retry
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div></div>
    // <Card className="filter-sidebar shadow-sm">
    //   <Card.Body>
    //     {/* <div className="d-flex justify-content-between align-items-center mb-4">
    //       <h5 className="filter-title mb-0">Filters</h5>
    //       {hasFilters && (
    //         <Button
    //           variant="outline-danger"
    //           size="sm"
    //           onClick={clearAllFilters}
    //         >
    //           Clear All
    //         </Button>
    //       )}
    //     </div> */}

    //     {/* VIDHAN SABHA COLLAPSIBLE SECTION */}
    //     <Card className="mb-3 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('vidhanSabha')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">विधानसभा (Vidhan Sabha)</Form.Label>
    //         <span>{openSections.vidhanSabha ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.vidhanSabha}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="vidhanSabha"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.vidhanSabha}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.vidhanSabha.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>

    //     {/* VIKAS KHAND COLLAPSIBLE SECTION */}
    //     <Card className="mb-3 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('vikasKhand')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">विकासखंड (Vikas Khand)</Form.Label>
    //         <span>{openSections.vikasKhand ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.vikasKhand}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="vikasKhand"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.vikasKhand}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.vikasKhand.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>

    //     {/* CENTER COLLAPSIBLE SECTION */}
    //     <Card className="mb-3 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('center')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">केंद्र (Center)</Form.Label>
    //         <span>{openSections.center ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.center}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="center"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.center}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.center.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>

    //     {/* SCHEME COLLAPSIBLE SECTION */}
    //     <Card className="mb-3 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('scheme')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">योजना (Scheme)</Form.Label>
    //         <span>{openSections.scheme ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.scheme}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="scheme"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.scheme}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.scheme.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>

    //     {/* SOURCE COLLAPSIBLE SECTION */}
    //     <Card className="mb-3 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('source')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">सप्लायर (Source of Receipt)</Form.Label>
    //         <span>{openSections.source ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.source}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="source"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.source}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.source.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>

    //     {/* COMPONENT COLLAPSIBLE SECTION */}
    //     <Card className="mb-3 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('component')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">घटक (Component)</Form.Label>
    //         <span>{openSections.component ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.component}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="component"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.component}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.component.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>

    //     {/* INVESTMENT COLLAPSIBLE SECTION */}
    //     <Card className="mb-4 filter-section-card">
    //       <Card.Header 
    //         className="d-flex justify-content-between align-items-center card-header-main"
    //         onClick={() => toggleSection('investment')}
    //         style={{ cursor: 'pointer' }}
    //       >
    //         <Form.Label className="mb-0 fw-bold gov-form-label">निवेश (Investment)</Form.Label>
    //         <span>{openSections.investment ? <FaAngleUp /> : <FaAngleDown />}</span>
    //       </Card.Header>
    //       <Collapse in={openSections.investment}>
    //         <Card.Body className="pt-0">
    //           <Form.Select
    //             name="investment"
    //             multiple
    //             className="filter-select"
    //             onChange={handleChange}
    //             value={filters.investment}
    //             size="4"
    //             style={{ minHeight: '100px' }}
    //           >
    //             {filterOptions.investment.map(option => (
    //               <option key={option} value={option}>{option}</option>
    //             ))}
    //           </Form.Select>
    //         </Card.Body>
    //       </Collapse>
    //     </Card>



    //     <Button
    //       variant="primary"
    //       className="w-100 mt-3"
    //       onClick={handleApply}
    //       disabled={!hasFilters}
    //     >
    //       Apply Filters {hasFilters && `(${Object.values(filters).flat().length} selected)`}
    //     </Button>
    //   </Card.Body>
    // </Card>
  );
};

export default LeftNav;