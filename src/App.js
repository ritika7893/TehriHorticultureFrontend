import "./App.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fontsource/poppins";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../src/custom/style.css";
import { Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./componets/ProtectedRoute";

import Home from "./componets/pages/Home";
import NavBar from "./componets/topnav/NavBar";
import DemandNavigation from "./componets/DemandNavigation";
import NurseryNavigation from "./componets/NurseryNavigation";
import Footer from "./componets/footer/Footer";
import Dashboard from "./componets/dash_board/Dashboard";
import Registration from "./componets/dash_board/Registration";
import KrishiRegistration from "./componets/dash_board/KrishiRegistration";
import MainDashboard from "./componets/dash_board/MainDashboard";
import Billing from "./componets/dash_board/Billing";
import AllBills from "./componets/dash_board/AllBills";
import MPR from "./componets/dash_board/MPR";
import AddEditComponent from "./componets/dash_board/AddEditComponent";
import ForgotPassword from "./componets/all_login/ForgotPassword";
import DemandGenerate from "./componets/DemandGenerate";
import DemandCenterwiseEntry from "./componets/DemandCenterwiseEntry";
import DemandKrishiwiseEntry from "./componets/DemandKrishiwiseEntry";
import { CenterProvider } from "./componets/all_login/CenterContext";
import KendraPasswordReset from "./componets/dash_board/KendraPasswordReset";
import DemandView from "./componets/dash_board/DemandView";
import NurseryFinancialEntry from "./componets/dash_board/NurseryFinancialEntry";
import NurseryPhysicalEntry from "./componets/dash_board/NurseryPhysicalEntry";
import { useAuth } from "./context/AuthContext";
import HorticultureManagementSystem from "./componets/dash_board/HorticultureManagementSystem";
import UdyanBill from "./componets/udhyan/UdyanBill";
import KishanBeej from "./componets/KishanBeej/KishanBeej";
import MonthAttendance from "./componets/KishanBeej/MonthAttendance";
import SeedFarmers from "./componets/Farmers/SeedFarmers";
import DashBoardHeader from "./componets/dash_board/DashBoardHeader";
import LibrarySystem from "./componets/Library/LibrarySystem";
import MonthReport from "./componets/MonthReport/MonthReport";
import KisanAavedanPortal from "./componets/kishanavedan/KisanAavedanPortal";
import GetViewLibrary from "./componets/GetViewLibrary";
import CenterUdyanBill from "./componets/udhyan/CenterUdyanBill";
import VetanMang from "./componets/VetanMang";
import AdminVetanMang from "./componets/dash_board/AdminVetanMang";
import AdminMonthAttendance from "./componets/dash_board/AdminMonthAttendance";
import AdminKishanAavedan from "./componets/KishanBeej/AdminKishanAavedan";

// Navbar wrapper component that uses useAuth (must be inside AuthProvider)
function NavbarWrapper() {
  const location = useLocation();
  const { user } = useAuth();

  const dashboardHeaderPaths = new Set([
    "/UdyanBill",
    "/KishanBeej",
    "/LibrarySystem",
    "/MonthReport",
    "/AdminVetanMang",
    "/AdminKishanAavedan"
  ]);
  const hiddenPaths = new Set([
    "/Dashboard",
    "/Registration",
    "/LibrarySystem",
    "/KrishiRegistration",
    "/MainDashboard",
    "/Billing",
    "/AllBills",
    "/MPR",
    "/AddEditComponent",
    "/DemandGenerate",
  
    "/DemandGenerate/CenterwiseEntry",
    "/DemandGenerate/KrishiwiseEntry",
    "/KendraPasswordReset",
    "/DemandView",
    "/NurseryFinancialEntry",
    "/NurseryPhysicalEntry",
    "/UdyanBill",
    "/KishanBeej",
    "/KisanAavedanPortal",
    "/GetViewLibrary",
    "/CenterUdyanBill",
    "/VetanMang",
    "/MonthAttendance",
    "/AdminKishanAavedan"
    
  ]);

  if (dashboardHeaderPaths.has(location.pathname) && user) {
    return <DashBoardHeader />;
  }

  if (!user) {
    return <NavBar />;
  }

  if (hiddenPaths.has(location.pathname)) {
    const loginType = user.loginType || "admin";

    if (loginType === "demand") {
      return <DemandNavigation />;
    }
    if (loginType === "nursery") {
      return <NurseryNavigation />;
    }
  }

  return <NavBar />;
}

// Main App content component
function AppContent() {
  const location = useLocation();

  return (
    <div className="app-container">
      <NavbarWrapper />

      <main className="main-content">
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Home />} />
          <Route path="/ForgotPassword" element={<ForgotPassword />} />

          {/* PROTECTED ROUTES */}
          <Route
            path="/Dashboard"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
  <Route
            path="/MonthReport"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <MonthReport />
              </ProtectedRoute>
            }
          />
  <Route
    path="/VetanMang"
    element={
      <ProtectedRoute allowedLoginTypes={["demand"]}>
        <VetanMang />
      </ProtectedRoute>
    }
  />
  <Route
    path="/AdminVetanMang"
    element={
      <ProtectedRoute allowedLoginTypes={["admin"]}>
        <AdminVetanMang />
      </ProtectedRoute>
    }
  />
  <Route
    path="/AdminMonthAttendance"
    element={
      <ProtectedRoute allowedLoginTypes={["admin"]}>
        <AdminMonthAttendance />
      </ProtectedRoute>
    }
  />
          <Route
            path="/Registration"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <Registration />
              </ProtectedRoute>
            }
          />
            <Route
            path="/AdminKishanAavedan"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <AdminKishanAavedan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/UdyanBill"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <UdyanBill />
              </ProtectedRoute>
            }
          />
          <Route
            path="/KishanBeej"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <KishanBeej />
              </ProtectedRoute>
            }
          />
          <Route
            path="/MonthAttendance"
            element={
              <ProtectedRoute allowedLoginTypes={["demand"]}>
                <MonthAttendance />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/LibrarySystem"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <LibrarySystem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/HorticultureManagementSystem"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <HorticultureManagementSystem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/SeedFarmers"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <SeedFarmers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/KisanAavedanPortal"
            element={
              <ProtectedRoute allowedLoginTypes={["admin", "demand"]}>
                <KisanAavedanPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/KrishiRegistration"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <KrishiRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/MainDashboard"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <MainDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Billing"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/AllBills"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <AllBills />
              </ProtectedRoute>
            }
          />
          <Route
            path="/MPR"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <MPR />
              </ProtectedRoute>
            }
          />
          <Route
            path="/AddEditComponent"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <AddEditComponent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/DemandGenerate"
            element={
              <ProtectedRoute allowedLoginTypes={["demand"]}>
                <DemandGenerate />
              </ProtectedRoute>
            }
          />
            <Route
            path="/CenterUdyanBill"
            element={
              <ProtectedRoute allowedLoginTypes={["demand"]}>
                <CenterUdyanBill />
              </ProtectedRoute>
            }
          />
          <Route
            path="/DemandGenerate/CenterwiseEntry"
            element={
              <ProtectedRoute allowedLoginTypes={["demand"]}>
                <DemandCenterwiseEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/DemandGenerate/KrishiwiseEntry"
            element={
              <ProtectedRoute allowedLoginTypes={["demand"]}>
                <DemandKrishiwiseEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/KendraPasswordReset"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <KendraPasswordReset />
              </ProtectedRoute>
            }
          />
          <Route
            path="/DemandView"
            element={
              <ProtectedRoute allowedLoginTypes={["admin"]}>
                <DemandView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/GetViewLibrary"
            element={
              <ProtectedRoute allowedLoginTypes={["admin", "demand"]}>
                <GetViewLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/NurseryFinancialEntry"
            element={
              <ProtectedRoute allowedLoginTypes={["admin", "nursery"]}>
                <NurseryFinancialEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/NurseryPhysicalEntry"
            element={
              <ProtectedRoute allowedLoginTypes={["admin", "nursery"]}>
                <NurseryPhysicalEntry />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {location.pathname !== "/KisanAavedanPortal" && <Footer />}
    </div>
  );
}

function App() {
  return (
    <CenterProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </CenterProvider>
  );
}

export default App;
