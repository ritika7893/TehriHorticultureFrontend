import React, { useState, useEffect } from "react";
import { Button, Col, Container, Row, Form, Alert, Spinner, Dropdown } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "../../assets/css/login.css";
import { useCenter } from "./CenterContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const { setCenter } = useCenter(); // Use CenterContext

  // Kenra names for demand generate login
  const kenraNames = [
    "कोटद्वार",
    "किनगोड़िखाल",
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
    "सिसल्ड़ी",
    "पौखाल",
    "सतपुली",
    "संगलाकोटी",
    "देवराजखाल",
    "पोखड़ा",
    "वेदीखाल",
    "विथ्याणी",
    "गंगाभोगपुर",
    "दिउली",
    "दुगड्डा",
    "सेंधीखाल"
  ];

  // Login type state
  const [loginType, setLoginType] = useState("regular"); // "regular", "demand" or "nursery"

  const [formData, setFormData] = useState({
    identifier: "", // This can be either email or username
    password: "",
  });

  // State for demand generate login
  const [demandFormData, setDemandFormData] = useState({
    username: "", // This will be the selected kendra name
    password: "",
  });

  // State for nursery login
  const [nurseryFormData, setNurseryFormData] = useState({
    username: "", // This will be the selected nursery name
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showDemandPassword, setShowDemandPassword] = useState(false);
  const [showNurseryPassword, setShowNurseryPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChangeOption, setShowPasswordChangeOption] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);
  const [isDemandLogin, setIsDemandLogin] = useState(false); // Track if it's a demand login

  // Handle navigation based on user authentication status
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        // Redirect based on loginType stored in auth user object
        if (user && user.loginType === 'demand') {
          navigate('/DemandGenerate/CenterwiseEntry', { replace: true });
        } else if (user && user.loginType === 'nursery') {
          navigate('/NurseryPhysicalEntry', { replace: true });
        } else {
          // Default to Dashboard for admin users
          navigate('/MonthReport', { replace: true });
        }
      }, 1500); // 1.5 second delay

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate, user]);

  // Handle Change for regular login
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Change for demand generate login
  const handleDemandChange = (e) => {
    setDemandFormData({ ...demandFormData, [e.target.name]: e.target.value });
  };

  // Handle Change for nursery login
  const handleNurseryChange = (e) => {
    setNurseryFormData({ ...nurseryFormData, [e.target.name]: e.target.value });
  };

  // Submit handler for regular login
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError("");
    setSuccess("");
    setShowPasswordChangeOption(false);
    setIsDemandLogin(false); // Reset demand login flag
    
    if (!formData.identifier || !formData.password) {
      setError("कृपया सभी आवश्यक फ़ील्ड भरें!");
      return;
    }
    
    setIsLoading(true);
   
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identifier);
    
    try {
      const response = await fetch("https://mahadevaaya.com/govbillingsystem/backend/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Send either email or username based on input
          ...(isEmail ? { email: formData.identifier } : { username: formData.identifier }),
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      console.log("API Response:", data); // Debug log
      
      // Check for password change requirement in either message or error field
      const passwordChangeMsg = data.message || data.error || "";
      const isPasswordChangeRequired = passwordChangeMsg === "You must change your default password before login";
      
      if (response.ok) {
        // Role validation for department login - only admin users can access
        if (!data.role || data.role !== "admin") {
          setError("केवल प्रशासक (Admin) उपयोगकर्ता ही विभाग लॉगिन में प्रवेश कर सकते हैं।");
          return;
        }

        if (isPasswordChangeRequired) {
          // Store user data for password change page
          setTempUserData({
            user_id: data.user_id,
            role: data.role,
            email: data.email || formData.identifier,
            username: data.username || (!isEmail ? formData.identifier : ""),
          });
          // Show the password change message and option
          setError(passwordChangeMsg);
          setShowPasswordChangeOption(true);
          return;
        }
        
        // Show success message
        setSuccess("लॉगिन सफलतापूर्वक पूर्ण हुआ!");
        
        // Call login with user data including role and loginType as admin
        login({
          user_id: data.user_id,
          role: data.role,
          email: data.email || formData.identifier, // Use email from response if available
          username: data.username || (!isEmail ? formData.identifier : ""), // Use username from response if available
          loginType: "admin", // Set loginType as admin to match the role
        });
      } else {
        // Handle error response
        if (isPasswordChangeRequired) {
          // Store user data for password change page
          setTempUserData({
            user_id: data.user_id,
            role: data.role,
            email: data.email || formData.identifier,
            username: data.username || (!isEmail ? formData.identifier : ""),
          });
          // Show the password change message and option
          setError(passwordChangeMsg);
          setShowPasswordChangeOption(true);
        } else {
          // Display the error message from API or default message
          setError(passwordChangeMsg || "लॉगिन विफल। कृपया अपने क्रेडेंशियल्स जांचें।");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("सर्वर से कनेक्ट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit handler for demand generate login
  const handleDemandSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError("");
    setSuccess("");
    
    if (!demandFormData.username || !demandFormData.password) {
      setError("कृपया सभी आवश्यक फ़ील्ड भरें!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("https://mahadevaaya.com/govbillingsystem/backend/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: demandFormData.username, // This will be the selected kendra name
          password: demandFormData.password,
        }),
      });
      
      const data = await response.json();
      console.log("Demand Login API Response:", data); // Debug log
      
      if (response.ok) {
        // Role validation for demand login - only center users can access
        if (data.role && data.role !== "center") {
          setError("केवल केंद्र उपयोगकर्ता ही यहाँ लॉगिन कर सकते हैं।");
          return;
        }

        // Show success message
        setSuccess("डिमांड लॉगिन सफलतापूर्वक पूर्ण हुआ!");
        
        // Set the demand login flag before calling login
        setIsDemandLogin(true);
        
        // Use CenterContext instead of localStorage
        setCenter(data.user_id, demandFormData.username);
        
        // Call login with user data including role and login type
        login({
          user_id: data.user_id,
          role: data.role,
          username: demandFormData.username, // This will be the selected kendra name
          loginType: "demand", // Add login type to distinguish
        });
      } else {
        // Display the error message from API or default message
        setError(data.message || data.error || "डिमांड लॉगिन विफल। कृपया अपने क्रेडेंशियल्स जांचें।");
      }
    } catch (err) {
      console.error("Demand login error:", err);
      setError("सर्वर से कनेक्ट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit handler for nursery login
  const handleNurserySubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError("");
    setSuccess("");
    
    if (!nurseryFormData.username || !nurseryFormData.password) {
      setError("कृपया सभी आवश्यक फ़ील्ड भरें!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("https://mahadevaaya.com/govbillingsystem/backend/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: nurseryFormData.username, // This will be the selected nursery name
          password: nurseryFormData.password,
        }),
      });
      
      const data = await response.json();
      console.log("Nursery Login API Response:", data); // Debug log
      
      if (response.ok) {
        // Role validation for nursery login - only nursery users can access
        if (data.role && data.role !== "nursery") {
          setError("केवल नर्सरी उपयोगकर्ता ही यहाँ लॉगिन कर सकते हैं।");
          return;
        }

        // Show success message
        setSuccess("नर्सरी लॉगिन सफलतापूर्वक पूर्ण हुआ!");
        
        // Call login with user data including role and login type
        login({
          user_id: data.user_id,
          role: data.role,
          username: nurseryFormData.username, // This will be the selected nursery name
          loginType: "nursery", // Add login type to distinguish
        });
      } else {
        // Display the error message from API or default message
        setError(data.message || data.error || "नर्सरी लॉगिन विफल। कृपया अपने क्रेडेंशियल्स जांचें।");
      }
    } catch (err) {
      console.error("Nursery login error:", err);
      setError("सर्वर से कनेक्ट करने में त्रुटि। कृपया बाद में पुन: प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change button click
  const handleChangePasswordClick = () => {
    // Store user data temporarily for the password change page
    localStorage.setItem('tempUserData', JSON.stringify(tempUserData));
    navigate("/ForgotPassword", { replace: true });
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
                    <h2>स्वागत है</h2>
                    <p>कृपया अपने खाते में लॉगिन करें</p>
                  </div>
                </Col>
                <Col md={6} className="p-4 p-md-5">
                  <div className="login-form">
                    <h3 className="mb-4 text-center">लॉगिन</h3>
                    
                    {/* Login Type Selector */}
                    <div className="mb-4">
                      <Dropdown className="w-100">
                        <Dropdown.Toggle variant="outline-secondary" id="login-type-dropdown" className="w-100">
                          {loginType === "regular" ? "Admin Login" : loginType === "demand" ? "Center Login" : "Nursery Login"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="w-100">
                          <Dropdown.Item onClick={() => setLoginType("regular")}>Admin Login</Dropdown.Item>
                          <Dropdown.Item onClick={() => setLoginType("demand")}>Center Login</Dropdown.Item>
                          <Dropdown.Item onClick={() => setLoginType("nursery")}>Nursery Login</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    
                    {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
                    {success && <Alert variant="success" className="mb-4">{success}</Alert>}
                    
                    {showPasswordChangeOption && (
                      <div className="text-center change-password mb-4">
                        <p 
                          onClick={handleChangePasswordClick}
                        >
                          Change Password
                        </p>
                      </div>
                    )}
                    
                    {/* Regular Login Form */}
                    {loginType === "regular" && (
                      <Form onSubmit={handleSubmit}>
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
                          <Form.Label>पासवर्ड</Form.Label>
                          <div className="password-input-container">
                            <Form.Control
                              type={showPassword ? "text" : "password"}
                              name="password"
                              placeholder="पासवर्ड दर्ज करें"
                              value={formData.password}
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

                        <div className="d-flex justify-content-between align-items-center forget-btn mb-4">
                          <Form.Check
                            type="checkbox"
                            id="remember-me"
                            label="मुझे याद रखें"
                            className="remember-me"
                          />
                          {/* <p className="mb-0">
                            <Link to="/ForgotPassword" className="text-decoration-none">
                              पासवर्ड भूल गए?
                            </Link>
                          </p> */}
                        </div>
                        <div className="text-center">
                          <Button 
                            type="submit" 
                            className="login-btn" 
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">लॉगिन हो रहे हैं...</span>
                              </>
                            ) : (
                              "लॉगिन"
                            )}
                          </Button>
                        </div>
                      </Form>
                    )}
                    
                    {/* Demand Generate Login Form */}
                    {loginType === "demand" && (
                      <Form onSubmit={handleDemandSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>उपयोगकर्ता नाम</Form.Label>
                          <Form.Select
                            name="username"
                            value={demandFormData.username}
                            onChange={handleDemandChange}
                            className="form-control-lg"
                            required
                          >
                            <option value="">केन्द्र नाम चुनें</option>
                            {kenraNames.map((name, index) => (
                              <option key={index} value={name}>{name}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>पासवर्ड</Form.Label>
                          <div className="password-input-container">
                            <Form.Control
                              type={showDemandPassword ? "text" : "password"}
                              name="password"
                              placeholder="पासवर्ड दर्ज करें"
                              value={demandFormData.password}
                              onChange={handleDemandChange}
                              className="form-control-lg"
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowDemandPassword(!showDemandPassword)}
                              aria-label="Toggle password visibility"
                            >
                              {showDemandPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </Form.Group>

                        <div className="text-center">
                          <Button 
                            type="submit" 
                            className="login-btn" 
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">लॉगिन हो रहे हैं...</span>
                              </>
                            ) : (
                              "डिमांड लॉगिन"
                            )}
                          </Button>
                        </div>
                      </Form>
                    )}

                    {/* Nursery Login Form */}
                    {loginType === "nursery" && (
                      <Form onSubmit={handleNurserySubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>उपयोगकर्ता नाम</Form.Label>
                          <Form.Control
                            type="text"
                            name="username"
                            placeholder="उपयोगकर्ता नाम दर्ज करें"
                            value={nurseryFormData.username}
                            onChange={handleNurseryChange}
                            className="form-control-lg"
                            required
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>पासवर्ड</Form.Label>
                          <div className="password-input-container">
                            <Form.Control
                              type={showNurseryPassword ? "text" : "password"}
                              name="password"
                              placeholder="पासवर्ड दर्ज करें"
                              value={nurseryFormData.password}
                              onChange={handleNurseryChange}
                              className="form-control-lg"
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowNurseryPassword(!showNurseryPassword)}
                              aria-label="Toggle password visibility"
                            >
                              {showNurseryPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </Form.Group>

                        <div className="text-center">
                          <Button 
                            type="submit" 
                            className="login-btn" 
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">लॉगिन हो रहे हैं...</span>
                              </>
                            ) : (
                              "नर्सरी लॉगिन"
                            )}
                          </Button>
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