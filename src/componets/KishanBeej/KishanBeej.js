import React, { useEffect, useMemo, useState } from "react";
import "./KishanBeej.css";

const API = "https://mahadevaaya.com/govbillingsystem/backend/api/kishanbeej";

const today = () => new Date().toISOString().slice(0, 10);

const money = (x) =>
  "₹" +
  Number(x || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const n = (x, d = 2) =>
  Number(x || 0).toLocaleString("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const gm = (x) => n(x, 2);

const dmy = (s) => (s ? String(s).split("-").reverse().join("-") : "");

const DEFAULT_CONFIG = {
  meta: {
    office: "उद्यान विशेषज्ञ कार्यालय · कोटद्वार गढ़वाल",
    title: "किसान बीज वितरण — सरल प्रणाली",
    scheme: "क्षेत्रफल विस्तार सब्जी योजना",
    year: "2026-27",
    subtitle:
      "जिला कार्ययोजना {{year}} · {{scheme}} · क्रय → आवंटन → वितरण, सब स्वतः जुड़ा",
    nav: [
      ["home", "🏠", "होम"],
      ["manak", "1️⃣", "Step 1 · मानक"],
      ["stock", "2️⃣", "Step 2 · स्टॉक"],
      ["entry", "3️⃣", "Step 3 · वितरण"],
      ["report", "4️⃣", "Step 4 · रिपोर्ट"],
    ],
    workflow: [
      { n: 1, label: "मानक टैब", desc: "हर किस्म के मद यहाँ जोड़ें/संपादित करें। राजसहायता व कृषक अंश का मानक स्वतः बनेगा।" },
      { n: 2, label: "स्टॉक टैब", desc: "बीज की खरीद और केन्द्रों को आवंटन यहाँ दर्ज होता है।" },
      { n: 3, label: "वितरण टैब", desc: "रोज़ का असली काम। केन्द्र, किस्म, किसान का नाम और क्षेत्रफल भरें — बाक़ी सब अपने आप।" },
      { n: 4, label: "रिपोर्ट टैब", desc: "छपाई व CSV।" },
    ],
    masterDefaults: {
      purchase_limit: 250000,
      project_cost: 60000,
      max_subsidy: 30000,
      farmer_share: 30000,
    },
    footer:
      "किसान बीज वितरण — सरल प्रणाली · जिला कार्ययोजना {{year}} · {{office}} · डेटा सर्वर पर सुरक्षित रहता है — नियमित CSV निर्यात व छपी प्रति अवश्य रखें।",
    printTitle: "किसान बीज वितरण रजिस्टर",
    printFooter:
      "उद्यान विशेषज्ञ कार्यालय · कोटद्वार गढ़वाल · जिला कार्ययोजना {{year}} · छपाई दिनांक {{date}}",
  },
};

function fill(str, map) {
  return str.replace(/{{(\w+)}}/g, (m, k) => (map[k] != null ? String(map[k]) : m));
}

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp(
      "(^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"
    )
  );
  return match ? decodeURIComponent(match[1]) : "";
}

async function jsonResponse(response) {
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`Server ने JSON के बजाय HTML/अन्य response दिया (${response.status}).`); }
  if (!response.ok) {
    let message = data?.detail || data?.error || "";
    if (!message) message = Object.values(data || {}).flat().join(" ");
    throw new Error(message || `Request failed (${response.status})`);
  }
  return data;
}

async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getCookie("csrftoken");
    if (csrf) headers["X-CSRFToken"] = csrf;
  }
  const response = await fetch(`${API}${path}`, {
    ...options,
    method,
    headers,
  });
  return jsonResponse(response);
}

const emptyForm = () => ({
  date: today(),
  centre: "",
  variety: "",
  area: "",
  name: "",
  father: "",
  village: "",
  mobile: "",
  sign1: "नहीं",
  sign2: "नहीं",
  note: "",
});

const emptyItemRow = () => ({ standard: null, label: "", unit: "", standard_qty: 0, qty: "", rate: "" });

const emptyAllot = () => ({ date: today(), centre: "", variety: "", qty: "", source: "" });
const emptyPurchase = () => ({ date: today(), variety: "", qty: "", rate: "", supplier: "", ref: "" });
const emptyVariety = () => ({ name: "", jati: "", default_rate: "", is_active: true });

/* === Standards (one record = one item) === */

function makeStandardItem(s) {
  return {
    id: s.id,
    variety: Number(s.variety),
    label: s.item_label || "",
    unit: s.item_unit || "",
    qty: Number(s.item_qty || 0),
    rate: Number(s.item_rate || 0),
  };
}

function groupByVariety(list) {
  const map = {};
  (list || []).forEach((s) => {
    const vid = Number(s.variety);
    if (!map[vid]) map[vid] = [];
    map[vid].push(makeStandardItem(s));
  });
  return map;
}

/* Calculate per-variety totals from the (flexible) list of items.
 * subsidy = items whose label mentions राजसहायता
 * farmer  = items whose label mentions कृषक अंश (else fallback)
 * gmha    = seed items (unit mentions किग्रा / kg) → qty * 1000
 */
function varietyTotals(items) {
  let total = 0, subsidy = 0, farmer = 0, gmha = 0;
  (items || []).forEach((it) => {
    const amt = Number(it.qty || 0) * Number(it.rate || 0);
    total += amt;
    const isSubsidy =
      (it.label && it.label.includes("राजसहायता")) ||
      (it.unit && (it.unit.includes("किग्रा") || /kg/i.test(it.unit)));
    const isFarmer = it.label && it.label.includes("कृषक अंश");
    if (isSubsidy) {
      subsidy += amt;
      if (it.unit && (it.unit.includes("किग्रा") || /kg/i.test(it.unit))) {
        gmha += Number(it.qty || 0) * 1000;
      }
    } else if (isFarmer) {
      farmer += amt;
    } else {
      farmer += amt; // default to farmer share if not classified
    }
  });
  return { total, subsidy, farmer, gmha };
}

/* === small UI bits === */
function Field({ label, required = false, children }) {
  return (
    <div>
      <label>
        {label} {required && <span className="r">*</span>}
      </label>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, state = "" }) {
  return (
    <div className={`kpi ${state}`}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="s">{sub}</div>
    </div>
  );
}

function EntryPreview({ calc, centre, stock }) {
  if (!calc) {
    return (
      <div className="note" style={{ marginTop: 12 }}>
        क्षेत्रफल भरते ही यहाँ पूरी गणना और केन्द्र का शेष स्टॉक दिखेगा।
      </div>
    );
  }
  const left = Number(stock || 0) - Number(calc.seed_gm || 0);
  return (
    <div className={`note ${left < 0 ? "bad" : "ok"}`} style={{ marginTop: 12 }}>
      बीज <b>{gm(calc.seed_gm)} ग्राम</b> · कुल लागत <b>{money(calc.total)}</b>{" "}
      (राजसहायता {money(calc.subsidy)} + कृषक अंश {money(calc.farmer)})
      {centre && (
        <>
          <br />
          <b>
            {left < 0
              ? `चेतावनी — इसके बाद ${centre} में बैलेंस ऋणात्मक (${gm(left)} ग्राम) हो जाएगा।`
              : `${centre} में इसके बाद शेष रहेगा: ${gm(left)} ग्राम`}
          </b>
        </>
      )}
    </div>
  );
}

export default function KishanBeej() {
  const [tab, setTab] = useState("home");
  const [stockTab, setStockTab] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [data, setData] = useState({
    master: null,
    meta: null,
    centres: [],
    varieties: [],
    standards: [],
    purchases: [],
    allocations: [],
    entries: [],
  });

  const [form, setForm] = useState(emptyForm);
  const [allotForm, setAllotForm] = useState(emptyAllot);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);
  const [varietyForm, setVarietyForm] = useState(emptyVariety);
  const [editingVarietyId, setEditingVarietyId] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);

  // Distribution edit mode (only items are editable; rest is locked)
  const [editingDistId, setEditingDistId] = useState(null);
  // Items table state for current/new distribution
  const [distItems, setDistItems] = useState([]); // [{standard, label, unit, standard_qty, qty, rate}]
  // Variety standards loaded for the currently selected variety in the form
  const [currentStandards, setDistCurrentStandards] = useState([]);
  const [currentStandardsLoading, setCurrentStandardsLoading] = useState(false);

  const [filters, setFilters] = useState({ centre: "", variety: "", search: "" });
  const [stockSearch, setStockSearch] = useState("");
  const [allotFilter, setAllotFilter] = useState("");

  const [masterDraft, setMasterDraft] = useState(null);
  const [meta, setMeta] = useState({ ...DEFAULT_CONFIG.meta });

  /* manak collapse state */
  const [openStandard, setOpenStandard] = useState({});
  /* item being edited (inline edit) */
  const [editingItem, setEditingItem] = useState(null); // { id, varietyId, form }
  /* per-variety new-item form */
  const [newItemForms, setNewItemForms] = useState({});
  /* per-variety items loaded from API */
  const [varietyItems, setVarietyItems] = useState({});

  const asList = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.results)) return value.results;
    return [];
  };

  /* =========================================================
     API LIFECYCLE: data loading follows strict dependency order.
     1. Bootstrap config
     2. Master settings + reference data (centres, varieties)
     3. Standards (depends on varieties)
     4. Transactions (purchases, allocations, distributions)
     ========================================================= */
  async function load() {
    setLoading(true);
    setError("");
    try {
      const bootstrap = await apiFetch("/bootstrap/");

      const [
        masterResult,
        centresResult,
        varietiesResult,
        standardsResult,
        purchasesResult,
        allocationsResult,
        distributionsResult,
      ] = await Promise.all([
        apiFetch("/master/"),
        apiFetch("/centres/"),
        apiFetch("/varieties/"),
        apiFetch("/standards/"),
        apiFetch("/purchases/"),
        apiFetch("/allocations/"),
        apiFetch("/distributions/"),
      ]);

      const result = {
        master: masterResult || bootstrap.master || null,
        meta: (bootstrap && bootstrap.meta) || null,
        centres: asList(centresResult).length ? asList(centresResult) : asList(bootstrap.centres),
        varieties: asList(varietiesResult).length ? asList(varietiesResult) : asList(bootstrap.varieties),
        standards: asList(standardsResult).length ? asList(standardsResult) : asList(bootstrap.standards),
        purchases: asList(purchasesResult).length ? asList(purchasesResult) : asList(bootstrap.purchases),
        allocations: asList(allocationsResult).length ? asList(allocationsResult) : asList(bootstrap.allocations),
        entries: asList(distributionsResult).length ? asList(distributionsResult) : asList(bootstrap.entries),
      };

      const mergedMeta = { ...DEFAULT_CONFIG.meta, ...(result.meta || {}) };

      setData(result);
      setMeta(mergedMeta);
      setMasterDraft(result.master || mergedMeta.masterDefaults);

      const grouped = groupByVariety(result.standards);
      setVarietyItems(grouped);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* =========================================================
     API LIFECYCLE
     1. Bootstrap  ->  /bootstrap/
     2. Master     ->  /master/
     3. Reference  ->  /centres/, /varieties/
     4. Standards  ->  /standards/
     5. Transactions -> /purchases/, /allocations/, /distributions/

     The load() function follows this exact sequence. Write
     operations below are grouped in the same lifecycle order.
     ========================================================= */

  async function load() {
    setLoading(true);
    setError("");
    try {
      const bootstrap = await apiFetch("/bootstrap/");

      const [
        masterResult,
        centresResult,
        varietiesResult,
        standardsResult,
        purchasesResult,
        allocationsResult,
        distributionsResult,
      ] = await Promise.all([
        apiFetch("/master/"),
        apiFetch("/centres/"),
        apiFetch("/varieties/"),
        apiFetch("/standards/"),
        apiFetch("/purchases/"),
        apiFetch("/allocations/"),
        apiFetch("/distributions/"),
      ]);

      const result = {
        master: masterResult || bootstrap.master || null,
        meta: (bootstrap && bootstrap.meta) || null,
        centres: asList(centresResult).length ? asList(centresResult) : asList(bootstrap.centres),
        varieties: asList(varietiesResult).length ? asList(varietiesResult) : asList(bootstrap.varieties),
        standards: asList(standardsResult).length ? asList(standardsResult) : asList(bootstrap.standards),
        purchases: asList(purchasesResult).length ? asList(purchasesResult) : asList(bootstrap.purchases),
        allocations: asList(allocationsResult).length ? asList(allocationsResult) : asList(bootstrap.allocations),
        entries: asList(distributionsResult).length ? asList(distributionsResult) : asList(bootstrap.entries),
      };

      const mergedMeta = { ...DEFAULT_CONFIG.meta, ...(result.meta || {}) };

      setData(result);
      setMeta(mergedMeta);
      setMasterDraft(result.master || mergedMeta.masterDefaults);

      const grouped = groupByVariety(result.standards);
      setVarietyItems(grouped);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* =========================================================
     PHASE 4: STANDARDS (lazy per-variety fetches)
     /standards/?variety={id}
     ========================================================= */

  /* === Standards API per variety === */
  async function fetchVarietyStandards(varietyId) {
    try {
      const result = await apiFetch(`/standards/?variety=${varietyId}`);
      const items = asList(result).map(makeStandardItem);
      setVarietyItems((p) => ({ ...p, [varietyId]: items }));
      return items;
    } catch (e) {
      setMessage(`✘ मानक लोड नहीं हुआ — ${e.message}`);
      return [];
    }
  }

  /* === Standards for the currently selected variety in distribution form === */
  async function loadStandardsForForm(varietyId) {
    if (!varietyId) {
      setDistCurrentStandards([]);
      setDistItems([]);
      return;
    }
    setCurrentStandardsLoading(true);
    try {
      const result = await apiFetch(`/standards/?variety=${varietyId}`);
      const rows = asList(result);
      setDistCurrentStandards(rows);
      setDistItems(
        rows.map((s) => ({
          standard: s.id,
          label: s.item_label || "",
          unit: s.item_unit || "",
          standard_qty: Number(s.item_qty || 0),
          qty: String(Number(s.item_qty || 0)),
          rate: String(Number(s.item_rate || 0)),
        }))
      );
    } catch (e) {
      setMessage(`✘ मानक लोड नहीं हुआ — ${e.message}`);
      setDistCurrentStandards([]);
      setDistItems([]);
    } finally {
      setCurrentStandardsLoading(false);
    }
  }

  /* =========================================================
     PHASE 2: MASTER CONFIG
     /master/  (GET in load, PUT below)
     ========================================================= */

  async function saveMaster() {
    try {
      const result = await apiFetch("/master/", {
        method: "PUT",
        body: JSON.stringify({
          purchase_limit: Number(masterDraft.purchase_limit),
          project_cost: Number(masterDraft.project_cost),
          max_subsidy: Number(masterDraft.max_subsidy),
          farmer_share: Number(masterDraft.farmer_share),
        }),
      });
      setData((p) => ({ ...p, master: result }));
      setMasterDraft(result);
      setMessage("✓ सुरक्षित।");
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  async function resetMaster() {
    if (!window.confirm("मूल मूल्यों पर लौटाएँ?")) return;
    try {
      const result = await apiFetch("/master/", {
        method: "PUT",
        body: JSON.stringify({
          purchase_limit: Number(meta.masterDefaults.purchase_limit),
          project_cost: Number(meta.masterDefaults.project_cost),
          max_subsidy: Number(meta.masterDefaults.max_subsidy),
          farmer_share: Number(meta.masterDefaults.farmer_share),
        }),
      });
      setData((p) => ({ ...p, master: result }));
      setMasterDraft(result);
      setMessage("✓ मूल मूल्य सुरक्षित हो गए।");
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  /* =========================================================
     PHASE 3: VARIETIES
     /varieties/  (POST, GET in load, PUT, DELETE)
     ========================================================= */

  function startEditVariety(v) {
    setEditingVarietyId(v.id);
    setVarietyForm({
      name: v.name || "",
      jati: v.jati || "",
      default_rate: v.default_rate != null ? String(v.default_rate) : "",
      is_active: v.is_active !== false,
    });
  }

  function cancelEditVariety() {
    setEditingVarietyId(null);
    setVarietyForm(emptyVariety());
  }

  async function saveVariety() {
    if (!varietyForm.name.trim()) {
      setMessage("किस्म का नाम भरना ज़रूरी है।");
      return;
    }
    const body = {
      name: varietyForm.name.trim(),
      jati: varietyForm.jati.trim(),
      default_rate: varietyForm.default_rate === "" ? 0 : Number(varietyForm.default_rate),
      is_active: !!varietyForm.is_active,
    };
    try {
      if (editingVarietyId) {
        await apiFetch(`/varieties/${editingVarietyId}/`, { method: "PUT", body: JSON.stringify(body) });
        setMessage(`✓ किस्म अद्यतन — ${body.name}।`);
      } else {
        await apiFetch("/varieties/", { method: "POST", body: JSON.stringify(body) });
        setMessage(`✓ नई किस्म जुड़ी — ${body.name}।`);
      }
      cancelEditVariety();
      await load();
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  async function deleteVariety(v) {
    if (!window.confirm(`क्या "${v.name}" किस्म हटानी है? मौजूदा मानक/क्रय/आवंटन/वितरण पर असर पड़ सकता है।`)) return;
    try {
      await apiFetch(`/varieties/${v.id}/`, { method: "DELETE" });
      if (editingVarietyId === v.id) cancelEditVariety();
      await load();
      setMessage(`✓ "${v.name}" किस्म हटाई गई।`);
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  /* =========================================================
     PHASE 4: STANDARD ITEMS
     /standards/  (POST, PUT, DELETE)
     ========================================================= */

  async function addStandardItem(varietyId) {
    const f = newItemForms[varietyId] || {};
    if (!f.label || !f.label.trim()) {
      setMessage("मद का नाम भरना ज़रूरी है।");
      return;
    }
    try {
      await apiFetch("/standards/", {
        method: "POST",
        body: JSON.stringify({
          variety: Number(varietyId),
          item_label: f.label.trim(),
          item_unit: (f.unit || "").trim(),
          item_qty: Number(f.qty || 0),
          item_rate: Number(f.rate || 0),
        }),
      });
      setNewItemForms((p) => ({ ...p, [varietyId]: {} }));
      await fetchVarietyStandards(varietyId);
      await load();
      setMessage("✓ मद जोड़ा गया।");
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  function startEditItem(item) {
    setEditingItem({
      id: item.id,
      varietyId: Number(item.variety),
      form: {
        label: item.label,
        unit: item.unit,
        qty: String(item.qty),
        rate: String(item.rate),
      },
    });
  }

  function cancelEditItem() {
    setEditingItem(null);
  }

  async function saveEditItem() {
    if (!editingItem) return;
    const f = editingItem.form;
    if (!f.label || !f.label.trim()) {
      setMessage("मद का नाम भरना ज़रूरी है।");
      return;
    }
    try {
      await apiFetch(`/standards/${editingItem.id}/`, {
        method: "PUT",
        body: JSON.stringify({
          variety: Number(editingItem.varietyId),
          item_label: f.label.trim(),
          item_unit: (f.unit || "").trim(),
          item_qty: Number(f.qty || 0),
          item_rate: Number(f.rate || 0),
        }),
      });
      const vid = editingItem.varietyId;
      setEditingItem(null);
      await fetchVarietyStandards(vid);
      await load();
      setMessage("✓ मद अद्यतन।");
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  async function deleteStandardItem(id, varietyId) {
    if (!window.confirm("क्या यह मद हटाना है?")) return;
    try {
      await apiFetch(`/standards/${id}/`, { method: "DELETE" });
      await fetchVarietyStandards(varietyId);
      await load();
      setMessage("✓ मद हटाया गया।");
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  /* =========================================================
     PHASE 5: PURCHASES
     /purchases/  (POST in addPurchase)
     ========================================================= */

  async function addPurchase() {
    const qty = Number(purchaseForm.qty);
    const rate = Number(purchaseForm.rate);
    if (!purchaseForm.date || !purchaseForm.variety || !qty || !rate) {
      setMessage("दिनांक, किस्म, मात्रा व दर भरें।");
      return;
    }
    try {
      const body = JSON.stringify({
        date: purchaseForm.date,
        variety: Number(purchaseForm.variety),
        qty_kg: qty,
        rate,
        supplier: purchaseForm.supplier.trim(),
        ref: purchaseForm.ref.trim(),
      });
      const result = editingPurchaseId
        ? await apiFetch(`/purchases/${editingPurchaseId}`, { method: "POST", body })
        : await apiFetch("/purchases/", { method: "POST", body });
      await load();
      setPurchaseForm(emptyPurchase());
      setEditingPurchaseId(null);
      setMessage(
        editingPurchaseId
          ? `✓ क्रय अद्यतन — ${result.variety_name}, ${n(result.qty_kg, 3)} किग्रा0 = ${money(result.amount)}।`
          : `✓ क्रय जुड़ा — ${result.variety_name}, ${n(result.qty_kg, 3)} किग्रा0 = ${money(result.amount)}।`
      );
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  function startEditPurchase(p) {
    setEditingPurchaseId(p.id);
    setPurchaseForm({
      date: p.date || today(),
      variety: String(p.variety),
      qty: String(p.qty_kg ?? ""),
      rate: String(p.rate ?? ""),
      supplier: p.supplier || "",
      ref: p.ref || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditPurchase() {
    setEditingPurchaseId(null);
    setPurchaseForm(emptyPurchase());
  }

  /* =========================================================
     PHASE 5: ALLOCATIONS
     /allocations/  (POST in addAllocation)
     ========================================================= */

  async function addAllocation() {
    if (!allotForm.date || !allotForm.centre || !allotForm.variety || !Number(allotForm.qty)) {
      setMessage("दिनांक, केन्द्र, किस्म व मात्रा भरें।");
      return;
    }
    const varietyId = Number(allotForm.variety);
    const qtyGm = Number(allotForm.qty);
    const available = centralLeft(varietyId);
    if (qtyGm > available + 0.01) {
      const vName = varietyById[varietyId]?.name || "";
      setMessage(
        `✘ आवंटन संभव नहीं — ${vName} का केन्द्रीय शेष केवल ${gm(available)} ग्राम है, आप ${gm(qtyGm)} ग्राम आवंटित करना चाहते हैं। पहले स्टॉक टैब से बीज-क्रय करें।`
      );
      return;
    }
    try {
      const result = await apiFetch("/allocations/", {
        method: "POST",
        body: JSON.stringify({
          date: allotForm.date,
          centre: Number(allotForm.centre),
          variety: Number(allotForm.variety),
          qty_gm: Number(allotForm.qty),
          source: allotForm.source.trim(),
        }),
      });
      await load();
      setAllotForm(emptyAllot());
      setMessage(`✓ ${result.centre_name} को ${result.variety_name} की ${gm(result.qty_gm)} ग्राम आवंटित।`);
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  /* =========================================================
     PHASE 6: DISTRIBUTIONS
     /distributions/  (POST in addEntry, PUT in updateDistributionItems)
     ========================================================= */

  function setFormValue(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "centre") {
        const allowed = centreVarieties(Number(value));
        const cur = varietyById[Number(prev.variety)]?.name;
        if (prev.variety && !allowed.includes(cur)) next.variety = "";
      }
      return next;
    });
    if (key === "variety") {
      loadStandardsForForm(value);
    }
  }

  function setItemField(idx, key, value) {
    setDistItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  function clearDistributionEdit() {
    setEditingDistId(null);
    setForm(emptyForm());
    setDistItems([]);
    setDistCurrentStandards([]);
  }

  function startEditDistribution(entry) {
    setEditingDistId(entry.id);
    setForm({
      date: entry.date || today(),
      centre: String(entry.centre || ""),
      variety: String(entry.variety || ""),
      area: String(entry.area || ""),
      name: entry.name || "",
      father: entry.father || "",
      village: entry.village || "",
      mobile: entry.mobile || "",
      sign1: entry.sign1 || "नहीं",
      sign2: entry.sign2 || "नहीं",
      note: entry.note || "",
    });
    const existing = (entry.items || []).map((it) => ({
      standard: it.standard,
      label: it.label || it.standard_label || "",
      unit: it.unit || it.standard_unit || "",
      standard_qty: Number(it.qty || 0),
      qty: String(it.qty || ""),
      rate: String(it.rate || ""),
    }));
    setDistItems(existing);
    if (entry.variety) {
      apiFetch(`/standards/?variety=${entry.variety}`)
        .then((rows) => setDistCurrentStandards(asList(rows)))
        .catch(() => {});
    }
    setTab("entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMessage(`✎ संपादन — मद बदलने हेतु तैयार। अन्य फ़ील्ड भी बदल सकते हैं।`);
  }

  async function addEntry() {
    if (!form.date || !form.centre || !form.variety || !form.area || !form.name.trim()) {
      setMessage("दिनांक, केन्द्र, किस्म, कृषक का नाम एवं क्षेत्रफल — पाँचों भरना ज़रूरी है।");
      return;
    }
    if (!distItems.length) {
      setMessage("✘ पहले किस्म का मानक लोड होने दें, फिर मद जोड़ें।");
      return;
    }
    const centreId = Number(form.centre);
    const varietyId = Number(form.variety);
    const area = Number(form.area);
    const t = totalsFor(varietyId);
    if (!t || t.gmha <= 0) {
      setMessage("✘ पहले मानक टैब में इस किस्म का बीज मद (राजसहायता, इकाई किग्रा0) जोड़ें।");
      return;
    }
    const requiredSeedGm = area * t.gmha;
    const available = opening(centreId, varietyId) - issued(centreId, varietyId);
    if (requiredSeedGm > available + 0.01) {
      const centreName = centres.find((c) => Number(c.id) === centreId)?.name || "";
      const varietyName = varietyById[varietyId]?.name || "";
      setMessage(
        `✘ वितरण संभव नहीं — ${centreName} में ${varietyName} का शेष ${gm(available)} ग्राम है, जबकि ${area} है0 के लिए ${gm(requiredSeedGm)} ग्राम चाहिए। पहले स्टॉक टैब से केन्द्र को आवंटित करें।`
      );
      return;
    }
    try {
      const itemsPayload = distItems
        .filter((it) => it.standard && (Number(it.qty) > 0 || Number(it.rate) > 0))
        .map((it) => ({
          standard: Number(it.standard),
          qty: Number(it.qty || 0),
          rate: Number(it.rate || 0),
        }));
      if (!itemsPayload.length) {
        setMessage("✘ कम से कम एक मद में मात्रा/दर भरें।");
        return;
      }
      const result = await apiFetch("/distributions/", {
        method: "POST",
        body: JSON.stringify({
          date: form.date,
          centre: Number(form.centre),
          variety: Number(form.variety),
          area: Number(form.area),
          name: form.name.trim(),
          father: form.father.trim(),
          village: form.village.trim(),
          mobile: form.mobile.trim(),
          sign1: form.sign1,
          sign2: form.sign2,
          note: form.note.trim(),
          items: itemsPayload,
        }),
      });
      await load();
      setForm(emptyForm());
      setDistItems([]);
      setDistCurrentStandards([]);
      setMessage(
        `✓ जुड़ गया — ${result.name}, ${result.centre_name}, ${result.variety_name}, ${gm(result.seed_gm)} ग्राम, कुल ${money(result.total)}।`
      );
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  /* Update an existing distribution — only items can change */
  async function updateDistributionItems() {
    if (!editingDistId) return;
    if (!distItems.length) {
      setMessage("✘ मद सूची खाली नहीं हो सकती।");
      return;
    }
    const itemsPayload = distItems
      .filter((it) => it.standard && (Number(it.qty) > 0 || Number(it.rate) > 0))
      .map((it) => ({
        standard: Number(it.standard),
        qty: Number(it.qty || 0),
        rate: Number(it.rate || 0),
      }));
    if (!itemsPayload.length) {
      setMessage("✘ कम से कम एक मद में मात्रा/दर भरें।");
      return;
    }
    try {
      const result = await apiFetch(`/distributions/${editingDistId}/`, {
        method: "PUT",
        body: JSON.stringify({
          date: form.date,
          centre: Number(form.centre),
          variety: Number(form.variety),
          area: Number(form.area),
          name: form.name.trim(),
          father: form.father.trim(),
          village: form.village.trim(),
          mobile: form.mobile.trim(),
          sign1: form.sign1,
          sign2: form.sign2,
          note: form.note.trim(),
          items: itemsPayload,
        }),
      });
      await load();
      clearDistributionEdit();
      setMessage(`✓ अद्यतन — ${result.name}, कुल ${money(result.total)}।`);
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  /* =========================================================
     SHARED DELETE HELPER
     /purchases/{id} POST _method=delete
     /{type}/{id}/ DELETE
     ========================================================= */

  async function deleteItem(type, id, label) {
    if (!window.confirm(`क्या ${label} हटाना है? यह वापस नहीं आएगा।`)) return;
    try {
      if (type === "purchases") {
        await apiFetch(`/purchases/${id}`, { method: "POST", body: JSON.stringify({ _method: "delete" }) });
      } else {
        await apiFetch(`/${type}/${id}/`, { method: "DELETE" });
      }
      await load();
    } catch (e) {
      setMessage(`✘ ${e.message}`);
    }
  }

  // Ref to know editing state from inside async setters (kept for future use)
  const editingDistIdRef = React.useRef(null);
  React.useEffect(() => { editingDistIdRef.current = editingDistId; }, [editingDistId]);

  const centres = data.centres || [];
  const varieties = data.varieties || [];
  const purchases = data.purchases || [];
  const allocations = data.allocations || [];
  const entries = data.entries || [];
  const master = data.master || { ...meta.masterDefaults };

  const varietyById = Object.fromEntries(varieties.map((v) => [v.id, v]));

  function itemsFor(varietyId) {
    return varietyItems[Number(varietyId)] || [];
  }
  function totalsFor(varietyId) {
    return varietyTotals(itemsFor(varietyId));
  }

  /* === stock calculations === */
  const purchAmt = (vid) =>
    purchases.filter((p) => Number(p.variety) === Number(vid)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const purchGm = (vid) =>
    purchases.filter((p) => Number(p.variety) === Number(vid)).reduce((s, p) => s + Number(p.qty_kg || 0) * 1000, 0);
  const allotGm = (vid) =>
    allocations.filter((a) => Number(a.variety) === Number(vid)).reduce((s, a) => s + Number(a.qty_gm || 0), 0);
  const centralLeft = (vid) => purchGm(vid) - allotGm(vid);
  const opening = (cid, vid) =>
    allocations
      .filter((a) => Number(a.centre) === Number(cid) && Number(a.variety) === Number(vid))
      .reduce((s, a) => s + Number(a.qty_gm || 0), 0);
  const issued = (cid, vid) =>
    entries
      .filter((e) => Number(e.centre) === Number(cid) && Number(e.variety) === Number(vid))
      .reduce((s, e) => s + Number(e.seed_gm || 0), 0);
  const gmha = (vid) => totalsFor(vid).gmha;
  const centreVarieties = (cid) =>
    varieties.filter((v) => opening(cid, v.id) > 0).map((v) => v.name);

  /* === distribution live calc === */
  const calcEntry = useMemo(() => {
    const area = Number(form.area);
    const t = form.variety ? totalsFor(form.variety) : null;
    if (!t || !area || area <= 0) return null;
    return {
      area,
      seed_gm: area * t.gmha,
      subsidy: area * t.subsidy,
      farmer: area * t.farmer,
      total: area * t.total,
    };
  }, [form.area, form.variety, varietyItems]);

  /* === allocation calc === */
  const allotCalc = useMemo(() => {
    const qty = Number(allotForm.qty);
    const t = totalsFor(allotForm.variety);
    if (!qty || qty <= 0 || !allotForm.variety) return null;
    const gmPerHa = t.gmha || 1;
    const area = qty / gmPerHa;
    return {
      gmv: qty,
      area,
      project: area * Number(master.project_cost),
      subsidy: area * Number(master.max_subsidy),
      farmer: area * Number(master.farmer_share),
    };
  }, [allotForm.qty, allotForm.variety, master, varietyItems]);

  /* === purchase calc === */
  const purchaseCalc = useMemo(() => {
    const qty = Number(purchaseForm.qty);
    const rate = Number(purchaseForm.rate);
    if (!purchaseForm.variety || !qty || !rate) return null;
    const total = qty * rate;
    const done = purchAmt(Number(purchaseForm.variety));
    const left = Number(master.purchase_limit) - done;
    return { total, done, left, after: done + total, remaining: left - total };
  }, [purchaseForm, purchases, master]);

  /* === ledger === */
  const ledgerRows = useMemo(() => {
    const result = [];
    centres.forEach((centre) => {
      varieties.forEach((variety) => {
        const received = opening(centre.id, variety.id);
        const distributed = issued(centre.id, variety.id);
        if (received || distributed) {
          result.push({
            centre: centre.name,
            centreId: centre.id,
            variety: variety.name,
            varietyId: variety.id,
            opening: received,
            issued: distributed,
            balance: received - distributed,
            farmers: entries.filter(
              (e) =>
                Number(e.centre) === Number(centre.id) &&
                Number(e.variety) === Number(variety.id)
            ).length,
          });
        }
      });
    });
    const q = stockSearch.trim().toLowerCase();
    if (!q) return result;
    return result.filter((r) =>
      `${r.centre}${r.variety}`.toLowerCase().includes(q)
    );
  }, [centres, varieties, allocations, entries, stockSearch]);

  const filteredEntries = entries.filter((e) => {
    return (
      (!filters.centre || Number(e.centre) === Number(filters.centre)) &&
      (!filters.variety || Number(e.variety) === Number(filters.variety)) &&
      (!filters.search ||
        `${e.name}${e.village || ""}${e.father || ""}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()))
    );
  });

  const auditChecks = useMemo(() => {
    const over = ledgerRows.filter((r) => r.balance < 0);
    const noSign = entries.filter((e) => e.sign1 !== "हाँ" || e.sign2 !== "हाँ");
    const badManak = varieties.filter((v) => {
      const t = totalsFor(v.id);
      return Math.abs(t.total - Number(master.project_cost)) >= 0.5;
    });
    const overAll = varieties.filter((v) => centralLeft(v.id) < -0.5);
    const atLimit = varieties.filter(
      (v) =>
        Number(master.purchase_limit) - purchAmt(v.id) <= 0.5 && purchAmt(v.id) > 0
    );
    const subsidy = entries.reduce((s, e) => s + Number(e.subsidy || 0), 0);
    const farmer = entries.reduce((s, e) => s + Number(e.farmer || 0), 0);
    const total = entries.reduce((s, e) => s + Number(e.total || 0), 0);
    return [
      {
        ok: !over.length,
        t: over.length
          ? `${over.length} केन्द्र-किस्म संयोजन में स्टॉक से अधिक वितरण — स्टॉक टैब में लाल पंक्तियाँ देखें।`
          : "किसी भी केन्द्र में स्टॉक से अधिक वितरण नहीं हुआ।",
      },
      {
        ok: !noSign.length,
        t: noSign.length
          ? `${noSign.length} प्रविष्टियों में कृषक/वितरक हस्ताक्षर बाकी हैं।`
          : "सभी प्रविष्टियों में दोनों हस्ताक्षर पूर्ण हैं।",
      },
      {
        ok: !badManak.length,
        t: badManak.length
          ? `${badManak.map((v) => v.name).join(", ")} — इनका मानक ₹${n(
              master.project_cost,
              0
            )}/है0 से भिन्न है, मानक टैब में जाँचें।`
          : `सभी ${varieties.length} किस्मों का मानक ₹${n(
              master.project_cost,
              0
            )}/है0 से पूरा मेल खाता है।`,
      },
      {
        ok: !overAll.length,
        t: overAll.length
          ? `${overAll.map((v) => v.name).join(", ")} — इनका केन्द्र-आवंटन कुल खरीद से अधिक है।`
          : "किसी किस्म का आवंटन उसकी खरीदी मात्रा से अधिक नहीं है।",
      },
      {
        ok: Math.abs(subsidy + farmer - total) < 0.5,
        t: `कुल राजसहायता ${money(subsidy)} + कृषक अंश ${money(farmer)} = कुल परियोजना निवेश ${money(total)} — मिलान सही।`,
      },
      {
        ok: true,
        t: atLimit.length
          ? `${atLimit.map((v) => v.name).join(", ")} — इनकी क्रय सीमा ${money(master.purchase_limit)} समाप्त, आगे खरीद स्वीकार नहीं होगी।`
          : "किसी भी किस्म की क्रय सीमा अभी समाप्त नहीं हुई है।",
      },
      {
        ok: true,
        t: "कृषक अंश नकद वितरित राशि नहीं, केवल अभिलेखीय स्व-अंशदान मूल्य है।",
      },
    ];
  }, [ledgerRows, entries, master, varieties, purchases, varietyItems]);

  const reportRows = varieties.map((v) => {
    const purchase = purchAmt(v.id);
    const remaining = Math.max(0, Number(master.purchase_limit) - purchase);
    const allocated = allotGm(v.id);
    const central = centralLeft(v.id);
    const distributed = entries
      .filter((e) => Number(e.variety) === Number(v.id))
      .reduce((s, e) => s + Number(e.seed_gm || 0), 0);
    const area = allocated / (gmha(v.id) || 1);
    return {
      v,
      purchase,
      remaining,
      allocated,
      central,
      distributed,
      area,
      project: area * Number(master.project_cost),
      count: entries.filter((e) => Number(e.variety) === Number(v.id)).length,
      purchaseGm: purchGm(v.id),
    };
  });

  function downloadCsv(filename, headers, rows) {
    const content =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printHtml(html, title) {
    const css = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => link.href)
      .find((href) => href.includes("KishanBeej"));
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(`
      <!doctype html><html lang="hi"><head><meta charset="utf-8"><title>${title}</title>
      ${css ? `<link rel="stylesheet" href="${css}">` : ""}</head>
      <body><div id="printarea">${html}</div>
      <script>window.onload = () => setTimeout(() => window.print(), 250);<\/script>
      </body></html>
    `);
    win.document.close();
  }

  function printRegister(list = filteredEntries, title = meta.printTitle || DEFAULT_CONFIG.meta.printTitle) {
    if (!list.length) {
      alert("कोई प्रविष्टि नहीं।");
      return;
    }
    const rows = list
      .map(
        (e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${dmy(e.date)}</td>
          <td>${e.centre_name}</td>
          <td>${e.variety_name}</td>
          <td>${e.name}</td>
          <td>${e.village || ""}</td>
          <td>${n(e.area, 3)}</td>
          <td>${gm(e.seed_gm)}</td>
          <td>${money(e.total)}</td>
          <td>${money(e.subsidy)}</td>
          <td>${money(e.farmer)}</td>
          <td class="sg"></td>
        </tr>`
      )
      .join("");
    printHtml(`
      <h2>${title}</h2>
      <p class="pm">${fill(meta.printFooter || DEFAULT_CONFIG.meta.printFooter, {
        year: meta.year,
        office: meta.office,
        date: dmy(today()),
      })}</p>
      <table>
        <thead>
          <tr>
            <th>क्र0</th><th>दिनांक</th><th>केन्द्र</th><th>किस्म</th>
            <th>कृषक का नाम</th><th>ग्राम</th><th>क्षे0फ0</th>
            <th>बीज (ग्राम)</th><th>कुल लागत</th><th>राजसहायता</th><th>कृषक अंश</th>
            <th>कृषक हस्ताक्षर/अंगूठा</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="pm">
        हस्ताक्षर उद्यान सचल दल ..................................... &nbsp;&nbsp;&nbsp;
        हस्ताक्षर केन्द्र प्रभारी .....................................
      </p>
    `, title);
  }

  if (loading) {
    return (
      <div className="kishan-beej-app">
        <header>
          <div className="in">
            <div className="eyebrow">{meta.office}</div>
            <h1>{meta.title}</h1>
            <p>{fill(meta.subtitle, { year: meta.year, scheme: meta.scheme })}</p>
          </div>
        </header>
        <div className="kishan-beej-main">
          <div className="kishan-beej-card">
            <div className="note">डेटा सर्वर से लोड हो रहा है...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="kishan-beej-app">
        <header>
          <div className="in">
            <div className="eyebrow">{meta.office}</div>
            <h1>{meta.title}</h1>
            <p>{fill(meta.subtitle, { year: meta.year, scheme: meta.scheme })}</p>
          </div>
        </header>

        <nav>
          <div className="in">
            {meta.nav.map(([id, icon, label]) => (
              <button
                key={id}
                className={tab === id ? "on" : ""}
                onClick={() => {
                  setTab(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="ic">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </nav>

        {error && (
          <div className="kishan-beej-main">
            <div className="note bad">
              ✘ {error}
              <button className="kishan-beej-btn b2 sm" style={{ marginLeft: 10 }} onClick={load}>
                फिर प्रयास करें
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className="kishan-beej-main">
            <div className={`note ${message.startsWith("✓") ? "ok" : "bad"}`}>{message}</div>
          </div>
        )}

        <div className="kishan-beej-main">
          {/* ===================== HOME ===================== */}
          {tab === "home" && (
            <section className="panel on">
              <h2>एक नज़र में स्थिति</h2>
              <p className="kishan-beej-sub">
                नीचे पूरी योजना की जीवंत स्थिति है। कोई भी संख्या लाल दिखे तो उसी टैब में जाकर जाँच करें।
              </p>
              <div className="kpis">
                <Kpi
                  label="कुल क्रय राशि"
                  value={money(purchases.reduce((s, p) => s + Number(p.amount || 0), 0))}
                  sub={`सभी ${varieties.length} किस्में`}
                />
                <Kpi
                  label="किसानों को वितरित"
                  value={`${gm(entries.reduce((s, e) => s + Number(e.seed_gm || 0), 0))} ग्राम`}
                  sub={`${entries.length} प्रविष्टियाँ`}
                />
                <Kpi
                  label="केन्द्रों में शेष"
                  value={`${gm(ledgerRows.reduce((s, r) => s + r.balance, 0))} ग्राम`}
                  sub={`प्राप्त ${n(ledgerRows.reduce((s, r) => s + r.opening, 0), 0)} ग्राम में से`}
                  state={ledgerRows.reduce((s, r) => s + r.balance, 0) < 0 ? "bad" : "ok"}
                />
                <Kpi
                  label="ध्यान देने योग्य"
                  value={auditChecks.filter((c) => !c.ok).length}
                  sub={`${ledgerRows.filter((r) => r.balance < 0).length} अधिक-वितरण, ${
                    entries.filter((e) => e.sign1 !== "हाँ" || e.sign2 !== "हाँ").length
                  } हस्ताक्षर बाकी`}
                  state={auditChecks.some((c) => !c.ok) ? "bad" : "ok"}
                />
              </div>
              <div className="kishan-beej-card">
                <h3>ज़रूरी जाँच</h3>
                <ul className="chk">
                  {auditChecks.slice(0, 5).map((c, i) => (
                    <li key={i}>
                      <span className={`i ${c.ok ? "ok" : "bad"}`}>{c.ok ? "✔" : "✘"}</span>
                      <span>{c.t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="kishan-beej-card">
                <h3>काम का क्रम — बस इतना ही</h3>
                <ul className="chk">
                  {meta.workflow.map((step) => (
                    <li key={step.n}>
                      <span className="i ok">{step.n}</span>
                      <span>
                        <b>{step.label}</b> — {fill(step.desc, {})}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

        {/* ===================== DISTRIBUTION ===================== */}
        {tab === "entry" && (
          <section className="panel on">
            <h2>किसान को बीज वितरण</h2>
            <p className="kishan-beej-sub">
              केवल <b>केन्द्र, किस्म, किसान का नाम और क्षेत्रफल</b> भरना है — बीज की मात्रा व राशि अपने आप निकल आएँगी।
            </p>
            <div className="kishan-beej-card noprint">
              <h3>
                {editingDistId ? `✎ संपादन — क्रमांक ${editingDistId}` : "नई प्रविष्टि"}
                {editingDistId && (
                  <button
                    className="kishan-beej-btn b2 sm"
                    style={{ marginLeft: 10 }}
                    onClick={clearDistributionEdit}
                  >
                    रद्द करूँ
                  </button>
                )}
              </h3>
              {editingDistId && (
                <div className="note ok" style={{ marginBottom: 10 }}>
                  संपादन मोड — सभी फ़ील्ड बदल सकते हैं। मद तालिका में नई मात्रा/दर भरकर
                  <b> "मद अद्यतन करें"</b> पर क्लिक करें। किस्म बदलने पर मद तालिका उस किस्म के मानक से अपने आप भर जाएगी।
                </div>
              )}
              <div className="grid g4">
                <Field label="दिनांक" required>
                  <input type="date" className="need" value={form.date}
                    onChange={(e) => setFormValue("date", e.target.value)} />
                </Field>
                <Field label="उ0स0द0 केन्द्र" required>
                  <select className="need" value={form.centre}
                    onChange={(e) => setFormValue("centre", e.target.value)}>
                    <option value="">— केन्द्र चुनें —</option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="किस्म" required>
                  <select className="need" value={form.variety}
                    onChange={(e) => setFormValue("variety", e.target.value)}>
                    <option value="">—{form.centre ? "किस्म चुनें" : "पहले केन्द्र चुनें"}—</option>
                    {(form.centre ? centreVarieties(Number(form.centre)) : varieties.map((v) => v.name)).map((name) => {
                      const v = varieties.find((x) => x.name === name);
                      return v ? <option key={v.id} value={v.id}>{v.name}</option> : null;
                    })}
                  </select>
                </Field>
                <Field label="क्षेत्रफल (है0)" required>
                  <input type="number" className="need" step="0.001" min="0.001"
                    placeholder="जैसे 0.200" value={form.area}
                    onChange={(e) => setFormValue("area", e.target.value)} />
                </Field>
              </div>
              <div className="grid g4" style={{ marginTop: 10 }}>
                <Field label="कृषक का नाम" required>
                  <input value={form.name} placeholder="श्री ..."
                    onChange={(e) => setFormValue("name", e.target.value)} />
                </Field>
                <Field label="पिता/पति का नाम">
                  <input value={form.father} onChange={(e) => setFormValue("father", e.target.value)} />
                </Field>
                <Field label="ग्राम">
                  <input value={form.village} onChange={(e) => setFormValue("village", e.target.value)} />
                </Field>
                <Field label="मोबाइल नं0">
                  <input type="tel" value={form.mobile} onChange={(e) => setFormValue("mobile", e.target.value)} />
                </Field>
              </div>
              <div className="grid g3" style={{ marginTop: 10 }}>
                <Field label="कृषक हस्ताक्षर/अंगूठा">
                  <select value={form.sign1} onChange={(e) => setFormValue("sign1", e.target.value)}>
                    <option>नहीं</option>
                    <option>हाँ</option>
                  </select>
                </Field>
                <Field label="वितरक हस्ताक्षर">
                  <select value={form.sign2} onChange={(e) => setFormValue("sign2", e.target.value)}>
                    <option>नहीं</option>
                    <option>हाँ</option>
                  </select>
                </Field>
                <Field label="टिप्पणी">
                  <input value={form.note} onChange={(e) => setFormValue("note", e.target.value)} />
                </Field>
              </div>
              <EntryPreview
                calc={calcEntry}
                centre={centres.find((c) => Number(c.id) === Number(form.centre))?.name}
                stock={form.centre && form.variety
                  ? opening(Number(form.centre), Number(form.variety)) -
                    issued(Number(form.centre), Number(form.variety))
                  : 0}
              />

              {/* === Items table — fetched as soon as variety is selected === */}
              <div className="kishan-beej-card" style={{ marginTop: 12, padding: 12, background: "#fafcfa" }}>
                <h4 style={{ margin: "0 0 8px" }}>
                  किस्म के मानक मद {currentStandardsLoading ? " (लोड हो रहे…)" : ""}
                </h4>
                {form.variety && distItems.length > 0 && (
                  <div className="kishan-beej-sub" style={{ marginBottom: 6, fontSize: 12 }}>
                    🔒 सभी फ़ील्ड किस्म के मानक से स्वतः भरे गए हैं — बदले नहीं जा सकते। मानक बदलने हेतु <b>मानक</b> टैब में जाएँ।
                  </div>
                )}
                {!form.variety && (
                  <div className="empty" style={{ padding: 16 }}>
                    पहले ऊपर से किस्म चुनें — चुनते ही यहाँ मानक मद तालिका आ जाएगी।
                  </div>
                )}
                {form.variety && !currentStandardsLoading && distItems.length === 0 && (
                  <div className="empty" style={{ padding: 16 }}>
                    इस किस्म का कोई मानक मद नहीं। पहले <b>मानक</b> टैब में जोड़ें।
                  </div>
                )}
                {distItems.length > 0 && (
                  <div className="tw" style={{ marginTop: 6 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>मद 🔒</th>
                            <th>इकाई 🔒</th>
                            <th>मानक मात्रा 🔒</th>
                            <th>वास्तविक मात्रा 🔒</th>
                            <th>दर (₹) 🔒</th>
                            <th>राशि (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distItems.map((it, idx) => {
                            const qty = Number(it.qty || 0);
                            const rate = Number(it.rate || 0);
                            const amount = qty * rate;
                            return (
                              <tr key={`${it.standard}-${idx}`}>
                                <td className="l">
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "5px 9px",
                                      background: "#f1eee5",
                                      border: "1px solid var(--line)",
                                      borderRadius: 6,
                                      fontWeight: 700,
                                      color: "var(--soft)",
                                      cursor: "not-allowed",
                                      minWidth: 140,
                                    }}
                                    title="मानक से लिया गया — बदला नहीं जा सकता"
                                  >
                                    🔒 {it.label}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "5px 9px",
                                      background: "#f1eee5",
                                      border: "1px solid var(--line)",
                                      borderRadius: 6,
                                      color: "var(--soft)",
                                      cursor: "not-allowed",
                                      minWidth: 70,
                                      textAlign: "center",
                                    }}
                                    title="मानक से लिया गया"
                                  >
                                    {it.unit}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "5px 9px",
                                      background: "#f1eee5",
                                      border: "1px solid var(--line)",
                                      borderRadius: 6,
                                      color: "var(--soft)",
                                      cursor: "not-allowed",
                                      minWidth: 80,
                                      textAlign: "right",
                                      fontFamily: "var(--m)",
                                    }}
                                    title="मानक मात्रा — बदली नहीं जा सकती"
                                  >
                                    {n(it.standard_qty)}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "5px 9px",
                                      background: "#f1eee5",
                                      border: "1px solid var(--line)",
                                      borderRadius: 6,
                                      color: "var(--soft)",
                                      cursor: "not-allowed",
                                      minWidth: 90,
                                      textAlign: "right",
                                      fontFamily: "var(--m)",
                                    }}
                                    title="वास्तविक मात्रा — बदली नहीं जा सकती"
                                  >
                                    🔒 {n(it.qty || 0)}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "5px 9px",
                                      background: "#f1eee5",
                                      border: "1px solid var(--line)",
                                      borderRadius: 6,
                                      color: "var(--soft)",
                                      cursor: "not-allowed",
                                      minWidth: 90,
                                      textAlign: "right",
                                      fontFamily: "var(--m)",
                                    }}
                                    title="दर — बदली नहीं जा सकती"
                                  >
                                    🔒 {money(it.rate || 0)}
                                  </span>
                                </td>
                                <td><b>{money(amount)}</b></td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={5} style={{ textAlign: "right" }}>कुल योग</td>
                            <td>
                              <b>
                                {money(
                                  distItems.reduce(
                                    (s, it) => s + Number(it.qty || 0) * Number(it.rate || 0),
                                    0
                                  )
                                )}
                              </b>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                )}
              </div>

              <div className="kishan-beej-row" style={{ marginTop: 12 }}>
                {editingDistId ? (
                  <>
                    <button className="kishan-beej-btn b1" onClick={updateDistributionItems}>
                      ✓ मद अद्यतन करें
                    </button>
                    <button className="kishan-beej-btn b2" onClick={clearDistributionEdit}>
                      रद्द করूँ
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="kishan-beej-btn b1"
                      onClick={addEntry}
                      disabled={!form.variety || distItems.length === 0}
                    >
                      ✓ रजिस्टर में जोड़ें
                    </button>
                    <button className="kishan-beej-btn b2" onClick={() => { setForm(emptyForm()); setDistItems([]); setDistCurrentStandards([]); }}>
                      साफ़ करें
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="kishan-beej-card noprint">
              <div className="grid g3">
                <Field label="केन्द्र से छाँटें">
                  <select value={filters.centre}
                    onChange={(e) => setFilters((p) => ({ ...p, centre: e.target.value, variety: "" }))}>
                    <option value="">सभी केन्द्र</option>
                    {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="किस्म से छाँटें">
                  <select value={filters.variety}
                    onChange={(e) => setFilters((p) => ({ ...p, variety: e.target.value }))}>
                    <option value="">सभी किस्में</option>
                    {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </Field>
                <Field label="नाम/ग्राम से खोजें">
                  <input placeholder="टाइप करें..." value={filters.search}
                    onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
                </Field>
              </div>
              <div className="kishan-beej-row end" style={{ marginTop: 12 }}>
                <span className="tag n">{filteredEntries.length} प्रविष्टियाँ</span>
                <div className="kishan-beej-row">
                  <button className="kishan-beej-btn b2 sm" onClick={() => printRegister()}>🖨 छापें (A4)</button>
                  <button className="kishan-beej-btn b2 sm"
                    onClick={() => downloadCsv(
                      "वितरण-रजिस्टर",
                      ["क्र0","दिनांक","केन्द्र","किस्म","कृषक का नाम","पिता/पति","ग्राम","मोबाइल","क्षे0फ0(है0)","बीज ग्राम","कुल लागत","राजसहायता","कृषक अंश","कृषक हस्ताक्षर","वितरक हस्ताक्षर","टिप्पणी"],
                      filteredEntries.map((e, i) => [
                        i + 1, dmy(e.date), e.centre_name, e.variety_name, e.name, e.father, e.village, e.mobile,
                        e.area, e.seed_gm, e.total, e.subsidy, e.farmer, e.sign1, e.sign2, e.note,
                      ])
                    )}>
                    ⬇ CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="kishan-beej-card table-card">
              {filteredEntries.length ? (
                <div className="tw">
                  <table>
                    <thead>
                      <tr>
                        <th>क्र0</th><th>दिनांक</th><th>केन्द्र</th><th>किस्म</th>
                        <th>कृषक का नाम</th><th>ग्राम</th><th>क्षे0फ0</th>
                        <th>बीज (ग्राम)</th><th>कुल</th><th>राजसहायता</th>
                        <th>कृषक अंश</th><th>हस्ताक्षर</th><th>क्रिया</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((e, i) => (
                        <tr key={e.id}>
                          <td>{i + 1}</td>
                          <td>{dmy(e.date)}</td>
                          <td>{e.centre_name}</td>
                          <td>{e.variety_name}</td>
                          <td>{e.name}</td>
                          <td>{e.village}</td>
                          <td>{n(e.area, 3)}</td>
                          <td>{gm(e.seed_gm)}</td>
                          <td>{money(e.total)}</td>
                          <td>{money(e.subsidy)}</td>
                          <td>{money(e.farmer)}</td>
                          <td>
                            {e.sign1 === "हाँ" && e.sign2 === "हाँ"
                              ? <span className="tag ok">पूर्ण</span>
                              : <span className="tag bad">अपूर्ण</span>}
                          </td>
                          <td>
                            <div className="kishan-beej-row">
                              <button className="kishan-beej-btn b2 sm"
                                onClick={() => startEditDistribution(e)}>
                                मद बदलें
                              </button>
                              <button className="kishan-beej-btn b3 sm"
                                onClick={() => deleteItem("distributions", e.id, `"${e.name}" की प्रविष्टि`)}>
                                हटाएँ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">अभी कोई प्रविष्टि नहीं। ऊपर फ़ॉर्म से पहला वितरण दर्ज करें।</div>
              )}
            </div>
          </section>
        )}

        {/* ===================== STOCK ===================== */}
        {tab === "stock" && (
          <section className="panel on">
            <h2>बीज स्टॉक</h2>
            <p className="kishan-beej-sub">खरीद → केन्द्रों को आवंटन → केन्द्र का शेष। तीनों एक ही जगह; नीचे बटन से भाग बदलें।</p>
            <div className="seg">
              {[["ledger","केन्द्रवार शेष"],["allot","केन्द्र आवंटन"],["purchase","बीज क्रय"]].map(([id, label]) => (
                <button key={id} className={stockTab === id ? "on" : ""} onClick={() => setStockTab(id)}>{label}</button>
              ))}
            </div>

            {stockTab === "ledger" && (
              <>
                <div className="kishan-beej-card noprint">
                  <div className="kishan-beej-row end">
                    <input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="केन्द्र या किस्म खोजें..." style={{ maxWidth: 280 }} />
                    <span className="tag n">{ledgerRows.length} संयोजन</span>
                  </div>
                </div>
                <div className="kishan-beej-card table-card">
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>क्र0</th><th>केन्द्र</th><th>किस्म</th><th>प्राप्त (ग्राम)</th>
                          <th>वितरित (ग्राम)</th><th>शेष (ग्राम)</th><th>स्थिति</th><th>किसान</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.map((row, index) => (
                          <tr key={`${row.centreId}-${row.varietyId}`}>
                            <td>{index + 1}</td>
                            <td>{row.centre}</td>
                            <td>{row.variety}</td>
                            <td>{n(row.opening, 0)}</td>
                            <td>{gm(row.issued)}</td>
                            <td className={row.balance < 0 ? "neg" : ""}>{gm(row.balance)}</td>
                            <td>
                              {row.balance < 0
                                ? <span className="tag bad">अधिक-वितरण</span>
                                : row.balance === 0
                                ? <span className="tag n">समाप्त</span>
                                : <span className="tag ok">सामान्य</span>}
                            </td>
                            <td>{row.farmers}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3">कुल योग</td>
                          <td>{n(ledgerRows.reduce((s, r) => s + r.opening, 0), 0)}</td>
                          <td>{gm(ledgerRows.reduce((s, r) => s + r.issued, 0))}</td>
                          <td>{gm(ledgerRows.reduce((s, r) => s + r.balance, 0))}</td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}

            {stockTab === "allot" && (
              <>
                <div className="kishan-beej-card noprint">
                  <h3>नया आवंटन (केन्द्रीय स्टॉक से)</h3>
                  <div className="grid g4">
                    <Field label="दिनांक" required>
                      <input type="date" className="need" value={allotForm.date}
                        onChange={(e) => setAllotForm((p) => ({ ...p, date: e.target.value }))} />
                    </Field>
                    <Field label="केन्द्र" required>
                      <select className="need" value={allotForm.centre}
                        onChange={(e) => setAllotForm((p) => ({ ...p, centre: e.target.value }))}>
                        <option value="">— केन्द्र चुनें —</option>
                        {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="किस्म" required>
                      <select className="need" value={allotForm.variety}
                        onChange={(e) => setAllotForm((p) => ({ ...p, variety: e.target.value }))}>
                        <option value="">— किस्म चुनें —</option>
                        {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </Field>
                    <Field label="मात्रा (ग्राम)" required>
                      <input type="number" className="need" step="0.001" min="0.001" value={allotForm.qty}
                        onChange={(e) => setAllotForm((p) => ({ ...p, qty: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid g3" style={{ marginTop: 10 }}>
                    <Field label="क्षेत्रफल — स्वतः (है0)">
                      <input readOnly value={allotCalc ? `${n(allotCalc.area, 4)} है0` : ""} />
                    </Field>
                    <Field label="परियोजना लागत — स्वतः (₹)">
                      <input readOnly value={allotCalc ? money(allotCalc.project) : ""} />
                    </Field>
                    <Field label="स्रोत/देयक सं0">
                      <input value={allotForm.source}
                        onChange={(e) => setAllotForm((p) => ({ ...p, source: e.target.value }))}
                        placeholder="आवंटन पत्र सं0..." />
                    </Field>
                  </div>
                  {allotCalc && (
                    <div
                      className={`note ${
                        allotCalc.gmv > centralLeft(Number(allotForm.variety)) + 0.01 ? "bad" : "ok"
                      }`}
                      style={{ marginTop: 12 }}
                    >
                      {allotCalc.gmv > centralLeft(Number(allotForm.variety)) + 0.01
                        ? `केन्द्रीय स्टॉक कम — ${
                            varietyById[Number(allotForm.variety)]?.name
                          } का शेष केवल ${gm(centralLeft(Number(allotForm.variety)))} ग्राम है।`
                        : `ठीक है — क्षेत्रफल ${n(allotCalc.area, 4)} है0, लागत ${money(allotCalc.project)} (राजसहायता ${money(allotCalc.subsidy)} + कृषक अंश ${money(allotCalc.farmer)})। इसके बाद केन्द्रीय शेष ${gm(centralLeft(Number(allotForm.variety)) - allotCalc.gmv)} ग्राम।`}
                    </div>
                  )}
                  <div className="kishan-beej-row" style={{ marginTop: 12 }}>
                    <button className="kishan-beej-btn b1" onClick={addAllocation}>आवंटन जोड़ें</button>
                  </div>
                </div>
                <div className="kishan-beej-card noprint">
                  <div className="kishan-beej-row end">
                    <select value={allotFilter} onChange={(e) => setAllotFilter(e.target.value)} style={{ maxWidth: 280 }}>
                      <option value="">सभी केन्द्र</option>
                      {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="kishan-beej-btn b2 sm"
                      onClick={() => downloadCsv(
                        "केन्द्र-आवंटन",
                        ["क्र0","दिनांक","केन्द्र","किस्म","मात्रा(ग्राम)","क्षे0फ0(है0)","परियोजना लागत","राजसहायता","कृषक अंश","स्रोत"],
                        allocations.filter((a) => !allotFilter || Number(a.centre) === Number(allotFilter))
                          .map((a, i) => [i + 1, dmy(a.date), a.centre_name, a.variety_name, a.qty_gm, a.area, a.project_cost, a.subsidy, a.farmer_share, a.source])
                      )}>
                      ⬇ CSV
                    </button>
                  </div>
                </div>
                <div className="kishan-beej-card table-card">
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>क्र0</th><th>दिनांक</th><th>केन्द्र</th><th>किस्म</th>
                          <th>मात्रा (ग्राम)</th><th>क्षे0फ0 (है0)</th><th>परियोजना लागत (₹)</th>
                          <th>राजसहायता (₹)</th><th>कृषक अंश (₹)</th><th>स्रोत</th><th>क्रिया</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.filter((a) => !allotFilter || Number(a.centre) === Number(allotFilter)).map((a, i) => (
                          <tr key={a.id}>
                            <td>{i + 1}</td>
                            <td>{dmy(a.date)}</td>
                            <td>{a.centre_name}</td>
                            <td>{a.variety_name}</td>
                            <td>{gm(a.qty_gm)}</td>
                            <td>{n(a.area, 4)}</td>
                            <td>{money(a.project_cost)}</td>
                            <td>{money(a.subsidy)}</td>
                            <td>{money(a.farmer_share)}</td>
                            <td>{a.source}</td>
                            <td>
                              <button className="kishan-beej-btn b3 sm"
                                onClick={() => deleteItem("allocations", a.id, `आवंटन ${a.centre_name}`)}>
                                हटाएँ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {stockTab === "purchase" && (
              <>
                <div className="kishan-beej-card noprint">
                  <h3>नई क्रय प्रविष्टि</h3>
                  <div className="grid g4">
                    <Field label="दिनांक" required>
                      <input type="date" className="need" value={purchaseForm.date}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, date: e.target.value }))} />
                    </Field>
                    <Field label="किस्म" required>
                      <select className="need" value={purchaseForm.variety}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, variety: e.target.value }))}>
                        <option value="">— किस्म चुनें —</option>
                        {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </Field>
                    <Field label="मात्रा (किग्रा0)" required>
                      <input type="number" className="need" step="0.001" min="0.001" value={purchaseForm.qty}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, qty: e.target.value }))} />
                    </Field>
                    <Field label="दर (₹/किग्रा0)" required>
                      <input type="number" className="need" step="0.01" min="0.01" value={purchaseForm.rate}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, rate: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid g3" style={{ marginTop: 10 }}>
                    <Field label="कुल राशि — स्वतः (₹)">
                      <input readOnly value={purchaseCalc ? money(purchaseCalc.total) : ""} />
                    </Field>
                    <Field label="आपूर्तिकर्ता">
                      <input value={purchaseForm.supplier}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, supplier: e.target.value }))} />
                    </Field>
                    <Field label="देयक सं0">
                      <input value={purchaseForm.ref}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, ref: e.target.value }))} />
                    </Field>
                  </div>
                  <div className={`note ${purchaseCalc && purchaseCalc.total > purchaseCalc.left + 0.01 ? "bad" : "ok"}`} style={{ marginTop: 12 }}>
                    {purchaseCalc
                      ? purchaseCalc.total > purchaseCalc.left + 0.01
                        ? `सीमा पार — ${varietyById[Number(purchaseForm.variety)]?.name} की शेष क्रय क्षमता केवल ${money(purchaseCalc.left)} है। यह प्रविष्टि स्वीकार नहीं होगी।`
                        : `ठीक है — इसके बाद ${varietyById[Number(purchaseForm.variety)]?.name} की कुल खरीद ${money(purchaseCalc.after)} होगी, शेष क्षमता ${money(purchaseCalc.remaining)}।`
                      : "किस्म, मात्रा व दर भरते ही क्रय सीमा की स्थिति दिखेगी।"}
                  </div>
                  <div className="kishan-beej-row" style={{ marginTop: 12 }}>
                    <button className="kishan-beej-btn b1" onClick={addPurchase}>
                      {editingPurchaseId ? "✓ क्रय अद्यतन करें" : "क्रय जोड़ें"}
                    </button>
                    {editingPurchaseId && (
                      <button className="kishan-beej-btn b2" onClick={cancelEditPurchase}>रद्द करें</button>
                    )}
                  </div>
                </div>
                <div className="kishan-beej-card noprint">
                  <div className="kishan-beej-row end">
                    <span className="tag n">{purchases.length} क्रय प्रविष्टियाँ</span>
                    <button className="kishan-beej-btn b2 sm"
                      onClick={() => downloadCsv(
                        "बीज-क्रय",
                        ["क्र0","दिनांक","किस्म","आपूर्तिकर्ता","मात्रा","इकाई","दर","कुल राशि","देयक सं0"],
                        purchases.map((p, i) => [i + 1, dmy(p.date), p.variety_name, p.supplier, p.qty_kg, "kg", p.rate, p.amount, p.ref])
                      )}>
                      ⬇ CSV
                    </button>
                  </div>
                </div>
                <div className="kishan-beej-card table-card">
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>क्र0</th><th>दिनांक</th><th>किस्म</th><th>आपूर्तिकर्ता</th>
                          <th>मात्रा</th><th>दर (₹)</th><th>कुल राशि (₹)</th>
                          <th>शेष क्रय क्षमता (₹)</th><th>देयक सं0</th><th>क्रिया</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((p, i) => (
                          <tr key={p.id}>
                            <td>{i + 1}</td>
                            <td>{dmy(p.date)}</td>
                            <td>{p.variety_name}</td>
                            <td>{p.supplier}</td>
                            <td>{n(p.qty_kg, 3)} किग्रा0</td>
                            <td>{money(p.rate)}</td>
                            <td>{money(p.amount)}</td>
                            <td className={Number(p.remaining_capacity) <= 0.5 ? "neg" : ""}>
                              {money(p.remaining_capacity)}
                            </td>
                            <td>{p.ref}</td>
                            <td>
                              <div className="kishan-beej-row">
                                <button className="kishan-beej-btn b2 sm" onClick={() => startEditPurchase(p)}>
                                  संपादित
                                </button>
                                <button className="kishan-beej-btn b3 sm"
                                  onClick={() => deleteItem("purchases", p.id, `क्रय ${p.variety_name}`)}>
                                  हटाएँ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="6">कुल योग</td>
                          <td>{money(purchases.reduce((s, p) => s + Number(p.amount || 0), 0))}</td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ===================== MANAK ===================== */}
        {tab === "manak" && (
          <section className="panel on">
            <h2>मानक एवं मूल सेटिंग्स</h2>
            <p className="kishan-beej-sub">
              एक बार जाँच लें, फिर छूने की ज़रूरत नहीं। यहाँ किया बदलाव केवल <b>आगे</b> जोड़ी जाने वाली प्रविष्टियों पर लागू होगा।
            </p>

            {/* मूल सेटिंग्स */}
            <div className="kishan-beej-card">
              <h3>चार मूल मूल्य</h3>
              <div className="grid g4">
                {[["purchase_limit","क्रय सीमा प्रति किस्म (₹)"],
                  ["project_cost","परियोजना लागत (₹/है0)"],
                  ["max_subsidy","अधिकतम राजसहायता (₹/है0)"],
                  ["farmer_share","कृषक अंश (₹/है0)"]].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input type="number" value={masterDraft?.[key] ?? ""}
                      onChange={(e) => setMasterDraft((p) => ({ ...p, [key]: e.target.value }))} />
                  </Field>
                ))}
              </div>
              <div className={`note ${
                Math.abs(
                  Number(masterDraft?.max_subsidy || 0) +
                  Number(masterDraft?.farmer_share || 0) -
                  Number(masterDraft?.project_cost || 0)
                ) < 0.5 ? "ok" : "bad"}`} style={{ marginTop: 12 }}>
                {Math.abs(
                  Number(masterDraft?.max_subsidy || 0) +
                  Number(masterDraft?.farmer_share || 0) -
                  Number(masterDraft?.project_cost || 0)
                ) < 0.5
                  ? `जाँच सही — राजसहायता ${money(masterDraft?.max_subsidy)} + कृषक अंश ${money(masterDraft?.farmer_share)} = परियोजना लागत ${money(masterDraft?.project_cost)} ✔`
                  : `मेल नहीं — ${money(masterDraft?.max_subsidy)} + ${money(masterDraft?.farmer_share)} = ${money(Number(masterDraft?.max_subsidy || 0) + Number(masterDraft?.farmer_share || 0))}, जबकि परियोजना लागत ${money(masterDraft?.project_cost)} है ✘`}
              </div>
              <div className="kishan-beej-row" style={{ marginTop: 12 }}>
                <button className="kishan-beej-btn b1" onClick={saveMaster}>सुरक्षित करें</button>
                <button className="kishan-beej-btn b2" onClick={resetMaster}>मूल मूल्यों पर लौटाएँ</button>
              </div>
            </div>

            {/* किस्मवार मानक */}
            <div className="kishan-beej-card">
              <h3>किस्मवार मानक</h3>
              <p className="kishan-beej-sub" style={{ marginBottom: 10 }}>
                जिस किस्म को खोलना हो उस पर टैप करें। मात्रा या दर बदलते ही राशि और जाँच अपने आप बदल जाएगी।
              </p>

              {varieties.length === 0 && (
                <div className="empty">अभी कोई किस्म नहीं। नीचे से पहली किस्म जोड़ें।</div>
              )}

              {varieties.map((v) => {
                const items = itemsFor(v.id);
                const t = varietyTotals(items);
                const okTotal = Math.abs(t.total - Number(master.project_cost)) < 0.5;
                const okSubsidy = Math.abs(t.subsidy - Number(master.max_subsidy)) < 0.5;
                return (
                  <details
                    key={v.id}
                    open={!!openStandard[v.id]}
                    onToggle={(e) => {
                      const isOpen = e.currentTarget.open;
                      setOpenStandard((p) => ({ ...p, [v.id]: isOpen }));
                      if (isOpen) fetchVarietyStandards(v.id);
                    }}
                  >
                    <summary>
                      <span>{v.name}</span>

                      <span className={`tag ${
                        items.length === 0
                          ? "n"
                          : (okTotal && okSubsidy ? "ok" : "bad")
                      }`}>
                        {items.length === 0
                          ? "कोई मद नहीं"
                          : (okTotal && okSubsidy ? "✔ मानक सही" : "✘ जाँचें")}
                      </span>

                      {t.gmha > 0 && (
                        <span className="tag n">
                          {gm(t.gmha)} ग्राम/है0
                        </span>
                      )}

                      <span className="tag n">
                        {money(t.total)}/है0
                      </span>
                    </summary>

                    <div className="dbody">
                      {/* Items list */}
                      {items.length === 0 && (
                        <div className="empty" style={{ marginBottom: 8 }}>
                          इस किस्म का कोई मद नहीं। नीचे नया मद जोड़ें।
                        </div>
                      )}

                      {items.map((item) => (
                        editingItem?.id === item.id ? (
                          <div key={item.id} className="kishan-beej-card" style={{ marginBottom: 8 }}>
                            <h4>मद संपादित करें</h4>
                            <div className="grid g4">
                              <Field label="मद नाम" required>
                                <input value={editingItem.form.label}
                                  onChange={(e) => setEditingItem((p) => ({
                                    ...p, form: { ...p.form, label: e.target.value }
                                  }))} />
                              </Field>
                              <Field label="इकाई">
                                <input value={editingItem.form.unit}
                                  onChange={(e) => setEditingItem((p) => ({
                                    ...p, form: { ...p.form, unit: e.target.value }
                                  }))} />
                              </Field>
                              <Field label="मात्रा">
                                <input type="number" step="0.0001" value={editingItem.form.qty}
                                  onChange={(e) => setEditingItem((p) => ({
                                    ...p, form: { ...p.form, qty: e.target.value }
                                  }))} />
                              </Field>
                              <Field label="दर (₹)">
                                <input type="number" step="0.01" value={editingItem.form.rate}
                                  onChange={(e) => setEditingItem((p) => ({
                                    ...p, form: { ...p.form, rate: e.target.value }
                                  }))} />
                              </Field>
                            </div>
                            <div className="kishan-beej-row" style={{ marginTop: 10 }}>
                              <button className="kishan-beej-btn b1 sm" onClick={saveEditItem}>सुरक्षित</button>
                              <button className="kishan-beej-btn b2 sm" onClick={cancelEditItem}>रद्द करें</button>
                            </div>
                          </div>
                        ) : (
                          <div key={item.id} className="kishan-beej-row"
                            style={{ justifyContent: "space-between", padding: "8px 4px", borderBottom: "1px dashed #ddd", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <b>{item.label}</b>
                              <span style={{ color: "#666", marginLeft: 8 }}>({item.unit})</span>
                            </div>
                            <div style={{ minWidth: 200 }}>
                              {n(item.qty)} × {money(item.rate)} = <b>{money(Number(item.qty) * Number(item.rate))}</b>
                            </div>
                            <div className="kishan-beej-row">
                              <button className="kishan-beej-btn b2 sm" onClick={() => startEditItem(item)}>संपादित</button>
                              <button className="kishan-beej-btn b3 sm"
                                onClick={() => deleteStandardItem(item.id, v.id)}>हटाएँ</button>
                            </div>
                          </div>
                        )
                      ))}

                      {/* Add new item */}
                      <div className="kishan-beej-card" style={{ marginTop: 12, background: "#fafafa" }}>
                        <h4>नया मद जोड़ें</h4>
                        <div className="grid g4">
                          <Field label="मद नाम" required>
                            <input value={newItemForms[v.id]?.label || ""}
                              placeholder="जैसे — खेत तैयारी + पौधशाला प्रबंधन (कृषक अंश)"
                              onChange={(e) => setNewItemForms((p) => ({
                                ...p,
                                [v.id]: { ...(p[v.id] || {}), label: e.target.value }
                              }))} />
                          </Field>
                          <Field label="इकाई">
                            <input value={newItemForms[v.id]?.unit || ""}
                              placeholder="जैसे — हैक्टेयर-तुल्य / किग्रा0 / कुन्तल"
                              onChange={(e) => setNewItemForms((p) => ({
                                ...p,
                                [v.id]: { ...(p[v.id] || {}), unit: e.target.value }
                              }))} />
                          </Field>
                          <Field label="मात्रा">
                            <input type="number" step="0.0001" value={newItemForms[v.id]?.qty || ""}
                              onChange={(e) => setNewItemForms((p) => ({
                                ...p,
                                [v.id]: { ...(p[v.id] || {}), qty: e.target.value }
                              }))} />
                          </Field>
                          <Field label="दर (₹)">
                            <input type="number" step="0.01" value={newItemForms[v.id]?.rate || ""}
                              onChange={(e) => setNewItemForms((p) => ({
                                ...p,
                                [v.id]: { ...(p[v.id] || {}), rate: e.target.value }
                              }))} />
                          </Field>
                        </div>
                        <div className="kishan-beej-row" style={{ marginTop: 8 }}>
                          <button className="kishan-beej-btn b1 sm" onClick={() => addStandardItem(v.id)}>
                            + मद जोड़ें
                          </button>
                        </div>
                      </div>

                      {/* total / check */}
                      {items.length > 0 && (
                        <div className={`note ${okTotal && okSubsidy ? "ok" : "bad"}`} style={{ marginTop: 10 }}>
                          कुल {money(t.total)} = राजसहायता {money(t.subsidy)} + कृषक अंश {money(t.farmer)}
                          {t.gmha > 0 && ` · बीज ${gm(t.gmha)} ग्राम/है0`}
                          {okTotal && okSubsidy ? " — मानक सही ✔" : " — मानक से भिन्न ✘"}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>

            {/* किस्म क्रूड */}
            <div className="kishan-beej-card">
              <h3>किस्में (Varieties)</h3>
              <p className="kishan-beej-sub" style={{ marginBottom: 10 }}>
                नई किस्म जोड़ें, मौजूदा का नाम/दर/जाति बदलें या हटाएँ। किस्म जोड़ते ही मानक टैब में उसकी प्रविष्टि तैयार करनी होगी।
              </p>
              <div className="grid g4">
                <Field label="किस्म का नाम" required>
                  <input value={varietyForm.name} placeholder="जैसे — बंदगोभी Bajwa60"
                    onChange={(e) => setVarietyForm((p) => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="जाति">
                  <select value={varietyForm.jati}
                    onChange={(e) => setVarietyForm((p) => ({ ...p, jati: e.target.value }))}>
                    <option value="">— चुनें —</option>
                    <option value="संकर">संकर</option>
                    <option value="सा0जाति">सा0जाति</option>
                    <option value="अन्य">अन्य</option>
                  </select>
                </Field>
                <Field label="मूल दर (₹/किग्रा0)">
                  <input type="number" step="0.01" min="0" value={varietyForm.default_rate}
                    onChange={(e) => setVarietyForm((p) => ({ ...p, default_rate: e.target.value }))} />
                </Field>
                <Field label="स्थिति">
                  <select value={varietyForm.is_active ? "1" : "0"}
                    onChange={(e) => setVarietyForm((p) => ({ ...p, is_active: e.target.value === "1" }))}>
                    <option value="1">सक्रिय</option>
                    <option value="0">निष्क्रिय</option>
                  </select>
                </Field>
              </div>
              <div className="kishan-beej-row" style={{ marginTop: 12 }}>
                <button className="kishan-beej-btn b1" onClick={saveVariety}>
                  {editingVarietyId ? "✓ किस्म अद्यतन करें" : "+ नई किस्म जोड़ें"}
                </button>
                {editingVarietyId && (
                  <button className="kishan-beej-btn b2" onClick={cancelEditVariety}>रद्द करें</button>
                )}
              </div>
            </div>

            <div className="kishan-beej-card table-card">
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>क्र0</th><th>किस्म का नाम</th><th>जाति</th>
                      <th>मूल दर (₹/किग्रा0)</th><th>स्थिति</th><th>क्रिया</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varieties.map((v, i) => (
                      <tr key={v.id}>
                        <td>{i + 1}</td>
                        <td className="l">{v.name}</td>
                        <td>{v.jati || "—"}</td>
                        <td>{v.default_rate != null ? money(v.default_rate) : "—"}</td>
                        <td>
                          {v.is_active === false
                            ? <span className="tag n">निष्क्रिय</span>
                            : <span className="tag ok">सक्रिय</span>}
                        </td>
                        <td>
                          <div className="kishan-beej-row">
                            <button className="kishan-beej-btn b2 sm" onClick={() => startEditVariety(v)}>संपादित</button>
                            <button className="kishan-beej-btn b3 sm" onClick={() => deleteVariety(v)}>हटाएँ</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!varieties.length && (
                      <tr>
                        <td colSpan="6" className="empty">अभी कोई किस्म नहीं। ऊपर से पहली किस्म जोड़ें।</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ===================== REPORT ===================== */}
        {tab === "report" && (
          <section className="panel on">
            <h2>रिपोर्ट, छपाई एवं ऑडिट</h2>
            <p className="kishan-beej-sub">
              किस्मवार पूरी तस्वीर और सत्यापन सूची। छपी प्रति पर हस्ताक्षर करवाकर फाइल में रखना ही भौतिक साक्ष्य है।
            </p>
            <div className="kishan-beej-card noprint">
              <div className="kishan-beej-row">
                <button className="kishan-beej-btn b2 sm"
                  onClick={() => printRegister(entries, "किसान बीज वितरण रजिस्टर — समस्त केन्द्र")}>
                  🖨 पूरा रजिस्टर छापें
                </button>
                <button className="kishan-beej-btn b2 sm"
                  onClick={() => downloadCsv(
                    "वितरण-रजिस्टर-पूर्ण",
                    ["क्र0","दिनांक","केन्द्र","किस्म","कृषक का नाम","पिता/पति","ग्राम","मोबाइल","क्षे0फ0(है0)","बीज ग्राम","कुल लागत","राजसहायता","कृषक अंश","कृषक हस्ताक्षर","वितरक हस्ताक्षर","टिप्पणी"],
                    entries.map((e, i) => [
                      i + 1, dmy(e.date), e.centre_name, e.variety_name, e.name, e.father, e.village, e.mobile,
                      e.area, e.seed_gm, e.total, e.subsidy, e.farmer, e.sign1, e.sign2, e.note,
                    ])
                  )}>
                  ⬇ पूरा रजिस्टर CSV
                </button>
              </div>
            </div>
            <div className="kishan-beej-card table-card">
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>किस्म</th><th>कुल क्रय (₹)</th><th>शेष क्रय क्षमता (₹)</th>
                      <th>क्रय मात्रा (ग्राम)</th><th>केन्द्रों को आवंटित</th>
                      <th>केन्द्रीय शेष</th><th>किसानों को वितरित</th>
                      <th>क्षेत्रफल (है0)</th><th>परियोजना लागत (₹)</th><th>किसान</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.v.id}>
                        <td className="l">{row.v.name}</td>
                        <td>{money(row.purchase)}</td>
                        <td className={row.remaining <= 0.5 ? "neg" : ""}>{money(row.remaining)}</td>
                        <td>{gm(row.purchaseGm)}</td>
                        <td>{gm(row.allocated)}</td>
                        <td className={row.central < 0 ? "neg" : ""}>{gm(row.central)}</td>
                        <td>{gm(row.distributed)}</td>
                        <td>{n(row.area, 4)}</td>
                        <td>{money(row.project)}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>कुल योग</td>
                      <td>{money(reportRows.reduce((s, r) => s + r.purchase, 0))}</td>
                      <td>{money(reportRows.reduce((s, r) => s + r.remaining, 0))}</td>
                      <td>{gm(reportRows.reduce((s, r) => s + r.purchaseGm, 0))}</td>
                      <td>{gm(reportRows.reduce((s, r) => s + r.allocated, 0))}</td>
                      <td>{gm(reportRows.reduce((s, r) => s + r.central, 0))}</td>
                      <td>{gm(entries.reduce((s, e) => s + Number(e.seed_gm || 0), 0))}</td>
                      <td>{n(reportRows.reduce((s, r) => s + r.area, 0), 4)}</td>
                      <td>{money(reportRows.reduce((s, r) => s + r.project, 0))}</td>
                      <td>{entries.length}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="kishan-beej-card">
              <h3>ऑडिट जाँच सूची</h3>
              <ul className="chk">
                {auditChecks.map((check, i) => (
                  <li key={i}>
                    <span className={`i ${check.ok ? "ok" : "bad"}`}>{check.ok ? "✔" : "✘"}</span>
                    <span>{check.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      <footer>
        {fill(meta.footer || DEFAULT_CONFIG.meta.footer, {
          year: meta.year,
          office: meta.office,
          scheme: meta.scheme,
        })}
      </footer>
    </div>
  );
}