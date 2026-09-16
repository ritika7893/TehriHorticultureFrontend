import React, { useState, useEffect } from "react";
import { Button, Col, Container, Row, Form, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../../assets/css/login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const username = searchParams.get('username'); // Get username from URL params
  
  // Determine if we're in forgot password or reset password mode
  const isResetMode = token ? true : false;
  
  const [formData, setFormData] = useState({
    identifier: "", 
    username: username || "", 
    new_password: "", 
    confirmPassword: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  // Verify token on component mount
  useEffect(() => {
    if (isResetMode && !token) {
      setTokenValid(false);
      setError("अमान्य रीसेट लिंक। कृपया पासवर्ड रीसेट करने के लिए फिर से अनुरोध करें।");
    }
  }, [token, isResetMode]);

  // Handle Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit handler for forgot password
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError("");
    setSuccess("");
    
    if (!formData.identifier) {
      setError("कृपया अपना ईमेल या उपयोगकर्ता नाम दर्ज करें!");
      return;
    }
    
    if (!formData.new_password) {
      setError("कृपया नया पासवर्ड दर्ज करें!");
      return;
    }
    
    if (!formData.confirmPassword) {
      setError("कृपया पासवर्ड की पुष्टि करें!");
      return;
    }
    
    if (formData.new_password !== formData.confirmPassword) {
      setError("पासवर्ड मेल नहीं खाते!");
      return;
    }
    
    if (formData.new_password.length < 8) {
      setError("पासवर्ड कम से कम 8 अक्षरों का होना चाहिए!");
      return;
    }
    
    setIsLoading(true);
    
    // Check if identifier is an email or username
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identifier);
    
    try {
      const response = await fetch("https://fe7959ee588b.ngrok-free.app/api/forget-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Send either email or username based on input
          ...(isEmail ? { email: formData.identifier } : { username: formData.identifier }),
          new_password: formData.new_password,
        }),
      });
      
      const data = await response.json();
      console.log("API Response:", data); // Debug log
      
      if (response.ok) {
       
        setSuccess("आपका पासवर्ड सफलतापूर्वक रीसेट कर दिया गया है। लॉगिन पेज पर रीडायरेक्ट हो रहे हैं...");
  
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        // Handle error response
        setError(data.message || "पासवर्ड रीसेट अनुरोध विफल। कृपया अपना ईमेल पता जांचें।");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("सर्वर से कनेक्ट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit handler for reset password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError("");
    setSuccess("");
    
    if (!formData.username || !formData.new_password || !formData.confirmPassword) {
      setError("कृपया सभी फ़ील्ड भरें");
      return;
    }
    
    if (formData.new_password !== formData.confirmPassword) {
      setError("पासवर्ड मेल नहीं खाते");
      return;
    }
    
    if (formData.new_password.length < 8) {
      setError("पासवर्ड कम से कम 8 अक्षरों का होना चाहिए");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("https://fe7959ee588b.ngrok-free.app/api/reset-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          new_password: formData.new_password,
        }),
      });
      
      const data = await response.json();
      console.log("API Response:", data); // Debug log
      
      if (response.ok) {
        setSuccess("आपका पासवर्ड सफलतापूर्वक रीसेट कर दिया गया है। लॉगिन पेज पर रीडायरेक्ट हो रहे हैं...");
        
        
        setTimeout(() => {
          navigate("/Login");
        }, 2000);
      } else {
        setError(data.message || "पासवर्ड रीसेट विफल। कृपया लिंक की समय सीमा समाप्त हो सकती है, फिर से कोशिश करें।");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("सर्वर से कनेक्ट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Container>
        <Row className="justify-content-center align-items-center">
          <Col md={10} lg={8} xl={6} className="mt-5">
            <div className="login-container shadow-lg">
              <Row className="g-0">
                <Col md={6} className="login-image d-none d-md-block">
                  <div className="image-overlay">
                    <h2>पासवर्ड रीसेट</h2>
                    <p>{isResetMode ? "अपना नया पासवर्ड सेट करें" : "अपना पासवर्ड रीसेट करने के लिए अपना ईमेल दर्ज करें"}</p>
                  </div>
                </Col>
                <Col md={6} className="p-4 p-md-5">
                  <div className="login-form">
                    <h3 className="mb-4 text-center">
                      {isResetMode ? "नया पासवर्ड सेट करें" : "पासवर्ड भूल गए?"}
                    </h3>
                    
                    {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
                    {success && <Alert variant="success" className="mb-4">{success}</Alert>}
                    
                    {isResetMode ? (
                      // Reset Password Form
                      tokenValid ? (
                        <Form onSubmit={handleResetSubmit}>
                          <Form.Group className="mb-3">
                            <Form.Label>उपयोगकर्ता नाम</Form.Label>
                            <Form.Control
                              type="text"
                              name="username"
                              placeholder="उपयोगकर्ता नाम दर्ज करें"
                              value={formData.username}
                              onChange={handleChange}
                              className="form-control-lg"
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>नया पासवर्ड</Form.Label>
                            <div className="password-input-container">
                              <Form.Control
                                type={showPassword ? "text" : "password"}
                                name="new_password"
                                placeholder="नया पासवर्ड दर्ज करें"
                                value={formData.new_password}
                                onChange={handleChange}
                                className="form-control-lg"
                                required
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                              >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </Form.Group>

                          <Form.Group className="mb-4">
                            <Form.Label>पासवर्ड की पुष्टि करें</Form.Label>
                            <div className="password-input-container">
                              <Form.Control
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="पासवर्ड दोबारा दर्ज करें"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="form-control-lg "
                                required
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label="Toggle password visibility"
                              >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </Form.Group>

                          <div className="text-center mb-4">
                            <Button 
                              type="submit" 
                              className="login-btn" 
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                  <span className="ms-2">रीसेट कर रहे हैं...</span>
                                </>
                              ) : (
                                "पासवर्ड रीसेट करें"
                              )}
                            </Button>
                          </div>
                          
                          <div className="text-center">
                            <p className="mb-0">
                              वापस लॉगिन पर? <Link to="/login" className="text-decoration-none">लॉगिन करें</Link>
                            </p>
                          </div>
                        </Form>
                      ) : (
                        <div className="text-center mb-4">
                          <p>कृपया पासवर्ड रीसेट करने के लिए फिर से अनुरोध करें।</p>
                          <Link to="/ForgotPassword" className="btn btn-primary">
                            पासवर्ड भूल गए?
                          </Link>
                        </div>
                      )
                    ) : (
                      // Forgot Password Form
                      <Form onSubmit={handleForgotSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>ईमेल या उपयोगकर्ता नाम</Form.Label>
                          <Form.Control
                            type="text"
                            name="identifier"
                            placeholder="ईमेल या उपयोगकर्ता नाम दर्ज करें"
                            value={formData.identifier}
                            onChange={handleChange}
                            className="form-control-lg"
                            required
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>नया पासवर्ड</Form.Label>
                          <div className="password-input-container">
                            <Form.Control
                              type={showPassword ? "text" : "password"}
                              name="new_password"
                              placeholder="नया पासवर्ड दर्ज करें"
                              value={formData.new_password}
                              onChange={handleChange}
                              className="form-control-lg"
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label="Toggle password visibility"
                            >
                              {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </Form.Group>

                        <Form.Group className="mb-4">
                          <Form.Label>पासवर्ड की पुष्टि करें</Form.Label>
                          <div className="password-input-container">
                            <Form.Control
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              placeholder="पासवर्ड दोबारा दर्ज करें"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              className="form-control-lg"
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              aria-label="Toggle password visibility"
                            >
                              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </Form.Group>

                        <div className="text-center mb-4">
                          <Button 
                            type="submit" 
                            className="login-btn" 
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">रीसेट कर रहे हैं...</span>
                              </>
                            ) : (
                              "पासवर्ड रीसेट करें"
                            )}
                          </Button>
                        </div>
                        
                        <div className="text-center">
                          <p className="mb-0">
                            वापस लॉगिन पर? <Link to="/" className="text-decoration-none">लॉगिन करें</Link>
                          </p>
                        </div>
                      </Form>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}