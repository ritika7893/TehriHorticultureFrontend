import React, { useState, useEffect } from "react";
import { Button, Col, Container, Row, Form, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLeaf, FaUser, FaLock, FaEnvelope, FaSignInAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "../../assets/css/login.css";
import { useCenter } from "./CenterContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const { setCenter } = useCenter(); // Use CenterContext

  // Kenra names for demand generate login
  const kenraNames = [
    "अखोरी",
    "अंजनीसैंण",
    "अच्चरीखूंट",
    "गाजा",
    "गर्केत",
    "घनसाली",
    "घुत्तू",
    "चम्बा",
    "जड़ीपानी",
    "जौनपुर",
    "टिहरी",
    "थत्यूड़",
    "थौलधार",
    "देवदर्शनी",
    "देवप्रयाग",
    "धनोल्टी",
    "नंदगांव",
    "नैनबाग",
    "नरेन्द्रनगर",
    "न्योली",
    "पंतवारी",
    "पवखाल",
    "पावकी देवी",
    "प्रतापनगर",
    "बौराड़ी",
    "बाचेलीखाल",
    "भवान",
    "भेदियाना",
    "भिलंगना",
    "मरौड़ा",
    "मुनि की रेती",
    "म्याणी",
    "राजाखेत",
    "लंबगांव",
    "लेसर",
    "वली",
    "श्रीकोट",
    "सबली",
    "हुलानाखाल",
    "हिंडोलाखाल",
    "हिसरियाखाल",
    "फकोट",
    "कमांद",
    "कोड़ी",
    "कुमाल्डा",
    "कीर्तिनगर",
    "छाम"
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
      const response = await fetch("https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api/login/", {
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
      const response = await fetch("https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api/login/", {
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
      const response = await fetch("https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api/login/", {
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
    <div className="uk-login-page">
    

      {/* ============ Main Split Layout ============ */}
      <div className="uk-login-main">
        <Container fluid className="px-0">
          <Row className="g-0 min-vh-100">
            {/* ===== LEFT: Hero with Mountain Background (60%) ===== */}
            <Col lg={7} md={6} className="uk-hero-section d-none d-lg-flex">
              <div className="hero-overlay">
                <div className="hero-content">
                  <h2 className="hero-title">हरित उत्तराखण्ड</h2>
                  <p className="hero-subtitle">समृद्ध किसान, सशक्त प्रदेश</p>
                  <div className="hero-divider"></div>
                  <p className="hero-description">
                    उद्यान, बागवानी एवं खाद्य प्रसंस्करण के माध्यम से
                    उत्तराखण्ड को आत्मनिर्भर और समृद्ध बनाने की दिशा में
                    हमारा प्रयास!
                  </p>
                </div>
              </div>
            </Col>

            {/* ===== RIGHT: Login Form Card (40%) ===== */}
            <Col lg={5} md={6} xs={12} className="uk-form-section">
              <div className="login-card-wrap">
                <div className="login-card">
                  {/* Sprout Icon + Heading */}
                  <div className="text-center mb-4">
                    <div className="leaf-icon-circle">
                      <FaLeaf />
                    </div>
                    <h3 className="login-title">लॉगिन</h3>
                    <p className="login-subtitle">अपने खाते में प्रवेश करें</p>
                  </div>

                  {/* Login Type Selector - native select prevents menu overlap */}
                  <Form.Group className="mb-3 login-type-group">
                    <Form.Label htmlFor="login-type-select">Login Type</Form.Label>
                    <Form.Select
                      id="login-type-select"
                      name="loginType"
                      value={loginType}
                      onChange={(e) => {
                        setLoginType(e.target.value);
                        setError("");
                        setSuccess("");
                        setShowPasswordChangeOption(false);
                      }}
                      className="form-control-lg uk-input login-type-select"
                      aria-label="Select login type"
                    >
                      <option value="regular">Admin Login</option>
                      <option value="demand">Center Login</option>
                      <option value="nursery">Nursery Login</option>
                    </Form.Select>
                  </Form.Group>

                  {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                  {success && <Alert variant="success" className="mb-3">{success}</Alert>}

                  {showPasswordChangeOption && (
                    <div className="text-center change-password mb-3">
                      <p onClick={handleChangePasswordClick}>Change Password</p>
                    </div>
                  )}

                  {/* ===== Regular Login Form ===== */}
                  {loginType === "regular" && (
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>ईमेल या उपयोगकर्ता नाम</Form.Label>
                        <div className="input-with-icon">
                          <FaEnvelope className="input-icon" />
                          <Form.Control
                            type="text"
                            name="identifier"
                            placeholder="ईमेल या उपयोगकर्ता नाम दर्ज करें"
                            value={formData.identifier}
                            onChange={handleChange}
                            className="form-control-lg uk-input"
                            required
                          />
                        </div>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>पासवर्ड</Form.Label>
                        <div className="password-input-container">
                          <FaLock className="input-icon input-icon-left" />
                          <Form.Control
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="पासवर्ड दर्ज करें"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-control-lg uk-input uk-input-password"
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
                        <p className="mb-0">
                          <Link to="/ForgotPassword" className="forgot-link">
                            पासवर्ड भूल गए?
                          </Link>
                        </p>
                      </div>

                      <div className="text-center">
                        <Button type="submit" className="login-btn w-100" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                              <span className="ms-2">लॉगिन हो रहे हैं...</span>
                            </>
                          ) : (
                            <>
                              <FaSignInAlt className="me-2" />
                              लॉगिन
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  )}

                  {/* ===== Demand Generate Login Form ===== */}
                  {loginType === "demand" && (
                    <Form onSubmit={handleDemandSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>उपयोगकर्ता नाम</Form.Label>
                        <Form.Select
                          name="username"
                          value={demandFormData.username}
                          onChange={handleDemandChange}
                          className="form-control-lg uk-input"
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
                          <FaLock className="input-icon input-icon-left" />
                          <Form.Control
                            type={showDemandPassword ? "text" : "password"}
                            name="password"
                            placeholder="पासवर्ड दर्ज करें"
                            value={demandFormData.password}
                            onChange={handleDemandChange}
                            className="form-control-lg uk-input uk-input-password"
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
                        <Button type="submit" className="login-btn w-100" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                              <span className="ms-2">लॉगिन हो रहे हैं...</span>
                            </>
                          ) : (
                            <>
                              <FaSignInAlt className="me-2" />
                              डिमांड लॉगिन
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  )}

                  {/* ===== Nursery Login Form ===== */}
                  {loginType === "nursery" && (
                    <Form onSubmit={handleNurserySubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>उपयोगकर्ता नाम</Form.Label>
                        <div className="input-with-icon">
                          <FaUser className="input-icon" />
                          <Form.Control
                            type="text"
                            name="username"
                            placeholder="उपयोगकर्ता नाम दर्ज करें"
                            value={nurseryFormData.username}
                            onChange={handleNurseryChange}
                            className="form-control-lg uk-input"
                            required
                          />
                        </div>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>पासवर्ड</Form.Label>
                        <div className="password-input-container">
                          <FaLock className="input-icon input-icon-left" />
                          <Form.Control
                            type={showNurseryPassword ? "text" : "password"}
                            name="password"
                            placeholder="पासवर्ड दर्ज करें"
                            value={nurseryFormData.password}
                            onChange={handleNurseryChange}
                            className="form-control-lg uk-input uk-input-password"
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
                        <Button type="submit" className="login-btn w-100" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                              <span className="ms-2">लॉगिन हो रहे हैं...</span>
                            </>
                          ) : (
                            <>
                              <FaSignInAlt className="me-2" />
                              नर्सरी लॉगिन
                            </>
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
      </div>
    </div>
  );
}