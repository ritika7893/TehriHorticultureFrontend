import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import UKSasan from "../../assets/images/UkSasan.png";
import "../../assets/css/topnavbar.css";
import { useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function DashBoardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleKendraPasswordReset = () => {
    navigate("/KendraPasswordReset");
  };

  // Helper arrays to check if a dropdown child is currently active
  const dataEntryRoutes = [
    "/Registration",
    "/KrishiRegistration",
    "/NurseryFinancialEntry",
    "/NurseryPhysicalEntry",
    "/UdyanBill",
    "/KishanBeej",
  ];
  const billRoutes = ["/Billing", "/AllBills"];

  return (
    <Navbar expand="lg" className="bg-body-tertiary Dash-header" fixed="top">
      <Container fluid>
        <Navbar.Brand as={Link} to="/Dashboard">
          <div className="dash-img d-flex justify-content-between mx-2">
            <img src={UKSasan} className="img-fluid" alt="UK Sasan" />
            <p>Tehri</p>
          </div>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Use as={NavLink} to let React Router handle active states and routing */}
            <Nav.Link as={NavLink} to="/MonthReport">
              MPR रिपोर्ट
            </Nav.Link>
            <Nav.Link as={NavLink} to="/Dashboard">
              MIS रिपोर्ट
            </Nav.Link>
            <Nav.Link as={NavLink} to="/AdminVetanMang">
              वेतन मांग
            </Nav.Link>

            <Nav.Link as={NavLink} to="/AdminMonthAttendance">
              मासिक उपस्थिति
            </Nav.Link>
            <Nav.Link as={NavLink} to="/AdminKishanAavedan">
              किसान आवेदन
            </Nav.Link>

            <Nav.Link as={NavLink} to="/MainDashboard">
              डैशबोर्ड
            </Nav.Link>

            <NavDropdown
              title="डेटा एंट्री"
              id="basic-nav-dropdown"
              active={dataEntryRoutes.includes(location.pathname)}
            >
              <NavDropdown.Item as={Link} to="/Registration">
                केंद्रवार एंट्री
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/KrishiRegistration">
                कृषक डेटा एंट्री
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/NurseryFinancialEntry">
                नर्सरी वित्तीय प्रविष्टि
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/NurseryPhysicalEntry">
                नर्सरी भौतिक प्रविष्टि
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/UdyanBill">
                उद्यान बिल
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/KishanBeej">
                किसान बीज
              </NavDropdown.Item>
            </NavDropdown>

          

            <NavDropdown
              title="डिमांड"
              id="demand-nav-dropdown"
              active={location.pathname === "/DemandView"}
            >
              <NavDropdown.Item as={Link} to="/DemandView">
                डिमांड देखें
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>

          <Nav className="ms-auto">
            <Nav.Link as={NavLink} to="/LibrarySystem">
              लाइब्रेरी सिस्टम
            </Nav.Link>
          </Nav>

          <Nav className="ms-auto">
            <NavDropdown title="खाता" id="account-nav-dropdown" align="end">
              <NavDropdown.Item onClick={handleKendraPasswordReset}>
                केंद्र पासवर्ड रीसेट
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>लॉगआउट</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default DashBoardHeader;
