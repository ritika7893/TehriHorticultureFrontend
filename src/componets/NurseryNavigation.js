import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import UKSasan from "../assets/images/UkSasan.png"
import "../assets/css/topnavbar.css"
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NurseryNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <Navbar expand="lg" className="bg-body-tertiary Dash-header" fixed="top">
      <Container fluid className=''>
        <Navbar.Brand href="#home">
          <div className='dash-img d-flex justify-content-between mx-2'>
            <img src={UKSasan} className='img-fluid'></img>
            <p>NURSERY PANEL</p>
          </div>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link
              active={isActive('/NurseryPhysicalEntry')}
              onClick={() => navigate('/NurseryPhysicalEntry')}
              style={{ 
                fontWeight: isActive('/NurseryPhysicalEntry') ? 'bold' : 'normal'
              }}
            >
              भौतिक प्रविष्टि
            </Nav.Link>
            <Nav.Link
              active={isActive('/NurseryFinancialEntry')}
              onClick={() => navigate('/NurseryFinancialEntry')}
              style={{ 
                fontWeight: isActive('/NurseryFinancialEntry') ? 'bold' : 'normal'
              }}
            >
              वित्तीय प्रविष्टि
            </Nav.Link>
          </Nav>
          <Nav className="ms-auto">
            <NavDropdown title="खाता" id="account-nav-dropdown" align="end">
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                लॉगआउट
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NurseryNavigation;
