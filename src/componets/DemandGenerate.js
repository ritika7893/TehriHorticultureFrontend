import React, { useEffect, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Alert,
  Spinner,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCenter } from './all_login/CenterContext';
import { useAuth } from '../context/AuthContext';
import { RiAddLine } from 'react-icons/ri';
import DemandNavigation from './DemandNavigation';

const API_BASE = 'https://mahadevaaya.com/govbillingsystem/backend/api';

const DemandGenerate = () => {
  const navigate = useNavigate();
  const { centerData, clearCenter } = useCenter();
  const { logout } = useAuth();

  const [demands, setDemands] = useState([]);
  const [centerDemands, setCenterDemands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [centerLoading, setCenterLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for inline editing
  const [editingId, setEditingId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [editingDemandByCenter, setEditingDemandByCenter] = useState(null);

  /* 🔐 Auth check */
  useEffect(() => {
    if (!centerData.isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [centerData.isLoggedIn, navigate]);

  /* 📥 GET demand-generation */
  const fetchDemands = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/demand-generation/`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDemands(data);
    } catch {
      setError('डिमांड लाने में त्रुटि');
    } finally {
      setLoading(false);
    }
  };

  /* 📥 GET demand-by-center */
  const fetchCenterDemands = async () => {
    setCenterLoading(true);
    try {
      const res = await fetch(`${API_BASE}/demand-by-center/`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCenterDemands(data);
    } catch {
      console.error('सेंटर डिमांड लाने में त्रुटि');
    } finally {
      setCenterLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
    fetchCenterDemands();
  }, []);

  // Custom onChange handler for real-time validation
  const handleDemandedQuantityChange = (e, maxQuantity) => {
    const value = parseFloat(e.target.value) || 0;
    const maxQty = parseFloat(maxQuantity) || 0;

    if (value > maxQty) {
      setValidationError(
        `मांगी गई मात्रा (${value}) DHO, कोटद्वार का कुल लक्ष्य (${maxQty}) से अधिक नहीं हो सकती`
      );
      return;
    }
    setValidationError('');
    setEditingQuantity(e.target.value);
  };

  /* 📤 POST demand-by-center */
  const handleSaveDemand = async (demandId, allocatedQuantity) => {
    if (!editingQuantity || parseFloat(editingQuantity) <= 0) {
      setValidationError('कृपया सही मात्रा दर्ज करें');
      return;
    }
    if (parseFloat(editingQuantity) > parseFloat(allocatedQuantity)) {
      setValidationError(
        `मांगी गई मात्रा DHO, कोटद्वार का कुल लक्ष्य (${allocatedQuantity}) से कम होनी चाहिए`
      );
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setValidationError('');

    const payload = {
      demand_id: demandId,
      center_name: centerData.centerName,
      demanded_quantity: parseFloat(editingQuantity),
    };

    try {
      const res = await fetch(`${API_BASE}/demand-by-center/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();

      setSuccess('डिमांड सफलतापूर्वक सेव की गई');
      setEditingId(null);
      setEditingQuantity('');
      await fetchCenterDemands();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('डिमांड सेव करने में त्रुटि');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* 📤 PUT demand-by-center - Edit existing demand */
  const handleEditDemand = async (demandByCenterId, allocatedQuantity) => {
    if (!demandByCenterId) {
      setValidationError('रिकॉर्ड नहीं मिला');
      return;
    }
    if (!editingQuantity || parseFloat(editingQuantity) <= 0) {
      setValidationError('कृपया सही मात्रा दर्ज करें');
      return;
    }
    if (parseFloat(editingQuantity) > parseFloat(allocatedQuantity)) {
      setValidationError(
        `मांगी गई मात्रा DHO, कोटद्वार का कुल लक्ष्य (${allocatedQuantity}) से कम होनी चाहिए`
      );
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setValidationError('');

    const payload = {
      id: demandByCenterId,
      demanded_quantity: parseFloat(editingQuantity),
    };

    try {
      const res = await fetch(`${API_BASE}/demand-by-center/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();

      setSuccess('डिमांड सफलतापूर्वक अपडेट की गई');
      setEditingDemandByCenter(null);
      setEditingQuantity('');
      await fetchCenterDemands();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('डिमांड अपडेट करने में त्रुटि');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* 🚪 Logout */
  const handleLogout = () => {
    clearCenter();
    logout();
    navigate('/', { replace: true });
  };

  // Get the full demand-by-center record
  const getDemandByCenterRecord = (demandId) => {
    return centerDemands.find(
      (cd) => cd.demand_id === demandId && cd.center_name === centerData.centerName
    );
  };

  // Get demanded quantity for a specific demand_id
  const getDemandedQuantity = (demandId) => {
    const record = getDemandByCenterRecord(demandId);
    return record ? record.demanded_quantity : null;
  };

  // Start editing a NEW demand
  const startEditing = (demandId) => {
    setEditingId(demandId);
    setEditingQuantity('');
    setValidationError('');
  };

  // Start editing an EXISTING demand-by-center record
  const startEditingDemandByCenter = (record) => {
    if (!record) return;
    
    // Prevent editing if 3 days have passed
    if (isEditingDisabled(record.created_at)) {
      setValidationError('3 दिन के बाद संपादन अक्षम है।');
      setTimeout(() => setValidationError(''), 3000);
      return;
    }

    setEditingDemandByCenter(record.id);
    setEditingQuantity(record.demanded_quantity || '');
    setValidationError('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingQuantity('');
    setValidationError('');
    setEditingDemandByCenter(null);
  };

  // Calculate demanded amount (rate * demanded quantity)
  const calculateDemandedAmount = (rate, demandedQuantity) => {
    if (!rate || !demandedQuantity) return 0;
    return (parseFloat(rate) * parseFloat(demandedQuantity)).toFixed(2);
  };

  // Check if editing is disabled (after 3 days from created_at)
  const isEditingDisabled = (createdAt) => {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const diffTime = currentDate - createdDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  };

  /* ========= Render: Demanded Quantity Cell ========= */
  const renderDemandedQuantityCell = (d) => {
    const record = getDemandByCenterRecord(d.demand_id);
    const recordId = record?.id;
    const demandedQty = record ? record.demanded_quantity : null;
    const isEditing = editingId === d.demand_id;
    const isEditingExisting = editingDemandByCenter === recordId;
    const editingDisabled = isEditingDisabled(record?.created_at);

    // Case 1: Editing period expired (Fallback safety check)
    if ((isEditing || isEditingExisting) && editingDisabled) {
      return (
        <div className="d-flex align-items-center gap-2">
          <span className="text-danger">संपादन अवधि समाप्त</span>
        </div>
      );
    }

    // Case 2: Currently editing a NEW demand
    if (isEditing) {
      return (
        <div>
          <div className="d-flex align-items-center mb-2">
            <Form.Control
              type="number"
              step="0.01"
              value={editingQuantity}
              onChange={(e) => handleDemandedQuantityChange(e, d.allocated_quantity)}
              placeholder="मात्रा"
              className="me-2"
              isInvalid={!!validationError}
              max={d.allocated_quantity}
              size="sm"
            />
            <Button
              size="sm"
              onClick={() => handleSaveDemand(d.demand_id, d.allocated_quantity)}
              disabled={isSubmitting || !!validationError}
              style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}
            >
              {isSubmitting ? <Spinner animation="border" size="sm" /> : (
                <>सबमिट <RiAddLine /></>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelEditing}
              className="ms-1"
            >
              ✕
            </Button>
          </div>
          {validationError && (
            <Form.Control.Feedback type="invalid" className="d-block">
              {validationError}
            </Form.Control.Feedback>
          )}
          <Form.Text className="text-muted small">
            अधिकतम: {d.allocated_quantity}
          </Form.Text>
        </div>
      );
    }

    // Case 3: Currently editing an EXISTING demand
    if (isEditingExisting && recordId) {
      return (
        <div className="d-flex align-items-center gap-2 flex-wrap w-100">
          <Form.Control
            type="number"
            step="0.01"
            value={editingQuantity}
            onChange={(e) => handleDemandedQuantityChange(e, d.allocated_quantity)}
            placeholder="मात्रा"
            isInvalid={!!validationError}
            max={d.allocated_quantity}
            size="sm"
            style={{ width: '100px' }}
          />
          <Button
            size="sm"
            onClick={() => handleEditDemand(recordId, d.allocated_quantity)}
            disabled={isSubmitting || !!validationError}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            {isSubmitting ? <Spinner animation="border" size="sm" /> : '✓'}
          </Button>
          <Button variant="secondary" size="sm" onClick={cancelEditing}>
            ✕
          </Button>
          {validationError && (
            <Form.Control.Feedback type="invalid" className="d-block w-100">
              {validationError}
            </Form.Control.Feedback>
          )}
        </div>
      );
    }

    // Case 4: Existing demand (view mode) - Checking 3 days validation
    if (demandedQty) {
      return (
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span className="text-success fw-bold">{demandedQty}</span>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => startEditingDemandByCenter(record)}
              title={editingDisabled ? '3 दिन के बाद संपादन अक्षम है' : 'संपादित करें'}
              disabled={editingDisabled}
            >
              ✎
            </Button>
          </div>
          {editingDisabled ? (
            <div className="text-danger small" style={{ fontSize: '0.7rem' }}>
              3 दिन के बाद संपादन अक्षम है
            </div>
          ) : (
            <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
              आप 3 दिन के भीतर संपादित कर सकते हैं
            </div>
          )}
        </div>
      );
    }

    // Case 5: No demand yet (add mode)
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="text-muted me-2">-</span>
        <Button
          size="sm"
          onClick={() => startEditing(d.demand_id)}
          style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}
        >
          <RiAddLine />
        </Button>
      </div>
    );
  };

  /* ========= Render: Total Amount Cell ========= */
  const renderAmountCell = (d) => {
    const demandedQty = getDemandedQuantity(d.demand_id);
    const isEditing = editingId === d.demand_id;
    const tempAmount =
      isEditing && editingQuantity ? calculateDemandedAmount(d.rate, editingQuantity) : null;

    if (isEditing && tempAmount) {
      return <span className="text-primary fw-bold">₹{tempAmount}</span>;
    }
    if (demandedQty) {
      return (
        <span className="text-info fw-bold">
          ₹{calculateDemandedAmount(d.rate, demandedQty)}
        </span>
      );
    }
    return <span className="text-muted">-</span>;
  };

  return (
    <Container fluid className="px-3" style={{ paddingTop: '60px' }}>
      <div className="mb-3">
        <DemandNavigation />
      </div>

      <Row className="mb-3">
        <Col>
          <div
            className="p-3 rounded shadow-sm"
            style={{ backgroundColor: '#2a4682', color: 'white' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 fw-bold">डिमांड जनरेशन</h5>
                <small className="opacity-75">{centerData.centerName}</small>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* 📋 Demand List */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header
              className="py-2"
              style={{ backgroundColor: '#0d9488', color: 'white' }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">सभी डिमांड</span>
                <span className="badge bg-light text-primary">
                  {demands.length} आइटम
                </span>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" style={{ color: '#0d9488' }} />
                </div>
              ) : (
                <div className="table-responsive">
                  <Table bordered striped hover responsive className="mb-0 table-sm">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: '50px' }}>क्र.सं.</th>
                        <th>उप-मद का नाम</th>
                        <th className="text-nowrap">इकाई</th>
                        <th className="text-nowrap">कुल लक्ष्य</th>
                        <th className="text-nowrap">कृषक विक्रय दर / अनुदान दर</th>
                        <th className="text-nowrap">राशि</th>
                        <th className="text-nowrap">योजना का नाम</th>
                        <th className="text-nowrap">मांगी गई मात्रा</th>
                        <th className="text-nowrap">कूल राशि</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demands.length > 0 ? (
                        demands.map((d, index) => (
                          <tr key={d.id}>
                            <td className="text-center text-muted">{index + 1}</td>
                            <td className="text-nowrap">{d.sub_investment_name}</td>
                            <td>
                              <span
                                className="badge"
                                style={{ backgroundColor: '#6b7280', color: 'white' }}
                              >
                                {d.unit || 'नग'}
                              </span>
                            </td>
                            <td className="text-nowrap">{d.allocated_quantity}</td>
                            <td className="text-nowrap">₹{d.rate}</td>
                            <td className="text-nowrap">₹{d.amount}</td>
                            <td className="text-nowrap">{d.scheme_name || '-'}</td>
                            <td style={{ minWidth: '180px' }}>
                              {renderDemandedQuantityCell(d)}
                            </td>
                            <td className="text-nowrap">{renderAmountCell(d)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="text-center py-4 text-muted">
                            कोई डाटा नहीं
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DemandGenerate;