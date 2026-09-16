import React, { useEffect, useState } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import UkSasan from "../../assets/images/UkSasan.png";
import { Link } from "react-router-dom";
import "../../assets/css/NavBar.css";
import axios from "axios";

function NavBar() {
  const [expanded, setExpanded] = useState(false);

  const closeMenu = () => setExpanded(false);
  const [, setShowCareer] = useState(false);
  // useEffect(() => {
  //   const fetchJobOpenings = async () => {
  //     try {
  //       const res = await axios.get(
  //         "https://mahadevaaya.com/brainrock.in/brainrock/backendbr/api/job-opening/"
  //       );

  //       if (Array.isArray(res.data) && res.data.length > 0) {
  //         // Check if at least one job is NOT closed
  //         const hasOpenJob = res.data.some((job) => {
  //           const status = job.status?.toLowerCase(); // safe check
  //           return status !== "closed";
  //         });

  //         setShowCareer(hasOpenJob);
  //       } else {
  //         setShowCareer(false);
  //       }
  //     } catch (error) {
  //       setShowCareer(false);
  //     }
  //   };

  //   fetchJobOpenings();
  // }, []);

  return (
    <>
      <Navbar
        sticky="top"
        expand="lg"
        expanded={expanded}
        className="bg-body-tertiary navbar-top awc-main justify-content-between"
      >
        <Container fluid className="container-fluid awc-mob-responsive">
          <Link to="/" className="logo-page" onClick={closeMenu}>
            <img src={UkSasan} alt="logo" className="logo-wecd" />
          </Link>

          <div>
            <div className="awc-title">
              <span className="awc-subtitle">
                <span className="br-span">
                  उद्यान एंव खाद्य प्रसंस्करण विभाग,{" "}
                </span>{" "}
                उत्तराखण्ड
              </span>
              <span className="br-span">
                कार्यालय-उद्यान विशेषज्ञ कोटद्वार गढ़वाल
              </span>
            </div>
          </div>

          <Navbar.Toggle
            aria-controls="basic-navbar-nav"
            className="toggle-logo"
            onClick={() => setExpanded(expanded ? false : true)}
          />

          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto justify-content-end flex-grow-1 nd-nav"></Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default NavBar;
