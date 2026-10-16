import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Row, Spinner, Table } from "react-bootstrap";
import DashBoardHeader from "./DashBoardHeader";

const API_BASE = "https://dhotehri.in/tehrihorticulture/tehrihorticulture_backend/api/";

const CATEGORY_CONFIG = {
  vegetables: { label: "Vegetables", url: "vegetable-monthly-report/", item: "vegetable", color: "#2e8b57", areaField: "current_month_sown_area", damageField: "total_damaged_area", prodField: "current_month_production" },
  fruits: { label: "Fruits", url: "fruit-monthly-report/", item: "fruit", color: "#e38b2c", areaField: "current_month_planted_area", damageField: "damaged_area", prodField: "current_month_production" },
  spices: { label: "Spices", url: "spice-monthly-report/", item: "spice", color: "#9a5b35", areaField: "current_month_sown_area", damageField: "damaged_area", prodField: "current_month_production" },
  flowers: { label: "Flowers", url: "flower-monthly-report/", item: "flower", color: "#a34d9b", areaField: "current_month_sown_area", damageField: "damaged_area", prodField: null },
};

const number = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const display = (value) => value === null || value === undefined || value === "" ? "-" : value;
const fmt = (value) => number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const uniqueSorted = (records, key) => [...new Set(records.map((row) => row[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

const AdminPlaceReport = ({ category }) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.vegetables;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [place, setPlace] = useState("");
  const [month, setMonth] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("center_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}${config.url}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? [payload] : [];
      setReports(rows);
      setLoading(false);
    } catch (error) {
      setErrors([`${config.label}: ${error.message || "Unable to load report"}`]);
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const allRecords = useMemo(() => reports.map((record) => ({ ...record, _category: category, _categoryLabel: config.label, _item: record[config.item] })), [reports, category, config]);

  const places = useMemo(() => uniqueSorted(allRecords, "center_name"), [allRecords]);
  const months = useMemo(() => uniqueSorted(allRecords, "month"), [allRecords]);
  const years = useMemo(() => uniqueSorted(allRecords, "financial_year"), [allRecords]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return allRecords.filter((row) =>
      (!place || row.center_name === place) &&
      (!month || row.month === month) &&
      (!financialYear || row.financial_year === financialYear) &&
      (!query || [row.center_name, row._item, row.month, row.financial_year, row.remarks].some((value) => String(value || "").toLocaleLowerCase().includes(query)))
    );
  }, [allRecords, place, month, financialYear, search]);

  useEffect(() => { setPage(1); }, [place, month, financialYear, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const left = a[sortKey] ?? a._item ?? "";
    const right = b[sortKey] ?? b._item ?? "";
    const numeric = Number(left) - Number(right);
    const comparison = left !== "" && right !== "" && Number.isFinite(numeric) && String(left).trim() !== "" && String(right).trim() !== "" ? numeric : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  }), [filtered, sortKey, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visibleRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const inScope = reports.filter((row) => (!place || row.center_name === place) && (!month || row.month === month) && (!financialYear || row.financial_year === financialYear));
  const areaTotal = inScope.reduce((total, row) => total + number(row[config.areaField]), 0);
  const damagedTotal = inScope.reduce((total, row) => total + number(row[config.damageField]), 0);
  const productionTotal = config.prodField ? inScope.reduce((total, row) => total + number(row[config.prodField]), 0) : 0;
  const distinctPlaces = new Set(inScope.map((row) => row.center_name).filter(Boolean)).size;

  const resetFilters = () => { setPlace(""); setMonth(""); setFinancialYear(""); setSearch(""); setPage(1); };
  const sortBy = (key) => { if (sortKey === key) setSortDirection((d) => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } };
  const sortLabel = (key) => sortKey === key ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  const commonColumns = [{ key: "center_name", label: "Place" }, { key: "_item", label: "Reported item" }, { key: "month", label: "Month" }, { key: "financial_year", label: "Financial year" }];
  const columns = useMemo(() => {
    if (category === "vegetables") return [...commonColumns, { key: "current_month_sown_area", label: "Sown area" }, { key: "previous_month_total_sown_area", label: "Previous total area" }, { key: "total_damaged_area", label: "Damaged area" }, { key: "current_month_production", label: "Current production" }, { key: "previous_month_total_production", label: "Previous production" }, { key: "remarks", label: "Remarks" }];
    if (category === "fruits") return [...commonColumns, { key: "current_month_planted_area", label: "Planted area" }, { key: "previous_month_total_area", label: "Previous total area" }, { key: "damaged_area", label: "Damaged area" }, { key: "current_month_production", label: "Current production" }, { key: "previous_month_production", label: "Previous production" }, { key: "remarks", label: "Remarks" }];
    if (category === "spices") return [...commonColumns, { key: "current_month_sown_area", label: "Sown area" }, { key: "previous_month_sown_area", label: "Previous sown area" }, { key: "damaged_area", label: "Damaged area" }, { key: "current_month_production", label: "Current production" }, { key: "previous_month_production", label: "Previous production" }, { key: "remarks", label: "Remarks" }];
    return [...commonColumns, { key: "current_month_sown_area", label: "Sown area" }, { key: "previous_month_sown_area", label: "Previous sown area" }, { key: "damaged_area", label: "Damaged area" }, { key: "current_month_spike_or_cut_flower_production", label: "Spike/cut production" }, { key: "current_month_loose_flower_production", label: "Loose flower production" }, { key: "previous_year_total_covered_area", label: "Previous covered area" }, { key: "remarks", label: "Remarks" }];
  }, [category]);

  const renderCell = (row, column) => {
    const value = column.key === "_item" ? row._item : row[column.key];
    return column.key === "remarks" || ["center_name", "month", "financial_year", "_item"].includes(column.key) ? display(value) : value === null || value === undefined || value === "" ? "-" : fmt(value);
  };

  return (
    <div className="horticulture-dashboard">
      <DashBoardHeader />
      <Container fluid className="py-4 px-3 px-lg-4">
        <div className="horticulture-heading d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div><div className="horticulture-eyebrow">TEHRI GARHWAL - ADMIN {config.label.toUpperCase()} REPORT</div><h1>{config.label} Admin Report</h1><p>View {config.label.toLowerCase()} cultivation and production data by place, month, and financial year.</p></div>
          <Button variant="outline-success" onClick={loadReports} disabled={loading}>{loading ? <Spinner size="sm" animation="border" className="me-2" /> : "Refresh"}Refresh data</Button>
        </div>
        {errors.map((error) => <Alert key={error} variant="warning" dismissible onClose={() => setErrors((items) => items.filter((item) => item !== error))}>{error}</Alert>)}

        <Card className="horticulture-filter-card mb-4"><Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} lg={3}><Form.Label>Place / Center</Form.Label><Form.Select value={place} onChange={(e) => setPlace(e.target.value)}><option value="">All places</option>{places.map((value) => <option key={value}>{value}</option>)}</Form.Select></Col>
            <Col xs={12} sm={6} lg={2}><Form.Label>Month</Form.Label><Form.Select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">All months</option>{months.map((value) => <option key={value}>{value}</option>)}</Form.Select></Col>
            <Col xs={12} sm={6} lg={2}><Form.Label>Financial year</Form.Label><Form.Select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}><option value="">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</Form.Select></Col>
            <Col xs={12} sm={8} lg={3}><Form.Label>Search records</Form.Label><Form.Control value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Place, item, month, remarks..." /></Col>
            <Col xs={12} sm={4} lg={2}><Button className="w-100" variant="light" onClick={resetFilters}>Reset filters</Button></Col>
          </Row>
        </Card.Body></Card>

        <Row className="g-3 mb-4">
          <Col xs={6} xl><Card className="horticulture-stat"><Card.Body><div className="stat-label">REPORT RECORDS</div><div className="stat-value">{filtered.length.toLocaleString("en-IN")}</div><div className="stat-note">Matching selected place</div></Card.Body></Card></Col>
          <Col xs={6} xl><Card className="horticulture-stat"><Card.Body><div className="stat-label">CURRENT AREA</div><div className="stat-value">{fmt(areaTotal)}</div><div className="stat-note">Area units</div></Card.Body></Card></Col>
          <Col xs={6} xl><Card className="horticulture-stat"><Card.Body><div className="stat-label">DAMAGED AREA</div><div className="stat-value">{fmt(damagedTotal)}</div><div className="stat-note">Area units</div></Card.Body></Card></Col>
          <Col xs={6} xl><Card className="horticulture-stat"><Card.Body><div className="stat-label">CURRENT PRODUCTION</div><div className="stat-value">{category === "flowers" ? "N/A" : fmt(productionTotal)}</div><div className="stat-note">Flowers shown separately</div></Card.Body></Card></Col>
          <Col xs={6} xl><Card className="horticulture-stat"><Card.Body><div className="stat-label">PLACES</div><div className="stat-value">{distinctPlaces}</div><div className="stat-note">With matching records</div></Card.Body></Card></Col>
        </Row>

        <Card className="horticulture-table-card">
          <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2"><div><h2>{config.label} report details</h2><span>{sorted.length} matching records - sorted by {sortKey.replaceAll("_", " ")}</span></div><div className="report-scope">{place || "All places"} - {month || "All months"} - {financialYear || "All years"}</div></Card.Header>
          {loading ? <div className="horticulture-loading"><Spinner animation="border" variant="success" />Loading {config.label.toLowerCase()} reports</div> : sorted.length === 0 ? <div className="horticulture-empty"><div>-</div><h3>No matching report records</h3><p>Try changing or resetting the selected place filters.</p></div> : <>
            <div className="table-responsive"><div className="horticulture-table-category"><span style={{ background: config.color }} />{config.label}<span className="count">{filtered.length} records</span></div><Table hover className="horticulture-table mb-0"><thead><tr>{columns.map((column) => <th key={column.key} onClick={() => sortBy(column.key === "_item" ? config.item : column.key)}>{column.label}{sortLabel(column.key === "_item" ? config.item : column.key)}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={`${category}-${row.id ?? index}`}>{columns.map((column) => <td key={column.key} title={String(renderCell(row, column))}>{renderCell(row, column)}</td>)}</tr>)}</tbody></Table></div>
            <div className="horticulture-pagination"><span>Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, sorted.length)} of {sorted.length}</span><div><Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {pageCount}</span><Button size="sm" variant="outline-secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
          </>}
        </Card>
      </Container>
      <style>{`
        .horticulture-dashboard{min-height:100vh;background:#f5f7f4;color:#24332b}
        .horticulture-heading h1{font-size:clamp(1.65rem,3vw,2.25rem);font-weight:750;letter-spacing:-.04em;margin:.25rem 0}.horticulture-heading p{color:#738078;margin:0}
        .horticulture-eyebrow{font-size:.68rem;font-weight:800;letter-spacing:.15em;color:#43835c}
        .horticulture-filter-card,.horticulture-stat,.horticulture-table-card{border:1px solid #e6ebe7;border-radius:14px;box-shadow:0 5px 18px #24452c08}
        .horticulture-filter-card .form-label{font-size:.78rem;font-weight:650;color:#617067}
        .horticulture-filter-card .form-control,.horticulture-filter-card .form-select{border-color:#e0e7e1;border-radius:9px;min-height:42px}
        .horticulture-stat .card-body{padding:17px 18px}.stat-label{font-size:.67rem;font-weight:750;letter-spacing:.08em;color:#87928b}.stat-value{font-size:1.7rem;font-weight:750;letter-spacing:-.04em;margin:4px 0}.stat-note{font-size:.75rem;color:#87928b}
        .horticulture-table-card{overflow:hidden}.horticulture-table-card>.card-header{background:#1e5f45;padding:17px 20px;border-bottom:1px solid #edf0ed}
        .horticulture-table-card h2{font-size:1rem;font-weight:750;margin:0 0 3px;color:#fff;}.horticulture-table-card .card-header span{font-size:.77rem;color:#d8eadf}.report-scope{font-size:.78rem;color:#617067;background:#f4f7f4;padding:7px 10px;border-radius:7px}
        .horticulture-table-category{display:flex;align-items:center;gap:9px;background:#f8faf8;padding:11px 16px;font-size:.83rem;font-weight:750;border-top:1px solid #edf0ed}.horticulture-table-category .count{margin-left:auto;font-weight:500}.horticulture-table{font-size:.79rem;white-space:nowrap}
        .horticulture-table th{font-weight:700;color:#fff;background:#267449;padding:11px 12px;border-bottom-color:#e9eeea;cursor:pointer}.horticulture-table td{padding:10px 12px;color:#45534a;max-width:220px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
        .horticulture-loading,.horticulture-empty{text-align:center;padding:48px 16px;color:#7c8981}.horticulture-loading .spinner-border{margin-right:10px}.horticulture-empty>div{font-size:2rem;color:#9baa9f}.horticulture-empty h3{font-size:1rem;color:#39483f;margin:8px}
        .horticulture-pagination{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;font-size:.78rem;color:#738078;border-top:1px solid #edf0ed}.horticulture-pagination>div{display:flex;align-items:center;gap:10px}.horticulture-pagination button{border-radius:7px}
        @media(max-width:575px){.horticulture-pagination{align-items:flex-start;gap:10px;flex-direction:column}.report-scope{display:none}}
      `}</style>
    </div>
  );
};

const AdminVegetableReport = () => <AdminPlaceReport category="vegetables" />;
const AdminFruitReport = () => <AdminPlaceReport category="fruits" />;
const AdminSpicesReport = () => <AdminPlaceReport category="spices" />;
const AdminFlowerReport = () => <AdminPlaceReport category="flowers" />;

export { AdminVegetableReport, AdminFruitReport, AdminSpicesReport, AdminFlowerReport };
export default AdminPlaceReport;
