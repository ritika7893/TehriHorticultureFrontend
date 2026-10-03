import React from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import UKSasan from "../assets/images/UkSasan.png";
import "../assets/css/topnavbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCenter } from "./all_login/CenterContext";

const DemandNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { clearCenter } = useCenter();

  const handleLogout = () => {
    clearCenter();
    logout();
    navigate("/", { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <Navbar expand="lg" className="bg-body-tertiary Dash-header" fixed="top">
      <Container fluid>
        <Navbar.Brand href="#home">
          <div className="dash-img d-flex justify-content-between mx-2">
            <img src={UKSasan} className="img-fluid" alt="UK Sasan" />
            <p>CENTER PANEL</p>
          </div>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Standalone Link */}
            <Nav.Link
              active={isActive("/DemandGenerate")}
              onClick={() => navigate("/DemandGenerate")}
              style={{
                fontWeight: isActive("/DemandGenerate") ? "bold" : "normal",
              }}
            >
              डिमांड जनरेशन
            </Nav.Link>

            {/* First Dropdown: एंट्री */}
            <NavDropdown
              title="एंट्री"
              id="entry-nav-dropdown"
              style={{
                fontWeight:
                  isActive("/DemandGenerate/CenterwiseEntry") ||
                  isActive("/DemandGenerate/KrishiwiseEntry")
                    ? "bold"
                    : "normal",
              }}
            >
              <NavDropdown.Item
                active={isActive("/DemandGenerate/CenterwiseEntry")}
                onClick={() => navigate("/DemandGenerate/CenterwiseEntry")}
                style={{
                  fontWeight: isActive("/DemandGenerate/CenterwiseEntry")
                    ? "bold"
                    : "normal",
                }}
              >
                सेंटरवाइज एंट्री
              </NavDropdown.Item>
              <NavDropdown.Item
                active={isActive("/DemandGenerate/KrishiwiseEntry")}
                onClick={() => navigate("/DemandGenerate/KrishiwiseEntry")}
                style={{
                  fontWeight: isActive("/DemandGenerate/KrishiwiseEntry")
                    ? "bold"
                    : "normal",
                }}
              >
                कृषिवाइज एंट्री
              </NavDropdown.Item>
            </NavDropdown>

            {/* Second Dropdown: सेवाएं (Services) */}
           
          </Nav>

          {/* Account Dropdown */}
          <Nav className="ms-auto">
            <NavDropdown title="खाता" id="account-nav-dropdown" align="end">
              <NavDropdown.Item onClick={handleLogout}>लॉगआउट</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default DemandNavigation;