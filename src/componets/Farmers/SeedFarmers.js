import React, { useState } from 'react';


const centres = [
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

const varietiesByCentre = {
  "अखोरी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "अंजनीसैंण": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "अच्चरीखूंट": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "गाजा": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "गर्केत": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "घनसाली": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "घुत्तू": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "चम्बा": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "जड़ीपानी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "जौनपुर": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "टिहरी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "थत्यूड़": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "थौलधार": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "देवदर्शनी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "देवप्रयाग": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "धनोल्टी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "नंदगांव": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "नैनबाग": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "नरेन्द्रनगर": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "न्योली": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "पंतवारी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "पवखाल": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "पावकी देवी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "प्रतापनगर": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "बौराड़ी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "बाचेलीखाल": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "भवान": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "भेदियाना": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "भिलंगना": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "मरौड़ा": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "मुनि की रेती": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "म्याणी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "राजाखेत": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "लंबगांव": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "लेसर": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "वली": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "श्रीकोट": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "सबली": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "हुलानाखाल": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "हिंडोलाखाल": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "हिसरियाखाल": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "फकोट": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "कमांद": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "कोड़ी": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "कुमाल्डा": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "कीर्तिनगर": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
  "छाम": [
    "ब्रोकली Rock 001",
    "बैंगन BSHB-33 (Navin)",
    "टमाटर Sindhu",
    "शिमला मिर्च Alaska",
    "बंदगोभी Bajwa60",
    "फूलगोभी AZCL-900",
  ],
};

const SeedFarmers = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCentre, setSelectedCentre] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');

  const tabs = [
    { id: 'home', label: 'होम' },
    { id: 'distribution', label: '✍️ वितरण' },
    { id: 'stock', label: '📦 स्टॉक' },
    { id: 'standard', label: '⚙️ मानक' },
    { id: 'report', label: '📊 रिपोर्ट' },
  ];

  const availableVarieties = selectedCentre
    ? varietiesByCentre[selectedCentre] || []
    : [];

  return (
    <div className="school-finance-app">
      {/* Top Header */}
      <header className="top-header">
        <div className="left">
          <div className="logo">SF</div>
          <h1>कृषि विभाग — बीज वितरण प्रबंधन</h1>
        </div>
        <div className="right">
          <span>होम</span>
          <span>प्रोफ़ाइल</span>
          <span>सूचनाएं</span>
          <span>लॉगआउट</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="container">
        
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="tab-content active">
            <div className="page-title">एक नज़र में स्थिति</div>
            <p className="subtext">नीचे पूरी योजना की जीवंत स्थिति है। कोई भी संख्या लाल दिखे तो उसी टैब में जाकर जाँच करें।</p>

            <div className="summary-grid">
              <div className="summary-card green">
                <div className="label">कुल क्रय राशि</div>
                <div className="value">₹22,43,295.00</div>
                <div className="sub">सभी 10 किस्में</div>
              </div>
              <div className="summary-card">
                <div className="label">किसानों को वितरित</div>
                <div className="value">0.00 ग्राम</div>
                <div className="sub">0 प्रविष्टियाँ</div>
              </div>
              <div className="summary-card orange">
                <div className="label">केन्द्रों में शेष</div>
                <div className="value">39,630.00 ग्राम</div>
                <div className="sub">प्राप्त 39,630 ग्राम में से</div>
              </div>
              <div className="summary-card red">
                <div className="label">ध्यान देने योग्य</div>
                <div className="value">0</div>
                <div className="sub">0 अधिक-वितरण, 0 हस्ताक्षर बाकी</div>
              </div>
            </div>

            <div className="info-box">
              <h3>ज़रूरी जाँच</h3>
              <ul className="check-list">
                <li>✔ किसी भी केन्द्र में स्टॉक से अधिक वितरण नहीं हुआ।</li>
                <li>✔ सभी प्रविष्टियों में दोनों हस्ताक्षर पूर्ण हैं।</li>
                <li>✔ सभी 10 किस्मों का मानक ₹60,000/हे0 से पूरा मेल खाता है।</li>
                <li>✔ किसी किस्म का आवंटन उसकी खरीदी मात्रा से अधिक नहीं है।</li>
                <li>✔ कुल राजसहायता ₹0.00 + कृषक अंश ₹0.00 = कुल परियोजना निवेश ₹0.00 — मिलान सही।</li>
              </ul>
            </div>

            <div className="info-box">
              <h3>काम का क्रम — बस इतना ही</h3>
              <ol>
                <li><strong>मानक टैब</strong> — एक बार जाँच लें कि हर किस्म का कुल ₹60,000/हे0 (राजसहायता ₹30,000 + कृषक अंश ₹30,000) से मेल खाता है। सब हरा है तो कुछ करने की ज़रूरत नहीं।</li>
                <li><strong>स्टॉक टैब</strong> — बीज की खरीद और केन्द्रों को आवंटन यहीं दर्ज होता है। दोनों पहले से भरे हुए हैं; नई खरीद/आवंटन आने पर ही छूएँ।</li>
                <li><strong>वितरण टैब</strong> — रोज़ का असली काम। केन्द्र, किस्म, किसान का नाम और क्षेत्रफल भरें — बाक़ी सब अपने आप।</li>
                <li><strong>रिपोर्ट टैब</strong> — छपाई व CSV। छपी प्रति पर हस्ताक्षर करवाकर फाइल में लगाएँ।</li>
              </ol>
            </div>
          </div>
        )}

        {/* Distribution Tab */}
        {activeTab === 'distribution' && (
          <div className="tab-content active">
            <div className="page-title">✍️ वितरण — किसान को बीज वितरण</div>
            <p className="subtext">केवल केन्द्र, किस्म, किसान का नाम और क्षेत्रफल भरना है — बीज की मात्रा, चारों मद और राशि अपने आप निकल आएँगी।</p>

            {/* New Entry Form */}
            <div className="info-box form-section">
              <h3>नई प्रविष्टि</h3>
              <div className="form-grid four-col">
                <div className="form-group">
                  <label>दिनांक <span className="required">*</span></label>
                  <input type="text" defaultValue="04-09-2026" />
                </div>

                <div className="form-group">
                  <label>उ0स0द0 केन्द्र <span className="required">*</span></label>
                  <select
                    id="f-centre"
                    className="need"
                    value={selectedCentre}
                    onChange={(e) => {
                      setSelectedCentre(e.target.value);
                      setSelectedVariety('');
                    }}
                  >
                    <option value="">— केन्द्र चुनें —</option>
                    {centres.map((centre) => (
                      <option key={centre} value={centre}>
                        {centre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>किस्म <span className="required">*</span></label>
                  <select
                    id="f-variety"
                    className="need"
                    value={selectedVariety}
                    onChange={(e) => setSelectedVariety(e.target.value)}
                    disabled={!selectedCentre}
                  >
                    <option value="">— किस्म चुनें —</option>
                    {availableVarieties.map((variety) => (
                      <option key={variety} value={variety}>
                        {variety}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>क्षेत्रफल (है0) <span className="required">*</span></label>
                  <input type="text" placeholder="जैसे 0.200" />
                </div>

                <div className="form-group">
                  <label>कृषक का नाम <span className="required">*</span></label>
                  <input type="text" placeholder="श्री ..." />
                </div>

                <div className="form-group">
                  <label>पिता/पति का नाम</label>
                  <input type="text" />
                </div>

                <div className="form-group">
                  <label>ग्राम</label>
                  <input type="text" />
                </div>

                <div className="form-group">
                  <label>मोबाइल नं0</label>
                  <input type="text" />
                </div>

                <div className="form-group">
                  <label>कृषक हस्ताक्षर/अंगूठा</label>
                  <input type="text" defaultValue="नहीं लिया" />
                </div>

                <div className="form-group">
                  <label>वितरक हस्ताक्षर</label>
                  <input type="text" defaultValue="नहीं लिया" />
                </div>
              </div>
               
              <div className="form-group full-width">
                <label>टिप्पणी</label>
                <textarea readOnly placeholder="क्षेत्रफल भरते ही यहाँ पूरी गणना और केन्द्र का शेष स्टॉक दिखेगा।"></textarea>
              </div>

              <div className="actions">
                <button className="btn">✓ रजिस्टर में जोड़ें</button>
                <button className="btn secondary">साफ़ करें</button>
              </div>
            </div>

            {/* List & Filters */}
            <div className="info-box">
              <h3>वितरण सूची</h3>
              <div className="filter-bar">
                <div className="filter-group">
                  <label>केन्द्र से छाँटें</label>
                  <select><option>सभी केन्द्र</option></select>
                </div>
                <div className="filter-group">
                  <label>किस्म से छाँटें</label>
                  <select><option>सभी किस्में</option></select>
                </div>
                <div className="filter-group">
                  <label>नाम/ग्राम से खोजें</label>
                  <input type="text" placeholder="टाइप करें..." />
                </div>
                <div className="entries-count">0 प्रविष्टियाँ</div>
              </div>

              <div className="table-actions">
                <button className="btn">🖨 छापें (A4)</button>
                <button className="btn secondary">⬇ CSV</button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>क्रमांक</th>
                    <th>केन्द्र</th>
                    <th>किस्म</th>
                    <th>किसान का नाम</th>
                    <th>क्षेत्रफल (हे0)</th>
                    <th>मात्रा (ग्राम)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan="6" style={{textAlign: 'center', color: '#94a3b8'}}>अभी तक कोई वितरण प्रविष्टि नहीं है।</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div className="tab-content active">
            <div className="page-title">स्टॉक एवं आवंटन विवरण</div>
            <div className="actions">
              <button className="btn">नई खरीद दर्ज करें</button>
              <button className="btn secondary">केन्द्रों को आवंटन करें</button>
            </div>
            <div className="info-box">
              <h3>वर्तमान स्टॉक स्थिति</h3>
              <table>
                <thead>
                  <tr>
                    <th>किस्म का नाम</th>
                    <th>कुल खरीदी (ग्राम)</th>
                    <th>केन्द्रों को आवंटन (ग्राम)</th>
                    <th>शेष स्टॉक (ग्राम)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>कुल मिलाकर</td>
                    <td>39,630.00</td>
                    <td>39,630.00</td>
                    <td>0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Standard Tab */}
        {activeTab === 'standard' && (
          <div className="tab-content active">
            <div className="page-title">मानक एवं वित्तीय अनुपालन</div>
            <div className="info-box">
              <h3>मानक जाँच प्रणाली</h3>
              <p>हर किस्म का कुल मानक ₹60,000/हे0 (राजसहायता ₹30,000 + कृषक अंश ₹30,000) से पूरा मेल खाता है।</p>
              <table>
                <thead>
                  <tr>
                    <th>किस्म क्रमांक</th>
                    <th>मानक राशि (₹/हे0)</th>
                    <th>राजसहायता (₹)</th>
                    <th>कृषक अंश (₹)</th>
                    <th>स्थिति</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1 से 10 (सभी किस्में)</td><td>60,000</td><td>30,000</td><td>30,000</td><td><span className="badge paid">मानक पूर्ण</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="tab-content active">
            <div className="page-title">रिपोर्ट एवं प्रिंट</div>
            <div className="actions">
              <button className="btn">प्रिंट करें</button>
              <button className="btn secondary">CSV डाउनलोड करें</button>
            </div>
            <div className="info-box">
              <h3>निर्यात विकल्प</h3>
              <p>यहाँ से आप छपाई हेतु प्रति डाउनलोड कर सकते हैं और CSV फ़ाइल निर्यात कर सकते हैं। छपी प्रति पर हस्ताक्षर करवाकर फाइल में लगाएँ।</p>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        © 2025 बीज वितरण प्रबंधन प्रणाली। सर्वाधिकार सुरक्षित।
      </footer>
    </div>
  );
};

export default SeedFarmers;
