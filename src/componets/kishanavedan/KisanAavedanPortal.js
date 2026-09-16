
import React, { useEffect, useMemo, useState } from "react";
import "./kisan-aavedan-portal.css";

const NALI_HA = 0.02;
const NALI_ACRE = 20;
const IRR = ["पाइपलाइन", "पानी की टंकी", "नहर", "बोरिंग", "अन्य"];
const CAT_SM = ["लघु कृषक", "सीमांत कृषक", "अन्य"];

// Shared draft-detection helpers. Keep these at module scope so every
// GET/resume path can use the same rules without redeclaration errors.
const hasMeaningfulValue = (value) => {
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item));
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value === true;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== "" && normalized !== "null" && normalized !== "undefined";
};

const hasAnySavedField = (item) => {
  const sections = [
    item?.personal || {},
    item?.plan_land_bank || {},
    item?.plan_technical_bank || {},
    item?.application_documents || {},
  ];
  const metadata = new Set(["id", "form_id", "created_at", "updated_at"]);
  return sections.some((section) =>
    Object.entries(section).some(([key, value]) =>
      !metadata.has(key) && hasMeaningfulValue(value)
    )
  );
};

const SCHEMES = {
  fencing: {
    name: "फेंसिंग",
    full: "जिला योजनान्तर्गत फेंसिंग हेतु कृषक आवेदन पत्र",
    tag: "खेत की सुरक्षा हेतु बाड़",
    blurb:
      "जंगली जानवरों व आवारा पशुओं से फसल बचाने हेतु फेंसिंग — चेन लिंक अथवा कांटेदार तार।",
    tags: ["चेन लिंक फेंसिंग", "कांटेदार तार की बाड़"],
    code: "CLF",
    costPerHa: 200000,
    docs: [
      "अद्यतन खतौनी की प्रति",
      "पहचान पत्र (आधार कार्ड)",
      "उद्यान कार्ड",
      "बैंक पासबुक की प्रति",
      "₹10/- का शपथ पत्र",
      "कार्य प्रारम्भ से पूर्व प्रस्तावित स्थल का जियो-टैग फोटो",
    ],
    standards: [
      "चैनलिंक वायर: मोटाई 3.15 mm, ऊँचाई 1.40 मीटर, मेश साइज 75 mm × 75 mm, मानक IS 2721 (2003)।",
      "एम.एस. एंगल पोस्ट: 35 mm × 35 mm × 5 mm, कुल लंबाई 2.20 मीटर।",
      "एंगल से एंगल की दूरी 3 मीटर तथा कोनों पर सपोर्टिंग एंगल लगेंगे।",
      "नींव 0.30 × 0.30 × 0.60 मीटर C.C. 1:3:6 में।",
      "समस्त एंगल आयरन पर जंग रोधक पेंट अनिवार्य।",
      "खेत में आवागमन हेतु उपयुक्त स्थान पर गेट लगाया जाएगा।",
      "कार्य का जियो-टैगिंग / फोटोग्राफी कराना अनिवार्य है।",
    ],
    barbed: [
      "एम.एस. एंगल पोस्ट: 35 mm × 35 mm × 5 mm, कुल लंबाई 2.20 मीटर।",
      "एंगल से एंगल की दूरी 3 मीटर तथा कोनों पर सपोर्टिंग एंगल लगेंगे।",
      "नींव 0.30 × 0.30 × 0.60 मीटर C.C. 1:3:6 में।",
      "समस्त एंगल आयरन पर जंग रोधक पेंट अनिवार्य।",
      "कांटेदार तार की पंक्तियाँ तनाव तार सहित लगाई जाएंगी।",
      "खेत में आवागमन हेतु उपयुक्त स्थान पर गेट लगाया जाएगा।",
      "कार्य का जियो-टैगिंग / फोटोग्राफी कराना अनिवार्य है।",
    ],
    steps: [
      "scheme",
      "personal",
      "land",
      "bank",
      "technical",
      "docs",
      "declaration",
    ],
  },
  kiwi: {
    name: "कीवी उद्यान स्थापना",
    full: "जिला योजनान्तर्गत कीवी उद्यान स्थापना — कृषक आवेदन पत्र",
    tag: "नकदी बागवानी",
    blurb:
      "ट्रेलिस, ड्रिप सिंचाई व फेंसिंग सहित कीवी बागान की स्थापना पर सहायता।",
    tags: ["208 पौधे/एकड़", "9 मादा : 1 नर", "कृषक अंश 30%"],
    code: "KWI",
    farmerShare: 30,
    docs: [
      "अद्यतन खतौनी (06 माह के भीतर) की प्रति",
      "पहचान पत्र (आधार कार्ड)",
      "उद्यान कार्ड",
      "बैंक पासबुक की प्रति",
      "समूह का पंजीकरण प्रमाण पत्र (यदि समूह हो)",
      "कार्य प्रारम्भ से पूर्व प्रस्तावित स्थल का जियो-टैग फोटो",
    ],
    standards: [
      "ट्रेलिस सिस्टम: T-Bar डिज़ाइन — कुल ऊँचाई 2.5m और आर्म चौड़ाई 2.0m।",
      "फेंसिंग: जी.आई. चेन लिंक फेंसिंग, लोहे के खम्भों के साथ।",
      "रोपण सामग्री: 208 पौधे प्रति एकड़ (167 मुख्य + 41 बैकअप), 9 मादा : 1 नर।",
      "सिंचाई: टपक सिंचाई प्रणाली का उपयोग अनिवार्य।",
    ],
    steps: ["personal", "land", "planbank", "technical", "docs", "declaration"],
  },
  dragon: {
    name: "ड्रैगन फ्रूट (कमलम)",
    full: "ड्रैगन फ्रूट (कमलम) उत्पादन प्रोत्साहन योजना — कृषक आवेदन पत्र",
    tag: "कम पानी, अधिक आय",
    blurb:
      "RCC पिलर, ड्रिप-फर्टिगेशन व फेंसिंग सहित ड्रैगन फ्रूट बागान की स्थापना।",
    tags: ["666 पिलर/एकड़", "2667 पौधे", "कृषक अंश 20%"],
    code: "DRF",
    farmerShare: 20,
    docs: [
      "अद्यतन खतौनी (06 माह के भीतर) की प्रति",
      "पहचान पत्र (आधार कार्ड)",
      "उद्यान कार्ड",
      "बैंक पासबुक की प्रति",
      "समूह का पंजीकरण प्रमाण पत्र (यदि समूह हो)",
      "कार्य प्रारम्भ से पूर्व प्रस्तावित स्थल का जियो-टैग फोटो",
    ],
    standards: [
      "प्रति एकड़ 666 RCC पिलर, 2.30 मीटर लंबाई के, शीर्ष पर कंक्रीट रिंग/छल्ला अनिवार्य।",
      "पिलर से पिलर 2.0 मीटर एवं लाइन से लाइन 3.0 मीटर।",
      "प्रति पिलर 4 पौधे — कुल लगभग 2667 पौधे प्रति एकड़।",
      "ड्रिप सिंचाई प्रणाली एवं फर्टिगेशन सिस्टम अनिवार्य।",
      "फेंसिंग: जी.आई. चेन लिंक फेंसिंग, लोहे के खम्भों के साथ।",
    ],
    steps: ["personal", "land", "planbank", "technical", "docs", "declaration"],
  },
};

const initialData = {
  gender: "",
  centerName: "",
  docs: [],
  irrSource: [],
  date: new Date().toISOString().slice(0, 10),
  propArea_unit: "नाली",
  photo: "",
};

const stepTitles = {
  scheme: "योजना एवं फेंसिंग का प्रकार",
  personal: "कृषक का विवरण",
  land: "भूमि एवं भौगोलिक स्थिति",
  bank: "बैंक विवरण",
  planbank: "योजना एवं बैंक विवरण",
  technical: "कार्यनिष्पादन एवं तकनीकी मानक",
  docs: "संलग्न दस्तावेज़",
  declaration: "घोषणा",
};

function rupees(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function toNali(data) {
  const v = parseFloat(data.propArea_val);
  if (!v || v <= 0) return 0;
  if (data.propArea_unit === "हेक्टेयर") return v / NALI_HA;
  if (data.propArea_unit === "एकड़") return v * NALI_ACRE;
  return v;
}
function escName(gender) {
  if (gender === "महिला") return "करती हूँ";
  if (gender === "अन्य") return "करता/करती हूँ";
  return "करता हूँ";
}
function calculate(scheme, data) {
  const nali = toNali(data),
    acre = nali / NALI_ACRE,
    ha = nali * NALI_HA;
  const perHa = scheme.costPerHa || Number(data.costPerHa || 0);
  let subPct = scheme.farmerShare ? 100 - scheme.farmerShare : null;
  if (scheme === SCHEMES.fencing) {
    if (!data.subsidyRatio) subPct = null;
    else subPct = data.subsidyRatio.startsWith("50%") ? 50 : 80;
  }
  const cost =
    ha && perHa && subPct != null
      ? {
          ha,
          perHa,
          total: ha * perHa,
          sub: (ha * perHa * subPct) / 100,
          farmer: (ha * perHa * (100 - subPct)) / 100,
          subPct,
        }
      : null;
  const rows = nali
    ? [
        [
          "क्षेत्रफल",
          `${acre.toFixed(2)} एकड़ / ${ha.toFixed(3)} हे0 / ${nali.toFixed(1)} नाली`,
        ],
      ]
    : [];
  if (nali && scheme === SCHEMES.kiwi) {
    const main = Math.round(167 * acre),
      back = Math.round(41 * acre);
    rows.push(
      ["कुल पौधे", (main + back).toLocaleString("en-IN")],
      [
        "मुख्य + बैकअप",
        `${main.toLocaleString("en-IN")} + ${back.toLocaleString("en-IN")}`,
      ],
      [
        "मादा : नर",
        `${Math.round(main * 0.9).toLocaleString("en-IN")} : ${(main - Math.round(main * 0.9)).toLocaleString("en-IN")}`,
      ],
    );
  }
  if (nali && scheme === SCHEMES.dragon)
    rows.push(
      ["RCC पिलर", Math.round(666 * acre).toLocaleString("en-IN")],
      ["कुल पौधे", Math.round(2667 * acre).toLocaleString("en-IN")],
    );
  if (nali && scheme === SCHEMES.fencing) {
    const perimeter = Math.round(4 * Math.sqrt(ha * 10000));
    rows.push(["अनुमानित परिधि", `${perimeter.toLocaleString("en-IN")} मीटर`]);
    if (data.fencingType === "कांटेदार तार की बाड़")
      rows.push(
        ["खम्भे", Math.ceil(perimeter / 2.5).toLocaleString("en-IN")],
        ["कांटेदार तार", `${(perimeter * 5).toLocaleString("en-IN")} मीटर`],
      );
    else
      rows.push(
        ["लोहे के खम्भे", Math.ceil(perimeter / 3).toLocaleString("en-IN")],
        [
          "जी.आई. जाली",
          `${Math.round(perimeter * 1.5).toLocaleString("en-IN")} वर्ग मीटर`,
        ],
      );
  }
  return { nali, rows, cost };
}

function SchemeIcon({ type }) {
  return (
    <span className="scheme-icon">
      {type === "kiwi" ? "🥝" : type === "dragon" ? "🌵" : "🛡️"}
    </span>
  );
}
function Field({ label, required, children, hint, error }) {
  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      {label && (
        <label className="lbl">
          {label}
          {required && <span className="req"> *</span>}
        </label>
      )}
      {children}
      {hint && <div className="hint">{hint}</div>}
      {error && <div className="errmsg">यह जानकारी भरना ज़रूरी है</div>}
    </div>
  );
}
function TextInput({
  data,
  set,
  k,
  type = "text",
  step,
  placeholder,
  disabled = false,
  inputMode,
}) {
  return (
    <input
      className="control"
      type={type}
      value={data[k] ?? ""}
      step={step}
      placeholder={placeholder}
      inputMode={inputMode}
      disabled={disabled}
      onChange={(e) => set(k, e.target.value)}
    />
  );
}
function Radio({ data, set, k, options, disabled = false }) {
  return (
    <div className="opts">
      {[
        ...new Set(
          data[k] && !options.includes(data[k])
            ? [...options, data[k]]
            : options,
        ),
      ].map((o) => (
        <label className="opt" key={o}>
          <input
            type="radio"
            name={k}
            checked={data[k] === o}
            disabled={disabled}
            onChange={() => set(k, o)}
          />
          {o}
        </label>
      ))}
    </div>
  );
}
function Select({ data, set, k, options, disabled = false }) {
  return (
    <select
      className="control"
      value={data[k] ?? ""}
      disabled={disabled}
      onChange={(e) => set(k, e.target.value)}
    >
      <option value="">— चुनें —</option>
      {[
        ...new Set(
          data[k] && !options.includes(data[k])
            ? [...options, data[k]]
            : options,
        ),
      ].map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
function Ledger({ calc, scheme }) {
  if (!calc.nali) return null;
  return (
    <div className="ledger">
      <div className="lhead">आपके क्षेत्रफल पर विभागीय मानक</div>
      <div className="lbody">
        {calc.rows.map(([a, b]) => (
          <div className="lrow" key={a}>
            <span>{a}</span>
            <b>{b}</b>
          </div>
        ))}
      </div>
      <div className="lfoot">
        अनुमानित गणना — अंतिम स्वीकृति विभागीय निरीक्षण के बाद।
        {scheme.farmerShare
          ? ` कृषक अंश ${scheme.farmerShare}% सीधे फर्म को देय हो सकता है।`
          : ""}
      </div>
    </div>
  );
}
function CostBox({ calc, scheme }) {
  if (!calc.cost)
    return (
      <div className="ledger">
        <div className="lhead">लागत एवं राजसहायता</div>
        <div className="lbody">
          <div className="lrow">
            <span>क्षेत्रफल और योजना लागत भरें</span>
            <b>—</b>
          </div>
        </div>
      </div>
    );
  const c = calc.cost;
  return (
    <div className="ledger">
      <div className="lhead">लागत एवं राजसहायता</div>
      <div className="lbody">
        <div className="lrow">
          <span>प्रति हेक्टेयर योजना लागत</span>
          <b>{rupees(c.perHa)}</b>
        </div>
        <div className="lrow">
          <span>क्षेत्रफल</span>
          <b>{c.ha.toFixed(3)} हे0</b>
        </div>
        <div className="lrow">
          <span>कुल लागत</span>
          <b>{rupees(c.total)}</b>
        </div>
        <div className="lrow">
          <span>राजसहायता ({c.subPct}%)</span>
          <b>{rupees(c.sub)}</b>
        </div>
        <div className="lrow">
          <span>कृषक अंश ({100 - c.subPct}%)</span>
          <b>{rupees(c.farmer)}</b>
        </div>
      </div>
      <div className="lfoot">
        राजसहायता प्रति हेक्टेयर लागत पर आनुपातिक रूप से देय। स्वीकृत मानक से
        अधिक व्यय कृषक द्वारा स्वयं वहन किया जाएगा।
      </div>
    </div>
  );
}

const PRINT_LABELS = {
  planScheme: "योजना का नाम",
  fencingType: "फेंसिंग का प्रकार",
  subsidyRatio: "राजसहायता अनुपात",
  name: "कृषक का नाम",
  gender: "लिंग",
  father: "पिता / पति का नाम",
  udyanCard: "उद्यान कार्ड संख्या",
  village: "ग्राम",
  post: "पोस्ट",
  block: "विकासखंड (ब्लॉक)",
  district: "जनपद",
  mobile: "मोबाइल नम्बर",
  aadhaar: "आधार संख्या",
  category: "कृषक की श्रेणी",
  totalLand: "कुल भूमि (हेक्टेयर)",
  propArea_val: "प्रस्तावित क्षेत्रफल",
  propArea_unit: "क्षेत्रफल इकाई",
  irrigation: "भूमि पर सिंचाई सुविधा",
  irrSource: "सिंचाई स्रोत",
  irrOther: "अन्य सिंचाई स्रोत",
  altitude: "ऊँचाई (मीटर)",
  roadDist: "मुख्य सड़क से दूरी",
  slope: "भूमि की ढाल",
  soil: "मृदा प्रकार",
  lat: "अक्षांश (Latitude)",
  lng: "देशांतर (Longitude)",
  costPerHa: "प्रति हेक्टेयर योजना लागत",
  planType: "आवेदन का प्रकार",
  groupName: "समूह का नाम",
  contribution: "अन्य योजना से सहायता",
  otherScheme: "अन्य योजना का नाम",
  execution: "कार्यनिष्पादन का माध्यम",
  firmName: "चयनित फर्म का नाम",
  bankName: "बैंक का नाम",
  branch: "शाखा",
  account: "बैंक खाता संख्या",
  ifsc: "IFSC कोड",
  place: "स्थान",
  date: "दिनांक",
};

function printValue(key, value) {
  if (Array.isArray(value)) return value.join(", ");
  if (key === "costPerHa" && value) return rupees(Number(value));
  if (key === "date" && value) {
    const [y, m, d] = String(value).split("-");
    return y && m && d ? `${d}-${m}-${y}` : value;
  }
  return String(value);
}

function PrintableApplication({ scheme, data, calc, appNo, preview = false }) {
  if (!scheme) return null;

  const excluded = new Set(["photo", "docs", "irrSource", "accept", "declare"]);
  const rows = [];
  Object.entries(data).forEach(([key, value]) => {
    if (excluded.has(key) || value === "" || value === false || value == null)
      return;
    if (!PRINT_LABELS[key]) return;
    rows.push([PRINT_LABELS[key], printValue(key, value)]);
  });

  if (data.irrSource?.length) {
    rows.push(["सिंचाई स्रोत", data.irrSource.join(", ")]);
  }

  const standards =
    scheme === SCHEMES.fencing && data.fencingType === "कांटेदार तार की बाड़"
      ? scheme.barbed
      : scheme.standards;

  const calculatedRows = calc?.rows || [];
  const cost = calc?.cost;
  const nali = calc?.nali || 0;

  return (
    <div
      className={`print-document ${preview ? "print-document-preview" : ""}`}
    >
      <div className="print-page">
        <div className="print-top">
          <div className="print-app-no">आवेदन क्रमांक: {appNo}</div>
          <div className="print-photo">
            {data.photo ? (
              <img src={data.photo} alt="कृषक" />
            ) : (
              <>
                फोटो
                <br />
                प्रभारी द्वारा
                <br />
                सत्यापित
              </>
            )}
          </div>
        </div>

        <h1 className="print-title">{scheme.full}</h1>
        <div className="print-department">
          उद्यान एवं खाद्य प्रसंस्करण विभाग
        </div>

        <table className="print-table print-details-table">
          <tbody>
            <tr>
              <td className="print-key">आवेदित योजना</td>
              <td>{scheme.name}</td>
            </tr>
            {rows.map(([label, value]) => (
              <tr key={`${label}-${value}`}>
                <td className="print-key">{label}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {nali > 0 && (
          <section className="print-section">
            <h2>क्षेत्रफल एवं मानकानुसार अनुमानित गणना</h2>
            <table className="print-table">
              <tbody>
                {calculatedRows.map(([label, value]) => (
                  <tr key={`calc-${label}`}>
                    <td className="print-key">{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {cost && (
          <section className="print-section">
            <h2>लागत एवं राजसहायता</h2>
            <table className="print-table">
              <tbody>
                <tr>
                  <td className="print-key">प्रति हेक्टेयर योजना लागत</td>
                  <td>{rupees(cost.perHa)}</td>
                </tr>
                <tr>
                  <td className="print-key">प्रस्तावित क्षेत्रफल</td>
                  <td>{cost.ha.toFixed(3)} हेक्टेयर</td>
                </tr>
                <tr>
                  <td className="print-key">कुल लागत</td>
                  <td>{rupees(cost.total)}</td>
                </tr>
                <tr>
                  <td className="print-key">राजसहायता ({cost.subPct}%)</td>
                  <td>{rupees(cost.sub)}</td>
                </tr>
                <tr>
                  <td className="print-key">कृषक अंश ({100 - cost.subPct}%)</td>
                  <td>{rupees(cost.farmer)}</td>
                </tr>
              </tbody>
            </table>
            <p className="print-note">
              राजसहायता का निर्धारण प्रति हेक्टेयर लागत पर आनुपातिक (Pro-rata)
              रूप से किया जाएगा। स्वीकृत मानक से अधिक होने वाला व्यय कृषक द्वारा
              स्वयं वहन किया जाएगा तथा उस पर अतिरिक्त राजसहायता देय नहीं होगी।
            </p>
          </section>
        )}

        {standards?.length > 0 && (
          <section className="print-section print-avoid-break">
            <h2>तकनीकी मानकों एवं शर्तों की स्वीकारोक्ति</h2>
            <ul className="print-list">
              {standards.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="print-note">
              {data.accept
                ? "☑ उपरोक्त मानक स्वीकार किए गए।"
                : "☐ उपरोक्त मानक स्वीकार किए गए।"}
            </p>
          </section>
        )}

        <section className="print-section print-avoid-break">
          <h2>संलग्न दस्तावेज़ों की सूची</h2>
          <ol className="print-list">
            {scheme.docs.map((doc) => (
              <li key={doc}>
                {data.docs?.includes(doc) ? "☑" : "☐"} {doc}
              </li>
            ))}
          </ol>
        </section>

        <section className="print-section print-avoid-break">
          <h2>घोषणा</h2>
          <p>
            मैं प्रमाणित {escName(data.gender)} कि उपरोक्त दी गई सभी जानकारी
            मेरी जानकारी में पूर्णतः सही है।
          </p>
          <p>
            मैं प्रमाणित {escName(data.gender)} कि कार्य के दौरान उपरोक्त तकनीकी
            मानकों का पालन अनिवार्यतः करूँगा/करूँगी।
          </p>
          <p className="print-check">
            {data.declare ? "☑" : "☐"} घोषणा स्वीकार की गई।
          </p>
        </section>

        <div className="print-signatures">
          <div>
            दिनांक: {printValue("date", data.date || "—")}
            <br />
            स्थान: {data.place || "—"}
          </div>
          <div>
            हस्ताक्षर ({data.gender === "महिला" ? "आवेदिका" : "आवेदक"}):
            ____________________
          </div>
        </div>

        <div className="print-officer">
          <b>प्रभारी की आख्या</b>
          <p>
            {scheme.officer ||
              "स्थलीय निरीक्षण एवं विभागीय परीक्षण के उपरांत आख्या अंकित की जाएगी।"}
          </p>
          <div>हस्ताक्षर प्रभारी: ____________________</div>
        </div>
      </div>
    </div>
  );
}

// Checks only real user/application fields. Database metadata such as id,
// form_id and timestamps never makes a record look like an incomplete draft.

export default function KisanAavedanPortal() {
  /*
   * Remove the legacy draft created by older versions of the portal.
   * The current application does NOT save form data as a draft.
   * This cleanup runs only once when the component is mounted.
   */
  useEffect(() => {
    try {
      window.localStorage.removeItem("udyan-aavedan:draft");
    } catch (error) {
      console.warn("Legacy draft cleanup failed:", error);
    }
  }, []);

  const API_BASE = "https://mahadevaaya.com/govbillingsystem/backend/api";

  const [schemeId, setSchemeId] = useState(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [formId, setFormId] = useState("");
  const [completedSteps, setCompletedSteps] = useState(() => new Set());
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  // Home page now has two center-level tabs: fresh application and completed applications.
  const [activeTab, setActiveTab] = useState("new");
  const [completedApplications, setCompletedApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [previewApplication, setPreviewApplication] = useState(null);
  const [schemeFilter, setSchemeFilter] = useState("all");
  // Incomplete applications are tracked PER SCHEME.
  const [incompleteApplicationsByScheme, setIncompleteApplicationsByScheme] = useState({});
  const incompleteApplication = schemeId ? incompleteApplicationsByScheme[schemeId] || null : null;

  // Always return the user to the top when moving between form steps.
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  const scheme = schemeId ? SCHEMES[schemeId] : null;
  const calc = useMemo(
    () =>
      scheme ? calculate(scheme, data) : { nali: 0, rows: [], cost: null },
    [scheme, data],
  );
  const appNo = formId || (scheme ? "नया आवेदन" : "");

  const normalizeGender = { Male: "पुरुष", Female: "महिला", Other: "अन्य" };
  const normalizeCategory = {
    General: "सामान्य",
    SC: "अनुसूचित",
    ST: "अनुसूचित",
    "Small Farmer": "लघु कृषक",
    "Marginal Farmer": "सीमांत कृषक",
    Other: "अन्य",
  };
  const normalizeIrrigation = { Yes: "हाँ", No: "नहीं" };
  const normalizeUnit = { Hectare: "हेक्टेयर", Acre: "एकड़", Nali: "नाली" };
  const normalizeSlope = {
    Flat: "समतल",
    Mild: "हल्का ढाल",
    Moderate: "मध्यम ढाल",
    Steep: "तीव्र ढाल",
  };
  const normalizePlanType = { Individual: "व्यक्तिगत", Group: "समूह" };
  const normalizeExecution = {
    Self: "स्वयं कार्य करने पर",
    Department: "विभागीय पंजीकृत फर्म के माध्यम से",
  };
  const normalizeFencing = {
    "Chain Link": "चेन लिंक फेंसिंग",
    "Barbed Wire": "कांटेदार तार की बाड़",
  };

  // Never put the literal text "null" into an input. A null API value means
  // that the field is empty and therefore the step is NOT complete.
  const apiText = (value) =>
    value === null || value === undefined ? "" : String(value);

  const genderApi = { पुरुष: "Male", महिला: "Female", अन्य: "Other" };
  const categoryApi = {
    सामान्य: "General",
    अनुसूचित: "SC",
    "लघु कृषक": "Small Farmer",
    "सीमांत कृषक": "Marginal Farmer",
    अन्य: "Other",
  };
  const irrigationApi = { हाँ: "Yes", नहीं: "No" };
  const unitApi = { हेक्टेयर: "Hectare", एकड़: "Acre", नाली: "Nali" };
  const slopeApi = {
    समतल: "Flat",
    "हल्का ढाल": "Mild",
    "मध्यम ढाल": "Moderate",
    "तीव्र ढाल": "Steep",
  };
  const planTypeApi = { व्यक्तिगत: "Individual", समूह: "Group" };
  const executionApi = {
    "स्वयं कार्य करने पर": "Self",
    "विभागीय पंजीकृत फर्म के माध्यम से": "Department",
  };
  const fencingApi = {
    "चेन लिंक फेंसिंग": "Chain Link",
    "कांटेदार तार की बाड़": "Barbed Wire",
  };

  const mergeApiResponse = (payload) => {
    const item = payload?.data?.[0] || payload?.data || payload;
    if (!item || typeof item !== "object") return null;

    const personal = item.personal || {};
    const plan = item.plan_land_bank || item.plan_technical_bank || {};
    const docs = item.application_documents || {};

    const nextData = {
      ...data,
      // From Personal
      ...(personal.center_name !== undefined ? { centerName: personal.center_name } : {}),
      ...(personal.plan_scheme !== undefined ? { planScheme: personal.plan_scheme } : {}),
      ...(personal.fencing_type !== undefined ? { fencingType: normalizeFencing[personal.fencing_type] || personal.fencing_type } : {}),
      ...(personal.subsidy_ratio !== undefined ? { subsidyRatio: personal.subsidy_ratio } : {}),
      ...(personal.name !== undefined ? { name: personal.name } : {}),
      ...(personal.gender !== undefined ? { gender: normalizeGender[personal.gender] || personal.gender } : {}),
      ...(personal.father !== undefined ? { father: personal.father } : {}),
      ...(personal.udyan_card !== undefined ? { udyanCard: personal.udyan_card } : {}),
      ...(personal.village !== undefined ? { village: personal.village } : {}),
      ...(personal.post !== undefined ? { post: personal.post } : {}),
      ...(personal.block !== undefined ? { block: personal.block } : {}),
      ...(personal.district !== undefined ? { district: personal.district } : {}),
      ...(personal.mobile !== undefined ? { mobile: apiText(personal.mobile) } : {}),
      ...(personal.aadhaar !== undefined ? { aadhaar: apiText(personal.aadhaar) } : {}),
      ...(personal.category !== undefined ? { category: normalizeCategory[personal.category] || personal.category } : {}),
      ...(personal.photo !== undefined ? { photo: personal.photo || "" } : {}),

      // From Plan Technical Bank
      ...(plan.total_land !== undefined ? { totalLand: apiText(plan.total_land) } : {}),
      ...(plan.proposed_area !== undefined ? { propArea_val: apiText(plan.proposed_area) } : {}),
      ...(plan.latitude !== undefined ? { lat: apiText(plan.latitude) } : {}),
      ...(plan.longitude !== undefined ? { lng: apiText(plan.longitude) } : {}),
      ...(plan.irrigation !== undefined ? { irrigation: normalizeIrrigation[plan.irrigation] || plan.irrigation } : {}),
      ...(plan.irr_source !== undefined ? { irrSource: Array.isArray(plan.irr_source) ? plan.irr_source : [] } : {}),
      ...(plan.irr_other !== undefined ? { irrOther: plan.irr_other || "" } : {}),
      ...(plan.altitude !== undefined ? { altitude: apiText(plan.altitude) } : {}),
      ...(plan.road_dist !== undefined ? { roadDist: apiText(plan.road_dist) } : {}),
      ...(plan.slope !== undefined ? { slope: normalizeSlope[plan.slope] || plan.slope } : {}),
      ...(plan.soil !== undefined ? { soil: plan.soil || "" } : {}),
      ...(plan.bank_name !== undefined ? { bankName: plan.bank_name || "" } : {}),
      ...(plan.branch !== undefined ? { branch: plan.branch } : {}),
      ...(plan.account !== undefined ? { account: apiText(plan.account) } : {}),
      ...(plan.ifsc !== undefined ? { ifsc: plan.ifsc } : {}),
      ...(plan.cost_per_ha !== undefined ? { costPerHa: apiText(plan.cost_per_ha) } : {}),
      ...(plan.plan_type !== undefined ? { planType: normalizePlanType[plan.plan_type] || plan.plan_type } : {}),
      ...(plan.group_name !== undefined ? { groupName: plan.group_name || "" } : {}),
      ...(plan.contribution !== undefined ? { contribution: plan.contribution } : {}),
      ...(plan.other_scheme !== undefined ? { otherScheme: plan.other_scheme || "" } : {}),

      // From Application Documents
      ...(docs.execution !== undefined ? { execution: normalizeExecution[docs.execution] || docs.execution } : {}),
      ...(docs.firm_name !== undefined ? { firmName: docs.firm_name || "" } : {}),
      ...(docs.technical_standard_accepted !== undefined ? { accept: !!docs.technical_standard_accepted } : {}),
      ...(docs.place !== undefined ? { place: docs.place } : {}),
      ...(docs.application_date !== undefined ? { date: docs.application_date } : {}),
      ...(docs.documents !== undefined ? { docs: docs.documents } : {}),
      ...(docs.declaration_accepted !== undefined ? { declare: !!docs.declaration_accepted } : {}),
    };

    const detectedId =
      item.form_id ||
      item.id ||
      item.formId ||
      item.insertId ||
      (typeof item === "object" && item?.data?.form_id) ||
      (typeof item === "object" && item?.data?.id) ||
      "";

    if (detectedId && !formId) {
      setFormId(String(detectedId));
    }

    setData(nextData);
    return { item, personal, plan, docs, nextData };
  };

  /*
   * ============================================================
   * GET ONE APPLICATION FROM THE SCHEME-SPECIFIC GET-ALL API
   * ============================================================
   *
   * IMPORTANT:
   * Neither Kiwi nor Fencing sends form_id in the GET URL.
   *
   * Kiwi:
   *   GET /kiwi-application/
   *
   * Fencing:
   *   GET /kisan-application/
   *
   * After receiving the complete list, find the requested form_id
   * locally. This matches the backend API contract supplied for
   * this application.
   */
  const getApplication = async (id = formId, schemeOverride = schemeId) => {
    if (!id) return null;

    const endpoint =
      schemeOverride === "kiwi"
        ? "kiwi-application/"
        : schemeOverride === "dragon"
          ? "dragon-application/"
          : schemeOverride === "fencing"
            ? "kisan-application/"
            : null;

    if (!endpoint) {
      console.error(
        "[GET APPLICATION] Missing/invalid scheme. Request cancelled:",
        schemeOverride
      );
      throw new Error("आवेदन की योजना की पहचान नहीं हो सकी।");
    }

    console.log(
      `[GET APPLICATION] scheme=${schemeOverride}, searching form_id=${id} from GET /${endpoint}`
    );

    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const payload = await response.json().catch(() => ({}));

    console.log(
      `[${String(schemeOverride).toUpperCase()} GET ALL] /${endpoint} → ${response.status}`,
      payload
    );

    if (response.status === 404 || response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          payload?.detail ||
          `GET failed (${response.status})`
      );
    }

    let candidates = [];

    if (Array.isArray(payload)) {
      candidates = payload;
    } else if (Array.isArray(payload?.data)) {
      candidates = payload.data;
    } else if (payload?.data && typeof payload.data === "object") {
      candidates = [payload.data];
    } else if (
      payload &&
      typeof payload === "object" &&
      (payload.form_id ||
        payload.formId ||
        payload.personal ||
        payload.plan_land_bank ||
        payload.plan_technical_bank ||
        payload.application_documents)
    ) {
      candidates = [payload];
    }

    const requestedId = String(id).trim();

    const application = candidates.find((item) => {
      const candidateId = String(
        item?.form_id ||
          item?.formId ||
          item?.id ||
          item?.personal?.form_id ||
          item?.plan_land_bank?.form_id ||
          item?.plan_technical_bank?.form_id ||
          item?.application_documents?.form_id ||
          ""
      ).trim();

      return candidateId === requestedId;
    });

    if (!application) {
      console.warn(
        `[${String(schemeOverride).toUpperCase()} GET ALL] form_id=${requestedId} was not found in the GET response.`,
        candidates
      );
      return null;
    }

    console.log(
      `[${String(schemeOverride).toUpperCase()} GET ALL] Found form_id=${requestedId}:`,
      application
    );

    /*
     * mergeApiResponse() expects the same object shape returned by the
     * backend: { form_id, personal, plan_land_bank, application_documents }.
     */
    return mergeApiResponse(application);
  };


  /*
   * ============================================================
   * RESUME EXISTING APPLICATION FROM SERVER
   * ============================================================
   *
   * No draft/localStorage data is used.
   *
   * On refresh / re-entry, the frontend asks the API for the
   * current user's existing application. The backend should
   * return the current application from:
   *
   * GET /kisan-application/
   *
   * If the backend requires form_id even for this request, it
   * must expose a current-user/current-application lookup.
   */
  const getCurrentApplicationFromServer = async (schemeOverride = schemeId) => {
    try {
      const effectiveSchemeId = schemeOverride || schemeId;

      if (!effectiveSchemeId || !SCHEMES[effectiveSchemeId]) {
        throw new Error("आवेदन की योजना की पहचान नहीं हो सकी।");
      }

      setApiLoading(true);
      setApiError("");

      const endpoint =
        effectiveSchemeId === "kiwi"
          ? "kiwi-application/"
          : effectiveSchemeId === "dragon"
            ? "dragon-application/"
            : effectiveSchemeId === "fencing"
              ? "kisan-application/"
              : null;

      if (!endpoint) {
        throw new Error("आवेदन की योजना की पहचान नहीं हो सकी।");
      }

      /*
       * GET ALL — no form_id in URL.
       */
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const payload = await response.json().catch(() => ({}));

      console.log(
        `[${effectiveSchemeId.toUpperCase()} CURRENT GET] /${endpoint} → ${response.status}`,
        payload
      );

      if (response.status === 404 || response.status === 204) {
        return null;
      }

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            payload?.detail ||
            `Application GET failed (${response.status})`
        );
      }

      let candidates = [];

      if (Array.isArray(payload)) {
        candidates = payload;
      } else if (Array.isArray(payload?.data)) {
        candidates = payload.data;
      } else if (payload?.data && typeof payload.data === "object") {
        candidates = [payload.data];
      } else if (payload && typeof payload === "object") {
        candidates = [payload];
      }

      const applications = candidates.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          (
            item.personal ||
            item.plan_land_bank ||
            item.plan_technical_bank ||
            item.application_documents ||
            item.form_id
          )
      );

      if (!applications.length) {
        console.log(
          `[${effectiveSchemeId.toUpperCase()} CURRENT GET] No application records found.`
        );
        return null;
      }

      /*
       * IMPORTANT:
       * The GET-all API is the source of truth. Select only records belonging
       * to this scheme's own endpoint. Never inspect the other scheme's data.
       *
       * An application is considered incomplete when:
       *   - declaration is not accepted, AND
       *   - at least one meaningful field exists in any step.
       *
       * A completely empty server row is NOT resumed as an existing draft.
       */

      const applicationHasAnySavedField = (item) => {
        const personal = item?.personal || {};
        const plan =
          item?.plan_land_bank ||
          item?.plan_technical_bank ||
          {};
        const docs = item?.application_documents || {};

        const values = [
          ...Object.entries(personal),
          ...Object.entries(plan),
          ...Object.entries(docs),
        ];

        return values.some(([key, value]) => {
          /*
           * Metadata must not make an empty application look incomplete.
           */
          if (
            [
              "id",
              "form_id",
              "created_at",
              "updated_at",
            ].includes(key)
          ) {
            return false;
          }

          return hasMeaningfulValue(value);
        });
      };

      const isDeclarationAccepted = (item) =>
        item?.application_documents?.declaration_accepted === true ||
        item?.application_documents?.declaration_accepted === 1 ||
        item?.declaration_accepted === true ||
        item?.declaration_accepted === 1;

      /*
       * A DB row containing only form_id / id / timestamps is not a useful
       * incomplete draft. At least one actual application field must have
       * been saved.
       */

      const incompleteApplications = applications.filter(
        (item) =>
          !!(
            item?.form_id ||
            item?.formId ||
            item?.id
          ) &&
          !isDeclarationAccepted(item) &&
          applicationHasAnySavedField(item)
      );

      const getUpdatedTime = (item) => {
        const value =
          item?.updated_at ||
          item?.updatedAt ||
          item?.application_documents?.updated_at ||
          item?.plan_land_bank?.updated_at ||
          item?.plan_technical_bank?.updated_at ||
          item?.personal?.updated_at ||
          0;

        const time = new Date(value).getTime();
        return Number.isFinite(time) ? time : 0;
      };

      const application = [...incompleteApplications].sort(
        (a, b) => getUpdatedTime(b) - getUpdatedTime(a)
      )[0];

      if (!application) {
        console.log(
          `[${effectiveSchemeId.toUpperCase()} CURRENT GET] No meaningful incomplete application found.`
        );
        return null;
      }

      const existingFormId =
        application.form_id ||
        application.formId ||
        application.id ||
        "";

      if (!existingFormId) {
        return null;
      }

      console.log(
        `[${effectiveSchemeId.toUpperCase()} CURRENT GET] Incomplete form found: ${existingFormId}`,
        application
      );

      /*
       * Do NOT call getApplication(existingFormId, ...).
       * The GET-all response above is already the required GET response.
       */
      return application;
    } catch (error) {
      console.error(
        `[${String(schemeOverride || schemeId).toUpperCase()} CURRENT GET]`,
        error
      );

      setApiError(
        error.message ||
          "सर्वर से पिछला आवेदन प्राप्त नहीं हो सका।"
      );

      return null;
    } finally {
      setApiLoading(false);
    }
  };

  /*
   * Detect the scheme from the server response.
   *
   * Preferred: explicit scheme_id / scheme_code / scheme.
   * Fallback:
   *   fencing_type => fencing
   *   30% contribution => kiwi
   *   20% contribution => dragon
   *
   * The backend should ideally return scheme_id explicitly.
   */
  const detectSchemeIdFromApplication = (application) => {
    if (!application || typeof application !== "object") {
      return null;
    }

    /*
     * APPLICATION LIST RECORDS ARE TAGGED WITH THE API THAT PRODUCED THEM.
     * This is the authoritative scheme identity for the completed-applications
     * table. The three APIs can legitimately return records without a
     * scheme_id field, so do not try to guess Kiwi/Dragon from contribution
     * text when the API source is already known.
     */
    if (
      application.__schemeSource === "fencing" ||
      application.__schemeSource === "kiwi" ||
      application.__schemeSource === "dragon"
    ) {
      return application.__schemeSource;
    }

    const personal = application.personal || {};
    const plan = application.plan_land_bank || application.plan_technical_bank || {};

    const explicitScheme =
      application.scheme_id ||
      application.schemeId ||
      application.scheme_code ||
      application.schemeCode ||
      application.scheme ||
      application.scheme_name ||
      application.schemeName ||
      application.application_scheme ||
      application.applicationScheme ||
      personal.scheme_id ||
      personal.scheme_code ||
      personal.scheme ||
      plan.scheme_id ||
      plan.scheme_code ||
      plan.scheme;

    const explicit = String(explicitScheme || "").trim().toLowerCase();

    if (
      explicit === "fencing" ||
      explicit.includes("fencing") ||
      explicit.includes("फेंसिंग") ||
      explicit.includes("clf")
    ) {
      return "fencing";
    }

    if (
      explicit === "kiwi" ||
      explicit.includes("kiwi") ||
      explicit.includes("कीवी") ||
      explicit.includes("kwi")
    ) {
      return "kiwi";
    }

    if (
      explicit === "dragon" ||
      explicit.includes("dragon") ||
      explicit.includes("ड्रैगन") ||
      explicit.includes("कमलम") ||
      explicit.includes("drf")
    ) {
      return "dragon";
    }

    if (personal.fencing_type) {
      return "fencing";
    }

    const contribution = String(plan.contribution || "").toLowerCase();

    if (contribution.includes("30")) {
      return "kiwi";
    }

    if (contribution.includes("20")) {
      return "dragon";
    }

    return null;
  };

  /*
   * A step is completed ONLY when every required field for that step
   * has a valid value. Boolean required fields (for example accept/declare)
   * must specifically be true.
   */
  const getCompletedStepsFromData = (schemeKey, serverData) => {
    const completed = new Set();

    if (!schemeKey || !serverData) return completed;

    // IMPORTANT: API values such as null, "null", undefined and empty strings
    // must never be treated as filled values.
    const hasValue = (value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value === true;
      if (value === null || value === undefined) return false;

      const normalized = String(value).trim().toLowerCase();
      return normalized !== "" && normalized !== "null" && normalized !== "undefined";
    };

    const isValidFormat = (field) => {
      const value = String(serverData[field] ?? "").trim();
      if (!value) return false;

      if (field === "mobile")
        return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
      if (field === "aadhaar")
        return /^\d{12}$/.test(value.replace(/\D/g, ""));
      if (field === "account")
        return /^\d{9,18}$/.test(value.replace(/\s/g, ""));
      if (field === "ifsc")
        return /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(value);

      return true;
    };

    const requiredFieldsForStep = (stepName) => {
      if (schemeKey === "fencing") {
        if (stepName === "scheme")
          return ["planScheme", "fencingType", "subsidyRatio", "centerName"];

        if (stepName === "personal")
          return [
            "name", "gender", "father", "village", "block", "district",
            "mobile", "aadhaar", "category",
          ];

        if (stepName === "land")
          return ["totalLand", "propArea_val", "lat", "lng"];

        if (stepName === "bank")
          return ["bankName", "branch", "account", "ifsc"];

        // Keep this exactly aligned with validate(): for fencing,
        // only Accept is required at the technical step.
        if (stepName === "technical") return ["accept"];

        // No document checkbox is required by validate(), therefore this
        // step is complete by default unless required fields are added later.
        if (stepName === "docs") return [];

        if (stepName === "declaration")
          return ["place", "date", "declare"];
      } else {
        if (stepName === "personal")
          return [
            "name", "gender", "father", "village", "block", "district",
            "mobile", "aadhaar", "category",
          ];

        if (stepName === "land") {
          const fields = [
            "totalLand", "propArea_val", "lat", "lng", "irrigation",
            "altitude", "roadDist", "slope", "soil",
          ];
          if (serverData.irrigation === "हाँ") fields.push("irrSource");
          return fields;
        }

        if (stepName === "planbank") {
          // IMPORTANT: Plan + Bank is one step in the UI, so ALL of these
          // fields must be present before the step receives a green tick.
          const fields = [
            "planScheme", "planType", "contribution",
            "bankName", "branch", "account", "ifsc",
          ];
          if (serverData.planType === "समूह") fields.push("groupName");
          if (serverData.contribution === "अन्य योजना") fields.push("otherScheme");
          return fields;
        }

        if (stepName === "technical") return ["execution", "accept"];

        // Kiwi Step 5 is the document-selection step. An empty/null
        // documents array means the step is still incomplete.
        if (stepName === "docs") return ["docs"];

        if (stepName === "declaration") return ["place", "date", "declare"];
      }

      return [];
    };

    const steps = SCHEMES[schemeKey]?.steps || [];

    steps.forEach((stepName) => {
      const requiredFields = requiredFieldsForStep(stepName);
      const isComplete = requiredFields.every(
        (field) => hasValue(serverData[field]) && isValidFormat(field)
      );

      if (isComplete) completed.add(stepName);
    });

    return completed;
  };

  /*
   * Populate the form from the server response, mark completed
   * steps and open the first incomplete step.
   */
  const resumeApplication = async (resumeId = "", resumeSchemeId = schemeId) => {
    // setSchemeId() is asynchronous. selectScheme() therefore passes the
    // selected scheme explicitly so the first GET can never use null.
    const effectiveSchemeId = resumeSchemeId || schemeId;

    if (!effectiveSchemeId || !SCHEMES[effectiveSchemeId]) {
      console.error("[RESUME APPLICATION] Missing/invalid scheme:", {
        resumeId,
        resumeSchemeId,
        currentSchemeId: schemeId,
      });
      setApiError("आवेदन की योजना की पहचान नहीं हो सकी।");
      return false;
    }

    const application = resumeId
      ? await getApplication(resumeId, effectiveSchemeId)
      : await getCurrentApplicationFromServer(effectiveSchemeId);

    if (!application) {
      return false;
    }

    // The GET endpoint is already scheme-specific. The selected scheme is
    // therefore authoritative even when the API response has no scheme_id.
    const detectedScheme = effectiveSchemeId;

    if (!SCHEMES[detectedScheme]) {
      setApiError("सर्वर से आवेदन मिला है, लेकिन योजना की पहचान नहीं हो सकी।");
      return false;
    }

    const personal = application.personal || {};
    const plan = application.plan_land_bank || application.plan_technical_bank || {};
    const docs = application.application_documents || {};

    const restoredData = {
      ...initialData,

      centerName: personal.center_name || "",

      planScheme:
        personal.plan_scheme ||
        plan.plan_scheme ||
        "",

      fencingType:
        normalizeFencing[personal.fencing_type] ||
        personal.fencing_type ||
        "",

      subsidyRatio: personal.subsidy_ratio || "",

      name: personal.name || "",
      gender:
        normalizeGender[personal.gender] ||
        personal.gender ||
        "",
      father: personal.father || "",
      udyanCard: personal.udyan_card || "",
      village: personal.village || "",
      post: personal.post || "",
      block: personal.block || "",
      district: personal.district || "",
      mobile: apiText(personal.mobile),
      aadhaar: apiText(personal.aadhaar),
      category:
        normalizeCategory[personal.category] ||
        personal.category ||
        "",
      photo: personal.photo || "",

      totalLand: apiText(plan.total_land),
      propArea_val: apiText(plan.proposed_area),
      lat: apiText(plan.latitude),
      lng: apiText(plan.longitude),
      irrigation: normalizeIrrigation[plan.irrigation] || plan.irrigation || "",
      irrSource: Array.isArray(plan.irr_source) ? plan.irr_source : [],
      irrOther: plan.irr_other || "",
      altitude: apiText(plan.altitude),
      roadDist: apiText(plan.road_dist),
      slope: normalizeSlope[plan.slope] || plan.slope || "",
      soil: plan.soil || "",

      bankName: plan.bank_name || "",
      branch: plan.branch || "",
      account: apiText(plan.account),
      ifsc: plan.ifsc || "",

      costPerHa: apiText(plan.cost_per_ha),
      planType:
        normalizePlanType[plan.plan_type] ||
        plan.plan_type ||
        "",
      groupName: plan.group_name || "",
      contribution: plan.contribution || "",
      otherScheme: plan.other_scheme || "",

      execution:
        normalizeExecution[docs.execution] ||
        docs.execution ||
        "",
      firmName: docs.firm_name || "",
      accept: !!docs.technical_standard_accepted,
      place: docs.place || "",
      date: docs.application_date || "",
      docs: Array.isArray(docs.documents)
        ? docs.documents
        : [],
      declare: !!docs.declaration_accepted,
    };

    const restoredFormId =
      application.form_id ||
      application.formId ||
      application.id ||
      "";

    // Existing server data means the application already exists. Keep its
    // form_id so the first step uses PUT, not another POST.
    setFormId(restoredFormId ? String(restoredFormId) : "");
    setSchemeId(detectedScheme);
    setData(restoredData);

    const completed = getCompletedStepsFromData(
      detectedScheme,
      restoredData
    );

    setCompletedSteps(completed);

    const steps = SCHEMES[detectedScheme].steps;
    const firstIncompleteIndex = steps.findIndex(
      (stepName) => !completed.has(stepName)
    );

    setStep(
      firstIncompleteIndex === -1
        ? steps.length
        : firstIncompleteIndex
    );

    setErrors({});
    setApiError("");

    console.log("[RESUME] Scheme:", detectedScheme);
    console.log(
      "[RESUME] Form ID:",
      application.form_id ||
        application.formId ||
        application.id ||
        ""
    );
    console.log(
      "[RESUME] Completed steps:",
      Array.from(completed)
    );
    console.log(
      "[RESUME] Opening step:",
      firstIncompleteIndex === -1
        ? "review"
        : steps[firstIncompleteIndex]
    );

    return true;
  };

  /*
   * Run resume whenever this component is mounted.
   * No draft/localStorage data is read.
   */
  const getPreviewDataFromApplication = (application) => {
    const personal = application?.personal || {};
    const plan = application?.plan_land_bank || application?.plan_technical_bank || {};
    const docs = application?.application_documents || {};
    return {
      ...initialData,
      centerName: personal.center_name || "",
      planScheme: personal.plan_scheme || plan.plan_scheme || "",
      fencingType: normalizeFencing[personal.fencing_type] || personal.fencing_type || "",
      subsidyRatio: personal.subsidy_ratio || "",
      name: personal.name || "",
      gender: normalizeGender[personal.gender] || personal.gender || "",
      father: personal.father || "",
      udyanCard: personal.udyan_card || "",
      village: personal.village || "",
      post: personal.post || "",
      block: personal.block || "",
      district: personal.district || "",
      mobile: apiText(personal.mobile),
      aadhaar: apiText(personal.aadhaar),
      category: normalizeCategory[personal.category] || personal.category || "",
      photo: personal.photo || "",
      totalLand: apiText(plan.total_land),
      propArea_val: apiText(plan.proposed_area),
      lat: apiText(plan.latitude),
      lng: apiText(plan.longitude),
      irrigation: normalizeIrrigation[plan.irrigation] || plan.irrigation || "",
      irrSource: Array.isArray(plan.irr_source) ? plan.irr_source : [],
      irrOther: plan.irr_other || "",
      altitude: apiText(plan.altitude),
      roadDist: apiText(plan.road_dist),
      slope: normalizeSlope[plan.slope] || plan.slope || "",
      soil: plan.soil || "",
      bankName: plan.bank_name || "",
      branch: plan.branch || "",
      account: apiText(plan.account),
      ifsc: plan.ifsc || "",
      costPerHa: apiText(plan.cost_per_ha),
      planType: normalizePlanType[plan.plan_type] || plan.plan_type || "",
      groupName: plan.group_name || "",
      contribution: plan.contribution || "",
      otherScheme: plan.other_scheme || "",
      execution: normalizeExecution[docs.execution] || docs.execution || "",
      firmName: docs.firm_name || "",
      accept: !!docs.technical_standard_accepted,
      place: docs.place || "",
      date: docs.application_date || "",
      docs: Array.isArray(docs.documents) ? docs.documents : [],
      declare: !!docs.declaration_accepted,
    };
  };

  /*
   * ============================================================
   * APPLICATION LIST — SCHEME-SPECIFIC GET APIS
   * ============================================================
   *
   * FENCING:
   *   GET /kisan-application/
   *
   * KIWI:
   *   GET /kiwi-application/
   *
   * These APIs are intentionally kept separate. Their response data
   * is never used interchangeably.
   */
  const getApplicationList = async () => {
    setApplicationsLoading(true);
    setApplicationsError("");

    const parseApplications = async (response, endpointName) => {
      const payload = await response.json().catch(() => ({}));

      console.log(
        `%c[${endpointName} GET] Status: ${response.status}`,
        `color:${response.ok ? "#16a34a" : "#dc2626"};font-weight:bold`
      );
      console.log(`[${endpointName} GET] Full response:`, payload);

      if (!response.ok) {
        if (response.status === 404 || response.status === 204) {
          return [];
        }

        throw new Error(
          payload?.message ||
            payload?.error ||
            payload?.detail ||
            `${endpointName} GET failed (${response.status})`
        );
      }

      if (Array.isArray(payload)) return payload;

      if (Array.isArray(payload?.data)) {
        return payload.data;
      }

      if (payload?.data && typeof payload.data === "object") {
        return [payload.data];
      }

      if (
        payload &&
        typeof payload === "object" &&
        (payload.form_id ||
          payload.formId ||
          payload.personal ||
          payload.plan_land_bank ||
          payload.plan_technical_bank ||
          payload.application_documents)
      ) {
        return [payload];
      }

      return [];
    };

    try {
      /*
       * IMPORTANT:
       * Run both APIs independently. Do NOT replace Kiwi with Kisan API
       * or Kisan/Fencing with Kiwi API.
       */
      const [fencingResponse, kiwiResponse, dragonResponse] = await Promise.all([
        fetch(`${API_BASE}/kisan-application/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        fetch(`${API_BASE}/kiwi-application/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        fetch(`${API_BASE}/dragon-application/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
      ]);

      const [fencingApplications, kiwiApplications, dragonApplications] = await Promise.all([
        parseApplications(fencingResponse, "FENCING / kisan-application"),
        parseApplications(kiwiResponse, "KIWI / kiwi-application"),
        parseApplications(dragonResponse, "DRAGON / dragon-application"),
      ]);

      console.log(
        "[FENCING GET] Applications:",
        fencingApplications
      );
      console.log(
        "[KIWI GET] Applications:",
        kiwiApplications
      );
      console.log(
        "[DRAGON GET] Applications:",
        dragonApplications
      );

      /*
       * Tag only the in-memory copy with its API source.
       * This prevents a Kiwi response from being interpreted as Fencing.
       */
      const allApplications = [
        ...fencingApplications.map((item) => ({
          ...item,
          __schemeSource: "fencing",
        })),
        ...kiwiApplications.map((item) => ({
          ...item,
          __schemeSource: "kiwi",
        })),
        ...dragonApplications.map((item) => ({
          ...item,
          __schemeSource: "dragon",
        })),
      ];

      const isDeclarationAccepted = (item) =>
        item?.application_documents?.declaration_accepted === true ||
        item?.application_documents?.declaration_accepted === 1 ||
        item?.declaration_accepted === true ||
        item?.declaration_accepted === 1;

      const getFormId = (item) =>
        item?.form_id ||
        item?.formId ||
        item?.id ||
        "";

      const getUpdatedTime = (item) => {
        const value =
          item?.updated_at ||
          item?.updatedAt ||
          item?.application_documents?.updated_at ||
          item?.plan_land_bank?.updated_at ||
          item?.plan_technical_bank?.updated_at ||
          item?.personal?.updated_at ||
          0;

        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
      };

      /*
       * Completed applications are still shown in the existing completed
       * applications section, but the source scheme remains attached.
       */
      setCompletedApplications(
        allApplications.filter(
          (item) =>
            !!getFormId(item) &&
            isDeclarationAccepted(item)
        )
      );

      /*
       * Find the latest incomplete record SEPARATELY for each scheme.
       */
      const latestFencing = fencingApplications
        .filter(
          (item) =>
            !!getFormId(item) &&
            !isDeclarationAccepted(item) &&
            hasAnySavedField(item)
        )
        .sort((a, b) => getUpdatedTime(b) - getUpdatedTime(a))[0] || null;

      const latestKiwi = kiwiApplications
        .filter(
          (item) =>
            !!getFormId(item) &&
            !isDeclarationAccepted(item) &&
            hasAnySavedField(item)
        )
        .sort((a, b) => getUpdatedTime(b) - getUpdatedTime(a))[0] || null;

      const latestDragon = dragonApplications
        .filter(
          (item) =>
            !!getFormId(item) &&
            !isDeclarationAccepted(item) &&
            hasAnySavedField(item)
        )
        .sort((a, b) => getUpdatedTime(b) - getUpdatedTime(a))[0] || null;

      const incompleteByScheme = {
        fencing: latestFencing,
        kiwi: latestKiwi,
        dragon: latestDragon,
      };

      setIncompleteApplicationsByScheme(incompleteByScheme);

      console.log(
        "%c[INCOMPLETE FENCING]",
        "color:#d97706;font-weight:bold",
        latestFencing
      );
      console.log(
        "%c[INCOMPLETE KIWI]",
        "color:#16a34a;font-weight:bold",
        latestKiwi
      );
      console.log(
        "%c[INCOMPLETE DRAGON]",
        "color:#dc2626;font-weight:bold",
        latestDragon
      );

      return allApplications;
    } catch (error) {
      console.error("[APPLICATION LIST]", error);
      setApplicationsError(
        error.message || "आवेदन सूची प्राप्त नहीं हो सकी।"
      );
      return [];
    } finally {
      setApplicationsLoading(false);
    }
  };

  useEffect(() => {
    /*
     * Load the status of BOTH schemes when the home screen opens.
     *
     * Do NOT resume a form here because schemeId is not known yet.
     * The user first clicks Kiwi or Fencing. selectScheme() then uses
     * ONLY that scheme's API and resumes its form_id.
     */
    (async () => {
      await getApplicationList();
    })();
  }, []);

  // Keep the step indicators accurate while the user edits the form.
  // If even one required field becomes empty/invalid, the green tick is removed
  // immediately and the step shows ! instead.
  useEffect(() => {
    if (!schemeId) {
      setCompletedSteps(new Set());
      return;
    }

    setCompletedSteps(getCompletedStepsFromData(schemeId, data));
  }, [schemeId, data]);

  const apiRequest = async (path, method, body) => {
    setApiLoading(true);
    setApiError("");
    const url = `${API_BASE}/${path}`;
    console.log(`%c[API REQUEST] ${method} ${url}`, "color:#2563eb;font-weight:bold");
    console.log("[API REQUEST] Body:", body);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      console.log(
        `%c[API RESPONSE] Status: ${response.status}`,
        `color:${response.ok ? "#16a34a" : "#dc2626"};font-weight:bold`
      );
      console.log("[API RESPONSE] Body:", payload);
      if (!response.ok) {
        const errMsg =
          payload?.message ||
          payload?.error ||
          payload?.detail ||
          `API failed (${response.status})`;
        throw new Error(errMsg);
      }
      return payload;
    } catch (error) {
      console.error(`%c[API ERROR] ${method} ${url}`, "color:#dc2626;font-weight:bold");
      console.error("[API ERROR] Message:", error.message);
      console.error("[API ERROR] Stack:", error);
      setApiError(error.message || "API request failed");
      throw error;
    } finally {
      setApiLoading(false);
    }
  };

  const extractFormId = (payload) => {
    if (!payload) return "";

    const directKeys = ["form_id", "formId", "id", "insertId", "insert_id", "lastInsertId", "last_insert_id", "record_id", "recordId"];
    for (const k of directKeys) {
      if (payload[k] != null && payload[k] !== "") {
        return String(payload[k]);
      }
    }

    const dataObj = payload.data;
    if (dataObj == null) return "";

    if (typeof dataObj === "string") return dataObj.trim();
    if (typeof dataObj === "number") return String(dataObj);

    if (Array.isArray(dataObj)) {
      const first = dataObj[0];
      if (!first) return "";
      for (const k of directKeys) {
        if (first[k] != null && first[k] !== "") {
          return String(first[k]);
        }
      }
      return "";
    }

    if (typeof dataObj === "object") {
      for (const k of directKeys) {
        if (dataObj[k] != null && dataObj[k] !== "") {
          return String(dataObj[k]);
        }
      }
      const nestedKeys = ["record", "result", "item", "application"];
      for (const nk of nestedKeys) {
        if (dataObj[nk] && typeof dataObj[nk] === "object") {
          for (const k of directKeys) {
            if (dataObj[nk][k] != null && dataObj[nk][k] !== "") {
              return String(dataObj[nk][k]);
            }
          }
        }
      }
    }

    console.warn("[extractFormId] Could not find form_id anywhere in payload.", payload);
    return "";
  };

  // --- Payload Functions ---

  const fencingCreatePayload = () => ({
    plan_scheme: data.planScheme || "",
    fencing_type: fencingApi[data.fencingType] || data.fencingType || "",
    subsidy_ratio: data.subsidyRatio || "",
    center_name: data.centerName || "",
  });

  // When an existing fencing application is resumed from GET, step 1 must
  // be updated with PUT instead of creating another application with POST.
  const fencingSchemeUpdatePayload = () => ({
    form_id: formId,
    plan_scheme: data.planScheme || "",
    fencing_type: fencingApi[data.fencingType] || data.fencingType || "",
    subsidy_ratio: data.subsidyRatio || "",
    center_name: data.centerName || "",
  });

  const kiwiPersonalCreatePayload = () => ({
    name: data.name || "", gender: genderApi[data.gender] || data.gender || "", father: data.father || "",
    udyan_card: data.udyanCard || "", village: data.village || "", post: data.post || "", block: data.block || "",
    district: data.district || "", mobile: data.mobile || "", aadhaar: data.aadhaar || "",
    category: categoryApi[data.category] || data.category || "", photo: data.photo || null,
  });
  const kiwiPersonalPayload = () => ({ form_id: formId, ...kiwiPersonalCreatePayload() });
  const kiwiLandPayload = () => ({
    form_id: formId, total_land: data.totalLand === "" ? null : Number(data.totalLand),
    proposed_area: data.propArea_val === "" ? null : Number(data.propArea_val),
    irrigation: irrigationApi[data.irrigation] || data.irrigation || "", irr_source: data.irrSource || [],
    irr_other: data.irrOther || "", altitude: data.altitude === "" ? null : Number(data.altitude),
    road_dist: data.roadDist === "" ? null : Number(data.roadDist), slope: slopeApi[data.slope] || data.slope || "",
    soil: data.soil || "", latitude: data.lat === "" ? null : Number(data.lat), longitude: data.lng === "" ? null : Number(data.lng),
  });
  const kiwiPlanBankPayload = () => ({
    form_id: formId, plan_scheme: data.planScheme || "", cost_per_ha: data.costPerHa === "" ? null : String(data.costPerHa),
    plan_type: planTypeApi[data.planType] || data.planType || "", group_name: data.groupName || "",
    contribution: data.contribution || "", other_scheme: data.otherScheme || "", bank_name: data.bankName || "",
    branch: data.branch || "", account: data.account || "", ifsc: data.ifsc || "",
  });
  const kiwiDocumentsPayload = () => ({
    form_id: formId, execution: executionApi[data.execution] || data.execution || null, firm_name: data.firmName || null,
    technical_standard_accepted: !!data.accept, documents: data.docs || [], place: data.place || "",
    application_date: data.date || new Date().toISOString().slice(0, 10), declaration_accepted: !!data.declare,
  });

  // Dragon Fruit uses the same field structure as Kiwi, but its own API endpoints.
  const dragonPersonalCreatePayload = () => ({
    name: data.name || "",
    gender: genderApi[data.gender] || data.gender || "",
    father: data.father || "",
    udyan_card: data.udyanCard || "",
    village: data.village || "",
    post: data.post || "",
    block: data.block || "",
    district: data.district || "",
    mobile: data.mobile || "",
    aadhaar: data.aadhaar || "",
    category: categoryApi[data.category] || data.category || "",
  });

  const dragonPersonalPayload = () => ({ form_id: formId, ...dragonPersonalCreatePayload() });
  const dragonLandPayload = () => ({
    form_id: formId,
    total_land: data.totalLand === "" ? null : Number(data.totalLand),
    proposed_area: data.propArea_val === "" ? null : Number(data.propArea_val),
    latitude: data.lat === "" ? null : Number(data.lat),
    longitude: data.lng === "" ? null : Number(data.lng),
    irrigation: irrigationApi[data.irrigation] || data.irrigation || "",
    irr_source: data.irrSource || [],
    irr_other: data.irrOther || null,
    altitude: data.altitude === "" ? null : Number(data.altitude),
    road_dist: data.roadDist === "" ? null : Number(data.roadDist),
    slope: slopeApi[data.slope] || data.slope || "",
    soil: data.soil || "",
    latitude: data.lat === "" ? null : Number(data.lat),
    longitude: data.lng === "" ? null : Number(data.lng),
  });
  const dragonPlanBankPayload = () => ({
    form_id: formId,
    plan_scheme: data.planScheme || "",
    cost_per_ha: data.costPerHa === "" ? null : String(data.costPerHa),
    plan_type: planTypeApi[data.planType] || data.planType || "",
    group_name: data.groupName || "",
    contribution: data.contribution || "",
    other_scheme: data.otherScheme || "",
    bank_name: data.bankName || "",
    branch: data.branch || "",
    account: data.account || "",
    ifsc: data.ifsc || "",
  });
  const dragonDocumentsPayload = () => ({
    form_id: formId,
    execution: executionApi[data.execution] || data.execution || null,
    firm_name: data.firmName || null,
    technical_standard_accepted: !!data.accept,
    documents: data.docs || [],
    place: data.place || "",
    application_date: data.date || new Date().toISOString().slice(0, 10),
    declaration_accepted: !!data.declare,
  });

  const personalCreatePayload = () => ({
    name: data.name || "",
    gender: genderApi[data.gender] || data.gender || "",
    father: data.father || "",
    udyan_card: data.udyanCard || "",
    village: data.village || "",
    post: data.post || "",
    block: data.block || "",
    district: data.district || "",
    mobile: data.mobile || "",
    aadhaar: data.aadhaar || "",
    category: categoryApi[data.category] || data.category || "",
  });

  const personalPayload = () => ({
    form_id: formId,
    name: data.name || "",
    gender: genderApi[data.gender] || data.gender || "",
    father: data.father || "",
    udyan_card: data.udyanCard || "",
    village: data.village || "",
    post: data.post || "",
    block: data.block || "",
    district: data.district || "",
    mobile: data.mobile || "",
    aadhaar: data.aadhaar || "",
    category: categoryApi[data.category] || data.category || "",
  });

  const landPayload = () => ({
    form_id: formId,
    total_land: data.totalLand === "" ? null : Number(data.totalLand),
    proposed_area: data.propArea_val === "" ? null : Number(data.propArea_val),
    latitude: data.lat === "" ? null : Number(data.lat),
    longitude: data.lng === "" ? null : Number(data.lng),
  });

  const bankPayload = () => ({
    form_id: formId,
    bank_name: data.bankName || "",
    branch: data.branch || "",
    account: data.account || "",
    ifsc: data.ifsc || "",
  });

  const planBankPayload = () => ({
    form_id: formId,
    plan_scheme: data.planScheme || "",
    cost_per_ha: data.costPerHa === "" ? null : String(data.costPerHa),
    plan_type: planTypeApi[data.planType] || data.planType || "",
    group_name: data.groupName || null,
    contribution: data.contribution || "",
    other_scheme: data.otherScheme || null,
    bank_name: data.bankName || "",
    branch: data.branch || "",
    account: data.account || "",
    ifsc: data.ifsc || "",
  });

  const techDocsPayload = () => ({
    form_id: formId,
    execution: executionApi[data.execution] || data.execution || null,
    firm_name: data.firmName || null,
    technical_standard_accepted: !!data.accept,
    place: data.place || "",
    application_date: data.date || new Date().toISOString().slice(0, 10),
    documents: data.docs || [],
    declaration_accepted: !!data.declare,
  });

  const markCompleted = (type) => {
    setCompletedSteps((prev) => new Set([...prev, type]));
  };

  const syncFromGetAndMark = async () => {
    const result = await getApplication();

    if (result?.item && formId) {
      const declarationAccepted =
        result.item?.application_documents?.declaration_accepted === true ||
        result.item?.application_documents?.declaration_accepted === 1 ||
        result.item?.declaration_accepted === true ||
        result.item?.declaration_accepted === 1;
      setIncompleteApplicationsByScheme((prev) => ({ ...prev, [schemeId]: declarationAccepted ? null : result.item }));
    }

    // Never blindly mark a step complete after PUT. Recalculate completion
    // from the actual server response so a missing required field stays !.
    const currentData = result?.nextData || data;
    if (schemeId) {
      setCompletedSteps(getCompletedStepsFromData(schemeId, currentData));
    }

    return result;
  };

  const submitCurrentStep = async () => {
    if (!validate()) {
      console.log("[Validate] Form validation failed. Errors:", errors);
      return false;
    }

    try {
      // Always use the server response after a save for completion checks.
      // React state updates are asynchronous, so checking `data` immediately
      // after PUT can otherwise evaluate the previous values and incorrectly
      // block/resume the wrong step.
      let savedServerData = data;

      /*
       * ============================================================
       * FIRST STEP - CREATE APPLICATION
       * ============================================================
       *
       * First step of every scheme uses:
       *
       * POST /kisan-application/
       *
       * Fencing:
       *   Step 0 = scheme
       *
       * Other schemes:
       *   Step 0 = personal
       *
       * This POST is used only once to create the application
       * and obtain the server-generated form_id.
       */
      if (step === 0) {
        // A brand-new application has no form_id, so POST is used exactly once.
        // If GET already restored an application and form_id exists, NEVER POST
        // again. Update the first step with PUT.
        if (!formId) {
          if (schemeId === "fencing") {
            console.log("[STEP 1] New fencing application → POST /kisan-application/");

            const created = await apiRequest(
              "kisan-application/",
              "POST",
              fencingCreatePayload()
            );

            const createdItem = mergeApiResponse(created);
            const newId =
              extractFormId(created) ||
              createdItem?.item?.form_id ||
              createdItem?.item?.id ||
              created?.data?.[0]?.form_id ||
              created?.data?.[0]?.id ||
              "";

            if (!newId) throw new Error("POST सफल रहा लेकिन response में form_id नहीं मिला।");

            setFormId(String(newId));
            // Keep the newly created server record as the single active
            // application so a re-entry can only resume this same form_id.
            setIncompleteApplicationsByScheme((prev) => ({ ...prev, [schemeId]: { form_id: String(newId) } }));
            await getApplication(String(newId));
          } else if (schemeId === "kiwi") {
            console.log("[KIWI STEP 1] New Kiwi application → POST /kiwi-application/");
            const created = await apiRequest("kiwi-application/", "POST", kiwiPersonalCreatePayload());
            const createdItem = mergeApiResponse(created);
            const newId = extractFormId(created) || createdItem?.item?.form_id || created?.data?.[0]?.form_id || "";
            if (!newId) throw new Error("Kiwi POST सफल रहा लेकिन response में form_id नहीं मिला।");
            setFormId(String(newId));
            setIncompleteApplicationsByScheme((prev) => ({ ...prev, kiwi: { form_id: String(newId) } }));
            await getApplication(String(newId), "kiwi");
          } else if (schemeId === "dragon") {
            console.log("[DRAGON STEP 1] New Dragon Fruit application → POST /dragon-application/");
            const created = await apiRequest("dragon-application/", "POST", dragonPersonalCreatePayload());
            const createdItem = mergeApiResponse(created);
            const newId = extractFormId(created) || createdItem?.item?.form_id || created?.data?.[0]?.form_id || "";
            if (!newId) throw new Error("Dragon Fruit POST सफल रहा लेकिन response में form_id नहीं मिला।");
            setFormId(String(newId));
            setIncompleteApplicationsByScheme((prev) => ({ ...prev, dragon: { form_id: String(newId) } }));
            await getApplication(String(newId), "dragon");
          } else {
            console.log("[STEP 1] New personal application → POST /kisan-application/");

            const created = await apiRequest(
              "kisan-application/",
              "POST",
              personalCreatePayload()
            );

            const createdItem = mergeApiResponse(created);
            const newId =
              extractFormId(created) ||
              createdItem?.item?.form_id ||
              createdItem?.item?.id ||
              created?.data?.[0]?.form_id ||
              created?.data?.[0]?.id ||
              "";

            if (!newId) throw new Error("POST सफल रहा लेकिन response में form_id नहीं मिला।");

            setFormId(String(newId));
            // Keep the newly created server record as the single active
            // application so a re-entry can only resume this same form_id.
            setIncompleteApplicationsByScheme((prev) => ({ ...prev, [schemeId]: { form_id: String(newId) } }));
            await getApplication(String(newId));
          }
        } else {
          // Existing/resumed application: first step is editable and PUT is used.
          if (schemeId === "fencing") {
            console.log("[STEP 1] Existing fencing application → PUT /kisan-personal-land-update/");
            await apiRequest(
              "kisan-personal-land-update/",
              "PUT",
              fencingSchemeUpdatePayload()
            );
          } else if (schemeId === "kiwi") {
            console.log("[KIWI STEP 1] Existing Kiwi application → PUT /kiwi-personal-details-update/");
            await apiRequest("kiwi-personal-details-update/", "PUT", kiwiPersonalPayload());
          } else if (schemeId === "dragon") {
            console.log("[DRAGON STEP 1] Existing Dragon Fruit application → PUT /dragon-personal-details-update/");
            await apiRequest("dragon-personal-details-update/", "PUT", dragonPersonalPayload());
          } else {
            console.log("[STEP 1] Existing personal application → PUT /kisan-personal-land-update/");
            await apiRequest(
              "kisan-personal-land-update/",
              "PUT",
              personalPayload()
            );
          }

          const synced = await syncFromGetAndMark();
          savedServerData = synced?.nextData || data;
          if (synced?.nextData) {
            const syncedCompleted = getCompletedStepsFromData(schemeId, synced.nextData);
            setCompletedSteps(syncedCompleted);
            if (!syncedCompleted.has(current)) return false;
          }
        }

        // Only move forward after successful POST/PUT and after the step is
        // actually complete according to the same required-field rules.
        const latestCompleted = getCompletedStepsFromData(schemeId, savedServerData);
        if (!latestCompleted.has(current)) return false;

        setCompletedSteps(latestCompleted);
        setStep((s) => s + 1);
        scrollToTop();
        return true;
      }

      /*
       * ============================================================
       * STEP 2 ONWARDS
       * ============================================================
       *
       * From this point onward:
       *
       * - NO POST
       * - Existing form_id is mandatory
       * - All updates use PUT
       *
       * If PUT fails, the user remains on the current step.
       */
      if (!formId) {
        throw new Error(
          "form_id उपलब्ध नहीं है। पहले आवेदन का POST सफल होना आवश्यक है।"
        );
      }

      /*
       * ------------------------------------------------------------
       * PERSONAL
       * ------------------------------------------------------------
       */
      if (current === "personal") {
        if (schemeId === "kiwi") {
          console.log("[KIWI PERSONAL] → PUT /kiwi-personal-details-update/");
          await apiRequest("kiwi-personal-details-update/", "PUT", kiwiPersonalPayload());
        } else if (schemeId === "dragon") {
          console.log("[DRAGON PERSONAL] → PUT /dragon-personal-details-update/");
          await apiRequest("dragon-personal-details-update/", "PUT", dragonPersonalPayload());
        } else {
          console.log("[PERSONAL] → PUT /kisan-personal-land-update/");
          await apiRequest("kisan-personal-land-update/", "PUT", personalPayload());
        }

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;
      }

      /*
       * ------------------------------------------------------------
       * LAND
       * ------------------------------------------------------------
       *
       * PUT /kisan-plan-technical-bank-update/
       *
       * Example payload:
       * {
       *   form_id: "FORM-000001",
       *   total_land: "5.5000",
       *   proposed_area: "2.2500",
       *   latitude: "30.3165000",
       *   longitude: "78.0322000"
       * }
       */
      else if (current === "land") {
        if (schemeId === "kiwi") {
          console.log("[KIWI LAND] → PUT /kiwi-plan-land-bank-update/");
          await apiRequest("kiwi-plan-land-bank-update/", "PUT", kiwiLandPayload());
        } else if (schemeId === "dragon") {
          console.log("[DRAGON LAND] → PUT /dragon-plan-land-bank-update/");
          await apiRequest("dragon-plan-land-bank-update/", "PUT", dragonLandPayload());
        } else {
          console.log("[LAND] → PUT /kisan-plan-technical-bank-update/");
          await apiRequest("kisan-plan-technical-bank-update/", "PUT", landPayload());
        }

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;
      }

      /*
       * ------------------------------------------------------------
       * BANK
       * ------------------------------------------------------------
       *
       * PUT /kisan-plan-technical-bank-update/
       *
       * Example payload:
       * {
       *   form_id: "FORM-000001",
       *   bank_name: "State Bank of India",
       *   branch: "Doiwala",
       *   account: "123456789012",
       *   ifsc: "SBIN0001234"
       * }
       */
      else if (current === "bank") {
        console.log(
          "[BANK] → PUT /kisan-plan-technical-bank-update/"
        );

        await apiRequest(
          "kisan-plan-technical-bank-update/",
          "PUT",
          bankPayload()
        );

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;
      }

      /*
       * ------------------------------------------------------------
       * PLAN + BANK
       * ------------------------------------------------------------
       */
      else if (current === "planbank") {
        if (schemeId === "kiwi") {
          console.log("[KIWI PLAN + BANK] → PUT /kiwi-plan-land-bank-update/");
          await apiRequest("kiwi-plan-land-bank-update/", "PUT", kiwiPlanBankPayload());
        } else if (schemeId === "dragon") {
          console.log("[DRAGON PLAN + BANK] → PUT /dragon-plan-land-bank-update/");
          await apiRequest("dragon-plan-land-bank-update/", "PUT", dragonPlanBankPayload());
        } else {
          console.log("[PLAN BANK] → PUT /kisan-plan-technical-bank-update/");
          await apiRequest("kisan-plan-technical-bank-update/", "PUT", planBankPayload());
        }

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;
      }

      /*
       * ------------------------------------------------------------
       * TECHNICAL
       * ------------------------------------------------------------
       */
      else if (current === "technical") {
        if (schemeId === "kiwi") {
          console.log("[KIWI TECHNICAL] → PUT /kiwi-application-documents-update/");
          await apiRequest("kiwi-application-documents-update/", "PUT", kiwiDocumentsPayload());
        } else if (schemeId === "dragon") {
          console.log("[DRAGON TECHNICAL] → PUT /dragon-application-documents-update/");
          await apiRequest("dragon-application-documents-update/", "PUT", dragonDocumentsPayload());
        } else {
          console.log("[TECHNICAL] → PUT /kisan-application-documents-update/");
          await apiRequest("kisan-application-documents-update/", "PUT", techDocsPayload());
        }

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;
      }

      /*
       * ------------------------------------------------------------
       * DOCUMENTS
       * ------------------------------------------------------------
       */
      else if (current === "docs") {
        if (schemeId === "kiwi") {
          console.log("[KIWI DOCUMENTS] → PUT /kiwi-application-documents-update/");
          await apiRequest("kiwi-application-documents-update/", "PUT", kiwiDocumentsPayload());
        } else if (schemeId === "dragon") {
          console.log("[DRAGON DOCUMENTS] → PUT /dragon-application-documents-update/");
          await apiRequest("dragon-application-documents-update/", "PUT", dragonDocumentsPayload());
        } else {
          console.log("[DOCUMENTS] → PUT /kisan-application-documents-update/");
          await apiRequest("kisan-application-documents-update/", "PUT", techDocsPayload());
        }

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;
      }

      /*
       * ------------------------------------------------------------
       * DECLARATION
       * ------------------------------------------------------------
       */
      else if (current === "declaration") {
        if (schemeId === "kiwi") {
          console.log("[KIWI DECLARATION] → PUT /kiwi-application-documents-update/");
          await apiRequest("kiwi-application-documents-update/", "PUT", kiwiDocumentsPayload());
        } else if (schemeId === "dragon") {
          console.log("[DRAGON DECLARATION] → PUT /dragon-application-documents-update/");
          await apiRequest("dragon-application-documents-update/", "PUT", dragonDocumentsPayload());
        } else {
          console.log("[DECLARATION] → PUT /kisan-application-documents-update/");
          await apiRequest("kisan-application-documents-update/", "PUT", techDocsPayload());
        }

        const synced = await syncFromGetAndMark();
        savedServerData = synced?.nextData || data;

        // Declaration submission is the final completion event. Once it is
        // accepted, never resume this form again; return to the two-tab home
        // screen so the center can immediately start a fresh application.
        if (savedServerData.declare === true) {
          await getApplicationList();
          setSchemeId(null);
          setStep(0);
          setFormId("");
          setData({ ...initialData });
          setCompletedSteps(new Set());
          setIncompleteApplicationsByScheme((prev) => ({ ...prev, [schemeId]: null }));
          setErrors({});
          setApiError("");
          setActiveTab("completed");
          scrollToTop();
          return true;
        }
      }

      /*
       * Move forward only after the API request succeeds AND the server data
       * confirms that every required field in this step is complete.
       */
      const latestCompleted = getCompletedStepsFromData(schemeId, savedServerData);
      if (!latestCompleted.has(current)) {
        setCompletedSteps(latestCompleted);
        setApiError("इस चरण की सभी आवश्यक जानकारी भरना अनिवार्य है।");
        return false;
      }

      setCompletedSteps(latestCompleted);
      setStep((s) => s + 1);
      scrollToTop();

      return true;
    } catch (error) {
      console.error(
        "[KISAN APPLICATION] API submission failed:",
        error
      );

      /*
       * Do not move to the next step if the API request fails.
       * The user stays on the current step and can retry.
       */
      return false;
    }
  };

  // Keep input updates simple and synchronous. Do not recreate input components
  // inside this parent during typing; TextInput is defined at module scope.
  // This preserves focus so the user can type continuously without re-clicking.
  const set = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: false }));
  };
  const selectScheme = async (id) => {
    setActiveTab("new");
    setApiError("");
    setApiLoading(true);

    try {
      if (!SCHEMES[id]) {
        throw new Error("अमान्य योजना चुनी गई है।");
      }

      /*
       * ============================================================
       * SCHEME-SPECIFIC GET-ALL
       * ============================================================
       *
       * Kiwi  -> /kiwi-application/
       * Fencing -> /kisan-application/
       *
       * Never send form_id in the GET URL.
       */
      const endpoint =
        id === "kiwi"
          ? "kiwi-application/"
          : id === "dragon"
            ? "dragon-application/"
            : id === "fencing"
              ? "kisan-application/"
              : null;

      if (!endpoint) {
        throw new Error("अमान्य योजना चुनी गई है।");
      }

      console.log(
        `[SELECT SCHEME] ${id} → GET /${endpoint}`
      );

      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const payload = await response.json().catch(() => ({}));

      console.log(
        `[${id.toUpperCase()} SELECT GET] /${endpoint} → ${response.status}`,
        payload
      );

      if (response.status === 404 || response.status === 204) {
        setIncompleteApplicationsByScheme((prev) => ({
          ...prev,
          [id]: null,
        }));

        setSchemeId(id);
        setStep(0);
        setData({ ...initialData });
        setFormId("");
        setCompletedSteps(new Set());
        setErrors({});
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            payload?.detail ||
            `GET failed (${response.status})`
        );
      }

      let candidates = [];

      if (Array.isArray(payload)) {
        candidates = payload;
      } else if (Array.isArray(payload?.data)) {
        candidates = payload.data;
      } else if (payload?.data && typeof payload.data === "object") {
        candidates = [payload.data];
      } else if (payload && typeof payload === "object") {
        candidates = [payload];
      }

      const isDeclarationAccepted = (item) =>
        item?.application_documents?.declaration_accepted === true ||
        item?.application_documents?.declaration_accepted === 1 ||
        item?.declaration_accepted === true ||
        item?.declaration_accepted === 1;

      /*
       * IMPORTANT:
       * Only this scheme's GET response is searched.
       *
       * A record is an incomplete application only when:
       *   1. it has a form_id,
       *   2. declaration is not accepted,
       *   3. at least one actual field has been saved.
       *
       * A completely empty record is treated as a fresh form.
       */
      const incomplete = candidates
        .filter((item) => {
          const idValue =
            item?.form_id ||
            item?.formId ||
            item?.id ||
            "";

          return (
            !!idValue &&
            !isDeclarationAccepted(item) &&
            hasAnySavedField(item)
          );
        })
        .sort((a, b) => {
          const getDate = (item) => {
            const value =
              item?.updated_at ||
              item?.updatedAt ||
              item?.application_documents?.updated_at ||
              item?.plan_land_bank?.updated_at ||
              item?.plan_technical_bank?.updated_at ||
              item?.personal?.updated_at ||
              0;

            const parsed = new Date(value).getTime();
            return Number.isFinite(parsed) ? parsed : 0;
          };

          return getDate(b) - getDate(a);
        })[0] || null;

      /*
       * No meaningful incomplete record for THIS scheme.
       * Start a brand-new application.
       */
      if (!incomplete) {
        console.log(
          `[${id.toUpperCase()}] No incomplete saved data found. Opening new form.`
        );

        setIncompleteApplicationsByScheme((prev) => ({
          ...prev,
          [id]: null,
        }));

        setSchemeId(id);
        setStep(0);
        setData({ ...initialData });
        setFormId("");
        setCompletedSteps(new Set());
        setErrors({});
        return;
      }

      const existingId =
        incomplete.form_id ||
        incomplete.formId ||
        incomplete.id ||
        "";

      /*
       * Store the exact response record. Do not mix it with the other scheme.
       */
      setIncompleteApplicationsByScheme((prev) => ({
        ...prev,
        [id]: {
          ...incomplete,
          __schemeKey: id,
        },
      }));

      setSchemeId(id);
      setFormId(String(existingId));

      console.log(
        `%c[${id.toUpperCase()} INCOMPLETE] Found form_id=${existingId}`,
        "color:#16a34a;font-weight:bold",
        incomplete
      );

      /*
       * Resume directly from the object returned by the GET-all API.
       * No second GET with ?form_id=... is made.
       */
      const result = mergeApiResponse(incomplete);

      if (!result?.item) {
        throw new Error(
          `${id} आवेदन का GET डेटा मान्य नहीं है।`
        );
      }

      const restoredData = result.nextData || {
        ...initialData,
      };

      setData(restoredData);

      const completed = getCompletedStepsFromData(
        id,
        restoredData
      );

      setCompletedSteps(completed);

      const steps = SCHEMES[id].steps;

      /*
       * First step whose ALL required fields are not saved/valid.
       * Example:
       *   personal complete
       *   land complete
       *   planbank partially filled
       *
       * Result: open planbank, not a blank personal form.
       */
      const firstIncompleteIndex = steps.findIndex(
        (stepName) => !completed.has(stepName)
      );

      const nextStep =
        firstIncompleteIndex === -1
          ? Math.max(0, steps.length - 1)
          : firstIncompleteIndex;

      setStep(nextStep);
      setErrors({});

      console.log(
        `[${id.toUpperCase()} RESUME] form_id=${existingId}`
      );
      console.log(
        `[${id.toUpperCase()} RESUME] completed steps:`,
        Array.from(completed)
      );
      console.log(
        `[${id.toUpperCase()} RESUME] opening step:`,
        steps[nextStep]
      );

      /*
       * IMPORTANT:
       * Do not call resumeApplication(existingId, id) here.
       * That would cause another GET and is unnecessary because the GET-all
       * response has already supplied the complete server record.
       */
    } catch (error) {
      console.error(
        `[${String(id).toUpperCase()} RESUME]`,
        error
      );

      setApiError(
        error.message ||
          "पिछला आवेदन प्राप्त नहीं हो सका।"
      );
    } finally {
      setApiLoading(false);
    }
  };
  const backToSchemes = () => {
    // Going back must NOT delete/reset an unfinished server application.
    // The lock remains active and the same form can be reopened from the home
    // screen.
    setSchemeId(null);
    setStep(0);
    setErrors({});
    setApiError("");
  };
  const visible = (f) =>
    !f.showIf ||
    (f.showIf.has
      ? (data[f.showIf.k] || []).includes(f.showIf.has)
      : f.showIf.any
        ? !!data[f.showIf.k]
        : data[f.showIf.k] === f.showIf.v);
        
  const validate = () => {
    const required = [];
    if (step === 0 && schemeId === "fencing")
      required.push("planScheme", "fencingType", "subsidyRatio", "centerName");
    if (step === 1 || (step === 0 && schemeId !== "fencing"))
      required.push(
        "name",
        "gender",
        "father",
        "village",
        "block",
        "district",
        "mobile",
        "aadhaar",
        "category",
      );
    const isLandStep =
      (schemeId === "fencing" && step === 2) ||
      (schemeId !== "fencing" && step === 1);
    if (isLandStep) required.push("totalLand", "propArea_val", "lat", "lng");
    if (schemeId !== "fencing" && isLandStep)
      required.push("irrigation", "altitude", "roadDist", "slope", "soil");
    if (
      isLandStep &&
      schemeId !== "fencing" &&
      data.irrigation === "हाँ" &&
      !(data.irrSource || []).length
    )
      required.push("irrSource");
    if (
      (schemeId === "fencing" && step === 3) ||
      (schemeId !== "fencing" && step === 2)
    )
      required.push("bankName", "branch", "account", "ifsc");
    if (schemeId !== "fencing" && step === 2)
      required.push("planScheme", "planType", "contribution");
    if (schemeId !== "fencing" && step === 2 && data.planType === "समूह")
      required.push("groupName");
    if (
      schemeId !== "fencing" &&
      step === 2 &&
      data.contribution === "अन्य योजना"
    )
      required.push("otherScheme");
    if (schemeId !== "fencing" && step === 3)
      required.push("execution", "accept");
    if (schemeId === "fencing" && step === 4) required.push("accept");
    if (schemeId === "fencing" && step === 6)
      required.push("place", "date", "declare");
    if (schemeId !== "fencing" && step === 5)
      required.push("place", "date", "declare");
      
    const e = {};
    required.forEach((k) => {
      if (!data[k] || (Array.isArray(data[k]) && !data[k].length)) e[k] = true;
    });
    
    // सुधार: Format जाँच केवल उसी step पर करें जब वह field required हो
    if (required.includes("mobile") && data.mobile && !/^[6-9]\d{9}$/.test(String(data.mobile).replace(/\D/g, "")))
      e.mobile = true;
    if (required.includes("aadhaar") && data.aadhaar && !/^\d{12}$/.test(String(data.aadhaar).replace(/\D/g, "")))
      e.aadhaar = true;
    if (required.includes("account") && data.account && !/^\d{9,18}$/.test(String(data.account).replace(/\s/g, "")))
      e.account = true;
    if (required.includes("ifsc") && data.ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(String(data.ifsc).trim()))
      e.ifsc = true;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    // The only way to move forward is through successful validation + API
    // save of the current step. This keeps the form strictly serial.
    return submitCurrentStep();
  };
  const gps = () => {
    if (!navigator.geolocation)
      return alert("इस ब्राउज़र में GPS उपलब्ध नहीं है।");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        set("lat", p.coords.latitude.toFixed(6));
        set("lng", p.coords.longitude.toFixed(6));
      },
      () => alert("लोकेशन नहीं मिली। ब्राउज़र में लोकेशन की अनुमति दें।"),
    );
  };
  const photo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set("photo", r.result);
    r.readAsDataURL(f);
  };

  const printCurrentApplication = () => {
    const source = document.querySelector(
      ".print-document:not(.print-document-preview)",
    );

    if (!source) {
      window.alert(
        "प्रिंट के लिए आवेदन तैयार नहीं है। कृपया पुनः प्रयास करें।",
      );
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument;
    const printWindow = iframe.contentWindow;

    if (!printDocument || !printWindow) {
      iframe.remove();
      window.alert("प्रिंट विंडो तैयार नहीं हो सकी।");
      return;
    }

    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((node) => {
        if (node.tagName.toLowerCase() === "link") {
          return `<link rel="stylesheet" href="${node.href}">`;
        }
        return `<style>${node.textContent || ""}</style>`;
      })
      .join("\n");

    const printableHtml = source.outerHTML
      .replace(/position:\s*absolute/gi, "position: static")
      .replace(/left:\s*-9999px/gi, "left: 0")
      .replace(/opacity:\s*0/gi, "opacity: 1")
      .replace(/z-index:\s*-1/gi, "z-index: 1");

    printDocument.open();
    printDocument.write(`<!doctype html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${scheme.full || "कृषक आवेदन पत्र"}</title>
  ${styles}
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      width: 100% !important;
      min-height: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-document {
      display: block !important;
      position: static !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      opacity: 1 !important;
      visibility: visible !important;
      z-index: 1 !important;
      pointer-events: auto !important;
      background: #fff !important;
    }

    .print-page {
      display: block !important;
      visibility: visible !important;
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      padding: 12mm !important;
      box-sizing: border-box !important;
      background: #fff !important;
      color: #000 !important;
      box-shadow: none !important;
    }

    .print-document-preview {
      display: none !important;
    }

    .print-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .print-avoid-break {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .print-photo img {
      display: block !important;
      max-width: 100% !important;
    }

    @media print {
      html,
      body {
        width: 100% !important;
        background: #fff !important;
      }

      .print-document {
        display: block !important;
      }
    }
  </style>
</head>
<body>
  ${printableHtml}
</body>
</html>`);
    printDocument.close();

    const finish = () => {
      window.setTimeout(() => iframe.remove(), 500);
    };

    const waitForImages = () => {
      const images = Array.from(printDocument.images || []);

      if (!images.length) {
        printWindow.focus();
        printWindow.print();
        finish();
        return;
      }

      let remaining = images.length;
      let done = false;

      const complete = () => {
        if (done) return;
        remaining -= 1;
        if (remaining > 0) return;
        done = true;
        printWindow.focus();
        printWindow.print();
        finish();
      };

      images.forEach((img) => {
        if (img.complete) {
          complete();
        } else {
          img.addEventListener("load", complete, { once: true });
          img.addEventListener("error", complete, { once: true });
        }
      });

      window.setTimeout(() => {
        if (done) return;
        done = true;
        printWindow.focus();
        printWindow.print();
        finish();
      }, 2500);
    };

    window.setTimeout(waitForImages, 300);
  };

  // Print exactly the same A4 document that is visible in the full-screen
  // "देखें" modal. We intentionally do not create an iframe or clone the
  // document because that can lose the component styles and produce blank pages.
  const printCompletedApplication = () => {
    if (!previewApplication?.schemeKey) {
      window.alert("प्रिंट के लिए आवेदन पूर्वावलोकन उपलब्ध नहीं है।");
      return;
    }

    const overlay = document.querySelector(".application-preview-overlay");
    const modal = overlay?.querySelector(".application-preview-modal");
    const documentNode = modal?.querySelector(".print-document-preview");

    if (!overlay || !modal || !documentNode) {
      window.alert("प्रिंट के लिए आवेदन तैयार नहीं है। कृपया पुनः प्रयास करें।");
      return;
    }

    // The CSS print rules use this class to expose only the modal/document.
    document.body.classList.add("printing-completed-application");

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("printing-completed-application");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    const printNow = () => {
      // Force browser layout/repaint before opening the native print preview.
      void documentNode.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
    };

    // Wait for application images before printing. This avoids a blank image
    // area in Chrome's print preview.
    const images = Array.from(documentNode.querySelectorAll("img"));
    const pendingImages = images.filter((img) => !img.complete);

    if (pendingImages.length === 0) {
      printNow();
      return;
    }

    let remaining = pendingImages.length;
    let finished = false;

    const ready = () => {
      if (finished) return;
      remaining -= 1;
      if (remaining > 0) return;
      finished = true;
      printNow();
    };

    pendingImages.forEach((img) => {
      img.addEventListener("load", ready, { once: true });
      img.addEventListener("error", ready, { once: true });
    });

    // Never leave the page stuck in print mode if an image request hangs.
    window.setTimeout(() => {
      if (finished) return;
      finished = true;
      printNow();
    }, 3000);
  };

  if (!scheme)
    return (
      <div className="kisan-page">
        <Header scheme={null} />
        <main className="portal">
          <div className="intro">
            <span className="eyebrow">उद्यान एवं खाद्य प्रसंस्करण विभाग</span>
            <h1>कृषक आवेदन पोर्टल</h1>
            <p>तीनों योजनाओं का आवेदन — एक ही जगह</p>
          </div>

          <div className="portal-tabs" role="tablist" aria-label="कृषक आवेदन विकल्प">
            <button
              type="button"
              className={`portal-tab ${activeTab === "new" ? "active" : ""}`}
              onClick={() => setActiveTab("new")}
            >
              <span>＋</span> नया आवेदन
            </button>
            <button
              type="button"
              className={`portal-tab ${activeTab === "completed" ? "active" : ""}`}
              onClick={async () => {
                setActiveTab("completed");
                await getApplicationList();
              }}
            >
              <span>▣</span> पूर्ण किए गए आवेदन
              <b>{completedApplications.length}</b>
            </button>
          </div>

          {activeTab === "new" ? (
            <section className="new-application-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">नई शुरुआत</span>
                  <h2>योजना चुनें और आवेदन भरें</h2>
                  <p>घोषणा सफलतापूर्वक जमा होने के बाद उसी केंद्र के लिए अगला आवेदन हमेशा नए फॉर्म से शुरू होगा।</p>
                </div>
              </div>
              {Object.entries(incompleteApplicationsByScheme).some(([, app]) => !!app) && (
                <div className="applications-error" role="alert">
                  <b>अधूरा आवेदन:</b> जिस योजना का आवेदन पहले से शुरू है, उसी योजना को चुनने पर
                  उसका पिछला डेटा server से उसी form_id के साथ फॉर्म में भरा जाएगा। दूसरी योजना स्वतंत्र है।
                </div>
              )}
              <div className="scheme-grid">
                {Object.entries(SCHEMES).map(([id, s]) => (
                  <button
                    className={`scheme-card s-${id}`}
                    key={id}
                    onClick={() => selectScheme(id)}
                  >
                    <SchemeIcon type={id} />
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.blurb}</p>
                      <div className="tags">
                        {s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
                      </div>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="completed-panel">
              <div className="completed-toolbar">
                <div>
                  <span className="eyebrow">केंद्र द्वारा जमा किए गए आवेदन</span>
                  <h2>पूर्ण आवेदन</h2>
                  <p>वे आवेदन जिनमें <b>घोषणा</b> सफलतापूर्वक जमा हो चुकी है।</p>
                </div>
                <button className="btn" type="button" onClick={() => setActiveTab("new")}>＋ नया आवेदन</button>
              </div>

              <div className="completed-filter-row">
                <label>योजना के अनुसार फ़िल्टर</label>
                <select
                  className="control"
                  value={schemeFilter}
                  onChange={(e) => setSchemeFilter(e.target.value)}
                >
                  <option value="all">सभी योजनाएँ</option>
                  {Object.entries(SCHEMES).map(([id, s]) => <option key={id} value={id}>{s.name}</option>)}
                </select>
                <button className="btn ghost" type="button" onClick={getApplicationList}>↻ ताज़ा करें</button>
              </div>

              {applicationsError && <div className="applications-error">{applicationsError}</div>}
              {applicationsLoading ? (
                <div className="empty-applications">आवेदन प्राप्त किए जा रहे हैं...</div>
              ) : (() => {
                const filter = schemeFilter;
                const rows = completedApplications.filter((item) => filter === "all" || detectSchemeIdFromApplication(item) === filter);
                if (!rows.length) return <div className="empty-applications">इस फ़िल्टर के लिए कोई पूर्ण आवेदन नहीं मिला।</div>;
                return (
                  <div className="applications-table-wrap">
                    <table className="applications-table">
                      <thead>
                        <tr>
                          <th>आवेदन क्रमांक</th>
                          <th>योजना</th>
                          <th>कृषक का नाम</th>
                          <th>ग्राम</th>
                          <th>जनपद</th>
                          <th>मोबाइल</th>
                          <th>जमा दिनांक</th>
                          <th>स्थिति</th>
                          <th className="action-column">कार्रवाई</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((item, index) => {
                          const formKey = item.form_id || item.formId || item.id || `application-${index}`;
                          const schemeKey = detectSchemeIdFromApplication(item);
                          const key = `${schemeKey || "unknown"}-${formKey}`;
                          const viewScheme = schemeKey ? SCHEMES[schemeKey] : null;
                          const viewData = getPreviewDataFromApplication(item);
                          return (
                            <tr key={key}>
                              <td><b>{formKey}</b></td>
                              <td>{viewScheme?.name || "—"}</td>
                              <td>{viewData.name || "—"}</td>
                              <td>{viewData.village || "—"}</td>
                              <td>{viewData.district || "—"}</td>
                              <td>{viewData.mobile || "—"}</td>
                              <td>{printValue("date", viewData.date || item.updated_at || "—")}</td>
                              <td><span className="status-badge">✓ घोषणा जमा</span></td>
                              <td className="action-column"><button className="view-btn" type="button" disabled={!viewScheme} onClick={() => setPreviewApplication({ item, schemeKey, data: viewData, formId: String(formKey) })}>देखें</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </section>
          )}
        </main>

        {previewApplication?.schemeKey && SCHEMES[previewApplication.schemeKey] && (
          <div className="application-preview-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setPreviewApplication(null); }}>
            <div className="application-preview-modal" role="dialog" aria-modal="true" aria-label="आवेदन पूर्वावलोकन">
              <div className="preview-modal-head">
                <div className="preview-heading-copy">
                  <span className="preview-eyebrow">पूर्ण आवेदन • प्रिंट पूर्वावलोकन</span>
                  <h2>आवेदन का पूर्वावलोकन</h2>
                  <span>आवेदन क्रमांक: <b>{previewApplication.formId}</b></span>
                </div>
                <div className="preview-modal-actions">
                  <button type="button" className="preview-print-btn" onClick={printCompletedApplication}>
                    🖨 प्रिंट / PDF
                  </button>
                  <button type="button" className="preview-close" onClick={() => setPreviewApplication(null)} aria-label="बंद करें">×</button>
                </div>
              </div>
              <div className="preview-modal-body">
                <PrintableApplication
                  scheme={SCHEMES[previewApplication.schemeKey]}
                  data={previewApplication.data}
                  calc={calculate(SCHEMES[previewApplication.schemeKey], previewApplication.data)}
                  appNo={previewApplication.formId}
                  preview
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );

  const total = scheme.steps.length;
  const current = scheme.steps[step];
  const currentLocked = false; // Server-completed steps remain editable.

  return (
    <>
      <div className="kisan-page">
        <Header scheme={scheme} />
        <main className="portal">
          <div className="topline">
            <div>
              <span className="eyebrow">आवेदन क्रमांक</span>
              <b>{appNo}</b>
            </div>
            <button className="link-btn" onClick={backToSchemes}>
              योजना बदलें
            </button>
          </div>
          {apiError && (
            <div className="api-error" role="alert">
              {apiError}
            </div>
          )}
          {formId && (
            <div className="api-status">
              Server Form ID: <b>{formId}</b>
              {apiLoading ? " — सेव हो रहा है..." : " — सर्वर से synced"}
            </div>
          )}
          <div className="progress">
            <span>
              चरण {Math.min(step + 1, total)} / {total}
            </span>
            <div className="progressbar">
              <i style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
          </div>
          {scheme && (
            <div
              className="server-step-status"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                margin: "14px 0 18px",
              }}
            >
              {(() => {
                const firstIncompleteIndex = scheme.steps.findIndex(
                  (name) => !completedSteps.has(name)
                );
                const maxAccessibleIndex =
                  firstIncompleteIndex === -1
                    ? scheme.steps.length
                    : firstIncompleteIndex;

                return scheme.steps.map((stepName, index) => {
                  const isCompleted = completedSteps.has(stepName);
                  const isCurrent = index === step;
                  const canNavigate = index <= maxAccessibleIndex;

                  return (
                  <button
                    key={stepName}
                    type="button"
                    disabled={!canNavigate}
                    onClick={() => {
                      if (canNavigate) setStep(index);
                    }}
                    style={{
                      border: isCurrent
                        ? "2px solid #2563eb"
                        : isCompleted
                          ? "1px solid #86efac"
                          : "1px solid #fdba74",
                      background: isCompleted
                        ? "#ecfdf5"
                        : "#fff7ed",
                      color: isCompleted
                        ? "#166534"
                        : "#c2410c",
                      borderRadius: "999px",
                      padding: "7px 12px",
                      cursor: canNavigate ? "pointer" : "not-allowed",
                      opacity: canNavigate ? 1 : 0.55,
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {isCompleted ? "✓ " : "! "}
                    {stepTitles[stepName]}
                  </button>
                  );
                });
              })()}
            </div>
          )}

          {step < total ? (
            <section
              className={`form-card ${currentLocked ? "locked-step" : ""}`}
            >
              <div className="section-head">
                <div>
                  <h2>{stepTitles[current]}</h2>
                  <p>
                    {current === "personal"
                      ? "आधार कार्ड में जो नाम है, वही लिखें।"
                      : current === "land"
                        ? "क्षेत्रफल और भौगोलिक विवरण सही भरें।"
                        : "आवश्यक जानकारी भरें और आगे बढ़ें।"}
                  </p>
                </div>
              </div>
              <fieldset
                className="step-fieldset"
                style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
              >
                <div className="form-grid">{renderStep(current)}</div>
              </fieldset>
              {completedSteps.has(current) && (
                <div
                  className="locked-note"
                  style={{
                    color: "#166534",
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    marginTop: "12px",
                  }}
                >
                  ✓ यह चरण सर्वर से प्राप्त हुआ है। आप इसकी जानकारी
                  <b> संपादित</b> कर सकते हैं और "आगे बढ़ें" दबाकर PUT से
                  अपडेट कर सकते हैं।
                </div>
              )}
            </section>
          ) : (
            <Review />
          )}
          <div className="actions">
            <div className="save-line">
              डेटा केवल API सर्वर पर सुरक्षित किया जाता है
            </div>
            <div className="action-buttons">
              {step === 0 ? (
                <button className="btn ghost" onClick={backToSchemes}>
                  योजना बदलें
                </button>
              ) : (
                <button
                  className="btn ghost"
                  onClick={() => {
                    setStep((s) => s - 1);
                    scrollToTop();
                  }}
                >
                  पीछे
                </button>
              )}
              {step < total ? (
                <button
                  className="btn"
                  onClick={next}
                  disabled={apiLoading}
                >
                  {apiLoading
                    ? "सहेजा जा रहा है..."
                    : step === total - 1
                      ? "आवेदन देखें"
                      : "आगे बढ़ें"}
                </button>
              ) : (
                <button className="btn" onClick={printCurrentApplication}>
                  प्रिंट / PDF
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
      <PrintableApplication
        scheme={scheme}
        data={data}
        calc={calc}
        appNo={appNo}
      />
    </>
  );

  function renderStep(type) {
    if (type === "scheme")
      return (
        <>
          <Field label="योजना का नाम" required error={errors.planScheme}>
            <Radio
              data={data}
              set={set}
              k="planScheme"
              options={["जिला योजना", "राज्य सेक्टर योजना"]}
            />
          </Field>
          <Field label="फेंसिंग का प्रकार" required error={errors.fencingType}>
            <Radio
              data={data}
              set={set}
              k="fencingType"
              options={["चेन लिंक फेंसिंग", "कांटेदार तार की बाड़"]}
            />
          </Field>
          <Field label="राजसहायता अनुपात" required error={errors.subsidyRatio}>
            <Radio
              data={data}
              set={set}
              k="subsidyRatio"
              options={[
                "80% राजसहायता : 20% कृषक अंश",
                "50% राजसहायता : 50% कृषक अंश",
              ]}
            />
          </Field>
          <Field label="केंद्र का नाम" required error={errors.centerName}>
            <TextInput data={data} set={set} k="centerName" />
          </Field>
          <CostBox calc={calc} scheme={scheme} />
        </>
      );
    if (type === "personal")
      return (
        <>
          <Field label="कृषक का नाम" required error={errors.name}>
            <TextInput data={data} set={set} k="name" />
          </Field>
          <Field label="लिंग" required error={errors.gender}>
            <Radio
              data={data}
              set={set}
              k="gender"
              options={["पुरुष", "महिला", "अन्य"]}
            />
          </Field>
          <Field label="पिता / पति का नाम" required error={errors.father}>
            <TextInput data={data} set={set} k="father" />
          </Field>
          <Field label="उद्यान कार्ड संख्या">
            <TextInput data={data} set={set} k="udyanCard" />
          </Field>
          <Field label="ग्राम" required error={errors.village}>
            <TextInput data={data} set={set} k="village" />
          </Field>
          <Field label="पोस्ट">
            <TextInput data={data} set={set} k="post" />
          </Field>
          <Field label="विकासखंड (ब्लॉक)" required error={errors.block}>
            <TextInput data={data} set={set} k="block" />
          </Field>
          <Field label="जनपद" required error={errors.district}>
            <TextInput data={data} set={set} k="district" />
          </Field>
          <Field
            label="मोबाइल नम्बर"
            required
            error={errors.mobile}
            hint="10 अंक, बिना +91"
          >
            <TextInput data={data} set={set} k="mobile" type="tel" />
          </Field>
          <Field
            label="आधार संख्या"
            required
            error={errors.aadhaar}
            hint="12 अंक"
          >
            <TextInput data={data} set={set} k="aadhaar" inputMode="numeric" />
          </Field>
          <Field label="कृषक की श्रेणी" required error={errors.category}>
            <Radio
              data={data}
              set={set}
              k="category"
              options={
                scheme === SCHEMES.fencing ? ["सामान्य", "अनुसूचित"] : CAT_SM
              }
            />
          </Field>
          <Field label="पासपोर्ट साइज़ फोटो">
            <div className="photo-row">
              <div className="photo-preview">
                {data.photo ? (
                  <img src={data.photo} alt="कृषक" />
                ) : (
                  <>
                    फोटो
                    <br />
                    बॉक्स
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={photo} />
            </div>
          </Field>
        </>
      );
    if (type === "land")
      return (
        <>
          <Field
            label="कुल भूमि (हेक्टेयर में)"
            required
            error={errors.totalLand}
          >
            <TextInput
              data={data}
              set={set}
              k="totalLand"
              type="number"
              step="0.01"
            />
          </Field>
          <Field
            label="प्रस्तावित क्षेत्रफल"
            required
            error={errors.propArea_val}
          >
            <div className="area-wrap">
              <TextInput
                data={data}
                set={set}
                k="propArea_val"
                type="number"
                step="0.01"
              />
              <Select
                data={data}
                set={set}
                k="propArea_unit"
                options={["नाली", "हेक्टेयर", "एकड़"]}
              />
            </div>
            <div className="hint">1 एकड़ = 20 नाली = 0.40 हेक्टेयर</div>
            <Ledger calc={calc} scheme={scheme} />
            <CostBox calc={calc} scheme={scheme} />
          </Field>
          {scheme !== SCHEMES.fencing && (
            <>
              <Field
                label="भूमि पर सिंचाई सुविधा उपलब्ध है?"
                required
                error={errors.irrigation}
              >
                <Radio
                  data={data}
                  set={set}
                  k="irrigation"
                  options={["हाँ", "नहीं"]}
                />
              </Field>
              {data.irrigation === "हाँ" && (
                <Field label="सिंचाई स्रोत" required error={errors.irrSource}>
                  <div className="opts">
                    {IRR.map((o) => (
                      <label className="opt" key={o}>
                        <input
                          type="checkbox"
                          checked={(data.irrSource || []).includes(o)}
                          onChange={(e) =>
                            set(
                              "irrSource",
                              e.target.checked
                                ? [...(data.irrSource || []), o]
                                : (data.irrSource || []).filter((x) => x !== o),
                            )
                          }
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                </Field>
              )}
              {data.irrigation === "हाँ" &&
                (data.irrSource || []).includes("अन्य") && (
                  <Field label="अन्य स्रोत का नाम">
                    <TextInput data={data} set={set} k="irrOther" />
                  </Field>
                )}
              <Field
                label="भूमि की ऊँचाई (मीटर में)"
                required
                error={errors.altitude}
              >
                <TextInput data={data} set={set} k="altitude" type="number" />
              </Field>
              <Field
                label="मुख्य मार्ग से दूरी (किलोमीटर)"
                required
                error={errors.roadDist}
              >
                <TextInput
                  data={data}
                  set={set}
                  k="roadDist"
                  type="number"
                  step="0.1"
                />
              </Field>
              <Field
                label="प्रस्तावित भूमि का ढाल"
                required
                error={errors.slope}
              >
                <Select
                  data={data}
                  set={set}
                  k="slope"
                  options={["समतल", "हल्का ढाल", "मध्यम ढाल", "तीव्र ढाल"]}
                />
              </Field>
              <Field label="मृदा का प्रकार" required error={errors.soil}>
                <Select
                  data={data}
                  set={set}
                  k="soil"
                  options={["दोमट", "बलुई दोमट", "चिकनी दोमट", "बलुई", "अन्य"]}
                />
              </Field>
            </>
          )}
          <Field label="अक्षांश (Latitude)" required error={errors.lat}>
            <TextInput data={data} set={set} k="lat" />
          </Field>
          <Field label="देशांतर (Longitude)" required error={errors.lng}>
            <TextInput data={data} set={set} k="lng" />
          </Field>
          <button className="btn gps" type="button" onClick={gps}>
            📍 मेरी वर्तमान लोकेशन भरें
          </button>
        </>
      );
    if (type === "bank") return renderBankFields();
    if (type === "planbank")
      return (
        <>
          <Field label="योजना का नाम" required error={errors.planScheme}>
            <Radio
              data={data}
              set={set}
              k="planScheme"
              options={["जिला योजना", "राज्य सेक्टर योजना"]}
            />
          </Field>
          <Field label="प्रति हेक्टेयर योजना लागत (₹)">
            <TextInput data={data} set={set} k="costPerHa" type="number" />
          </Field>
          <CostBox calc={calc} scheme={scheme} />
          <Field label="योजना श्रेणी" required error={errors.planType}>
            <Radio
              data={data}
              set={set}
              k="planType"
              options={["व्यक्तिगत", "समूह"]}
            />
          </Field>
          {data.planType === "समूह" && (
            <Field label="समूह का नाम" required error={errors.groupName}>
              <TextInput data={data} set={set} k="groupName" />
            </Field>
          )}
          <Field
            label="अंशदान की व्यवस्था"
            required
            error={errors.contribution}
          >
            <Radio
              data={data}
              set={set}
              k="contribution"
              options={["स्वयं", "ऋण", "अन्य योजना"]}
            />
          </Field>
          {data.contribution === "अन्य योजना" && (
            <Field
              label="अन्य योजना का नाम"
              required
              error={errors.otherScheme}
            >
              <TextInput data={data} set={set} k="otherScheme" />
            </Field>
          )}
          {renderBankFields()}
        </>
      );
    if (type === "technical")
      return (
        <>
          <Field
            label="कार्य कैसे कराया जाएगा"
            required
            error={errors.execution}
          >
            <Radio
              data={data}
              set={set}
              k="execution"
              options={[
                "स्वयं कार्य करने पर",
                "विभागीय पंजीकृत फर्म के माध्यम से",
              ]}
            />
          </Field>
          {data.execution === "विभागीय पंजीकृत फर्म के माध्यम से" && (
            <Field label="चयनित फर्म का नाम">
              <TextInput data={data} set={set} k="firmName" />
            </Field>
          )}
          <div className="standards">
            <h3>तकनीकी मानक</h3>
            <ul>
              {(scheme === SCHEMES.fencing &&
              data.fencingType === "कांटेदार तार की बाड़"
                ? scheme.barbed
                : scheme.standards
              ).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <Ledger calc={calc} scheme={scheme} />
          <CostBox calc={calc} scheme={scheme} />
          <Field error={errors.accept}>
            <label className="declare">
              <input
                type="checkbox"
                checked={!!data.accept}
                onChange={(e) => set("accept", e.target.checked)}
              />
              <span className="declare-text">
                मैं प्रमाणित {escName(data.gender)} कि कार्य के दौरान उपरोक्त
                तकनीकी मानकों का पालन अनिवार्यतः करूँगा/करूँगी।
              </span>
            </label>
          </Field>
        </>
      );
    if (type === "docs")
      return (
        <div className="docs">
          <p>जो दस्तावेज़ तैयार हैं उन पर निशान लगाएँ।</p>
          {scheme.docs.map((d) => (
            <label className="doc" key={d}>
              <input
                type="checkbox"
                checked={(data.docs || []).includes(d)}
                onChange={(e) =>
                  set(
                    "docs",
                    e.target.checked
                      ? [...(data.docs || []), d]
                      : (data.docs || []).filter((x) => x !== d),
                  )
                }
              />
              <span className="doc-text">{d}</span>
            </label>
          ))}
        </div>
      );
    return (
      <>
        <Field label="स्थान" required error={errors.place}>
          <TextInput data={data} set={set} k="place" />
        </Field>
        <Field label="दिनांक" required error={errors.date}>
          <TextInput data={data} set={set} k="date" type="date" />
        </Field>
        <div className="declare-block">
          <Field error={errors.declare}>
            <label className="declare">
              <input
                type="checkbox"
                checked={!!data.declare}
                onChange={(e) => set("declare", e.target.checked)}
              />
              <span className="declare-text">
                मैं प्रमाणित {escName(data.gender)} कि उपरोक्त दी गई सभी जानकारी
                मेरी जानकारी में पूर्णतः सही है।
              </span>
            </label>
          </Field>
        </div>
      </>
    );
  }
  // Render bank fields as a render function, not a nested React component.
  // Defining BankFields as a component inside KisanAavedanPortal recreates its
  // component type on every parent render, which can unmount/remount inputs
  // and cause focus to be lost after each typed character.
  function renderBankFields() {
    return (
      <>
        {[["bankName", "बैंक का नाम"], ["branch", "शाखा"]].map(([k, l]) => (
          <Field label={l} required error={errors[k]} key={k}>
            <TextInput data={data} set={set} k={k} />
          </Field>
        ))}
        <Field label="खाता संख्या" required error={errors.account}>
          <TextInput data={data} set={set} k="account" type="text" />
        </Field>
        <Field label="IFSC कोड" required error={errors.ifsc}>
          <TextInput data={data} set={set} k="ifsc" />
        </Field>
      </>
    );
  }
  function Review() {
    const missing = scheme.docs.filter((d) => !(data.docs || []).includes(d));
    return (
      <section className="form-card review">
        <div className="section-head">
          <div>
            <h2>आवेदन की समीक्षा</h2>
            <p>प्रिंट करने से पहले विवरण जाँच लें।</p>
          </div>
        </div>
        <div className="review-grid">
          {Object.entries(data)
            .filter(
              ([k, v]) =>
                v !== "" &&
                v !== false &&
                k !== "photo" &&
                k !== "docs" &&
                k !== "irrSource",
            )
            .map(([k, v]) => (
              <div className="revrow" key={k}>
                <span>{k}</span>
                <b>{Array.isArray(v) ? v.join(", ") : String(v)}</b>
              </div>
            ))}
        </div>
        <Ledger calc={calc} scheme={scheme} />
        <CostBox calc={calc} scheme={scheme} />
        <div className="docs-summary">
          <b>
            दस्तावेज़: {data.docs?.length || 0}/{scheme.docs.length}
          </b>
          {missing.length > 0 && <p>{missing.join(" · ")}</p>}
        </div>
        <div className="print-preview-box">
          <div className="print-preview-heading">
            <div>
              <b>पूरा आवेदन (जैसा छपेगा)</b>
              <span>नीचे वही A4 संरचना है जो Print / PDF में जाएगी।</span>
            </div>
          </div>
          <PrintableApplication
            scheme={scheme}
            data={data}
            calc={calc}
            appNo={appNo}
            preview
          />
        </div>
      </section>
    );
  }
}

function Header({ scheme }) {
  return (
    <header
      className={`portal-header ${scheme ? `theme-${scheme.code.toLowerCase()}` : ""}`}
    >
      <div>
        <div className="brand">🌱 कृषक आवेदन पोर्टल</div>
        <div className="subtitle">
          {scheme ? scheme.name : "तीनों योजनाओं का आवेदन — एक ही जगह"}
        </div>
      </div>
    </header>
  );
}
