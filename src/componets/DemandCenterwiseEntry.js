import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Container, Spinner, Alert, Row, Col, Card, Form, Button } from "react-bootstrap";
import Select from "react-select";
import axios from "axios";
import DemandNavigation from "./DemandNavigation";
import { useCenter } from "./all_login/CenterContext";
import { FaCalendarAlt, FaFilter, FaTable } from "react-icons/fa";
import "./DemandCenterwiseEntry.css";

const BILLING_API_URL =
  "https://mahadevaaya.com/govbillingsystem/backend/api/billing-items/";

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#194e8b' : '#e0e0e0',
    borderWidth: '1px',
    borderRadius: '6px',
    padding: '2px',
    minHeight: '36px',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(25, 78, 139, 0.15)' : 'none',
    '&:hover': { borderColor: '#194e8b' }
  }),
  valueContainer: provided => ({ ...provided, padding: '0 6px' }),
  multiValue: provided => ({ ...provided, backgroundColor: '#194e8b', borderRadius: '3px', margin: '2px' }),
  multiValueLabel: provided => ({ ...provided, color: '#ffffff', fontSize: '0.75rem', padding: '1px 4px' }),
  multiValueRemove: provided => ({
    ...provided,
    color: '#ffffff',
    padding: '0 2px',
    '&:hover': { backgroundColor: '#0d3a6b', color: '#ffffff' }
  }),
  placeholder: provided => ({ ...provided, color: '#6c757d', fontSize: '0.8rem' }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#194e8b' : state.isFocused ? '#e8f0f8' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#333333',
    fontSize: '0.8rem',
    padding: '8px 12px',
    '&:active': { backgroundColor: '#194e8b' }
  }),
  menu: provided => ({ ...provided, zIndex: 9999, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }),
  menuPortal: provided => ({ ...provided, zIndex: 9999 })
};

const getFinancialYearDates = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;
  return { startDate: `${startYear}-04-01`, endDate: `${endYear}-03-31` };
};


// ============================================================================
// Per-table column visibility selector
// Same idea as Registration page: every table has its OWN checkbox selector.
// ============================================================================
const ReportColumnSelector = ({ columns, visibleColumns, setVisibleColumns, label = "स्तंभ चुनें" }) => {
  const safeColumns = (columns || []).filter(Boolean);
  const visible = visibleColumns === null || visibleColumns === undefined
    ? safeColumns.map(c => c.key)
    : visibleColumns;

  const allSelected = safeColumns.length > 0 && visible.length === safeColumns.length;

  const toggle = (key) => {
    setVisibleColumns(prev => {
      const current = prev === null || prev === undefined
        ? safeColumns.map(c => c.key)
        : prev;

      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];

      return next.length === safeColumns.length ? null : next;
    });
  };

  return (
    <div className="report-column-selector">
      <div className="report-column-selector-header">
        <span className="report-column-selector-title">☷ {label}</span>
        <button
          type="button"
          className="report-column-select-all-btn"
          onClick={() => setVisibleColumns(allSelected ? [] : null)}
        >
          {allSelected ? "सभी हटाएं" : "सभी चुनें"}
        </button>
      </div>

      <div className="report-column-selector-options">
        {safeColumns.map(column => (
          <label key={column.key} className="report-column-option">
            <input
              type="checkbox"
              checked={visible.includes(column.key)}
              onChange={() => toggle(column.key)}
            />
            <span>{column.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};


// ============================================================================
// Independent date filter for each detailed-report tab.
// Every tab starts with the current financial year and keeps its own state.
// ============================================================================
const ReportTabDateFilter = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  appliedStartDate,
  appliedEndDate,
  onApply,
  onClear,
}) => (
  <div className="report-tab-date-filter">
    <div className="report-tab-date-filter-title">
      <FaCalendarAlt className="me-1" />
      तिथि के अनुसार फ़िल्टर
    </div>

    <Row className="align-items-end g-2">
      <Col lg={3} md={4} sm={6} className="mb-2">
        <Form.Group>
          <Form.Label className="filter-label-sm">प्रारंभ तिथि</Form.Label>
          <Form.Control
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="date-input-sm"
            size="sm"
          />
        </Form.Group>
      </Col>

      <Col lg={3} md={4} sm={6} className="mb-2">
        <Form.Group>
          <Form.Label className="filter-label-sm">समाप्ति तिथि</Form.Label>
          <Form.Control
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={e => setEndDate(e.target.value)}
            className="date-input-sm"
            size="sm"
          />
        </Form.Group>
      </Col>

      <Col lg={6} md={4} sm={12} className="mb-2">
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <Button
            type="button"
            size="sm"
            className="btn-filter-submit"
            onClick={onApply}
            disabled={!startDate && !endDate}
          >
            <FaFilter className="me-1" />
            फ़िल्टर लागू करें
          </Button>

          <Button
            type="button"
            size="sm"
            className="clear-btn-primary"
            onClick={onClear}
          >
            फ़िल्टर हटाएं
          </Button>

          {(appliedStartDate || appliedEndDate) && (
            <span
              className="badge bg-success d-flex align-items-center"
              style={{ fontSize: '0.7rem' }}
            >
              <FaCalendarAlt className="me-1" />
              {appliedStartDate || 'N/A'} - {appliedEndDate || 'N/A'}
            </span>
          )}
        </div>
      </Col>
    </Row>
  </div>
);

// This is the "सारांश देखें:" table moved to the top of the सारांश tab.
// It uses the currently filtered summary rows, so the selected tab date
// range and the सारांश tab filters are both reflected here.
const SummaryFilteredTable = ({ data }) => {
  const [summaryMode, setSummaryMode] = useState('financial');

  const summary = useMemo(() => {
    const map = new Map();

    data.forEach(row => {
      const plan = row.vahan || 'अन्य';
      if (!map.has(plan)) {
        map.set(plan, { quantity: 0, financial: 0 });
      }

      const item = map.get(plan);
      item.quantity += Number(row.matra) || 0;
      item.financial += Number(row.anudan) || 0;
    });

    return [...map.entries()]
      .filter(([, value]) => value.quantity > 0 || value.financial > 0)
      .sort((a, b) => b[1].financial - a[1].financial);
  }, [data]);

  const total = summary.reduce(
    (sum, [, value]) =>
      sum + (summaryMode === 'financial' ? value.financial : value.quantity),
    0
  );

  const formatInteger = value =>
    new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value) || 0));

  return (
    <div className="scheme-wise-financial-summary report-top-summary">
      <div className="scheme-summary-mode-filter">
        <label
          htmlFor="top-summary-mode"
          style={{
            margin: 0,
            color: '#194e8b',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          सारांश देखें:
        </label>

        <select
          id="top-summary-mode"
          value={summaryMode}
          onChange={e => setSummaryMode(e.target.value)}
        >
          <option value="financial">अनुदान राशि के अनुसार</option>
          <option value="quantity">भौतिक पूर्ति के अनुसार</option>
        </select>
      </div>

      <div className="report-top-summary-title">
        ▣ योजना-वार {summaryMode === 'financial'
          ? 'वित्तीय सारांश'
          : 'भौतिक पूर्ति सारांश'}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="report-top-summary-table">
          <thead>
            <tr>
              {summary.map(([plan]) => (
                <th key={`top-summary-head-${plan}`}>{plan}</th>
              ))}
              <th>कुल (Total)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {summary.map(([plan, value]) => {
                const displayValue =
                  summaryMode === 'financial'
                    ? value.financial
                    : value.quantity;

                return (
                  <td key={`top-summary-value-${plan}`}>
                    {summaryMode === 'financial' ? '₹' : ''}
                    {formatInteger(displayValue)}
                  </td>
                );
              })}

              <td className="report-top-summary-total">
                {summaryMode === 'financial' ? '₹' : ''}
                {formatInteger(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DynamicReportTabs = ({ sourceData }) => {
  const [activeTab, setActiveTab] = useState('saransh');
  const [openFilter, setOpenFilter] = useState(null);
  const [progressView, setProgressView] = useState('vidhan');
  const [saleView, setSaleView] = useState('vidhan');
  // Independent view/column state for the second 4401 table.
  const [saleSecondView, setSaleSecondView] = useState('vidhan');
  const [saleSecondColumns, setSaleSecondColumns] = useState(null);

  // Each report tab has an independent financial-year date filter.
  const {
    startDate: summaryInitialStartDate,
    endDate: summaryInitialEndDate,
  } = getFinancialYearDates();

  const [summaryStartDate, setSummaryStartDate] = useState(summaryInitialStartDate);
  const [summaryEndDate, setSummaryEndDate] = useState(summaryInitialEndDate);
  const [summaryAppliedStartDate, setSummaryAppliedStartDate] = useState(summaryInitialStartDate);
  const [summaryAppliedEndDate, setSummaryAppliedEndDate] = useState(summaryInitialEndDate);

  const [progressStartDate, setProgressStartDate] = useState(summaryInitialStartDate);
  const [progressEndDate, setProgressEndDate] = useState(summaryInitialEndDate);
  const [progressAppliedStartDate, setProgressAppliedStartDate] = useState(summaryInitialStartDate);
  const [progressAppliedEndDate, setProgressAppliedEndDate] = useState(summaryInitialEndDate);

  const [saleStartDate, setSaleStartDate] = useState(summaryInitialStartDate);
  const [saleEndDate, setSaleEndDate] = useState(summaryInitialEndDate);
  const [saleAppliedStartDate, setSaleAppliedStartDate] = useState(summaryInitialStartDate);
  const [saleAppliedEndDate, setSaleAppliedEndDate] = useState(summaryInitialEndDate);

  const filterRowsByDate = (data, startDate, endDate) => {
    return data.filter(row => {
      const itemDate = row.date ? new Date(row.date) : null;
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (!itemDate || Number.isNaN(itemDate.getTime())) return false;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;

      return true;
    });
  };

  const applySummaryDateFilter = () => {
    setSummaryAppliedStartDate(summaryStartDate);
    setSummaryAppliedEndDate(summaryEndDate);
  };

  const clearSummaryDateFilter = () => {
    const { startDate, endDate } = getFinancialYearDates();
    setSummaryStartDate(startDate);
    setSummaryEndDate(endDate);
    setSummaryAppliedStartDate(startDate);
    setSummaryAppliedEndDate(endDate);
  };

  const applyProgressDateFilter = () => {
    setProgressAppliedStartDate(progressStartDate);
    setProgressAppliedEndDate(progressEndDate);
  };

  const clearProgressDateFilter = () => {
    const { startDate, endDate } = getFinancialYearDates();
    setProgressStartDate(startDate);
    setProgressEndDate(endDate);
    setProgressAppliedStartDate(startDate);
    setProgressAppliedEndDate(endDate);
  };

  const applySaleDateFilter = () => {
    setSaleAppliedStartDate(saleStartDate);
    setSaleAppliedEndDate(saleEndDate);
  };

  const clearSaleDateFilter = () => {
    const { startDate, endDate } = getFinancialYearDates();
    setSaleStartDate(startDate);
    setSaleEndDate(endDate);
    setSaleAppliedStartDate(startDate);
    setSaleAppliedEndDate(endDate);
  };


  // Independent selectors/column visibility for the two additional
  // "योजना प्रगति विवरण" tables. These tables are intentionally
  // independent of the main progress filters, matching the reference HTML.
  const [progressBlock, setProgressBlock] = useState('');
  const [progressVidhan, setProgressVidhan] = useState('');
  const [progressBlockColumns, setProgressBlockColumns] = useState(null);
  const [progressVidhanColumns, setProgressVidhanColumns] = useState(null);

  // Independent filters for each report tab.
  const [summaryFilters, setSummaryFilters] = useState({
    vahan: null, kendra: null
  });
  const [progressFilters, setProgressFilters] = useState({
    vahan: null, kendra: null, block: null, vidhan: null
  });
  const [saleFilters, setSaleFilters] = useState({
    kendra: null, block: null, vidhan: null, nivesh: null, upnivesh: null
  });

  // Summary report: one selector controls whether rows are shown Mad-wise or Up-Mad-wise.
  // Default is Mad-wise, as requested.
  const [summaryReportView, setSummaryReportView] = useState('mad');

  // Independent column visibility for the remaining report tables.
  const [summaryPlanColumns, setSummaryPlanColumns] = useState(null);
  const [progressColumns, setProgressColumns] = useState(null);
  const [saleColumns, setSaleColumns] = useState(null);

  const rows = useMemo(() => (
    Array.isArray(sourceData) ? sourceData : []
  ).map(item => ({
    raw: item,
    kendra: item.center_name?.trim() || 'अन्य',
    kraya: item.scheme_name?.trim() || 'अन्य',
    vahan: item.anudan_name?.trim() || 'अन्य',
    nivesh: item.investment_name?.trim() || 'अन्य',
    upnivesh: item.sub_investment_name?.trim() || 'अन्य',
    ikai: item.unit?.trim() || 'अन्य',
    vidhan: item.vidhan_sabha_name?.trim() || 'अन्य',
    block: item.vikas_khand_name?.trim() || 'अन्य',
    matra: Number(item.allocated_quantity) || 0,
    rate: Number(item.rate) || 0,
    vikray: Number(item.farmer_selling_rate) || 0,
    anudanRate: Number(item.farmer_subsidy_rate) || 0,
    ansh: Number(item.amount_of_farmer_share) || 0,
    anudan: Number(item.amount_of_subsidy) || 0,
    kul: Number(item.total_amount) || 0,
    date: item.bill_date || '',
  })), [sourceData]);

  // Apply each tab's own date range only after rows has been initialized.
  const summaryDateRows = useMemo(
    () => filterRowsByDate(rows, summaryAppliedStartDate, summaryAppliedEndDate),
    [rows, summaryAppliedStartDate, summaryAppliedEndDate]
  );

  const progressDateRows = useMemo(
    () => filterRowsByDate(rows, progressAppliedStartDate, progressAppliedEndDate),
    [rows, progressAppliedStartDate, progressAppliedEndDate]
  );

  const saleDateRows = useMemo(
    () => filterRowsByDate(rows, saleAppliedStartDate, saleAppliedEndDate),
    [rows, saleAppliedStartDate, saleAppliedEndDate]
  );

  const uniq = values => [...new Set(values.filter(v => v !== null && v !== undefined && String(v).trim() !== ''))]
    .sort((a, b) => String(a).localeCompare(String(b), 'hi'));

  const lists = useMemo(() => ({
    kendra: uniq(rows.map(r => r.kendra)),
    kraya: uniq(rows.map(r => r.kraya)),
    vahan: uniq(rows.map(r => r.vahan)),
    nivesh: uniq(rows.map(r => r.nivesh)),
    upnivesh: uniq(rows.map(r => r.upnivesh)),
    block: uniq(rows.map(r => r.block)),
    vidhan: uniq(rows.map(r => r.vidhan)),
  }), [rows]);

  // Only use 4401 when it actually exists in the fetched API data.
  const fixedPlan = useMemo(
    () => lists.kraya.find(v => String(v).trim() === '4401 बिक्री हेतु') || null,
    [lists.kraya]
  );

  const getOptions = (section, field) => lists[field] || [];

  const getFilterState = section =>
    section === 'summary'
      ? [summaryFilters, setSummaryFilters]
      : section === 'progress'
        ? [progressFilters, setProgressFilters]
        : [saleFilters, setSaleFilters];


  const toggleFilter = (section, field, value) => {
    const [, setter] = getFilterState(section);

    setter(prev => {
      const options = getOptions(section, field);
      const current = prev[field] === null || prev[field] === undefined
        ? [...options]
        : [...prev[field]];

      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];

      return {
        ...prev,
        // null = ALL, [] = NONE, non-empty array = selected values.
        [field]: next.length === options.length
          ? null
          : next.length === 0
            ? []
            : next
      };
    });
  };

  const clearFilters = section => {
    const [state, setter] = getFilterState(section);
    setter(Object.fromEntries(Object.keys(state).map(key => [key, null])));
    setOpenFilter(null);
  };

  const FilterButton = ({ section, field, label }) => {
    const [state, setter] = getFilterState(section);
    const options = getOptions(section, field);
    const selected = state[field];
    const selectedValues = selected === null || selected === undefined ? options : selected;
    const selectedCount = selectedValues.length;
    const id = `${section}-${field}`;
    const open = openFilter === id;
    const isFiltered = selected !== null && selected !== undefined && selectedCount !== options.length;

    return (
      <div className="dynamic-report-filter-wrap">
        <button
          type="button"
          className={`dynamic-report-filter-btn ${isFiltered ? 'filtered' : ''}`}
          onClick={() => setOpenFilter(open ? null : id)}
        >
          <span>{label}</span>
          <span className="dynamic-report-badge">{`${selectedCount}/${options.length}`}</span>
          <span>▼</span>
        </button>

        {open && (
          <div className="dynamic-report-filter-menu">
            <div className="dynamic-report-filter-actions">
              <button
                type="button"
                onClick={() => setter(prev => ({ ...prev, [field]: null }))}
              >सभी चुनें</button>
              <button
                type="button"
                onClick={() => setter(prev => ({ ...prev, [field]: [] }))}
              >कोई नहीं</button>
            </div>

            <div className="dynamic-report-filter-list">
              {options.map(value => (
                <label key={value} className="dynamic-report-filter-option">
                  <input
                    type="checkbox"
                    checked={
                      selected === null || selected === undefined
                        ? true
                        : Array.isArray(selected) && selected.includes(value)
                    }
                    onChange={() => toggleFilter(section, field, value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>

            <button type="button" className="dynamic-report-filter-close" onClick={() => setOpenFilter(null)}>
              बंद करें
            </button>
          </div>
        )}
      </div>
    );
  };

  const FilterBar = ({ section }) => (
    <div className="dynamic-report-filterbar professional-filterbar">
      {filterDefinitions[section].map(([field, label]) => (
        <FilterButton key={field} section={section} field={field} label={label} />
      ))}
      <button type="button" className="dynamic-report-clear-btn" onClick={() => clearFilters(section)}>
        फ़िल्टर हटाएं
      </button>
    </div>
  );

  const filterDefinitions = {
    summary: [
      ['vahan', 'अनुदान वहन योजना'],
      ['kendra', 'केंद्र']
    ],
    progress: [
      ['vahan', 'योजना का नाम (अनुदान वहन योजना)'],
      ['kendra', 'केंद्र'],
      ['block', 'ब्लॉक'],
      ['vidhan', 'विधानसभा']
    ],
    sale: [
      ['kendra', 'केंद्र'],
      ['block', 'ब्लॉक'],
      ['vidhan', 'विधानसभा'],
      ['nivesh', 'मद का नाम'],
      ['upnivesh', 'उप-मद का नाम']
    ]
  };

  const applyFilters = (data, filters, fields) => data.filter(r =>
    fields.every(field => {
      const selected = filters[field];
      return selected === null || selected === undefined || selected.includes(r[field]);
    })
  );


  const summaryRows = useMemo(() => (
    applyFilters(summaryDateRows, summaryFilters, ['vahan', 'kendra'])
      .filter(r => !fixedPlan || r.kraya !== fixedPlan)
  ), [summaryDateRows, summaryFilters, fixedPlan]);

  const progressRows = useMemo(() => (
    applyFilters(progressDateRows, progressFilters, ['vahan', 'kendra', 'block', 'vidhan'])
      .filter(r => !fixedPlan || r.kraya !== fixedPlan)
  ), [progressDateRows, progressFilters, fixedPlan]);

  const saleRows = useMemo(() => (
    fixedPlan
      ? applyFilters(saleDateRows.filter(r => r.kraya === fixedPlan), saleFilters, ['kendra', 'block', 'vidhan', 'nivesh', 'upnivesh'])
      : []
  ), [saleDateRows, saleFilters, fixedPlan]);

  // ---------------------------------------------------------------------------
  // Two additional tables required inside "योजना प्रगति विवरण".
  // They intentionally do NOT use the main progress filters. They work exactly
  // like the reference HTML:
  //   1. Select a ब्लॉक -> show its centers as columns.
  //   2. Select a विधानसभा -> show its centers as columns.
  // Both tables use grant-bearing data only (4401 is excluded).
  // ---------------------------------------------------------------------------
  const grantRows = useMemo(
    () => progressDateRows.filter(r => !fixedPlan || r.kraya !== fixedPlan),
    [progressDateRows, fixedPlan]
  );

  const progressBlockOptions = useMemo(
    () => lists.block,
    [lists.block]
  );

  const progressVidhanOptions = useMemo(
    () => lists.vidhan,
    [lists.vidhan]
  );

  // Keep the selectors valid when API data changes.
  useEffect(() => {
    if (!progressBlockOptions.length) {
      setProgressBlock('');
    } else if (!progressBlockOptions.includes(progressBlock)) {
      setProgressBlock(progressBlockOptions[0]);
    }
  }, [progressBlockOptions, progressBlock]);

  useEffect(() => {
    if (!progressVidhanOptions.length) {
      setProgressVidhan('');
    } else if (!progressVidhanOptions.includes(progressVidhan)) {
      setProgressVidhan(progressVidhanOptions[0]);
    }
  }, [progressVidhanOptions, progressVidhan]);

  const progressBlockRows = useMemo(
    () => progressBlock
      ? grantRows.filter(r => r.block === progressBlock)
      : [],
    [grantRows, progressBlock]
  );

  const progressVidhanRows = useMemo(
    () => progressVidhan
      ? grantRows.filter(r => r.vidhan === progressVidhan)
      : [],
    [grantRows, progressVidhan]
  );

  const progressBlockCentres = useMemo(
    () => uniq(progressBlockRows.map(r => r.kendra)),
    [progressBlockRows]
  );

  const progressVidhanCentres = useMemo(
    () => uniq(progressVidhanRows.map(r => r.kendra)),
    [progressVidhanRows]
  );

  const fmtN = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const fmtR = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
  const fmtDate = value => value ? new Date(value).toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';


  const summaryPlanDefs = [
    { key: 'sno', label: 'क्रम संख्या' },
    { key: 'vahan', label: 'योजना का नाम (अनुदान वहन योजना)' },
    { key: 'matra', label: 'भौतिक पूर्ति ' },
    { key: 'anudan', label: 'अनुदान राशि (रु0)' },
  ];

  // Existing scheme-wise summary table (kept as the first summary table).
  const SummaryPlanTable = () => {
    const map = new Map();
    summaryRows.forEach(r => {
      if (!map.has(r.vahan)) map.set(r.vahan, { matra: 0, anudan: 0 });
      const g = map.get(r.vahan);
      g.matra += r.matra;
      g.anudan += r.anudan;
    });

    const groups = [...map.entries()]
      .filter(([name, g]) => g.matra > 0 && g.anudan > 0)
      .sort((a, b) => b[1].anudan - a[1].anudan);

    const visible = summaryPlanColumns === null
      ? summaryPlanDefs.map(c => c.key)
      : summaryPlanColumns;
    const show = key => visible.includes(key);

    const totalMatra = groups.reduce((s, [, g]) => s + g.matra, 0);
    const totalAnudan = groups.reduce((s, [, g]) => s + g.anudan, 0);

    return (
      <>
        <ReportColumnSelector
          columns={summaryPlanDefs}
          visibleColumns={summaryPlanColumns}
          setVisibleColumns={setSummaryPlanColumns}
          label="इस तालिका के स्तंभ चुनें"
        />
        <div className="dynamic-report-table-scroll">
          <table className="dynamic-report-table">
            <thead>
              <tr>
                {show('sno') && <th>#</th>}
                {show('vahan') && <th>योजना का नाम<br/>(अनुदान वहन योजना)</th>}
                {show('matra') && <th>भौतिक पूर्ति </th>}
                {show('anudan') && <th>अनुदान राशि (रु0)</th>}
              </tr>
            </thead>
            <tbody>
              {groups.length ? groups.map(([name, g], i) => (
                <tr key={name}>
                  {show('sno') && <td>{i + 1}</td>}
                  {show('vahan') && <td>{name}</td>}
                  {show('matra') && <td>{fmtN(g.matra)}</td>}
                  {show('anudan') && <td>{fmtR(g.anudan)}</td>}
                </tr>
              )) : (
                <tr>
                  <td colSpan={Math.max(1, visible.length)} className="dynamic-report-empty">
                    कोई डेटा नहीं — चुने फ़िल्टर पर कुछ नहीं मिला
                  </td>
                </tr>
              )}
            </tbody>
            {groups.length > 0 && (
              <tfoot>
                <tr className="report-total-values-row">
                  {visible.map((key, index) => {
                    const value = key === 'matra' ? fmtN(totalMatra)
                      : key === 'anudan' ? fmtR(totalAnudan)
                      : null;
                    const isFirst = index === 0;
                    return (
                      <td key={`summary-plan-total-${key}`} className={value !== null ? 'tot' : ''}>
                        {isFirst && value !== null ? `योग: ${value}` : isFirst ? 'योग' : value}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </>
    );
  };

  // ============================================================================
  // Single Mad / Up-Mad summary table
  // ----------------------------------------------------------------------------
  // One selector switches the row dimension:
  //   - मद       => rows grouped by investment_name
  //   - उप-मद    => rows grouped by sub_investment_name
  //
  // Column structure follows the supplied Excel/reference screenshot:
  //   क्रम संख्या | मद/उप-मद | इकाई |
  //   योजना 1 -> भौतिक पूर्ति  | अनुदान राशि (रु0) |
  //   योजना 2 -> भौतिक पूर्ति  | अनुदान राशि (रु0) | ...
  //   लाभार्थी
  //
  // Existing API data is used without changing the underlying records.
  // भौतिक = allocated_quantity
  // वित्तीय = amount_of_subsidy
  // लाभार्थी is read from an existing beneficiary field if the API provides
  // one; otherwise it is shown as "-". No beneficiary value is invented.
  // ============================================================================

  const SummaryMadUpMadTable = ({ data }) => {
    const [summaryWiseView, setSummaryWiseView] = useState('mad');
    const [summaryWiseFilters, setSummaryWiseFilters] = useState({
      nivesh: null,
      upnivesh: null,
      vidhan: null,
      block: null,
      kendra: null,
    });
    const [openSummaryWiseFilter, setOpenSummaryWiseFilter] = useState(null);
    const [selectedSummaryPlanFilter, setSelectedSummaryPlanFilter] = useState(null);
    const [summaryWiseSummaryMode, setSummaryWiseSummaryMode] = useState('financial');
    // Only these three table columns can be shown/hidden from the column selector.
    const [summaryWiseVisibleColumns, setSummaryWiseVisibleColumns] = useState(null);
    const summaryWiseColumnDefs = [
      { key: 'ikai', label: 'इकाई' },
      { key: 'matra', label: 'भौतिक पूर्ति ' },
      { key: 'anudan', label: 'अनुदान राशि (रु0)' },
    ];
    const summaryWiseShowIkai = summaryWiseVisibleColumns === null || summaryWiseVisibleColumns.includes('ikai');
    const summaryWiseShowMatra = summaryWiseVisibleColumns === null || summaryWiseVisibleColumns.includes('matra');
    const summaryWiseShowAnudan = summaryWiseVisibleColumns === null || summaryWiseVisibleColumns.includes('anudan');
    const summaryWisePlanColumnCount = (summaryWiseShowMatra ? 1 : 0) + (summaryWiseShowAnudan ? 1 : 0);

    const viewConfig = {
      mad: { field: 'nivesh', label: 'मद का नाम' },
      upmad: { field: 'upnivesh', label: 'उप-मद का नाम' },
      vidhan: { field: 'vidhan', label: 'विधानसभा का नाम' },
      block: { field: 'block', label: 'विकासखण्ड का नाम' },
      kendra: { field: 'kendra', label: 'केंद्र का नाम' },
    };

    const current = viewConfig[summaryWiseView];
    const rowField = current.field;
    const rowLabel = current.label;

    // Five independent filters for this table.
    // Empty/null selection means ALL values for that filter.
    const summaryWiseBaseRows = useMemo(
      () => (Array.isArray(data) ? data : []).filter(r => !fixedPlan || r.kraya !== fixedPlan),
      [data, fixedPlan]
    );

    const summaryWiseFilterDefinitions = [
      ['nivesh', 'मद का नाम'],
      ['upnivesh', 'उप-मद का नाम'],
      ['vidhan', 'विधानसभा'],
      ['block', 'विकासखण्ड'],
      ['kendra', 'केंद्र'],
    ];

    const summaryWiseFilterOptions = useMemo(() => ({
      nivesh: uniq(summaryWiseBaseRows.map(r => r.nivesh)),
      upnivesh: uniq(summaryWiseBaseRows.map(r => r.upnivesh)),
      vidhan: uniq(summaryWiseBaseRows.map(r => r.vidhan)),
      block: uniq(summaryWiseBaseRows.map(r => r.block)),
      kendra: uniq(summaryWiseBaseRows.map(r => r.kendra)),
    }), [summaryWiseBaseRows]);

    // Keep selections valid if API data changes.
    useEffect(() => {
      setSummaryWiseFilters(prev => {
        const next = { ...prev };
        let changed = false;

        summaryWiseFilterDefinitions.forEach(([field]) => {
          const selected = prev[field];
          const options = summaryWiseFilterOptions[field] || [];
          if (selected !== null && selected !== undefined) {
            const valid = selected.filter(value => options.includes(value));
            const normalized = valid.length === options.length ? null : valid;
            if (JSON.stringify(normalized) !== JSON.stringify(selected)) {
              next[field] = normalized;
              changed = true;
            }
          }
        });

        return changed ? next : prev;
      });
    }, [summaryWiseFilterOptions]);

    const toggleSummaryWiseFilter = (field, value) => {
      setSummaryWiseFilters(prev => {
        const options = summaryWiseFilterOptions[field] || [];
        const currentSelection = prev[field] === null || prev[field] === undefined
          ? [...options]
          : [...prev[field]];

        const next = currentSelection.includes(value)
          ? currentSelection.filter(v => v !== value)
          : [...currentSelection, value];

        return {
          ...prev,
          [field]: next.length === options.length ? null : next,
        };
      });
    };

    const clearSummaryWiseFilters = () => {
      setSummaryWiseFilters({
        nivesh: null,
        upnivesh: null,
        vidhan: null,
        block: null,
        kendra: null,
      });
      setOpenSummaryWiseFilter(null);
    };

    const summaryWiseRows = useMemo(() => (
      summaryWiseBaseRows.filter(r =>
        summaryWiseFilterDefinitions.every(([field]) => {
          const selected = summaryWiseFilters[field];
          return selected === null || selected === undefined || selected.includes(r[field]);
        })
      )
    ), [summaryWiseBaseRows, summaryWiseFilters]);

    const planList = uniq(summaryWiseRows.map(r => r.vahan).filter(Boolean));

    useEffect(() => {
      setSelectedSummaryPlanFilter(prev => {
        if (prev === null || prev === undefined) return null;
        const valid = prev.filter(value => planList.includes(value));
        if (valid.length === planList.length) return null;
        return valid;
      });
    }, [planList.join('|')]);

    const selectedPlans = selectedSummaryPlanFilter === null || selectedSummaryPlanFilter === undefined
      ? planList
      : planList.filter(plan => selectedSummaryPlanFilter.includes(plan));

    const togglePlanFilter = plan => {
      setSelectedSummaryPlanFilter(prev => {
        const currentSelection = prev === null || prev === undefined
          ? [...planList]
          : [...prev];
        const next = currentSelection.includes(plan)
          ? currentSelection.filter(value => value !== plan)
          : [...currentSelection, plan];
        return next.length === planList.length ? null : next;
      });
    };

    const groupedRows = useMemo(() => {
      const map = new Map();

      summaryWiseRows.filter(r => selectedPlans.includes(r.vahan)).forEach(r => {
        const key = r[rowField] || 'अन्य';

        if (!map.has(key)) {
          map.set(key, {
            physical: {},
            financial: {},
            units: new Set(),
          });
        }

        const group = map.get(key);
        const plan = r.vahan || 'अन्य';

        group.physical[plan] = (group.physical[plan] || 0) + (Number(r.matra) || 0);
        group.financial[plan] = (group.financial[plan] || 0) + (Number(r.anudan) || 0);

        if (r.ikai) group.units.add(r.ikai);
      });

      return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'hi'));
    }, [summaryWiseRows, rowField, selectedPlans.join('|')]);

    const preserveScroll = callback => {
      const scrollY = window.scrollY;
      callback();
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: window.scrollX, behavior: 'auto' });
      });
    };

    const formatExactNumber = value => {
      const num = Number(value) || 0;
      return new Intl.NumberFormat('en-IN', {
        useGrouping: true,
        maximumFractionDigits: 20,
      }).format(num);
    };

    const formatSummaryInteger = value => {
      const num = Number(value) || 0;
      return new Intl.NumberFormat('en-IN', {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(Math.round(num));
    };

    // IMPORTANT: calculate the summary from the SAME filtered/grouped data
    // that is visible in the table above. Do not divide financial values into
    // lakhs here, otherwise the total would not match the table.
    const schemeWiseSummary = selectedPlans.map(plan => {
      const rawValue = groupedRows.reduce(
        (sum, [, group]) => sum + (
          summaryWiseSummaryMode === 'quantity'
            ? (group.physical[plan] || 0)
            : (group.financial[plan] || 0)
        ),
        0
      );

      return {
        plan,
        rawValue,
        displayValue: rawValue,
      };
    });

    const totalSummaryValue = schemeWiseSummary.reduce(
      (sum, item) => sum + item.displayValue,
      0
    );

    return (
      <div className="summary-mad-upmad-report-wrapper">
        <div
          className="dynamic-report-view-row professional-view-row"
          style={{
            marginBottom: '10px',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <label htmlFor="summary-mad-upmad-view-select">देखने का प्रकार</label>
          <select
            id="summary-mad-upmad-view-select"
            value={summaryWiseView}
            onChange={e => {
              const value = e.target.value;
              preserveScroll(() => setSummaryWiseView(value));
            }}
            style={{
              minWidth: '230px',
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #d9e1e8',
              background: '#fff',
              fontWeight: 600,
            }}
          >
            <option value="mad">मद के अनुसार</option>
            <option value="upmad">उप-मद के अनुसार</option>
            <option value="vidhan">विधानसभा के अनुसार</option>
            <option value="block">विकासखण्ड के अनुसार</option>
            <option value="kendra">केंद्र के अनुसार</option>
          </select>

          {summaryWiseFilterDefinitions.map(([field, label]) => {
            const options = summaryWiseFilterOptions[field] || [];
            const selected = summaryWiseFilters[field];
            const selectedValues = selected === null || selected === undefined ? options : selected;
            const selectedCount = selectedValues.length;
            const filterId = `summary-mad-upmad-${field}`;
            const isOpen = openSummaryWiseFilter === filterId;
            const isFiltered = selected !== null && selected !== undefined && selectedCount !== options.length;

            return (
              <div key={field} className="dynamic-report-filter-wrap">
                <button
                  type="button"
                  className={`dynamic-report-filter-btn ${isFiltered ? 'filtered' : ''}`}
                  onClick={() => setOpenSummaryWiseFilter(isOpen ? null : filterId)}
                >
                  <span>{label} फ़िल्टर</span>
                  <span className="dynamic-report-badge">{selectedCount}/{options.length}</span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="dynamic-report-filter-menu">
                    <div className="dynamic-report-filter-actions">
                      <button type="button" onClick={() => setSummaryWiseFilters(prev => ({ ...prev, [field]: null }))}>सभी चुनें</button>
                      <button type="button" onClick={() => setSummaryWiseFilters(prev => ({ ...prev, [field]: [] }))}>कोई नहीं</button>
                    </div>

                    <div className="dynamic-report-filter-list">
                      {options.length === 0 ? (
                        <div className="dynamic-report-filter-empty">कोई विकल्प उपलब्ध नहीं</div>
                      ) : (
                        options.map(value => (
                          <label key={value} className="dynamic-report-filter-option">
                            <input
                              type="checkbox"
                              checked={selected === null || selected === undefined ? true : selected.includes(value)}
                              onChange={() => {
                                const currentScrollY = window.scrollY;
                                toggleSummaryWiseFilter(field, value);
                                requestAnimationFrame(() => {
                                  window.scrollTo({ top: currentScrollY, left: window.scrollX, behavior: 'auto' });
                                });
                              }}
                            />
                            <span>{value}</span>
                          </label>
                        ))
                      )}
                    </div>

                    <button type="button" className="dynamic-report-filter-close" onClick={() => setOpenSummaryWiseFilter(null)}>
                      बंद करें
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="dynamic-report-filter-wrap">
            <button
              type="button"
              className={`dynamic-report-filter-btn ${selectedSummaryPlanFilter !== null && selectedSummaryPlanFilter !== undefined && selectedSummaryPlanFilter.length !== planList.length ? 'filtered' : ''}`}
              onClick={() => setOpenSummaryWiseFilter(openSummaryWiseFilter === 'summary-mad-upmad-plan' ? null : 'summary-mad-upmad-plan')}
            >
              <span>योजना फ़िल्टर</span>
              <span className="dynamic-report-badge">{selectedPlans.length}/{planList.length}</span>
              <span>{openSummaryWiseFilter === 'summary-mad-upmad-plan' ? '▲' : '▼'}</span>
            </button>

            {openSummaryWiseFilter === 'summary-mad-upmad-plan' && (
              <div className="dynamic-report-filter-menu">
                <div className="dynamic-report-filter-actions">
                  <button type="button" onClick={() => setSelectedSummaryPlanFilter(null)}>सभी चुनें</button>
                  <button type="button" onClick={() => setSelectedSummaryPlanFilter([])}>कोई नहीं</button>
                </div>
                <div className="dynamic-report-filter-list">
                  {planList.length === 0 ? (
                    <div className="dynamic-report-filter-empty">कोई विकल्प उपलब्ध नहीं</div>
                  ) : (
                    planList.map(plan => (
                      <label key={plan} className="dynamic-report-filter-option">
                        <input
                          type="checkbox"
                          checked={selectedPlans.includes(plan)}
                          onChange={() => {
                            const currentScrollY = window.scrollY;
                            togglePlanFilter(plan);
                            requestAnimationFrame(() => {
                              window.scrollTo({ top: currentScrollY, left: window.scrollX, behavior: 'auto' });
                            });
                          }}
                        />
                        <span>{plan}</span>
                      </label>
                    ))
                  )}
                </div>
                <button type="button" className="dynamic-report-filter-close" onClick={() => setOpenSummaryWiseFilter(null)}>
                  बंद करें
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="dynamic-report-clear-btn"
            onClick={() => clearSummaryWiseFilters()}
          >
            फ़िल्टर हटाएं
          </button>
        </div>

        <ReportColumnSelector
          columns={summaryWiseColumnDefs}
          visibleColumns={summaryWiseVisibleColumns}
          setVisibleColumns={setSummaryWiseVisibleColumns}
          label="इस तालिका के स्तंभ चुनें"
        />

        <div className="dynamic-report-table-scroll matrix-scroll">
          <table
            className="dynamic-report-table matrix-table summary-mad-upmad-detail-table"
            style={{ minWidth: '1100px' }}
          >
            <thead>
              <tr>
                <th rowSpan="2">क्रम संख्या</th>
                <th rowSpan="2">{rowLabel}</th>
                {summaryWiseShowIkai ? (
                  <th rowSpan="2">इकाई</th>
                ) : null}
                {summaryWisePlanColumnCount > 0 && selectedPlans.map(plan => (
                  <th
                    key={`yw-plan-${plan}`}
                    colSpan={summaryWisePlanColumnCount}
                    style={{ textAlign: 'center' }}
                  >
                    {plan}
                  </th>
                ))}
                {summaryWisePlanColumnCount > 0 && (
                  <th
                    key="yw-total-plan"
                    colSpan={summaryWisePlanColumnCount}
                    style={{ textAlign: 'center' }}
                  >
                    कुल योग
                  </th>
                )}
              </tr>
              <tr>
                {selectedPlans.flatMap(plan => {
                  const cells = [];
                  if (summaryWiseShowMatra) {
                    cells.push(<th key={`yw-physical-${plan}`}>भौतिक पूर्ति </th>);
                  }
                  if (summaryWiseShowAnudan) {
                    cells.push(<th key={`yw-financial-${plan}`}>अनुदान राशि (रु0)</th>);
                  }
                  return cells;
                })}
                {summaryWisePlanColumnCount > 0 && (
                  <>
                    {summaryWiseShowMatra && <th>भौतिक पूर्ति </th>}
                    {summaryWiseShowAnudan && <th>अनुदान राशि (रु0)</th>}
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {groupedRows.length ? groupedRows.map(([name, group], index) => (
                <tr key={`summary-mad-upmad-${summaryWiseView}-${name}`}>
                  <td>{index + 1}</td>
                  <td>{name}</td>
                  {summaryWiseShowIkai ? (
                    <td>{[...group.units].join(', ') || '-'}</td>
                  ) : null}

                  {selectedPlans.flatMap(plan => {
                    const cells = [];
                    if (summaryWiseShowMatra) {
                      cells.push(
                        <td key={`yw-matra-${name}-${plan}`}>
                          {group.physical[plan] ? formatExactNumber(group.physical[plan]) : ''}
                        </td>
                      );
                    }
                    if (summaryWiseShowAnudan) {
                      cells.push(
                        <td key={`yw-anudan-${name}-${plan}`}>
                          {group.financial[plan] ? fmtR(group.financial[plan]) : ''}
                        </td>
                      );
                    }
                    return cells;
                  })}
                  {summaryWisePlanColumnCount > 0 && (
                    <>
                      {summaryWiseShowMatra && (
                        <td className="tot">
                          {formatExactNumber(selectedPlans.reduce((sum, plan) => sum + (group.physical[plan] || 0), 0))}
                        </td>
                      )}
                      {summaryWiseShowAnudan && (
                        <td className="tot">
                          {fmtR(selectedPlans.reduce((sum, plan) => sum + (group.financial[plan] || 0), 0))}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={2 + (summaryWiseVisibleColumns === null ? 1 : (summaryWiseVisibleColumns.includes('ikai') ? 1 : 0)) + (selectedPlans.length + (selectedPlans.length ? 1 : 0)) * (summaryWiseVisibleColumns === null ? 2 : summaryWiseVisibleColumns.filter(k => k === 'matra' || k === 'anudan').length)} className="dynamic-report-empty">
                    कोई डेटा नहीं — चुने फ़िल्टर पर कुछ नहीं मिला
                  </td>
                </tr>
              )}
            </tbody>

            {groupedRows.length > 0 && (
              <tfoot>
                <tr className="report-total-values-row">
                  <td>योग</td>
                  <td></td>
                  {summaryWiseShowIkai ? <td></td> : null}
                  {selectedPlans.flatMap(plan => {
                    const physicalTotal = groupedRows.reduce(
                      (sum, [, group]) => sum + (group.physical[plan] || 0), 0
                    );
                    const financialTotal = groupedRows.reduce(
                      (sum, [, group]) => sum + (group.financial[plan] || 0), 0
                    );

                    const cells = [];
                    if (summaryWiseShowMatra) {
                      cells.push(
                        <td key={`yw-total-matra-${plan}`} className="tot">
                          {physicalTotal ? formatExactNumber(physicalTotal) : ''}
                        </td>
                      );
                    }
                    if (summaryWiseShowAnudan) {
                      cells.push(
                        <td key={`yw-total-anudan-${plan}`} className="tot">
                          {financialTotal ? fmtR(financialTotal) : ''}
                        </td>
                      );
                    }
                    return cells;
                  })}
                  {summaryWisePlanColumnCount > 0 && (
                    <>
                      <td className="tot">
                        {formatExactNumber(groupedRows.reduce((sum, [, group]) =>
                          sum + selectedPlans.reduce((inner, plan) => inner + (group.physical[plan] || 0), 0), 0))}
                      </td>
                      <td className="tot">
                        {fmtR(groupedRows.reduce((sum, [, group]) =>
                          sum + selectedPlans.reduce((inner, plan) => inner + (group.financial[plan] || 0), 0), 0))}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  };

  const MatrixTable = ({
    data,
    geoField,
    geoList,
    saleMode,
    schemeLabel,
    columns,
    setColumns,
    enableHierarchyFilters = false
  }) => {
    const [selectedMad, setSelectedMad] = useState([]);
    const [selectedUpmad, setSelectedUpmad] = useState([]);
    const [groupBy, setGroupBy] = useState('mad');

    const safeData = Array.isArray(data) ? data : [];

    const uniqValues = (values) => [...new Set(
      values.map(value => String(value ?? '').trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'hi'));

    const madOptions = useMemo(() => {
      const source = selectedUpmad.length
        ? safeData.filter(row => selectedUpmad.includes(String(row.upnivesh ?? '').trim()))
        : safeData;
      return uniqValues(source.map(row => row.nivesh)).map(value => ({ value, label: value }));
    }, [safeData, selectedUpmad]);

    const upmadOptions = useMemo(() => {
      const source = selectedMad.length
        ? safeData.filter(row => selectedMad.includes(String(row.nivesh ?? '').trim()))
        : safeData;
      return uniqValues(source.map(row => row.upnivesh)).map(value => ({ value, label: value }));
    }, [safeData, selectedMad]);

    useEffect(() => {
      if (!enableHierarchyFilters) return;
      const available = new Set(madOptions.map(option => option.value));
      setSelectedMad(prev => prev.filter(value => available.has(value)));
    }, [enableHierarchyFilters, madOptions]);

    useEffect(() => {
      if (!enableHierarchyFilters) return;
      const available = new Set(upmadOptions.map(option => option.value));
      setSelectedUpmad(prev => prev.filter(value => available.has(value)));
    }, [enableHierarchyFilters, upmadOptions]);

    const filteredData = useMemo(() => {
      if (!enableHierarchyFilters) return safeData;
      return safeData.filter(row => {
        const mad = String(row.nivesh ?? '').trim();
        const upmad = String(row.upnivesh ?? '').trim();
        if (selectedMad.length && !selectedMad.includes(mad)) return false;
        if (selectedUpmad.length && !selectedUpmad.includes(upmad)) return false;
        return true;
      });
    }, [safeData, enableHierarchyFilters, selectedMad, selectedUpmad]);

    // Decide which hierarchy should be unique in the first column.
    // This is independent for every table because MatrixTable owns its own state.
    const madMode = enableHierarchyFilters && groupBy === 'mad';
    const upmadMode = enableHierarchyFilters && groupBy === 'upmad';

    const groupedItems = useMemo(() => {
      const groups = new Map();

      filteredData.forEach(row => {
        const mad = String(row.nivesh ?? '').trim();
        const upmad = String(row.upnivesh ?? '').trim();
        const yojna = String(row.vahan ?? '').trim();
        const ikai = String(row.ikai ?? '').trim();

        let key;
        if (upmadMode) {
          key = `upmad|${upmad}`;
        } else if (madMode) {
          key = `mad|${mad}`;
        } else {
          key = `normal|${mad}|${upmad}|${yojna}|${ikai}`;
        }

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            niveshValues: new Set(),
            upniveshValues: new Set(),
            vahanValues: new Set(),
            ikaiValues: new Set(),
            rows: []
          });
        }

        const group = groups.get(key);
        if (mad) group.niveshValues.add(mad);
        if (upmad) group.upniveshValues.add(upmad);
        if (yojna) group.vahanValues.add(yojna);
        if (ikai) group.ikaiValues.add(ikai);
        group.rows.push(row);
      });

      return [...groups.values()].map(group => ({
        ...group,
        nivesh: [...group.niveshValues].join(', '),
        upnivesh: [...group.upniveshValues].join(', '),
        vahan: [...group.vahanValues].join(', '),
        ikai: [...group.ikaiValues].join(', ')
      }));
    }, [filteredData, madMode, upmadMode]);

    const hasData = (item, geo) => item.rows.some(r =>
      r[geoField] === geo &&
      (saleMode
        ? r.matra > 0 && r.ansh > 0
        : r.matra > 0 || r.anudan > 0)
    );

    const visibleGeo = geoList.filter(geo => groupedItems.some(item => hasData(item, geo)));
    const visibleItems = groupedItems.filter(item => visibleGeo.some(geo => hasData(item, geo)));

    const subColumns = saleMode
      ? ['विक्रय दर', 'भौतिक पूर्ति ', 'वित्तीय (₹)']
      : ['भौतिक पूर्ति ', 'वित्तीय (₹)'];

    const hierarchyDefs = enableHierarchyFilters
      ? (upmadMode
          ? [
              { key: 'submad', label: 'उप-मद का नाम' },
              { key: 'mad', label: 'मद का नाम' },
              { key: 'scheme', label: 'योजना का नाम' }
            ]
          : [
              { key: 'mad', label: 'मद का नाम' },
              { key: 'submad', label: 'उप-मद का नाम' },
              { key: 'scheme', label: 'योजना का नाम' }
            ])
      : [
          { key: 'scheme', label: 'योजना का नाम' },
          { key: 'mad', label: 'मद का नाम' },
          { key: 'submad', label: 'उप-मद का नाम' }
        ];

    const matrixDefs = [
      { key: 'sno', label: 'क्रम संख्या' },
      ...hierarchyDefs,
      { key: 'ikai', label: 'इकाई' },
      ...visibleGeo.map((geo, index) => ({ key: `geo_${index}`, label: geo })),
      { key: 'total', label: saleMode ? 'कुल' : 'कुल योग' }
    ];

    const visible = columns === null ? matrixDefs.map(c => c.key) : columns;
    const show = key => visible.includes(key);

    const getCell = (item, geo) => item.rows
      .filter(r => r[geoField] === geo)
      .reduce((a, r) => ({
        mat: a.mat + r.matra,
        val: a.val + (saleMode ? r.ansh : r.anudan)
      }), { mat: 0, val: 0 });

    const geoTotals = Object.fromEntries(visibleGeo.map(geo => [geo, { mat: 0, val: 0 }]));
    let grandMat = 0;
    let grandVal = 0;

    const renderCellValues = (cellData, keyPrefix) => {
      const rate = cellData.mat ? cellData.val / cellData.mat : 0;
      if (saleMode) {
        return (
          <React.Fragment key={keyPrefix}>
            <td>{cellData.mat ? fmtR(rate) : ''}</td>
            <td>{cellData.mat ? fmtN(cellData.mat) : ''}</td>
            <td>{cellData.val ? fmtR(cellData.val) : ''}</td>
          </React.Fragment>
        );
      }
      return (
        <React.Fragment key={keyPrefix}>
          <td>{cellData.mat ? fmtN(cellData.mat) : ''}</td>
          <td>{cellData.val ? fmtR(cellData.val) : ''}</td>
        </React.Fragment>
      );
    };

    const renderTotalValues = (cellData, keyPrefix) => {
      const rate = cellData.mat ? cellData.val / cellData.mat : 0;
      if (saleMode) {
        return (
          <React.Fragment key={keyPrefix}>
            <td className="tot">{cellData.mat ? fmtR(rate) : ''}</td>
            <td className="tot">{fmtN(cellData.mat)}</td>
            <td className="tot">{fmtR(cellData.val)}</td>
          </React.Fragment>
        );
      }
      return (
        <React.Fragment key={keyPrefix}>
          <td className="tot">{fmtN(cellData.mat)}</td>
          <td className="tot">{fmtR(cellData.val)}</td>
        </React.Fragment>
      );
    };

    const colspan = subColumns.length;
    const selectedMadOptions = selectedMad.map(value => ({ value, label: value }));
    const selectedUpmadOptions = selectedUpmad.map(value => ({ value, label: value }));

    // Special actions for both multi-select filters.
    // These are handled without ever becoming actual selected filter values.
    const madFilterOptions = [
      { value: '__SELECT_ALL_MAD__', label: 'सभी चुनें' },
      { value: '__CLEAR_ALL_MAD__', label: 'सभी हटाएं' },
      ...madOptions
    ];
    const upmadFilterOptions = [
      { value: '__SELECT_ALL_UPMAD__', label: 'सभी चुनें' },
      { value: '__CLEAR_ALL_UPMAD__', label: 'सभी हटाएं' },
      ...upmadOptions
    ];

    const handleMadFilterChange = options => {
      const values = options || [];
      if (values.some(option => option.value === '__SELECT_ALL_MAD__')) {
        setSelectedMad(madOptions.map(option => option.value));
        return;
      }
      if (values.some(option => option.value === '__CLEAR_ALL_MAD__')) {
        setSelectedMad([]);
        return;
      }
      setSelectedMad(values.map(option => option.value));
    };

    const handleUpmadFilterChange = options => {
      const values = options || [];
      if (values.some(option => option.value === '__SELECT_ALL_UPMAD__')) {
        setSelectedUpmad(upmadOptions.map(option => option.value));
        return;
      }
      if (values.some(option => option.value === '__CLEAR_ALL_UPMAD__')) {
        setSelectedUpmad([]);
        return;
      }
      setSelectedUpmad(values.map(option => option.value));
    };

    return (
      <>
        {enableHierarchyFilters && (
          <div className="progress-hierarchy-filterbar">
            <div className="progress-hierarchy-filter-group progress-hierarchy-mode-group">
              <label>तालिका किसके अनुसार दिखाएं</label>
              <Select
                isSearchable={false}
                options={[
                  { value: 'mad', label: 'मद के अनुसार' },
                  { value: 'upmad', label: 'उप-मद के अनुसार' }
                ]}
                value={groupBy === 'upmad'
                  ? { value: 'upmad', label: 'उप-मद के अनुसार' }
                  : { value: 'mad', label: 'मद के अनुसार' }}
                onChange={option => setGroupBy(option?.value || 'mad')}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="progress-hierarchy-filter-group">
              <label>मद के अनुसार फ़िल्टर</label>
              <Select
                isMulti
                isSearchable
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                options={madFilterOptions}
                value={selectedMadOptions}
                onChange={handleMadFilterChange}
                placeholder="एक या अधिक मद चुनें..."
                noOptionsMessage={() => 'कोई मद उपलब्ध नहीं'}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="progress-hierarchy-filter-group">
              <label>उप-मद के अनुसार फ़िल्टर</label>
              <Select
                isMulti
                isSearchable
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                options={upmadFilterOptions}
                value={selectedUpmadOptions}
                onChange={handleUpmadFilterChange}
                placeholder="एक या अधिक उप-मद चुनें..."
                noOptionsMessage={() => 'कोई उप-मद उपलब्ध नहीं'}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            {(selectedMad.length || selectedUpmad.length) ? (
              <button
                type="button"
                className="progress-hierarchy-clear-btn"
                onClick={() => {
                  setSelectedMad([]);
                  setSelectedUpmad([]);
                }}
              >
                फ़िल्टर हटाएं
              </button>
            ) : null}
          </div>
        )}

        <ReportColumnSelector
          columns={matrixDefs}
          visibleColumns={columns}
          setVisibleColumns={setColumns}
          label="प्रगति मैट्रिक्स — इस तालिका के स्तंभ चुनें"
        />

        {!visibleGeo.length || !visibleItems.length ? (
          <div className="dynamic-report-empty-box">कोई डेटा नहीं — चुने फ़िल्टर पर कुछ नहीं मिला</div>
        ) : (
          <div className="dynamic-report-table-scroll matrix-scroll">
            <table className="dynamic-report-table matrix-table">
              <thead>
                <tr>
                  {show('sno') && <th rowSpan="2">क्रम संख्या</th>}
                  {upmadMode ? (
                    <>
                      {show('submad') && <th rowSpan="2">उप-मद का नाम</th>}
                      {show('mad') && <th rowSpan="2">मद का नाम</th>}
                      {show('scheme') && <th rowSpan="2">{schemeLabel || 'योजना का नाम'}</th>}
                    </>
                  ) : (
                    <>
                      {show('mad') && <th rowSpan="2">मद का नाम</th>}
                      {show('submad') && <th rowSpan="2">उप-मद का नाम</th>}
                      {show('scheme') && <th rowSpan="2">{schemeLabel || 'योजना का नाम'}</th>}
                    </>
                  )}
                  {show('ikai') && <th rowSpan="2">इकाई</th>}
                  {visibleGeo.map((geo, index) =>
                    show(`geo_${index}`) && <th colSpan={colspan} key={geo}>{geo}</th>
                  )}
                  {show('total') && <th colSpan={colspan}>{saleMode ? 'कुल' : 'कुल योग'}</th>}
                </tr>
                <tr>
                  {visibleGeo.flatMap((geo, index) =>
                    show(`geo_${index}`)
                      ? subColumns.map(column => <th key={`${geo}-${column}`}>{column}</th>)
                      : []
                  )}
                  {show('total') && subColumns.map(column => <th key={`total-${column}`}>{column}</th>)}
                </tr>
              </thead>

              <tbody>
                {visibleItems.map((item, idx) => {
                  let rowMat = 0;
                  let rowVal = 0;

                  const cells = visibleGeo.flatMap((geo, geoIndex) => {
                    const c = getCell(item, geo);
                    geoTotals[geo].mat += c.mat;
                    geoTotals[geo].val += c.val;
                    rowMat += c.mat;
                    rowVal += c.val;
                    return show(`geo_${geoIndex}`)
                      ? [renderCellValues(c, `${item.key}-${geo}`)]
                      : [];
                  });

                  grandMat += rowMat;
                  grandVal += rowVal;

                  return (
                    <tr key={`${item.key}-${idx}`}>
                      {show('sno') && <td>{idx + 1}</td>}
                      {upmadMode ? (
                        <>
                          {show('submad') && <td>{item.upnivesh}</td>}
                          {show('mad') && <td>{item.nivesh}</td>}
                          {show('scheme') && <td>{schemeLabel || item.vahan}</td>}
                        </>
                      ) : (
                        <>
                          {show('mad') && <td>{item.nivesh}</td>}
                          {show('submad') && <td>{item.upnivesh}</td>}
                          {show('scheme') && <td>{schemeLabel || item.vahan}</td>}
                        </>
                      )}
                      {show('ikai') && <td>{item.ikai}</td>}
                      {cells}
                      {show('total') && renderTotalValues({ mat: rowMat, val: rowVal }, `row-total-${idx}`)}
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="report-total-values-row">
                  {(() => {
                    const metaKeys = ['sno', 'mad', 'submad', 'scheme', 'ikai'];
                    const visibleMetaCount = metaKeys.filter(key => show(key)).length;
                    const labelCell = visibleMetaCount > 0 ? <td colSpan={visibleMetaCount}>योग</td> : null;
                    return (
                      <>
                        {labelCell}
                        {visibleGeo.map((geo, geoIndex) =>
                          show(`geo_${geoIndex}`)
                            ? renderTotalValues(geoTotals[geo], `footer-${geo}`)
                            : null
                        )}
                        {show('total') && renderTotalValues({ mat: grandMat, val: grandVal }, 'footer-grand-total')}
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <section
      className="dynamic-report-section"
      style={{
        marginTop: "0",
        paddingTop: "0"
      }}
    >
      <div
        className="dynamic-report-heading"
        style={{
          marginTop: "0",
          marginBottom: "8px",
          paddingTop: "4px",
          paddingBottom: "4px"
        }}
      >
        <h4 style={{ margin: 0 }}>
          <FaTable className="me-2" />विस्तृत रिपोर्ट
        </h4>
      </div>

      <div className="dynamic-report-tabs professional-report-tabs">
        {[['saransh','सारांश'],['pragati','योजना प्रगति विवरण'],['vivaran4401','4401 बिक्री हेतु']]
          .map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={activeTab === key ? 'active' : ''}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
      </div>

      <div className="dynamic-report-content professional-report-content">

        {activeTab === 'saransh' && (
          <div className="dynamic-report-panel">
            <h5 style={{ marginBottom: "6px" }}>सारांश — योजना-वार मद / उप-मद विवरण</h5>

            {/* सारांश देखें + योजना-वार वित्तीय/भौतिक सारांश
                must appear immediately below the main सारांश heading,
                before the date filter. */}
            <SummaryFilteredTable data={summaryRows} />

            <ReportTabDateFilter
              startDate={summaryStartDate}
              endDate={summaryEndDate}
              setStartDate={setSummaryStartDate}
              setEndDate={setSummaryEndDate}
              appliedStartDate={summaryAppliedStartDate}
              appliedEndDate={summaryAppliedEndDate}
              onApply={applySummaryDateFilter}
              onClear={clearSummaryDateFilter}
            />

            <FilterBar section="summary" />

            <h6 className="dynamic-report-subtitle">1) अनुदान वहन योजना के अनुसार सारांश</h6>
            <SummaryPlanTable />

            <h6 className="dynamic-report-subtitle">
              2) विधानसभा / विकासखंड / केंद्र / मद / उप-मद  के नाम अनुसार — योजना-वार
            </h6>
            <SummaryMadUpMadTable data={summaryRows} />
          </div>
        )}

        {activeTab === 'pragati' && (
          <div className="dynamic-report-panel">
            <h5 style={{ marginBottom: "6px" }}>योजना प्रगति विवरण — अनुदान वहन योजना के अनुसार</h5>

            <ReportTabDateFilter
              startDate={progressStartDate}
              endDate={progressEndDate}
              setStartDate={setProgressStartDate}
              setEndDate={setProgressEndDate}
              appliedStartDate={progressAppliedStartDate}
              appliedEndDate={progressAppliedEndDate}
              onApply={applyProgressDateFilter}
              onClear={clearProgressDateFilter}
            />

            <div className="dynamic-report-view-row professional-view-row">
              <label>देखने का प्रकार</label>
              <select value={progressView} onChange={e => setProgressView(e.target.value)}>
                <option value="vidhan">विधानसभा-वार</option>
                <option value="block">ब्लॉक-वार</option>
                <option value="kendra">केंद्र-वार</option>
              </select>
            </div>

            <FilterBar section="progress" />
            <h6 className="dynamic-report-subtitle">प्रगति मैट्रिक्स</h6>

            <MatrixTable
              enableHierarchyFilters={true}
              data={progressRows}
              geoField={progressView === 'vidhan' ? 'vidhan' : progressView === 'block' ? 'block' : 'kendra'}
              geoList={progressView === 'vidhan' ? lists.vidhan : progressView === 'block' ? lists.block : lists.kendra}
              saleMode={false}
              columns={progressColumns}
              setColumns={setProgressColumns}
            />

            {/* ================================================================
                अतिरिक्त प्रगति तालिका 1:
                एक ब्लॉक चुनें — उसके केंद्रों का विवरण
                यह मुख्य progress filters से स्वतंत्र है.
               ================================================================ */}
            <div className="dynamic-report-subsection professional-report-subsection" style={{ marginTop: "30px" }}>
              <h6 className="dynamic-report-subtitle">
               एक ब्लॉक चुनें — उसके केंद्रों का विवरण (मूल प्रारूप जैसा)
              </h6>
              <p className="dynamic-report-note">
                यह तालिका ऊपर के फ़िल्टरों से स्वतंत्र है। नीचे एक ब्लॉक चुनें,
                उसके अंदर आने वाले केंद्र अपने आप कॉलम बनेंगे।
              </p>

              <div className="dynamic-report-view-row professional-view-row">
                <label>ब्लॉक चुनें</label>
                <select
                  value={progressBlock}
                  onChange={e => setProgressBlock(e.target.value)}
                >
                  {progressBlockOptions.length === 0 ? (
                    <option value="">कोई विकल्प उपलब्ध नहीं</option>
                  ) : (
                    progressBlockOptions.map(block => (
                      <option key={block} value={block}>{block}</option>
                    ))
                  )}
                </select>
              </div>

              <p className="dynamic-report-note" style={{ marginTop: "10px" }}>
                ब्लॉक के अनुसार:
              </p>

              <MatrixTable
                enableHierarchyFilters={true}
                data={progressBlockRows}
                geoField="kendra"
                geoList={progressBlockCentres}
                saleMode={false}
                columns={progressBlockColumns}
                setColumns={setProgressBlockColumns}
              />
            </div>

            {/* ================================================================
                अतिरिक्त प्रगति तालिका 2:
                एक विधानसभा चुनें — उसके केंद्रों का विवरण
                यह मुख्य progress filters से स्वतंत्र है.
               ================================================================ */}
            <div className="dynamic-report-subsection professional-report-subsection" style={{ marginTop: "26px" }}>
              <h6 className="dynamic-report-subtitle">
                विधानसभा के अनुसार केंद्रों का विवरण
              </h6>
              <p className="dynamic-report-note">
                यह तालिका भी ऊपर के फ़िल्टरों से स्वतंत्र है। नीचे एक विधानसभा
                चुनें, उसके अंदर आने वाले केंद्र अपने आप कॉलम बनेंगे।
              </p>

              <div className="dynamic-report-view-row professional-view-row">
                <label>विधानसभा चुनें</label>
                <select
                  value={progressVidhan}
                  onChange={e => setProgressVidhan(e.target.value)}
                >
                  {progressVidhanOptions.length === 0 ? (
                    <option value="">कोई विकल्प उपलब्ध नहीं</option>
                  ) : (
                    progressVidhanOptions.map(vidhan => (
                      <option key={vidhan} value={vidhan}>{vidhan}</option>
                    ))
                  )}
                </select>
              </div>

              <p className="dynamic-report-note" style={{ marginTop: "10px" }}>
                विधानसभा के अनुसार:
              </p>

              <MatrixTable
                enableHierarchyFilters={true}
                data={progressVidhanRows}
                geoField="kendra"
                geoList={progressVidhanCentres}
                saleMode={false}
                columns={progressVidhanColumns}
                setColumns={setProgressVidhanColumns}
              />
            </div>
          </div>
        )}

        {activeTab === 'vivaran4401' && (
          <div className="dynamic-report-panel">
            <h5>{fixedPlan || '4401 बिक्री हेतु'} — क्रय योजना के अनुसार</h5>
            <p className="dynamic-report-note">यह शीट केवल 4401 बिक्री हेतु की पंक्तियाँ दिखाती है। भौतिक = भौतिक पूर्ति  और वित्तीय = कृषक अंश।</p>

            <ReportTabDateFilter
              startDate={saleStartDate}
              endDate={saleEndDate}
              setStartDate={setSaleStartDate}
              setEndDate={setSaleEndDate}
              appliedStartDate={saleAppliedStartDate}
              appliedEndDate={saleAppliedEndDate}
              onApply={applySaleDateFilter}
              onClear={clearSaleDateFilter}
            />

            <div className="dynamic-report-view-row professional-view-row">
              <label>देखने का प्रकार</label>
              <select value={saleView} onChange={e => setSaleView(e.target.value)}>
                <option value="vidhan">विधानसभा-वार</option>
                <option value="block">ब्लॉक-वार</option>
                <option value="kendra">केंद्र-वार</option>
              </select>
            </div>

            <FilterBar section="sale" />
            <h6 className="dynamic-report-subtitle">4401 प्रगति मैट्रिक्स — विक्रय दर व कृषक अंश</h6>

            <MatrixTable
              data={saleRows}
              geoField={saleView === 'vidhan' ? 'vidhan' : saleView === 'block' ? 'block' : 'kendra'}
              geoList={saleView === 'vidhan' ? lists.vidhan : saleView === 'block' ? lists.block : lists.kendra}
              saleMode={true}
              schemeLabel={fixedPlan || '—'}
              columns={saleColumns}
              setColumns={setSaleColumns}
            />

            {/* दूसरा 4401 table — मद / उप-मद के अनुसार, स्वतंत्र view और column state. */}
            <div
              className="dynamic-report-subsection professional-report-subsection"
              style={{ marginTop: '26px' }}
            >
              <h6 className="dynamic-report-subtitle">
                4401 प्रगति मैट्रिक्स — मद / उप-मद के अनुसार
              </h6>
              <p className="dynamic-report-note">
                इस तालिका में योजना प्रगति विवरण की तरह मद / उप-मद के अनुसार
                तालिका बदलने और संबंधित फ़िल्टर चुनने की सुविधा है।
              </p>

              <div className="dynamic-report-view-row professional-view-row">
                <label>देखने का प्रकार</label>
                <select
                  value={saleSecondView}
                  onChange={e => setSaleSecondView(e.target.value)}
                >
                  <option value="vidhan">विधानसभा-वार</option>
                  <option value="block">ब्लॉक-वार</option>
                  <option value="kendra">केंद्र-वार</option>
                </select>
              </div>

              <MatrixTable
                enableHierarchyFilters={true}
                data={saleRows}
                geoField={
                  saleSecondView === 'vidhan'
                    ? 'vidhan'
                    : saleSecondView === 'block'
                      ? 'block'
                      : 'kendra'
                }
                geoList={
                  saleSecondView === 'vidhan'
                    ? lists.vidhan
                    : saleSecondView === 'block'
                      ? lists.block
                      : lists.kendra
                }
                saleMode={true}
                schemeLabel={fixedPlan || '—'}
                columns={saleSecondColumns}
                setColumns={setSaleSecondColumns}
              />
            </div>
          </div>
        )}

      </div>
    </section>
  );
};




const DemandCenterwiseEntry = () => {
  const { centerData } = useCenter();
  const [sourceData, setSourceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const loggedInCenter = String(centerData?.centerName || '').trim();

  useEffect(() => {
    let cancelled = false;

    const fetchCenterBillingData = async () => {
      if (!loggedInCenter) {
        setSourceData([]);
        setIsLoading(false);
        setApiError(null);
        return;
      }

      try {
        setIsLoading(true);
        setApiError(null);

        const response = await axios.get(BILLING_API_URL);
        const payload = response?.data?.data ?? response?.data;
        const items = Array.isArray(payload) ? payload : [];

        const normalize = value => String(value ?? '').trim().normalize('NFKD');
        const centerKey = normalize(loggedInCenter);

        const centerItems = items.filter(item =>
          normalize(item?.center_name) === centerKey
        );

        if (!cancelled) {
          setSourceData(centerItems);
        }
      } catch (error) {
        if (!cancelled) {
          setSourceData([]);
          setApiError(
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            'डेटा लोड करने में त्रुटि हुई।'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCenterBillingData();
    return () => { cancelled = true; };
  }, [loggedInCenter]);

  return (
    <Container fluid className="demand-center-report-page">
      <div className="demand-center-navigation">
        <DemandNavigation />
      </div>

      <div className="demand-center-header">
        <div>
          <h4>{loggedInCenter || 'केंद्र'} - केंद्र-वार रिपोर्ट</h4>
        </div>
      </div>

      {apiError && (
        <Alert variant="danger" className="demand-center-alert">
          {apiError}
          <button type="button" className="demand-center-retry" onClick={() => window.location.reload()}>
            पुनः प्रयास करें
          </button>
        </Alert>
      )}

      {isLoading ? (
        <div className="demand-center-loading">
          <Spinner animation="border" variant="primary" />
          <div>डेटा लोड हो रहा है...</div>
        </div>
      ) : sourceData.length === 0 ? (
        <Alert variant="info" className="demand-center-empty">
          <strong>{loggedInCenter || 'इस केंद्र'}</strong> के लिए कोई डेटा उपलब्ध नहीं है।
        </Alert>
      ) : (
        <DynamicReportTabs sourceData={sourceData} />
      )}
    </Container>
  );
};

export default DemandCenterwiseEntry;
