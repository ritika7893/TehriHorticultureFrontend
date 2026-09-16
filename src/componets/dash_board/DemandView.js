import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert, Spinner, Modal, InputGroup, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCenter } from '../all_login/CenterContext';
import { useAuth } from '../../context/AuthContext';
import DashBoardHeader from './DashBoardHeader';
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiSaveLine, RiCloseLine, RiEyeLine, RiSearchLine, RiFileDownloadLine, RiFileExcel2Line, RiFilePdfLine } from 'react-icons/ri';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

const DemandView = () => {
  const navigate = useNavigate();
  const { centerData, clearCenter } = useCenter();
  const { logout } = useAuth();
  
  // State for data
  const [centerDemands, setCenterDemands] = useState([]);
  const [centerLoading, setCenterLoading] = useState(false);
  const [centerError, setCenterError] = useState('');
  const [demands, setDemands] = useState([]);
  const [filteredDemands, setFilteredDemands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentDemand, setCurrentDemand] = useState(null);
  const [showRemainingCentersModal, setShowRemainingCentersModal] = useState(false); // State for Remaining Centers Modal
  
  // State for forms
  const [formData, setFormData] = useState({
    sub_investment_name: '',
    scheme_name: '',
    allocated_quantity: '',
    rate: '',
    unit: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for center demands filters
  const [selectedCenters, setSelectedCenters] = useState([]);
  const [selectedSubInvestments, setSelectedSubInvestments] = useState([]);
  
  // State for editing center demands
  const [editingCenterDemandId, setEditingCenterDemandId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editValidationError, setEditValidationError] = useState('');
  const [showDeleteCenterDemandModal, setShowDeleteCenterDemandModal] = useState(false);
  const [centerDemandToDelete, setCenterDemandToDelete] = useState(null);
  
  // Ref for table elements
  const demandsTableRef = useRef(null);
  const centerDemandsTableRef = useRef(null);
  
  // Fetch all demands on component mount
  useEffect(() => {
    fetchDemands();
    fetchDemandByCenter();
  }, []);
  
  const fetchDemandByCenter = async () => {
    setCenterLoading(true);
    setCenterError('');

    try {
      const response = await fetch('https://mahadevaaya.com/govbillingsystem/backend/api/demand-by-center/');

      if (!response.ok) {
        throw new Error('Failed to fetch center demands');
      }

      const data = await response.json();
      setCenterDemands(data);
    } catch (err) {
      console.error(err);
      setCenterError('सेंटर डिमांड लाने में त्रुटि');
    } finally {
      setCenterLoading(false);
    }
  };

  // Filter demands based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDemands(demands);
    } else {
      const filtered = demands.filter(demand => 
        demand.demand_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demand.sub_investment_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDemands(filtered);
    }
  }, [searchTerm, demands]);

  // Get unique centers and sub-investments for filters (This acts as the Master List of available centers)
  const uniqueCenters = Array.from(new Set(centerDemands.map(item => item.center_name))).filter(Boolean);
  const uniqueSubInvestments = Array.from(new Set(centerDemands.map(item => item?.demand?.sub_investment_name))).filter(Boolean);

  // Filter center demands based on selected filters
  const filteredCenterDemands = centerDemands.filter(item => {
    const matchesCenter = selectedCenters.length === 0 || selectedCenters.includes(item.center_name);
    const matchesSubInvestment = selectedSubInvestments.length === 0 || selectedSubInvestments.includes(item?.demand?.sub_investment_name);
    return matchesCenter && matchesSubInvestment;
  });

  // Identify centers currently displayed in the filtered table
  const filteredUniqueCenters = Array.from(new Set(filteredCenterDemands.map(item => item.center_name))).filter(Boolean);
  
  // Identify centers from the dropdown (केंद्र फ़िल्टर) that are NOT in the currently filtered table
  const remainingCenters = uniqueCenters.filter(
    centerName => !filteredUniqueCenters.includes(centerName)
  );
  
  // GET: Fetch all demands
  const fetchDemands = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('https://mahadevaaya.com/govbillingsystem/backend/api/demand-generation/');
      if (!response.ok) {
        throw new Error('Failed to fetch demands');
      }
      const data = await response.json();
      setDemands(data);
      setFilteredDemands(data);
    } catch (err) {
      console.error('Error fetching demands:', err);
      setError('डेटा लाने में त्रुटि। कृपया बाद में पुन: प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };
  
  // POST: Create new demand
  const handleAddDemand = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (!formData.sub_investment_name || !formData.allocated_quantity || !formData.rate) {
        setError('सभी फ़ील्ड भरना अनिवार्य है');
        setIsSubmitting(false);
        return;
      }
      const payload = {
        sub_investment_name: formData.sub_investment_name,
        scheme_name: formData.scheme_name,
        allocated_quantity: parseFloat(formData.allocated_quantity),
        rate: parseFloat(formData.rate),
        unit: formData.unit
      };
      const response = await fetch('https://mahadevaaya.com/govbillingsystem/backend/api/demand-generation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create demand');
      }
      setFormData({ sub_investment_name: '', scheme_name: '', allocated_quantity: '', rate: '', unit: '' });
      setShowAddModal(false);
      setSuccess('डिमांड सफलतापूर्वक बनाई गई!');
      await fetchDemands();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating demand:', err);
      setError(err.message || 'डिमांड बनाने में त्रुटि। कृपया बाद में पुन: प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // PUT: Update existing demand
  const handleUpdateDemand = async () => {
    if (!currentDemand) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (!formData.sub_investment_name || !formData.allocated_quantity || !formData.rate) {
        setError('सभी फ़ील्ड भरना अनिवार्य है');
        setIsSubmitting(false);
        return;
      }
      const payload = {
        demand_id: currentDemand.demand_id,
        sub_investment_name: formData.sub_investment_name,
        scheme_name: formData.scheme_name,
        allocated_quantity: parseFloat(formData.allocated_quantity),
        rate: parseFloat(formData.rate),
        unit: formData.unit 
      };
      const response = await fetch(`https://mahadevaaya.com/govbillingsystem/backend/api/demand-generation/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update demand');
      }
      setFormData({ sub_investment_name: '', scheme_name: '', allocated_quantity: '', rate: '', unit: '' });
      setShowEditModal(false);
      setCurrentDemand(null);
      setSuccess('डिमांड सफलतापूर्वक अपडेट की गई!');
      await fetchDemands();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating demand:', err);
      setError(err.message || 'डिमांड अपडेट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // DELETE: Remove demand
  const handleDeleteDemand = async () => {
    if (!currentDemand) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`https://mahadevaaya.com/govbillingsystem/backend/api/demand-generation/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demand_id: currentDemand.demand_id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete demand');
      }
      setShowDeleteModal(false);
      setCurrentDemand(null);
      setSuccess('डिमांड सफलतापूर्वक हटा दी गई!');
      await fetchDemands();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting demand:', err);
      setError(err.message || 'डिमांड हटाने में त्रुटि। कृपया बाद में पुन: प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openEditModal = (demand) => {
    setCurrentDemand(demand);
    setFormData({
      sub_investment_name: demand.sub_investment_name,
      scheme_name: demand.scheme_name || '',
      allocated_quantity: demand.allocated_quantity,
      rate: demand.rate,
      unit: demand.unit || ''  
    });
    setShowEditModal(true);
  };
  
  const openViewModal = (demand) => {
    setCurrentDemand(demand);
    setShowViewModal(true);
  };
  
  const openDeleteModal = (demand) => {
    setCurrentDemand(demand);
    setShowDeleteModal(true);
  };

  const handleEditCenterDemand = async (recordId, allocatedQuantity) => {
    if (editingQuantity === '' || editingQuantity === null) {
      setEditValidationError('कृपया मात्रा दर्ज करें');
      return;
    }
    if (parseFloat(editingQuantity) > parseFloat(allocatedQuantity)) {
      setEditValidationError(`मांगी गई मात्रा DHO, कोटद्वार का कुल लक्ष्य (${allocatedQuantity}) से कम होनी चाहिए`);
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setEditValidationError('');
    const payload = { id: recordId, demanded_quantity: parseFloat(editingQuantity) };
    try {
      const response = await fetch('https://mahadevaaya.com/govbillingsystem/backend/api/demand-by-center/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'डिमांड अपडेट करने में विफल');
      }
      setSuccess('डिमांड सफलतापूर्वक अपडेट की गई!');
      setEditingCenterDemandId(null);
      setEditingQuantity('');
      await fetchDemandByCenter();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error editing center demand:', err);
      setError(err.message || 'डिमांड अपडेट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingCenterDemand = (record) => {
    setEditingCenterDemandId(record.id);
    setEditingQuantity(record.demanded_quantity);
    setEditValidationError('');
  };

  const cancelEditingCenterDemand = () => {
    setEditingCenterDemandId(null);
    setEditingQuantity('');
    setEditValidationError('');
  };

  const handleDeleteCenterDemand = async () => {
    if (!centerDemandToDelete) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('https://mahadevaaya.com/govbillingsystem/backend/api/demand-by-center/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: centerDemandToDelete.id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'सेंटर डिमांड हटाने में विफल');
      }
      setShowDeleteCenterDemandModal(false);
      setCenterDemandToDelete(null);
      setSuccess('सेंटर डिमांड सफलतापूर्वक हटा दी गई!');
      await fetchDemandByCenter();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting center demand:', err);
      setError(err.message || 'सेंटर डिमांड हटाने में त्रुटि। कृपया बाद में पुन: प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteCenterDemandModal = (record) => {
    setCenterDemandToDelete(record);
    setShowDeleteCenterDemandModal(true);
  };

  const handleEditQuantityChange = (e, maxQuantity) => {
    const value = parseFloat(e.target.value) || 0;
    const maxQty = parseFloat(maxQuantity) || 0;
    if (value < 0) {
      setEditValidationError('मात्रा ऋणात्मक नहीं हो सकती');
      return;
    }
    if (value > maxQty) {
      setEditValidationError(`मांगी गई मात्रा (${value}) DHO, कोटद्वार का कुल लक्ष्य (${maxQty}) से अधिक नहीं हो सकती`);
      return;
    }
    setEditValidationError('');
    setEditingQuantity(e.target.value);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCloseModal = (modalType) => {
    if (modalType === 'add') setShowAddModal(false);
    else if (modalType === 'edit') { setShowEditModal(false); setCurrentDemand(null); }
    else if (modalType === 'delete') { setShowDeleteModal(false); setCurrentDemand(null); }
    else if (modalType === 'view') { setShowViewModal(false); setCurrentDemand(null); }
    
    setFormData({ sub_investment_name: '', scheme_name: '', allocated_quantity: '', rate: '', unit: '' });
    setError('');
  };
  
  const handleLogout = () => {
    clearCenter();
    logout();
    navigate('/', { replace: true });
  };
  
  const exportDemandsToExcel = () => {
    const exportData = filteredDemands.map((demand, index) => ({
      'S.No.': index + 1,
      'उप-मद का नाम': demand.sub_investment_name,
      'योजना का नाम': demand.scheme_name,
      'DHO, कोटद्वार का कुल लक्ष्य': demand.allocated_quantity,
      'इकाई': demand.unit,
      'कृषक विक्रय दर / अनुदान दर': demand.rate
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "डिमांड रिकॉर्ड्स");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `डिमांड_रिकॉर्ड्स_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const exportCenterDemandsToExcel = () => {
    const groupedByCenter = {};
    filteredCenterDemands.forEach(item => {
      if (!groupedByCenter[item.center_name]) groupedByCenter[item.center_name] = [];
      groupedByCenter[item.center_name].push(item);
    });
    const exportData = [];
    let sNo = 1;
    Object.keys(groupedByCenter).forEach(centerName => {
      groupedByCenter[centerName].forEach((item, index) => {
        exportData.push({
          'S.No.': index === 0 ? sNo++ : '',
          'सेंटर नाम': index === 0 ? item.center_name : '',
          'उप-मद का नाम': item?.demand?.sub_investment_name || '',
          'योजना का नाम': item?.demand?.scheme_name || '',
          'इकाई': item?.demand?.unit || '',
          'मांगी गई मात्रा': item.demanded_quantity,
          'कृषक विक्रय दर / अनुदान दर': item?.demand?.rate || 0,
          'कुल राशि': (item.demanded_quantity * (item?.demand?.rate || 0)).toFixed(2)
        });
      });
    });
    exportData.push({
      'S.No.': '', 'सेंटर नाम': 'कुल', 'उप-मद का नाम': '', 'योजना का नाम': '', 'इकाई': '',
      'मांगी गई मात्रा': filteredCenterDemands.reduce((sum, item) => sum + parseFloat(item.demanded_quantity || 0), 0).toFixed(2),
      'कृषक विक्रय दर / अनुदान दर': '',
      'कुल राशि': filteredCenterDemands.reduce((sum, item) => sum + (parseFloat(item.demanded_quantity || 0) * parseFloat(item?.demand?.rate || 0)), 0).toFixed(2)
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "सेंटर अनुसार डिमांड");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `सेंटर_डिमांड_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportDemandsToPDF = () => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.fontFamily = 'Arial, sans-serif';
    wrapper.style.maxWidth = '100%';
    wrapper.style.overflow = 'hidden';
    const title = document.createElement('h3');
    title.textContent = 'डिमांड रिकॉर्ड्स';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    wrapper.appendChild(title);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.tableLayout = 'fixed';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['S.No.', 'उप-मद का नाम', 'योजना का नाम', 'DHO, कोटद्वार का कुल लक्ष्य', 'इकाई', 'कृषक विक्रय दर / अनुदान दर'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.border = '1px solid #000';
      th.style.padding = '8px';
      th.style.backgroundColor = 'blue';
      th.style.fontWeight = 'bold';
      th.style.textAlign = 'center';
      th.style.color = '#000000';
      th.style.whiteSpace = 'normal';
      th.style.wordBreak = 'break-word';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    
    filteredDemands.forEach((demand, index) => {
      const row = document.createElement('tr');
      const cellData = [index + 1, demand.sub_investment_name, demand.scheme_name, demand.allocated_quantity, demand.unit, demand.rate];
      cellData.forEach(cellText => {
        const td = document.createElement('td');
        td.textContent = cellText;
        td.style.border = '1px solid #000';
        td.style.padding = '8px';
        td.style.textAlign = 'left';
        td.style.color = '#000000';
        td.style.whiteSpace = 'normal';
        td.style.wordBreak = 'break-word';
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);

    const opt = {
      margin: 10,
      filename: `डिमांड_रिकॉर्ड्स_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(wrapper).save();
  };

  const exportCenterDemandsToPDF = () => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.fontFamily = 'Arial, sans-serif';
    wrapper.style.maxWidth = '100%';
    wrapper.style.overflow = 'hidden';
    const title = document.createElement('h3');
    title.textContent = 'सेंटर अनुसार डिमांड';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    wrapper.appendChild(title);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.tableLayout = 'fixed';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['S.No.', 'सेंटर नाम', 'उप-मद का नाम', 'योजना का नाम', 'इकाई', 'मांगी गई मात्रा', 'कृषक विक्रय दर / अनुदान दर', 'कुल राशि'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.border = '1px solid #000';
      th.style.padding = '8px';
      th.style.backgroundColor = '#0B488F';
      th.style.fontWeight = 'bold';
      th.style.textAlign = 'center';
      th.style.color = '#000000';
      th.style.whiteSpace = 'normal';
      th.style.wordBreak = 'break-word';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    
    const groupedByCenter = {};
    filteredCenterDemands.forEach(item => {
      if (!groupedByCenter[item.center_name]) groupedByCenter[item.center_name] = [];
      groupedByCenter[item.center_name].push(item);
    });

    let sNo = 1;
    Object.keys(groupedByCenter).forEach(centerName => {
      groupedByCenter[centerName].forEach((item, index) => {
        const row = document.createElement('tr');
        const sNoCell = document.createElement('td');
        sNoCell.textContent = index === 0 ? sNo++ : '';
        sNoCell.style.border = '1px solid #000';
        sNoCell.style.padding = '8px';
        sNoCell.style.color = '#000000';
        row.appendChild(sNoCell);
        
        const centerCell = document.createElement('td');
        centerCell.textContent = index === 0 ? item.center_name : '';
        centerCell.style.border = '1px solid #000';
        centerCell.style.padding = '8px';
        centerCell.style.color = '#000000';
        row.appendChild(centerCell);
        
        const cellData = [
          item?.demand?.sub_investment_name || '', item?.demand?.scheme_name || '', item?.demand?.unit || '',
          item.demanded_quantity, item?.demand?.rate || 0,
          (item.demanded_quantity * (item?.demand?.rate || 0)).toFixed(2)
        ];
        cellData.forEach(cellText => {
          const td = document.createElement('td');
          td.textContent = cellText;
          td.style.border = '1px solid #000';
          td.style.padding = '8px';
          td.style.color = '#000000';
          td.style.whiteSpace = 'normal';
          td.style.wordBreak = 'break-word';
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
    });

    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#f8f9fa';
    for (let i = 0; i < 5; i++) {
      const td = document.createElement('td');
      td.textContent = i === 0 ? 'कुल' : '';
      td.style.border = '1px solid #000';
      td.style.padding = '8px';
      td.style.color = '#000000';
      totalRow.appendChild(td);
    }
    const totalQuantityCell = document.createElement('td');
    totalQuantityCell.textContent = filteredCenterDemands.reduce((sum, item) => sum + parseFloat(item.demanded_quantity || 0), 0).toFixed(2);
    totalQuantityCell.style.border = '1px solid #000';
    totalQuantityCell.style.padding = '8px';
    totalQuantityCell.style.color = '#000000';
    totalRow.appendChild(totalQuantityCell);
    
    const emptyRateCell = document.createElement('td');
    emptyRateCell.textContent = '';
    emptyRateCell.style.border = '1px solid #000';
    emptyRateCell.style.padding = '8px';
    emptyRateCell.style.color = '#000000';
    totalRow.appendChild(emptyRateCell);
    
    const totalAmountCell = document.createElement('td');
    totalAmountCell.textContent = filteredCenterDemands.reduce((sum, item) => sum + (parseFloat(item.demanded_quantity || 0) * parseFloat(item?.demand?.rate || 0)), 0).toFixed(2);
    totalAmountCell.style.border = '1px solid #000';
    totalAmountCell.style.padding = '8px';
    totalAmountCell.style.color = '#000000';
    totalRow.appendChild(totalAmountCell);
    
    tbody.appendChild(totalRow);
    table.appendChild(tbody);
    wrapper.appendChild(table);

    const opt = {
      margin: 10,
      filename: `सेंटर_डिमांड_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(wrapper).save();
  };
  
  return (
    <>
      <DashBoardHeader />
      <Container fluid className="py-4 bg-home">
        <Row className="mb-4 table-m-top">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h2>डिमांड प्रबंधन</h2>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                  <RiAddLine /> नई डिमांड जोड़ें
                </Button>
                <Button variant="danger" onClick={handleLogout}>लॉगआउट</Button>
              </div>
            </div>
          </Col>
        </Row>
        
        {success && <Alert variant="success" className="mb-3">{success}</Alert>}
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
        
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">डिमांड रिकॉर्ड्स</h5>
                <div className="d-flex gap-2">
                  <InputGroup style={{ width: '500px' }}>
                    <InputGroup.Text><RiSearchLine /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="उप-निवेश खोजें..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button style={{marginLeft: '10px', fontSize: '10px'}} variant="primary" onClick={() => setShowAddModal(true)}>
                      <RiAddLine /> नई डिमांड जोड़ें
                    </Button>
                  </InputGroup>
                  <Button variant="outline-success" style={{backgroundColor: '#28a745', color: 'white', fontSize: '10px'}} onClick={exportDemandsToExcel}>
                    <RiFileExcel2Line /> Excel निर्यात करें
                  </Button>
                  <Button variant="outline-danger" style={{backgroundColor: '#dc3545', color: 'white', fontSize: '10px'}} onClick={exportDemandsToPDF}>
                    <RiFilePdfLine /> PDF निर्यात करें
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {isLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">लोड हो रहा है...</span>
                    </Spinner>
                  </div>
                ) : (
                  <>
                    {filteredDemands.length > 0 ? (
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }} ref={demandsTableRef}>
                        <Table striped bordered hover responsive className="mb-0 table-thead-style">
                           <thead className='table-thead'>
                             <tr>
                                <th>S.No.</th>
                               <th>उप-मद का नाम</th>
                               <th>योजना का नाम</th>
                               <th>DHO, कोटद्वार का कुल लक्ष्य</th>
                               <th>इकाई</th>
                               <th>कृषक विक्रय दर / अनुदान दर</th>
                               <th>कार्यवाही</th>
                             </tr>
                           </thead>
                           <tbody>
                             {filteredDemands.map((demand,index) => (
                               <tr key={demand.id}>
                                 <td>{index + 1}</td>
                                 <td>{demand.sub_investment_name}</td>
                                 <td>{demand.scheme_name}</td>
                                 <td>{demand.allocated_quantity}</td>
                                 <td>{demand.unit}</td>
                                 <td>{demand.rate}</td>
                                <td>
                                  <div className="d-flex gap-1">
                                    <Button variant="outline-info" size="sm" onClick={() => openViewModal(demand)} title="देखें">
                                      <RiEyeLine />
                                    </Button>
                                    <Button variant="outline-primary" size="sm" onClick={() => openEditModal(demand)} title="संपादित करें">
                                      <RiEditLine />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(demand)} title="हटाएं">
                                      <RiDeleteBinLine />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4"><p>कोई डिमांड रिकॉर्ड नहीं मिला</p></div>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">सेंटर अनुसार डिमांड</h5>
                <div className="d-flex gap-2">
                  <Button variant="outline-success"style={{backgroundColor: '#28a745', color: 'white', fontSize: '10px' }} onClick={exportCenterDemandsToExcel}>
                    <RiFileExcel2Line /> Excel निर्यात करें
                  </Button>
                  <Button variant="outline-danger" style={{backgroundColor: '#dc3545', color: 'white', fontSize: '10px' }} onClick={exportCenterDemandsToPDF}>
                    <RiFilePdfLine /> PDF निर्यात करें
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {/* Filters */}
                <div className="mb-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="centerFilter">
                        <Form.Label>केंद्र फ़िल्टर</Form.Label>
                         <Form.Select
                            multiple
                            value={selectedCenters}
                            style={{ height: '120px', cursor: 'pointer', fontSize: '12px'  }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const value = e.target.value;
                              setSelectedCenters((prev) =>
                                prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
                              );
                            }}
                          >
                          {uniqueCenters.map(center => (
                            <option key={center} value={center}>{center}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="subInvestmentFilter">
                        <Form.Label>उप-मद का नाम फ़िल्टर</Form.Label>
                        <Form.Select
                          multiple
                          value={selectedSubInvestments}
                          style={{ height: '120px', cursor: 'pointer', fontSize: '12px'  }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const value = e.target.value;
                            setSelectedSubInvestments((prev) =>
                              prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
                            );
                          }}
                        >
                          {uniqueSubInvestments.map(subInvestment => (
                            <option key={subInvestment} value={subInvestment}>{subInvestment}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  {/* Buttons */}
                  <div className="mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <Button
                      variant=" clear-btn-primary"
                      onClick={() => { setSelectedCenters([]); setSelectedSubInvestments([]); }}
                    >
                      फ़िल्टर साफ़ करें
                    </Button>

                    <Button 
                      variant="warning" 
                      onClick={() => setShowRemainingCentersModal(true)}
                      disabled={selectedCenters.length > 0 || remainingCenters.length === 0}
                    >
                      शेष/मेल न खाने वाले सेंटर दिखाएं
                    </Button>
                  </div>
                </div>

                {centerLoading ? (
                  <div className="text-center py-4"><Spinner animation="border" /></div>
                ) : centerError ? (
                  <Alert variant="danger">{centerError}</Alert>
                ) : filteredCenterDemands?.length > 0 ? (
                  <div style={{ maxHeight: '450px', overflowY: 'auto' }} ref={centerDemandsTableRef}>
                    <Table striped bordered hover responsive className='table-thead-style'>
                      <thead className='table-thead'>
                        <tr>
                          <th>S.No.</th>
                          <th>सेंटर नाम</th>
                          <th>उप-मद का नाम</th>
                          <th>इकाई</th>
                          <th>मांगी गई मात्रा</th>
                          <th>कृषक विक्रय दर / अनुदान दर</th>
                          <th>कुल राशि</th>
                          <th>कार्यवाही</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let serial = 1; 
                          return Object.values(
                            filteredCenterDemands.reduce((acc, item) => {
                              if (!acc[item.center_name]) acc[item.center_name] = [];
                              acc[item.center_name].push(item);
                              return acc;
                            }, {})
                          ).map((centerItems) =>
                            centerItems.map((item, idx) => (
                              <tr key={item.id}>
                                {idx === 0 && (
                                  <td rowSpan={centerItems.length}>{serial++}</td>
                                )}
                                {idx === 0 && (
                                  <td rowSpan={centerItems.length}>{item.center_name || '-'}</td>
                                )}
                                <td>{item?.demand?.sub_investment_name || '-'}</td>
                                <td>{item?.demand?.unit || '-'}</td>
                                <td>
                                  {editingCenterDemandId === item.id ? (
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                      <Form.Control
                                        type="number"
                                        step="0.01"
                                        value={editingQuantity}
                                        onChange={(e) => handleEditQuantityChange(e, item?.demand?.allocated_quantity || 0)}
                                        placeholder="मात्रा दर्ज करें"
                                        isInvalid={!!editValidationError}
                                        style={{ width: '120px' }}
                                      />
                                      <Button variant="success" size="sm" onClick={() => handleEditCenterDemand(item.id, item?.demand?.allocated_quantity || 0)} disabled={isSubmitting || !!editValidationError}>
                                        {isSubmitting ? <Spinner animation="border" size="sm" /> : '✓'}
                                      </Button>
                                      <Button variant="secondary" size="sm" onClick={cancelEditingCenterDemand}>✕</Button>
                                      {editValidationError && (
                                        <Form.Control.Feedback type="invalid" className="d-block w-100">
                                          {editValidationError}
                                        </Form.Control.Feedback>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="d-flex align-items-center gap-2">
                                      <span>{item.demanded_quantity ?? '-'}</span>
                                      <Button variant="outline-primary" size="sm" onClick={() => startEditingCenterDemand(item)} title="संपादित करें">✎</Button>
                                    </div>
                                  )}
                                </td>
                                <td>{item?.demand?.rate ?? '-'}</td>
                                <td>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span>{(item.demanded_quantity * (item?.demand?.rate || 0)).toFixed(2)}</span>
                                    <Button variant="outline-danger" size="sm" onClick={() => openDeleteCenterDemandModal(item)} title="हटाएं">
                                      <RiDeleteBinLine />
                                    </Button>
                                  </div>
                                </td>
                                <td>
                                  <div className="d-flex gap-1">
                                    <Button variant="outline-info" size="sm" onClick={() => openViewModal(item?.demand)} title="देखें" disabled={!item?.demand}>
                                      <RiEyeLine />
                                    </Button>
                                    <Button variant="outline-primary" size="sm" onClick={() => openEditModal(item?.demand)} title="संपादित करें" disabled={!item?.demand}>
                                      <RiEditLine />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          );
                        })()}

                        {/* Total Row */}
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
                          <td colSpan={4}>कुल</td>
                          <td>{(filteredCenterDemands.reduce((sum, item) => sum + parseFloat(item.demanded_quantity || 0), 0)).toFixed(2)}</td>
                          <td></td>
                          <td>{(filteredCenterDemands.reduce((sum, item) => sum + (parseFloat(item.demanded_quantity || 0) * parseFloat(item?.demand?.rate || 0)), 0)).toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4"><p>कोई रिकॉर्ड उपलब्ध नहीं</p></div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      
      {/* Add Demand Modal */}
      <Modal show={showAddModal} onHide={() => handleCloseModal('add')}>
        <Modal.Header closeButton>
          <Modal.Title>नई डिमांड जोड़ें</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={(e) => { e.preventDefault(); }}>
            <Form.Group className="mb-3">
              <Form.Label>उप-मद का नाम <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" name="sub_investment_name" value={formData.sub_investment_name} onChange={handleInputChange} placeholder="जैसे: आलू-1, सोलर पैनल स्थापना" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>योजना का नाम</Form.Label>
              <Form.Control type="text" name="scheme_name" value={formData.scheme_name} onChange={handleInputChange} placeholder="जैसे: PM-KUSUM Scheme" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>इकाई <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Kg / Quintal / Nos" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>DHO, कोटद्वार का कुल लक्ष्य <span className="text-danger">*</span></Form.Label>
              <Form.Control type="number" step="0.01" name="allocated_quantity" value={formData.allocated_quantity} onChange={handleInputChange} placeholder="जैसे: 120.50" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>कृषक विक्रय दर / अनुदान दर <span className="text-danger">*</span></Form.Label>
              <Form.Control type="number" step="0.01" name="rate" value={formData.rate} onChange={handleInputChange} placeholder="जैसे: 45000.00" required />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => handleCloseModal('add')}>रद्द करें</Button>
          <Button type="button" variant="primary" onClick={handleAddDemand} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Spinner as="span" animation="border" size="sm" /><span className="ms-2">जोड़ा जा रहा है...</span></>
            ) : (
              <><RiSaveLine /> जोड़ें</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Edit Demand Modal */}
      <Modal show={showEditModal} onHide={() => handleCloseModal('edit')}>
        <Modal.Header closeButton>
          <Modal.Title>डिमांड संपादित करें</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={(e) => { e.preventDefault(); }}>
            <Form.Group className="mb-3">
              <Form.Label>उप-मद का नाम <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" name="sub_investment_name" value={formData.sub_investment_name} onChange={handleInputChange} placeholder="जैसे: आलू-1, सोलर पैनल स्थापना" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>योजना का नाम</Form.Label>
              <Form.Control type="text" name="scheme_name" value={formData.scheme_name} onChange={handleInputChange} placeholder="जैसे: PM-KUSUM Scheme" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>इकाई <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Kg / Quintal / Nos" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>DHO, कोटद्वार का कुल लक्ष्य <span className="text-danger">*</span></Form.Label>
              <Form.Control type="number" step="0.01" name="allocated_quantity" value={formData.allocated_quantity} onChange={handleInputChange} placeholder="जैसे: 120.50" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>कृषक विक्रय दर / अनुदान दर <span className="text-danger">*</span></Form.Label>
              <Form.Control type="number" step="0.01" name="rate" value={formData.rate} onChange={handleInputChange} placeholder="जैसे: 45000.00" required />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => handleCloseModal('edit')}>रद्द करें</Button>
          <Button type="button" variant="primary" onClick={handleUpdateDemand} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Spinner as="span" animation="border" size="sm" /><span className="ms-2">अपडेट हो रहा है...</span></>
            ) : (
              <><RiSaveLine /> अपडेट करें</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* View Demand Modal */}
      <Modal show={showViewModal} onHide={() => handleCloseModal('view')} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>डिमांड विवरण</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentDemand && (
            <div>
              <Row className="mb-3">
                <Col md={6}><strong>उप-मद का नाम:</strong> {currentDemand.sub_investment_name}</Col>
                <Col md={6}><strong>योजना का नाम:</strong> {currentDemand.scheme_name}</Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}><strong>DHO, कोटद्वार का कुल लक्ष्य:</strong> {currentDemand.allocated_quantity}</Col>
                <Col md={6}><strong>इकाई:</strong> {currentDemand.unit}</Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}><strong>कृषक विक्रय दर / अनुदान दर:</strong> {currentDemand.rate}</Col>
                <Col md={6}><strong>कुल राशि:</strong> {currentDemand.amount?.toLocaleString('hi-IN') || 0}</Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => handleCloseModal('view')}>बंद करें</Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => handleCloseModal('delete')}>
        <Modal.Header closeButton>
          <Modal.Title>डिमांड हटाने की पुष्टि</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p>क्या आप वाकई इस डिमांड को हटाना चाहते हैं?</p>
          {currentDemand && (
            <div className="border rounded p-3 bg-light">
              <p><strong>उप-मद का नाम:</strong> {currentDemand.sub_investment_name}</p>
              <p><strong>योजना का नाम:</strong> {currentDemand.scheme_name}</p>
              <p><strong>DHO, कोटद्वार का कुल लक्ष्य:</strong> {currentDemand.allocated_quantity}</p>
              <p><strong>इकाई:</strong> {currentDemand.unit}</p>
              <p><strong>कृषक विक्रय दर / अनुदान दर:</strong> {currentDemand.rate}</p>
            </div>
          )}
          <p className="text-danger mt-3"><strong>चेतावनी:</strong> यह कार्रवाई पूर्ववत नहीं की जा सकती है।</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => handleCloseModal('delete')}>रद्द करें</Button>
          <Button variant="danger" onClick={handleDeleteDemand} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Spinner as="span" animation="border" size="sm" /><span className="ms-2">हटाया जा रहा है...</span></>
            ) : (
              <><RiDeleteBinLine /> हटाएं</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Center Demand Modal */}
      <Modal show={showDeleteCenterDemandModal} onHide={() => { setShowDeleteCenterDemandModal(false); setCenterDemandToDelete(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>सेंटर डिमांड हटाने की पुष्टि</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p>क्या आप वाकई इस सेंटर डिमांड को हटाना चाहते हैं?</p>
          {centerDemandToDelete && (
            <div className="border rounded p-3 bg-light">
              <p><strong>सेंटर नाम:</strong> {centerDemandToDelete.center_name}</p>
              <p><strong>उप-मद का नाम:</strong> {centerDemandToDelete?.demand?.sub_investment_name}</p>
              <p><strong>मांगी गई मात्रा:</strong> {centerDemandToDelete.demanded_quantity}</p>
              <p><strong>कुल राशि:</strong> ₹{(centerDemandToDelete.demanded_quantity * (centerDemandToDelete?.demand?.rate || 0)).toFixed(2)}</p>
            </div>
          )}
          <p className="text-danger mt-3"><strong>चेतावनी:</strong> यह कार्रवाई पूर्ववत नहीं की जा सकती है।</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDeleteCenterDemandModal(false); setCenterDemandToDelete(null); }}>रद्द करें</Button>
          <Button variant="danger" onClick={handleDeleteCenterDemand} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Spinner as="span" animation="border" size="sm" /><span className="ms-2">हटाया जा रहा है...</span></>
            ) : (
              <><RiDeleteBinLine /> हटाएं</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remaining Centers Modal */}
      <Modal show={showRemainingCentersModal} onHide={() => setShowRemainingCentersModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>शेष/मेल न खाने वाले सेंटर (Remaining Centers)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {remainingCenters.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>सेंटर नाम (Center Name)</th>
                </tr>
              </thead>
              <tbody>
                {remainingCenters.map((center, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td><strong>{center}</strong></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info" className="mb-0 text-center">
              केंद्र फ़िल्टर के सभी सेंटर वर्तमान में टेबल में मौजूद हैं। (All centers from the filter are currently present in the table.)
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemainingCentersModal(false)}>
            बंद करें (Close)
          </Button>
        </Modal.Footer>
      </Modal>

    </>
  );
};

export default DemandView;