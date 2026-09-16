import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashBoardHeader from './DashBoardHeader';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const KendraPasswordReset = () => {
  const navigate = useNavigate();
  const [kendraList, setKendraList] = useState([]);
  const [selectedKendraId, setSelectedKendraId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  // Fetch kendra list on component mount
  useEffect(() => {
    const fetchKendraList = async () => {
      try {
        const response = await axios.get('https://mahadevaaya.com/govbillingsystem/backend/api/reguser-list/');
        setKendraList(response.data);
        setFetching(false);
      } catch (error) {
        console.error('Error fetching kendra list:', error);
        setMessage({ 
          type: 'danger', 
          text: 'Failed to fetch kendra list. Please try again.' 
        });
        setFetching(false);
      }
    };

    fetchKendraList();
  }, []);

  // Handle new password change
  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    // Clear backend password error while typing
    setErrors((prev) => ({ ...prev, password: "" }));

    // Local validation
    if (value.length < 8) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters long" }));
    }

    // Check confirm password match
    if (confirmPassword && value !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  // Handle confirm password change
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (value !== newPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  // Validate form before submit
  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedKendraId) newErrors.kendra = 'Please select a kendra';
    if (!newPassword) newErrors.password = 'Please enter a new password';
    else if (newPassword.length < 8) newErrors.password = 'Password must be at least 8 characters long';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    return newErrors;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.put(
        'https://mahadevaaya.com/govbillingsystem/backend/api/center-password-change/',
        { user_id: selectedKendraId, password: newPassword }
      );

      setMessage({ type: 'success', text: 'Password reset successfully!' });

      // Reset form
      setSelectedKendraId('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});

      // Optional: navigate after success
      // setTimeout(() => navigate('/MainDashboard'), 2000);

    } catch (error) {
      console.error('Error resetting password:', error);

      const backendMessage = error.response?.data?.message;

      // Handle same password error inline
      if (backendMessage?.toLowerCase().includes("same")) {
        setErrors((prev) => ({ ...prev, password: "New password cannot be the same as the old password" }));
      } else {
        setMessage({ type: 'danger', text: backendMessage || 'Failed to reset password. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DashBoardHeader />
      <Container className="py-4 container-view">
        <Row className="justify-content-center">
          <Col md={6}>
            <div className="card forgot-card">
              <div className="card-header reset-heading">
                <h4 className="mb-0">केंद्र पासवर्ड रीसेट</h4>
              </div>
              <div className="card-body">
                {message.text && (
                  <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                  </Alert>
                )}
                
                {fetching ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="kendraSelect">
                      <Form.Label className="reset-label">केंद्र चुनें (Select Kendra)</Form.Label>
                      <Form.Select
                        value={selectedKendraId}
                        onChange={(e) => setSelectedKendraId(e.target.value)}
                        isInvalid={!!errors.kendra}
                      >
                        <option value="">-- केंद्र चुनें --</option>
                        {kendraList.map((kendra) => (
                          <option key={kendra.user_id} value={kendra.user_id}>
                            {kendra.username} 
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.kendra}
                      </Form.Control.Feedback>
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="newPassword">
                      <Form.Label className="reset-label">नया पासवर्ड (New Password)</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={handleNewPasswordChange}
                          isInvalid={!!errors.password}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{ borderColor: errors.password ? '#dc3545' : '#ced4da' }}
                        >
                          {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                        <Form.Control.Feedback type="invalid">
                          {errors.password}
                        </Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="confirmPassword">
                      <Form.Label className="reset-label">पासवर्ड की पुष्टि करें (Confirm Password)</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          isInvalid={!!errors.confirmPassword}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{ borderColor: errors.confirmPassword ? '#dc3545' : '#ced4da' }}
                        >
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>
                    
                    <div className="d-flex justify-content-center mt-3 ">
                      <Button style={{ backgroundColor: '#0B488F', borderColor: '#0B488F', }}
                        className="btn btn-primary"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                            />
                            <span className="visually-hidden">Loading...</span>
                          </>
                        ) : (
                          'पासवर्ड रीसेट करें'
                        )}
                      </Button>
                    </div>
                  </Form>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default KendraPasswordReset;
