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
           

<NavDropdown
              title="एंट्री"
              id="entry-nav-dropdown"
              style={{
                fontWeight:
                  isActive("/FruitReport") ||
                  isActive("/VegetableReport") ||
                  isActive("/SpicesReport") ||
                  isActive("/FlowerReport")
                    ? "bold"
                    : "normal",
              }}
            >
              <NavDropdown.Item
                active={isActive("/FruitReport")}
                onClick={() => navigate("/FruitReport")}
                style={{
                  fontWeight: isActive("/FruitReport")
                    ? "bold"
                    : "normal",
                }}
              >
                फल  रिपोर्ट
              </NavDropdown.Item>
              <NavDropdown.Item
                active={isActive("/FlowerReport")}
                onClick={() => navigate("/FlowerReport")}
                style={{
                  fontWeight: isActive("/FlowerReport")
                    ? "bold"
                    : "normal",
                }}
              >
                फूल  रिपोर्ट
              </NavDropdown.Item>
              <NavDropdown.Item
                active={isActive("/VegetableReport")}
                onClick={() => navigate("/VegetableReport")}
                style={{
                  fontWeight: isActive("/VegetableReport")
                    ? "bold"
                    : "normal",
                }}
              >
                सब्जी  रिपोर्ट
              </NavDropdown.Item>
              <NavDropdown.Item
                active={isActive("/SpicesReport")}
                onClick={() => navigate("/SpicesReport")}
                style={{
                  fontWeight: isActive("/SpicesReport")
                    ? "bold"
                    : "normal",
                }}
              >
                मसाला रिपोर्ट
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