import React, { useState, useEffect } from 'react';
import './AdminKishanBeej.css';


const ADMIN_PRINT_SCHEMES = {
  kisan: {
    name: 'फेंसिंग',
    full: 'जिला योजनान्तर्गत फेंसिंग हेतु कृषक आवेदन पत्र',
    standards: [
      'चैनलिंक वायर: मोटाई 3.15 mm, ऊँचाई 1.40 मीटर, मेश साइज 75 mm × 75 mm, मानक IS 2721 (2003)।',
      'एम.एस. एंगल पोस्ट: 35 mm × 35 mm × 5 mm, कुल लंबाई 2.20 मीटर।',
      'एंगल से एंगल की दूरी 3 मीटर तथा कोनों पर सपोर्टिंग एंगल लगेंगे।',
      'नींव 0.30 × 0.30 × 0.60 मीटर C.C. 1:3:6 में।',
      'समस्त एंगल आयरन पर जंग रोधक पेंट अनिवार्य।',
      'खेत में आवागमन हेतु उपयुक्त स्थान पर गेट लगाया जाएगा।',
      'कार्य का जियो-टैगिंग / फोटोग्राफी कराना अनिवार्य है।'
    ],
    docs: ['अद्यतन खतौनी की प्रति','पहचान पत्र (आधार कार्ड)','उद्यान कार्ड','बैंक पासबुक की प्रति','₹10/- का शपथ पत्र','कार्य प्रारम्भ से पूर्व प्रस्तावित स्थल का जियो-टैग फोटो']
  },
  kiwi: {
    name: 'कीवी उद्यान स्थापना',
    full: 'जिला योजनान्तर्गत कीवी उद्यान स्थापना — कृषक आवेदन पत्र',
    standards: ['ट्रेलिस सिस्टम: T-Bar डिज़ाइन — कुल ऊँचाई 2.5m और आर्म चौड़ाई 2.0m।','फेंसिंग: जी.आई. चेन लिंक फेंसिंग, लोहे के खम्भों के साथ।','रोपण सामग्री: 208 पौधे प्रति एकड़ (167 मुख्य + 41 बैकअप), 9 मादा : 1 नर।','सिंचाई: टपक सिंचाई प्रणाली का उपयोग अनिवार्य।'],
    docs: ['अद्यतन खतौनी (06 माह के भीतर) की प्रति','पहचान पत्र (आधार कार्ड)','उद्यान कार्ड','बैंक पासबुक की प्रति','समूह का पंजीकरण प्रमाण पत्र (यदि समूह हो)','कार्य प्रारम्भ से पूर्व प्रस्तावित स्थल का जियो-टैग फोटो'],
    farmerShare: 30
  },
  dragon: {
    name: 'ड्रैगन फ्रूट (कमलम)',
    full: 'ड्रैगन फ्रूट (कमलम) उत्पादन प्रोत्साहन योजना — कृषक आवेदन पत्र',
    standards: ['प्रति एकड़ 666 RCC पिलर, 2.30 मीटर लंबाई के, शीर्ष पर कंक्रीट रिंग/छल्ला अनिवार्य।','पिलर से पिलर 2.0 मीटर एवं लाइन से लाइन 3.0 मीटर।','प्रति पिलर 4 पौधे — कुल लगभग 2667 पौधे प्रति एकड़।','ड्रिप सिंचाई प्रणाली एवं फर्टिगेशन सिस्टम अनिवार्य।','फेंसिंग: जी.आई. चेन लिंक फेंसिंग, लोहे के खम्भों के साथ।'],
    docs: ['अद्यतन खतौनी (06 माह के भीतर) की प्रति','पहचान पत्र (आधार कार्ड)','उद्यान कार्ड','बैंक पासबुक की प्रति','समूह का पंजीकरण प्रमाण पत्र (यदि समूह हो)','कार्य प्रारम्भ से पूर्व प्रस्तावित स्थल का जियो-टैग फोटो'],
    farmerShare: 20
  }
};

const adminPrintText = (value, fallback='—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

function AdminPrintableApplication({ application }) {
  if (!application) return null;
  const type = application.schemeType || 'kisan';
  const scheme = ADMIN_PRINT_SCHEMES[type] || ADMIN_PRINT_SCHEMES.kisan;
  const personal = application.raw?.personal || {};
  const plan = application.raw?.plan || {};
  const docs = application.raw?.docs || {};
  const area = Number(plan.proposed_area || 0);
  const costPerHa = Number(plan.cost_per_ha || 0);
  const farmerShare = scheme.farmerShare;
  const subsidy = farmerShare != null ? 100 - farmerShare : null;
  const totalCost = area && costPerHa ? area * costPerHa : 0;

  const details = [
    ['कृषक का नाम', personal.name], ['लिंग', personal.gender],
    ['पिता / पति का नाम', personal.father], ['उद्यान कार्ड संख्या', personal.udyan_card],
    ['ग्राम', personal.village], ['पोस्ट', personal.post],
    ['विकासखंड (ब्लॉक)', personal.block], ['जनपद', personal.district],
    ['मोबाइल नम्बर', personal.mobile], ['आधार संख्या', personal.aadhaar],
    ['कृषक की श्रेणी', personal.category]
  ].filter(([,v]) => v !== null && v !== undefined && v !== '');

  const planRows = [
    ['कुल भूमि', plan.total_land], ['प्रस्तावित क्षेत्रफल', plan.proposed_area],
    ['अक्षांश (Latitude)', plan.latitude], ['देशांतर (Longitude)', plan.longitude],
    ['भूमि पर सिंचाई सुविधा', plan.irrigation], ['सिंचाई स्रोत', plan.irr_source],
    ['अन्य सिंचाई स्रोत', plan.irr_other], ['ऊँचाई (मीटर)', plan.altitude],
    ['मुख्य सड़क से दूरी', plan.road_dist], ['भूमि की ढाल', plan.slope],
    ['मृदा प्रकार', plan.soil], ['योजना का नाम', plan.plan_scheme || scheme.name],
    ['प्रति हेक्टेयर योजना लागत', plan.cost_per_ha], ['आवेदन का प्रकार', plan.plan_type],
    ['समूह का नाम', plan.group_name], ['अन्य योजना से सहायता', plan.contribution],
    ['अन्य योजना का नाम', plan.other_scheme], ['बैंक का नाम', plan.bank_name],
    ['शाखा', plan.branch], ['बैंक खाता संख्या', plan.account], ['IFSC कोड', plan.ifsc]
  ].filter(([,v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="print-document print-document-preview">
      <div className="print-page">
        <div className="print-top">
          <div className="print-app-no">आवेदन क्रमांक: {adminPrintText(application.form_id)}</div>
          <div className="print-photo">
            {personal.photo ? <img src={personal.photo} alt="कृषक" /> : <>फोटो<br />प्रभारी द्वारा<br />सत्यापित</>}
          </div>
        </div>
        <h1 className="print-title">{scheme.full}</h1>
        <div className="print-department">उद्यान एवं खाद्य प्रसंस्करण विभाग</div>

        <table className="print-table print-details-table"><tbody>
          <tr><td className="print-key">आवेदित योजना</td><td>{scheme.name}</td></tr>
          {details.map(([label,value]) => <tr key={label}><td className="print-key">{label}</td><td>{adminPrintText(value)}</td></tr>)}
        </tbody></table>

        <section className="print-section print-avoid-break">
          <h2>भूमि एवं योजना विवरण</h2>
          <table className="print-table"><tbody>
            {planRows.map(([label,value]) => <tr key={label}><td className="print-key">{label}</td><td>{adminPrintText(value)}</td></tr>)}
          </tbody></table>
        </section>

        {area > 0 && (
          <section className="print-section print-avoid-break">
            <h2>क्षेत्रफल एवं मानकानुसार अनुमानित गणना</h2>
            <table className="print-table"><tbody>
              <tr><td className="print-key">प्रस्तावित क्षेत्रफल</td><td>{area} हेक्टेयर</td></tr>
              {type === 'kiwi' && <><tr><td className="print-key">कुल पौधे</td><td>{Math.round(208 * area).toLocaleString('en-IN')}</td></tr><tr><td className="print-key">मादा : नर</td><td>9 : 1</td></tr></>}
              {type === 'dragon' && <><tr><td className="print-key">RCC पिलर</td><td>{Math.round(666 * area).toLocaleString('en-IN')}</td></tr><tr><td className="print-key">कुल पौधे</td><td>{Math.round(2667 * area).toLocaleString('en-IN')}</td></tr></>}
            </tbody></table>
          </section>
        )}

        {totalCost > 0 && subsidy != null && (
          <section className="print-section print-avoid-break">
            <h2>लागत एवं राजसहायता</h2>
            <table className="print-table"><tbody>
              <tr><td className="print-key">प्रति हेक्टेयर योजना लागत</td><td>₹{Math.round(costPerHa).toLocaleString('en-IN')}</td></tr>
              <tr><td className="print-key">प्रस्तावित क्षेत्रफल</td><td>{area.toFixed(3)} हेक्टेयर</td></tr>
              <tr><td className="print-key">कुल लागत</td><td>₹{Math.round(totalCost).toLocaleString('en-IN')}</td></tr>
              <tr><td className="print-key">राजसहायता ({subsidy}%)</td><td>₹{Math.round(totalCost * subsidy / 100).toLocaleString('en-IN')}</td></tr>
              <tr><td className="print-key">कृषक अंश ({farmerShare}%)</td><td>₹{Math.round(totalCost * farmerShare / 100).toLocaleString('en-IN')}</td></tr>
            </tbody></table>
            <p className="print-note">राजसहायता का निर्धारण प्रति हेक्टेयर लागत पर आनुपातिक रूप से किया जाएगा। स्वीकृत मानक से अधिक व्यय कृषक द्वारा स्वयं वहन किया जाएगा।</p>
          </section>
        )}

        <section className="print-section print-avoid-break">
          <h2>तकनीकी मानकों एवं शर्तों की स्वीकारोक्ति</h2>
          <ul className="print-list">{scheme.standards.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="print-note">{docs.technical_standard_accepted ? '☑ उपरोक्त मानक स्वीकार किए गए।' : '☐ उपरोक्त मानक स्वीकार किए गए।'}</p>
        </section>

        <section className="print-section print-avoid-break">
          <h2>संलग्न दस्तावेज़ों की सूची</h2>
          <ol className="print-list">{scheme.docs.map(doc => <li key={doc}>{Array.isArray(docs.documents) && docs.documents.includes(doc) ? '☑' : '☐'} {doc}</li>)}</ol>
        </section>

        <section className="print-section print-avoid-break">
          <h2>घोषणा</h2>
          <p>मैं प्रमाणित करता/करती हूँ कि उपरोक्त दी गई सभी जानकारी मेरी जानकारी में पूर्णतः सही है।</p>
          <p>मैं प्रमाणित करता/करती हूँ कि कार्य के दौरान उपरोक्त तकनीकी मानकों का पालन अनिवार्यतः करूँगा/करूँगी।</p>
          <p className="print-check">{docs.declaration_accepted ? '☑' : '☐'} घोषणा स्वीकार की गई।</p>
        </section>

        <div className="print-signatures">
          <div>दिनांक: {adminPrintText(docs.application_date)}<br />स्थान: {adminPrintText(docs.place)}</div>
          <div>हस्ताक्षर (आवेदक): ____________________</div>
        </div>
        <div className="print-officer"><b>प्रभारी की आख्या</b><p>स्थलीय निरीक्षण एवं विभागीय परीक्षण के उपरांत आख्या अंकित की जाएगी।</p><div>हस्ताक्षर प्रभारी: ____________________</div></div>
      </div>
    </div>
  );
}

function AdminKishanAavedan() {
  const [data, setData] = useState({ kisan: [], kiwi: [], dragon: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('kisan');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Full-screen application document viewer.
  const [viewingApplication, setViewingApplication] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://mahadevaaya.com/govbillingsystem/backend/api/all-kisan-applications/'
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();

      if (result.status && result.data) {
        setData({
          kisan: processCategoryData(result.data.kisan, 'kisan'),
          kiwi: processCategoryData(result.data.kiwi, 'kiwi'),
          dragon: processCategoryData(result.data.dragon, 'dragon'),
        });
      } else {
        setData({ kisan: [], kiwi: [], dragon: [] });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processCategoryData = (categoryData, type) => {
    if (!categoryData) return [];

    const personalKey = type === 'kisan' ? 'personal_land' : 'personal';
    const planKey =
      type === 'kisan' ? 'plan_technical_bank' : 'plan_land_bank';

    const personalMap = {};
    categoryData[personalKey]?.forEach((p) => {
      if (p?.form_id) personalMap[p.form_id] = p;
    });

    const planMap = {};
    categoryData[planKey]?.forEach((p) => {
      if (p?.form_id) planMap[p.form_id] = p;
    });

    const docMap = {};
    categoryData.documents?.forEach((d) => {
      if (d?.form_id) docMap[d.form_id] = d;
    });

    const formIds = new Set([
      ...Object.keys(personalMap),
      ...Object.keys(planMap),
      ...Object.keys(docMap),
    ]);

    return Array.from(formIds).map((formId) => {
      const personal = personalMap[formId] || {};
      const plan = planMap[formId] || {};
      const docs = docMap[formId] || {};

      const isComplete = Boolean(
        personal.name &&
          plan.total_land &&
          docs.declaration_accepted === true
      );

      return {
        form_id: formId,
        name: personal.name || '-',
        mobile: personal.mobile || '-',
        father: personal.father || '-',
        village: personal.village || '-',
        block: personal.block || '-',
        district: personal.district || '-',
        scheme:
          plan.plan_scheme ||
          personal.plan_scheme ||
          getSchemeDisplayName(type),
        created_at:
          personal.created_at ||
          plan.created_at ||
          docs.created_at ||
          '',
        isComplete,
        raw: { personal, plan, docs },
        schemeType: type,
      };
    });
  };

  const getSchemeDisplayName = (type) => {
    if (type === 'kiwi') return 'कीवी उद्यान स्थापना';
    if (type === 'dragon') return 'ड्रैगन फ्रूट (कमलम)';
    return 'फेंसिंग';
  };

  const getSchemeEnglishName = (type) => {
    if (type === 'kiwi') return 'Kiwi Orchard Establishment';
    if (type === 'dragon') return 'Dragon Fruit (Kamalam)';
    return 'Fencing';
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setStatusFilter('all');
  };

  const getFilteredData = () => {
    let filtered = data[activeTab] || [];

    if (statusFilter === 'completed') {
      filtered = filtered.filter((item) => item.isComplete);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter((item) => !item.isComplete);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();

      filtered = filtered.filter((item) => {
        return (
          String(item.name || '').toLowerCase().includes(q) ||
          String(item.form_id || '').toLowerCase().includes(q) ||
          String(item.mobile || '').includes(q) ||
          String(item.father || '').toLowerCase().includes(q) ||
          String(item.district || '').toLowerCase().includes(q) ||
          String(item.scheme || '').toLowerCase().includes(q)
        );
      });
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  const openApplicationView = (item) => {
    setViewingApplication(item);
    document.body.classList.add('admin-application-view-open');
  };

  const closeApplicationView = () => {
    setViewingApplication(null);
    document.body.classList.remove('admin-application-view-open');
  };

  const printApplication = () => {
    if (!viewingApplication) return;

    const overlay = document.querySelector('.application-preview-overlay');
    const modal = overlay?.querySelector('.application-preview-modal');
    const documentNode = modal?.querySelector('.print-document-preview');

    if (!overlay || !modal || !documentNode) {
      window.alert('प्रिंट के लिए आवेदन तैयार नहीं है। कृपया पुनः प्रयास करें।');
      return;
    }

    const body = document.body;
    body.classList.add('printing-completed-application');

    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      body.classList.remove('printing-completed-application');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    const printNow = () => {
      /*
       * Force Chromium to recalculate the print layout after the
       * print-only CSS has changed the modal from fixed/scrolling
       * layout to normal A4 document flow.
       */
      void overlay.offsetWidth;
      void modal.offsetWidth;
      void documentNode.offsetWidth;
      void documentNode.offsetHeight;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
    };

    /*
     * If the application contains a farmer photo, wait for it before
     * printing. A broken image must never block printing.
     */
    const images = Array.from(documentNode.querySelectorAll('img'));
    const pendingImages = images.filter((img) => !img.complete);

    if (pendingImages.length === 0) {
      printNow();
      return;
    }

    let remaining = pendingImages.length;
    let started = false;

    const imageReady = () => {
      if (started || cleaned) return;

      remaining -= 1;

      if (remaining <= 0) {
        started = true;
        printNow();
      }
    };

    pendingImages.forEach((img) => {
      img.addEventListener('load', imageReady, { once: true });
      img.addEventListener('error', imageReady, { once: true });
    });

    /*
     * Fallback: do not keep the print dialog waiting forever because
     * an image request is slow or unavailable.
     */
    window.setTimeout(() => {
      if (started || cleaned) return;
      started = true;
      printNow();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('admin-application-view-open');
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-spinner"></div>
        <p>Loading Applications...</p>
      </div>
    );
  }

  if (error) {
    return <div className="admin-error">Error: {error}</div>;
  }

  return (
    <>
      <div className="admin-kishan-container">
        <div className="header-section">
          <h2>Kishan Avedan Admin Panel</h2>
          <p>Manage and review farmer subsidy applications</p>
        </div>

        <div className="admin-controls-bar">
          <div className="admin-tabs">
            {['kisan', 'kiwi', 'dragon'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn ${
                  activeTab === tab ? 'active' : ''
                }`}
                onClick={() => handleTabChange(tab)}
              >
                {tab === 'kisan'
                  ? 'फेंसिंग'
                  : tab === 'kiwi'
                    ? 'कीवी उद्यान'
                    : 'ड्रैगन फ्रूट'}
              </button>
            ))}
          </div>

          <div className="admin-filters">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search Name, Form ID, Mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="all">All Applications</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Form ID</th>
                <th>Scheme</th>
                <th>Applicant Name</th>
                <th>Father's Name</th>
                <th>Village</th>
                <th>District</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-data">
                    <div className="no-data-content">
                      <span>📋</span>
                      <p>No applications found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr
                    key={`${item.schemeType}-${item.form_id}-${index}`}
                    className="data-row"
                  >
                    <td className="form-id-cell">{item.form_id}</td>

                    <td className="scheme-cell" title={item.scheme}>
                      <strong>{item.scheme}</strong>
                      <small>{getSchemeEnglishName(item.schemeType)}</small>
                    </td>

                    <td className="name-cell">{item.name}</td>
                    <td>{item.father}</td>
                    <td>{item.village}</td>
                    <td>{item.district}</td>
                    <td>{item.mobile}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          item.isComplete ? 'completed' : 'pending'
                        }`}
                      >
                        <span className="status-dot"></span>
                        {item.isComplete ? 'Completed' : 'Pending'}
                      </span>
                    </td>

                    <td className="action-cell">
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() => openApplicationView(item)}
                      >
                        देखें
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingApplication && (
        <div
          className="application-preview-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeApplicationView();
          }}
        >
          <div className="application-preview-modal" role="dialog" aria-modal="true" aria-label="आवेदन पूर्वावलोकन">
            <div className="preview-modal-head">
              <div className="preview-heading-copy">
                <span className="preview-eyebrow">पूर्ण आवेदन • प्रिंट पूर्वावलोकन</span>
                <h2>{viewingApplication.scheme || getSchemeDisplayName(viewingApplication.schemeType)}</h2>
                <span>आवेदन क्रमांक: {viewingApplication.form_id}</span>
              </div>
              <div className="preview-modal-actions">
                <button type="button" className="preview-print-btn" onClick={printApplication}>🖨 प्रिंट / PDF</button>
                <button type="button" className="preview-close" onClick={closeApplicationView} aria-label="बंद करें">×</button>
              </div>
            </div>
            <div className="preview-modal-body">
              <AdminPrintableApplication application={viewingApplication} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminKishanAavedan;
