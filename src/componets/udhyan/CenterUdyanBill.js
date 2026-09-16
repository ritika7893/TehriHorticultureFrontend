import React, { useEffect, useMemo, useState } from "react";
import "./UdyanBill.css";
import { useAuth } from "../../context/AuthContext";

const API_BASE = "https://mahadevaaya.com/govbillingsystem/backend/api/udyan";

/* =========================================================
    API HELPERS
    ========================================================= */

const apiFetch = async (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    return fetch(url, { ...options, method, headers, credentials: "omit" });
};

const readJsonResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (!text) return {};
    if (!contentType.toLowerCase().includes("application/json")) {
        const preview = text.replace(/\s+/g, " ").trim().slice(0, 200);
        if (response.status === 401) throw new Error("सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।");
        if (response.status === 403) throw new Error("आपको इस कार्य की अनुमति नहीं है।");
        if (response.status === 404) throw new Error("API URL उपलब्ध नहीं है। कृपया backend API URL जाँचें।");
        throw new Error(`सर्वर ने JSON के बजाय HTML/अन्य response भेजा। HTTP ${response.status}${preview ? ` — ${preview}` : ""}`);
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error("Invalid JSON response:", text);
        throw new Error("सर्वर का JSON response मान्य नहीं है।");
    }
};

/* =========================================================
   NUMBER HELPERS
   ========================================================= */

const num = (value, fallback = 0) => {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
};

const roundValue = (value, digits = 2) => {
    const factor = Math.pow(10, digits);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const formatMoney = (value, digits = 2) => {
    return Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};

/* =========================================================
   HINDI NUMBER WORDS
   ========================================================= */

const HINDI_NUMBERS = [
    "शून्य","एक","दो","तीन","चार","पाँच","छह","सात","आठ","नौ","दस","ग्यारह","बारह","तेरह","चौदह","पन्द्रह","सोलह","सत्रह","अठारह","उन्नीस","बीस","इक्कीस","बाईस","तेईस","चौबीस","पच्चीस","छब्बीस","सत्ताईस","अट्ठाईस","उनतीस","तीस","इकतीस","बत्तीस","तैंतीस","चौंतीस","पैंतीस","छत्तीस","सैंतीस","अड़तीस","उनतालीस","चालीस","इकतालीस","बयालीस","तैंतालीस","चवालीस","पैंतालीस","छियालीस","सैंतालीस","अड़तालीस","उनचास","पचास","इक्यावन","बावन","तिरपन","चौवन","पचपन","छप्पन","सत्तावन","अट्ठावन","उनसठ","साठ","इकसठ","बासठ","तिरसठ","चौंसठ","पैंसठ","छियासठ","सड़सठ","अड़सठ","उनहत्तर","सत्तर","इकहत्तर","बहत्तर","तिहत्तर","चौहत्तर","पचहत्तर","छिहत्तर","सतहत्तर","अठहत्तर","उन्यासी","अस्सी","इक्यासी","बयासी","तिरासी","चौरासी","पचासी","छियासी","सत्तासी","अट्ठासी","नवासी","नब्बे","इक्यानवे","बानवे","तिरानवे","चौरानवे","पचानवे","छियानवे","सत्तानवे","निन्यानवे",
];

const belowThousand = (number) => {
    let result = "";
    const hundred = Math.floor(number / 100);
    const remainder = number % 100;
    if (hundred) result += HINDI_NUMBERS[hundred] + " सौ ";
    if (remainder) result += HINDI_NUMBERS[remainder] + " ";
    return result.trim();
};

const numberToHindiWords = (value) => {
    let n = Math.round(Number(value) || 0);
    if (n === 0) return "शून्य";
    if (n < 0) return "ऋण " + numberToHindiWords(Math.abs(n));
    let result = "";
    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh = Math.floor(n / 100000); n %= 100000;
    const thousand = Math.floor(n / 1000); n %= 1000;
    if (crore) result += belowThousand(crore) + " करोड़ ";
    if (lakh) result += belowThousand(lakh) + " लाख ";
    if (thousand) result += belowThousand(thousand) + " हजार ";
    if (n) result += belowThousand(n);
    return result.trim();
};

const amountToHindiWords = (value) => {
    const amount = Number(value) || 0;
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let text = numberToHindiWords(rupees) + " रुपये";
    if (paise > 0) text += " " + numberToHindiWords(paise) + " पैसे";
    return text + " मात्र";
};

/* =========================================================
   EMPTY FORM
   ========================================================= */

const emptyBill = {
    financial_year: "2026-27",
    crop: "", area: "1.00", plants: "",
    calculation_basis: "area", rounding: "2",
    caste: "", scheme_name: "", heading: "",
    farmer_name: "", father_husband_name: "", date_of_birth: "",
    village: "", center: "",
    bank_name_1: "", account_number_1: "", ifsc_code_1: "",
    bank_name_2: "", account_number_2: "", ifsc_code_2: "",
    aadhaar_number: "", mobile_number: "", pan_number: "",
    supplier_name: "", supplier_father_name: "", supplier_village: "",
    labour_name: "", labour_father_name: "", labour_village: "",
    voucher_2: true,
};

/* =========================================================
   STABLE INPUT COMPONENTS (TYPEABLE FOR PREVIEW)
   ========================================================= */

const Field = ({ bill, onChange, label, field, type = "text", width = "", placeholder = "" }) => (
    <label className={`live-field ${width}`}>
        <span>{label}</span>
        <input
            type={type}
            value={bill[field] ?? ""}
            placeholder={placeholder}
            onChange={(event) => onChange(field, event.target.value)}
        />
    </label>
);

const DocField = ({ bill, onChange, field, className = "" }) => (
    <input
        className={`doc-input ${className}`}
        value={bill[field] ?? ""}
        placeholder="________________"
        onChange={(event) => onChange(field, event.target.value)}
    />
);

/* =========================================================
   COMPONENT
   ========================================================= */

const getCenterNameFromAuthUser = (authUser) => {
    if (!authUser) return "";

    // Handle both direct and nested values used by different login responses.
    const directCandidates = [
        authUser.center_name,
        authUser.centerName,
        authUser.centre_name,
        authUser.centreName,
        authUser.center?.center_name,
        authUser.center?.centerName,
        authUser.center?.name,
        authUser.centre?.center_name,
        authUser.centre?.centerName,
        authUser.centre?.name,
        authUser.udyan_center,
        authUser.udyan_center_name,
        authUser.udyanCenter,
        authUser.udyanCenterName,
        authUser.profile?.center_name,
        authUser.profile?.centerName,
        authUser.profile?.centre_name,
        authUser.profile?.centreName,
        authUser.profile?.center?.name,
        authUser.profile?.centre?.name,
        authUser.data?.center_name,
        authUser.data?.centerName,
        authUser.data?.centre_name,
        authUser.data?.centreName,
        authUser.data?.center?.name,
        authUser.data?.centre?.name,
    ];

    const direct = directCandidates.find(
        (value) => value !== null && value !== undefined && String(value).trim() !== ""
    );

    if (direct) return String(direct).trim();

    // Last-resort recursive lookup for a differently named center field.
    const visited = new Set();
    const findCenter = (value) => {
        if (!value || typeof value !== "object" || visited.has(value)) return "";
        visited.add(value);

        for (const [key, child] of Object.entries(value)) {
            const normalizedKey = String(key).toLowerCase().replace(/[-_\s]/g, "");
            const isCenterKey =
                normalizedKey.includes("center") ||
                normalizedKey.includes("centre") ||
                normalizedKey.includes("udyancenter") ||
                normalizedKey.includes("udyancentre");

            if (isCenterKey && typeof child === "string" && child.trim()) {
                return child.trim();
            }

            if (isCenterKey && child && typeof child === "object") {
                const nestedName =
                    child.name || child.center_name || child.centerName ||
                    child.centre_name || child.centreName;
                if (nestedName !== null && nestedName !== undefined && String(nestedName).trim()) {
                    return String(nestedName).trim();
                }
            }

            const nested = findCenter(child);
            if (nested) return nested;
        }

        return "";
    };

    return findCenter(authUser);
};

const getCenterNameFromStorage = () => {
    try {
        const storedCenterData = localStorage.getItem("centerData");
        if (!storedCenterData) return "";

        const centerData = JSON.parse(storedCenterData);
        return String(centerData?.centerName || "").trim();
    } catch (error) {
        console.error("Failed to read centerData:", error);
        return "";
    }
};

export default function CenterUdyanBill() {
    const { user } = useAuth();

    // The logged-in center is stored separately as centerData:
    // { centerId: "CENT-015", centerName: "सतपुली", isLoggedIn: true }
    // Use centerData first, then fall back to AuthContext if needed.
    const authCenterName = useMemo(() => {
        const storedCenterName = getCenterNameFromStorage();
        if (storedCenterName) return storedCenterName;
        return getCenterNameFromAuthUser(user);
    }, [user]);

    const [financialYear, setFinancialYear] = useState("2026-27");
    const [bill, setBill] = useState(() => ({ ...emptyBill, center: authCenterName }));
    const [standards, setStandards] = useState([]);
    const [uploadedBills, setUploadedBills] = useState([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [selectedCropId, setSelectedCropId] = useState("");
    const [loadingStandards, setLoadingStandards] = useState(false);
    const [activeSection, setActiveSection] = useState("bill");
    const [includeStandardPrint, setIncludeStandardPrint] = useState(false);
    const [showVoucher2, setShowVoucher2] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!authCenterName) return;
        setBill((previous) => ({ ...previous, center: authCenterName }));
    }, [authCenterName]);

    /* =====================================================
       LOAD STANDARDS
       ===================================================== */

    const loadStandards = async () => {
        setLoadingStandards(true);
        try {
            const response = await apiFetch(`${API_BASE}/crop-standards/?financial_year=${encodeURIComponent(financialYear)}`);
            const data = await readJsonResponse(response);
            if (!response.ok) {
                const error = data?.detail || data?.error || Object.values(data || {}).flat().join(" ");
                throw new Error(error || "मानक सूची प्राप्त नहीं हो सकी।");
            }
            const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
            const activeList = list.filter((item) => item.is_active !== false);
            setStandards(activeList);
            if (!selectedCropId && activeList.length > 0) {
                const firstId = String(activeList[0].id);
                setSelectedCropId(firstId);
                setBill((previous) => ({ ...previous, crop: firstId }));
            }
            if (selectedCropId && !activeList.some((item) => String(item.id) === String(selectedCropId))) {
                setSelectedCropId("");
                setBill((previous) => ({ ...previous, crop: "" }));
            }
        } catch (error) {
            console.error("loadStandards:", error);
            setMessage(error.message || "मानक सूची प्राप्त नहीं हो सकी।");
        } finally {
            setLoadingStandards(false);
        }
    };

    useEffect(() => {
        loadStandards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [financialYear]);

    /* =====================================================
       LOAD UPLOADED BILLS (VIEW ONLY)
       ===================================================== */

    const loadUploadedBills = async () => {
        setLoadingBills(true);
        try {
            const centerParam = authCenterName ? `?center=${encodeURIComponent(authCenterName)}` : "";
            const response = await apiFetch(`${API_BASE}/bills/${centerParam}`);
            const data = await readJsonResponse(response);
            if (!response.ok) {
                throw new Error(data?.detail || data?.error || "बिल सूची प्राप्त नहीं हो सकी।");
            }
            setUploadedBills(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
        } catch (error) {
            console.error("loadUploadedBills:", error);
            setMessage(error.message || "बिल सूची प्राप्त नहीं हो सकी।");
        } finally {
            setLoadingBills(false);
        }
    };

    useEffect(() => {
        if (activeSection === "bills") {
            loadUploadedBills();
        }
    }, [activeSection, authCenterName]);

    /* =====================================================
       VIEW UPLOADED BILL (LOADS INTO TYPEABLE FORM)
       ===================================================== */

    const viewUploadedBill = (savedBill) => {
        if (!savedBill?.id) {
            alert("इस बिल का ID उपलब्ध नहीं है।");
            return;
        }

        const selectedId = String(savedBill.crop ?? "");
        const matchingStandard = standards.find((standard) => String(standard.id) === selectedId);

        setFinancialYear(savedBill.year || savedBill.financial_year || "2026-27");
        setSelectedCropId(selectedId);

        setBill({
            ...emptyBill,
            ...savedBill,
            financial_year: savedBill.year || savedBill.financial_year || "2026-27",
            crop: selectedId,
            scheme_name: savedBill.scheme ?? savedBill.scheme_name ?? "",
            heading: savedBill.heading ?? "",
            ifsc_code_1: savedBill.ifsc_1 ?? savedBill.ifsc_code_1 ?? "",
            ifsc_code_2: savedBill.ifsc_2 ?? savedBill.ifsc_code_2 ?? "",
            aadhaar_number: savedBill.aadhaar ?? savedBill.aadhaar_number ?? "",
            mobile_number: savedBill.mobile ?? savedBill.mobile_number ?? "",
            pan_number: savedBill.pan ?? savedBill.pan_number ?? "",
            voucher_2: Boolean(savedBill.voucher_2),
            center: authCenterName,
        });

        setShowVoucher2(Boolean(savedBill.voucher_2));
        setActiveSection("bill");

        setMessage(`बिल #${savedBill.id} देखा जा रहा है (आप इसे संशोधित कर प्रिंट कर सकते हैं, पर सेव नहीं कर सकते)।`);

        if (!matchingStandard) {
            setMessage(`बिल #${savedBill.id} खोला गया है। संबंधित मानक उपलब्ध नहीं है।`);
        }
    };

    /* =====================================================
       SELECTED STANDARD & CALCULATION
       ===================================================== */

    const selectedStandard = useMemo(() => {
        return standards.find((item) => String(item.id) === String(selectedCropId)) || null;
    }, [standards, selectedCropId]);

    const updateBill = (field, value) => {
        if (field === "center") return;
        setBill((previous) => ({ ...previous, [field]: value }));
    };

    const handleCropChange = (event) => {
        const id = event.target.value;
        setSelectedCropId(id);
        updateBill("crop", id);
    };

    const displayBill = useMemo(
        () => ({ ...bill, center: authCenterName || bill.center || "" }),
        [bill, authCenterName]
    );

    const calculation = useMemo(() => {
        if (!selectedStandard) {
            return {
                plants: 0, plantTotal: 0, plantSubsidy: 0,
                pitTotal: 0, pitSubsidy: 0, pitFarmer: 0,
                manureTotal: 0, manureSubsidy: 0, manureFarmer: 0,
                manureQuantity: 0, billTotal: 0, billSubsidy: 0,
                billFarmer: 0, grandTotal: 0, grandSubsidy: 0,
            };
        }

        const area = Math.max(0, num(bill.area));
        const plantsPerHectare = num(selectedStandard.plants_per_hectare);

        let plants;
        if (bill.calculation_basis === "plant") {
            plants = Math.max(0, Math.round(num(bill.plants)));
        } else {
            plants = Math.max(0, Math.round(area * plantsPerHectare));
        }

        const plantRate = num(selectedStandard.plant_rate);
        const pitRate = num(selectedStandard.pit_rate);
        const manureRate = num(selectedStandard.manure_rate);
        const standardTotal = num(selectedStandard.standard_total);
        const standardSubsidy = num(selectedStandard.standard_subsidy);

        const plantTotal = plants * plantRate;
        const pitTotal = plants * pitRate;
        const pitSubsidy = 0;
        const pitFarmer = pitTotal - pitSubsidy;

        let manureTotal;
        if (bill.calculation_basis === "plant") {
            manureTotal = standardTotal * area - plantTotal - pitTotal;
        } else {
            manureTotal = (standardTotal - plantRate * plantsPerHectare - pitRate * plantsPerHectare) * area;
        }
        manureTotal = Math.max(0, manureTotal);

        const manureQuantity = manureRate > 0 ? manureTotal / manureRate : 0;
        const plantSubsidy = Math.min(plantTotal, standardSubsidy * area);
        const manureSubsidy = Math.min(manureTotal, Math.max(0, standardSubsidy * area - plantSubsidy));
        const manureFarmer = Math.max(0, manureTotal - manureSubsidy);
        const billTotal = pitTotal + manureTotal;
        const billSubsidy = pitSubsidy + manureSubsidy;
        const billFarmer = pitFarmer + manureFarmer;
        const grandTotal = billTotal + plantTotal;
        const grandSubsidy = billSubsidy + plantSubsidy;

        const digits = Number(bill.rounding);

        return {
            plants,
            plantTotal: roundValue(plantTotal, digits),
            plantSubsidy: roundValue(plantSubsidy, digits),
            pitTotal: roundValue(pitTotal, digits),
            pitSubsidy: roundValue(pitSubsidy, digits),
            pitFarmer: roundValue(pitFarmer, digits),
            manureTotal: roundValue(manureTotal, digits),
            manureSubsidy: roundValue(manureSubsidy, digits),
            manureFarmer: roundValue(manureFarmer, digits),
            manureQuantity: roundValue(manureQuantity, 2),
            billTotal: roundValue(billTotal, digits),
            billSubsidy: roundValue(billSubsidy, digits),
            billFarmer: roundValue(billFarmer, digits),
            grandTotal: roundValue(grandTotal, digits),
            grandSubsidy: roundValue(grandSubsidy, digits),
        };
    }, [bill.area, bill.plants, bill.calculation_basis, bill.rounding, selectedStandard]);

    /* =====================================================
       PRINT BILL
       ===================================================== */

    const printBill = () => {
        const printDocument = document.getElementById("printDocument");
        if (!printDocument) { alert("प्रिंट प्रपत्र अभी तैयार नहीं है।"); return; }

        const existingFrame = document.getElementById("udyan-print-frame");
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement("iframe");
        iframe.id = "udyan-print-frame";
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";

        document.body.appendChild(iframe);

        const iframeDocument = iframe.contentDocument;
        const iframeWindow = iframe.contentWindow;

        if (!iframeDocument || !iframeWindow) {
            iframe.remove();
            alert("प्रिंट प्रपत्र तैयार नहीं हो सका।");
            return;
        }

        const clonedDocument = printDocument.cloneNode(true);

        const sourceFields = printDocument.querySelectorAll("input, textarea, select");
        const clonedFields = clonedDocument.querySelectorAll("input, textarea, select");

        sourceFields.forEach((sourceField, index) => {
            const clonedField = clonedFields[index];
            if (!clonedField) return;
            if (sourceField instanceof HTMLInputElement) {
                clonedField.value = sourceField.value;
                clonedField.setAttribute("value", sourceField.value);
                if (sourceField.type === "checkbox" || sourceField.type === "radio") {
                    clonedField.checked = sourceField.checked;
                    if (sourceField.checked) clonedField.setAttribute("checked", "checked");
                    else clonedField.removeAttribute("checked");
                }
            } else if (sourceField instanceof HTMLTextAreaElement) {
                clonedField.value = sourceField.value;
                clonedField.textContent = sourceField.value;
            } else if (sourceField instanceof HTMLSelectElement) {
                clonedField.value = sourceField.value;
                Array.from(clonedField.options).forEach((option, optionIndex) => {
                    const sourceOption = sourceField.options[optionIndex];
                    const selected = Boolean(sourceOption?.selected);
                    option.selected = selected;
                    if (selected) option.setAttribute("selected", "selected");
                    else option.removeAttribute("selected");
                });
            }
        });

        const styleMarkup = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((node) => node.outerHTML).join("\n");

        iframeDocument.open();
        iframeDocument.write(`<!doctype html>
<html lang="hi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>उद्यान बिल</title>
    ${styleMarkup}
    <style>
        @page { size: A4 portrait; margin: 12mm; }
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 0 !important; min-height: 0 !important; height: auto !important; overflow: visible !important; background: #ffffff !important; }
        body { color: #111 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Kokila", "Segoe UI", sans-serif !important; }
        #printDocument { display: block !important; width: 100% !important; max-width: none !important; min-width: 0 !important; height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #ffffff !important; }
        .a4-page { display: block !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; overflow: visible !important; background: #ffffff !important; page-break-after: always !important; break-after: page !important; }
        .a4-page:last-child { page-break-after: auto !important; break-after: auto !important; }
        .document-table { width: 100% !important; border-collapse: collapse !important; }
        .document-table th, .document-table td { border: 1px solid #000 !important; }
        .doc-input { color: #000 !important; background: transparent !important; }
    </style>
</head>
<body>
    ${clonedDocument.outerHTML}
</body>
</html>`);
        iframeDocument.close();

        const waitForImages = async () => {
            const images = Array.from(iframeDocument.images || []);
            await Promise.all(images.map((image) =>
                image.complete ? Promise.resolve() : new Promise((resolve) => {
                    image.addEventListener("load", resolve, { once: true });
                    image.addEventListener("error", resolve, { once: true });
                })
            ));
            if (iframeDocument.fonts?.ready) {
                try { await iframeDocument.fonts.ready; } catch { }
            }
        };

        const cleanup = () => { setTimeout(() => iframe.remove(), 500); };
        let printStarted = false;

        const printFromFrame = async () => {
            if (printStarted) return;
            printStarted = true;
            try { await waitForImages(); } catch { }
            iframeWindow.focus();
            iframeWindow.addEventListener("afterprint", cleanup, { once: true });
            setTimeout(() => { iframeWindow.print(); }, 100);
        };

        if (iframeDocument.readyState === "complete") {
            printFromFrame();
        } else {
            iframeWindow.addEventListener("load", printFromFrame, { once: true });
            setTimeout(() => { printFromFrame(); }, 300);
        }
    };

    /* =====================================================
       UPLOADED BILLS MANAGER (VIEW ONLY — NO ADD/EDIT/DELETE)
       ===================================================== */

    const UploadedBillsManager = () => (
        <div className="uploaded-bills-panel">
            <div className="uploaded-bills-heading">
                <div>
                    <span className="section-kicker">SAVED RECORDS</span>
                    <h2>अपलोड किए गए बिल (केवल दर्शन)</h2>
                    <p>सर्वर पर सुरक्षित बिलों की सूची — केवल देखा जा सकता है।</p>
                </div>
                <button type="button" className="outline-button" onClick={loadUploadedBills} disabled={loadingBills}>
                    {loadingBills ? "लोड हो रहा है..." : "सूची ताज़ा करें"}
                </button>
            </div>

            {loadingBills ? (
                <div className="loading-box">बिल लोड हो रहे हैं...</div>
            ) : uploadedBills.length === 0 ? (
                <div className="no-standards"><h3>अभी कोई बिल उपलब्ध नहीं है</h3><p>सेव किया गया बिल यहाँ दिखाई देगा।</p></div>
            ) : (
                <div className="uploaded-bills-table-wrap">
                    <table className="uploaded-bills-table">
                        <thead>
                            <tr><th>क्र0</th><th>वर्ष</th><th>कृषक</th><th>फसल</th><th>केन्द्र</th><th>क्षेत्रफल</th><th>कुल राशि</th><th>दिनांक</th><th>कार्य</th></tr>
                        </thead>
                        <tbody>
                            {uploadedBills.map((savedBill, index) => (
                                <tr key={savedBill.id ?? index}>
                                    <td>{index + 1}</td>
                                    <td>{savedBill.year || savedBill.financial_year || "—"}</td>
                                    <td><strong>{savedBill.farmer_name || "—"}</strong><small>{savedBill.village || ""}</small></td>
                                    <td>{savedBill.crop_name || savedBill.crop || "—"}</td>
                                    <td>{savedBill.center || "—"}</td>
                                    <td>{savedBill.area || "0.00"}</td>
                                    <td className="money">₹ {formatMoney(savedBill.grand_total)}</td>
                                    <td>{savedBill.created_at ? new Date(savedBill.created_at).toLocaleDateString("hi-IN") : "—"}</td>
                                    <td className="uploaded-bill-actions">
                                        <button
                                            type="button"
                                            className="green-button table-view-button"
                                            onClick={() => viewUploadedBill(savedBill)}
                                        >
                                            देखें
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    /* =====================================================
       DOCUMENT PREVIEW (TYPEABLE)
       ===================================================== */

    const PrintPreview = () => {
        if (!selectedStandard) {
            return (
                <div className="preview-empty">
                    <div className="preview-empty-icon">☷</div>
                    <h3>प्रपत्र पूर्वावलोकन</h3>
                    <p>ऊपर से फल पौध का मानक चुनें। चयन करते ही यहाँ A4 प्रपत्र स्वतः तैयार होगा।</p>
                </div>
            );
        }

        const digits = Number(bill.rounding);

        return (
            <div className="document-area" id="printDocument">
                {/* PAGE 1 */}
                <div className="a4-page">
                    <div className="treasury-copy">कोषागार प्रति</div>
                    <div className="document-center document-title-small">कार्यालय उद्यान विशेषज्ञ, कोटद्वार गढ़वाल</div>
                    <div className="document-center document-title">
                        {bill.heading || bill.scheme_name || "जिला योजनान्तर्गत उद्यान स्थापना"} — वर्ष{" "}
                        {financialYear} &nbsp;(बिल)
                    </div>

                    <div className="document-line">
                        जाति <DocField bill={bill} onChange={updateBill} field="caste" className="w-160" />
                        
                    </div>
                    <div className="document-line">
                        नाम कृषक <DocField bill={bill} onChange={updateBill} field="farmer_name" className="w-220" />
                        <span>पिता/पति का नाम</span>
                        <DocField bill={bill} onChange={updateBill} field="father_husband_name" className="w-220" />
                    </div>
                    <div className="document-line">
                        जन्म तिथि <DocField bill={bill} onChange={updateBill} field="date_of_birth" className="w-110" />
                        <span>ग्राम</span>
                        <DocField bill={bill} onChange={updateBill} field="village" className="w-150" />
                        <span>उद्यान सचल दल केन्द्र</span>
                        <DocField bill={displayBill} onChange={updateBill} field="center" className="w-150" disabled />
                    </div>
                    <div className="document-line">
                        रोपित पौधों की संख्या <strong>{calculation.plants}</strong>
                        <span>क्षेत्रफल है0 </span>
                        <strong>{num(bill.area).toFixed(2)}</strong>
                        <span>&nbsp; फल पौध का नाम </span>
                        <strong>{selectedStandard.crop_name}</strong>
                        <span>&nbsp;(दूरी {selectedStandard.spacing})</span>
                    </div>
                    <div className="document-line">
                        (1) बैंक का नाम व शाखा <DocField bill={bill} onChange={updateBill} field="bank_name_1" className="w-200" />
                        <span>खाता संख्या</span>
                        <DocField bill={bill} onChange={updateBill} field="account_number_1" className="w-150" />
                    </div>
                    <div className="document-line indent">
                        आई0एफ0एस0सी0 कोड <DocField bill={bill} onChange={updateBill} field="ifsc_code_1" className="w-150" />
                    </div>
                  
                    <div className="document-line">
                        आधार कार्ड सं0 (बारह अंकों का) <DocField bill={bill} onChange={updateBill} field="aadhaar_number" className="w-220" />
                    </div>
                    <div className="document-line">
                        मोबाइल नम्बर <DocField bill={bill} onChange={updateBill} field="mobile_number" className="w-150" />
                        <span>पैन नम्बर</span>
                        <DocField bill={bill} onChange={updateBill} field="pan_number" className="w-150" />
                    </div>

                    <table className="document-table bill-table">
                        <thead>
                            <tr>
                                <th rowSpan="2">क्र0<br />सं0</th>
                                <th rowSpan="2">कार्य/मद का विवरण</th>
                                <th rowSpan="2">मात्रा/सं0</th>
                                <th colSpan="3">व्यय का विवरण<br />(क्षेत्रफल {num(bill.area).toFixed(2)} है0 हेतु)</th>
                            </tr>
                            <tr><th>कुल व्यय</th><th>देय राजसहायता</th><th>कृषक अंश</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="center">1</td>
                                <td>गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/अन्य पोषक तत्व/पौध सुरक्षा/रोपण सिंचाई आदि (कु0) @ रु0 {selectedStandard.manure_rate} प्रति कु0</td>
                                <td className="center">{calculation.manureQuantity} कु0</td>
                                <td className="money">₹{formatMoney(calculation.manureTotal, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.manureSubsidy, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.manureFarmer, digits)}</td>
                            </tr>
                            <tr>
                                <td className="center">2</td>
                                <td>गड्ढा खुदान, भरान, पौध रोपण (1×1×1 मी0) @ रु0 {selectedStandard.pit_rate} प्रति गड्ढा</td>
                                <td className="center">{calculation.plants} गड्ढा</td>
                                <td className="money">₹{formatMoney(calculation.pitTotal, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.pitSubsidy, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.pitFarmer, digits)}</td>
                            </tr>
                            <tr className="total-row">
                                <td colSpan="3" className="right">योग :-</td>
                                <td className="money">₹{formatMoney(calculation.billTotal, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.billSubsidy, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.billFarmer, digits)}</td>
                            </tr>
                            <tr>
                                <td className="center">—</td>
                                <td className="small-text">फल पौध की लागत ({selectedStandard.spacing}) @ रु0 {selectedStandard.plant_rate} प्रति पौध — विभाग द्वारा पौध के रूप में आपूर्ति (नगद देय नहीं)</td>
                                <td className="center">{calculation.plants}</td>
                                <td className="money">₹{formatMoney(calculation.plantTotal, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.plantSubsidy, digits)}</td>
                                <td className="money">₹0</td>
                            </tr>
                            <tr className="grand-row">
                                <td colSpan="3" className="right">महायोग (मानकानुसार) :-</td>
                                <td className="money">₹{formatMoney(calculation.grandTotal, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.grandSubsidy, digits)}</td>
                                <td className="money">₹{formatMoney(calculation.billFarmer, digits)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <p className="document-paragraph">
                        प्रमाणित किया जाता है कि मेरे द्वारा <strong>{num(bill.area).toFixed(2)}</strong> है0 क्षेत्रफल में <strong>{selectedStandard.crop_name}</strong> उद्यान लगाने हेतु मु0 रु0 <strong>{formatMoney(calculation.billTotal, digits)}</strong> ({amountToHindiWords(calculation.billTotal)}) की धनराशि का कुल व्यय किया गया है, अतः कार्य योजना के अनुसार क्र0 सं0 1 व 2 की धनराशि मु0 रु0 <strong>{formatMoney(calculation.billSubsidy, digits)}</strong> ({amountToHindiWords(calculation.billSubsidy)}) राजसहायता का भुगतान मुझे करने की कृपा करेंगे।
                    </p>

                    <div className="signature-block">
                        हस्ताक्षर कृषक<DocField bill={bill} onChange={updateBill} field="farmer_name" className="signature-input" /><br />
                        कृषक का नाम<DocField bill={bill} onChange={updateBill} field="farmer_name" className="signature-input" /><br />
                        पिता/पति का नाम<DocField bill={bill} onChange={updateBill} field="father_husband_name" className="signature-input" /><br />
                        ग्राम<DocField bill={bill} onChange={updateBill} field="village" className="signature-input" />
                    </div>

                    <p className="document-paragraph">
                        प्रमाणित किया जाता है कि कृषक द्वारा उक्तानुसार <strong>{num(bill.area).toFixed(2)}</strong> है0 उद्यान लगाने हेतु <strong>{calculation.plants}</strong> पौधों का रोपण किया गया है, जिसका मेरे द्वारा स्थलीय सत्यापन कर दिया गया है। अतः कृषक को योजना अनुसार मु0 रु0 <strong>{formatMoney(calculation.billSubsidy, digits)}</strong> ({amountToHindiWords(calculation.billSubsidy)}) का अनुदान भुगतान करने की संस्तुति की जाती है।
                    </p>

                    <div className="officer-sign">
                        प्रभारी<br />उद्यान सचल दल<br />केन्द्र <DocField bill={displayBill} onChange={updateBill} field="center" className="officer-input" disabled />
                    </div>
                </div>

                {/* PAGE 2 */}
                <div className="a4-page">
                    <div className="document-center document-title">कृषक अंश वाउचर सं0 - 1</div>
                    <div className="document-center document-title-small">गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/अन्य पोषक तत्व आदि</div>
                    <div className="document-center document-line">
                        फल पौध : <strong>{selectedStandard.crop_name}</strong>&nbsp;&nbsp;क्षेत्रफल : <strong>{num(bill.area).toFixed(2)}</strong> है0&nbsp;&nbsp;वर्ष : <strong>{financialYear}</strong>
                    </div>

                    <p className="document-paragraph large-gap">
                        मु0 रु0 <strong>{formatMoney(calculation.manureTotal, digits)}</strong> ({amountToHindiWords(calculation.manureTotal)}) बावत गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/अन्य पोषक तत्व आदि का भुगतान रु0 <strong>{formatMoney(calculation.manureTotal, digits)}</strong> श्री <DocField bill={bill} onChange={updateBill} field="farmer_name" className="inline-document-input" /> पुत्र श्री <DocField bill={bill} onChange={updateBill} field="father_husband_name" className="inline-document-input" /> ग्राम <DocField bill={bill} onChange={updateBill} field="village" className="inline-document-input" /> से नगद प्राप्त किया।
                    </p>

                    <div className="signature-block">
                        हस्ताक्षर आपूर्ति कर्ता<DocField bill={bill} onChange={updateBill} field="supplier_name" className="signature-input" /><br />
                        आपूर्ति कर्ता का नाम<DocField bill={bill} onChange={updateBill} field="supplier_name" className="signature-input" /><br />
                        पिता/पति का नाम<DocField bill={bill} onChange={updateBill} field="supplier_father_name" className="signature-input" /><br />
                        ग्राम<DocField bill={bill} onChange={updateBill} field="supplier_village" className="signature-input" />
                    </div>

                    <p className="document-paragraph large-gap">
                        प्रमाणित किया जाता है कि मेरे द्वारा श्री <DocField bill={bill} onChange={updateBill} field="supplier_name" className="inline-document-input" /> पुत्र श्री <DocField bill={bill} onChange={updateBill} field="supplier_father_name" className="inline-document-input" /> ग्राम <DocField bill={bill} onChange={updateBill} field="supplier_village" className="inline-document-input" /> को <strong>{num(bill.area).toFixed(2)}</strong> है0 में गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/अन्य पोषक तत्व आदि हेतु मु0 रु0 <strong>{formatMoney(calculation.manureTotal, digits)}</strong> ({amountToHindiWords(calculation.manureTotal)}) का नगद भुगतान किया गया है। अतः राजसहायता का भुगतान रु0 <strong>{formatMoney(calculation.manureSubsidy, digits)}</strong> ({amountToHindiWords(calculation.manureSubsidy)}) मुझे करने की कृपा कीजियेगा।
                    </p>

                    <div className="signature-block">
                        हस्ताक्षर कृषक<DocField bill={bill} onChange={updateBill} field="farmer_name" className="signature-input" /><br />
                        कृषक का नाम<DocField bill={bill} onChange={updateBill} field="farmer_name" className="signature-input" /><br />
                        पिता/पति का नाम<DocField bill={bill} onChange={updateBill} field="father_husband_name" className="signature-input" /><br />
                        ग्राम<DocField bill={bill} onChange={updateBill} field="village" className="signature-input" />
                    </div>

                    <p className="document-paragraph large-gap">
                        प्रमाणित किया जाता है कि कृषक श्री <strong>{bill.farmer_name || "________"}</strong> पुत्र श्री <strong>{bill.father_husband_name || "________"}</strong> ग्राम <strong>{bill.village || "________"}</strong> द्वारा <strong>{calculation.manureQuantity}</strong> गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/अन्य पोषक तत्व आदि का कार्य किया गया है, जिसका स्थलीय सत्यापन मेरे द्वारा कर दिया गया है। अतः राजसहायता रु0 <strong>{formatMoney(calculation.manureSubsidy, digits)}</strong> ({amountToHindiWords(calculation.manureSubsidy)}) का भुगतान करने की संस्तुति की जाती है।
                    </p>

                    <div className="officer-sign">
                        प्रभारी<br />उद्यान सचल दल<br />केन्द्र <DocField bill={displayBill} onChange={updateBill} field="center" className="officer-input" disabled />
                    </div>
                </div>

                {/* PAGE 3 */}
                {showVoucher2 && (
                    <div className="a4-page">
                        <div className="document-center document-title">कृषक अंश वाउचर सं0 - 2</div>
                        <div className="document-center document-title-small">गड्ढा खुदान, भरान, पौध रोपण (1×1×1 मी0)</div>
                        <div className="document-center document-line">
                            फल पौध : <strong>{selectedStandard.crop_name}</strong>&nbsp;&nbsp;क्षेत्रफल : <strong>{num(bill.area).toFixed(2)}</strong> है0&nbsp;&nbsp;वर्ष : <strong>{financialYear}</strong>
                        </div>

                        <p className="document-paragraph large-gap">
                            मु0 रु0 <strong>{formatMoney(calculation.pitTotal, digits)}</strong> ({amountToHindiWords(calculation.pitTotal)}) बावत गड्ढा खुदान, भरान, पौध रोपण (1×1×1 मी0) का भुगतान रु0 <strong>{formatMoney(calculation.pitTotal, digits)}</strong> श्री <DocField bill={bill} onChange={updateBill} field="farmer_name" className="inline-document-input" /> पुत्र श्री <DocField bill={bill} onChange={updateBill} field="father_husband_name" className="inline-document-input" /> ग्राम <DocField bill={bill} onChange={updateBill} field="village" className="inline-document-input" /> से नगद प्राप्त किया।
                        </p>

                        <div className="signature-block">
                            हस्ताक्षर श्रमिक<DocField bill={bill} onChange={updateBill} field="labour_name" className="signature-input" /><br />
                            श्रमिक का नाम<DocField bill={bill} onChange={updateBill} field="labour_name" className="signature-input" /><br />
                            पिता/पति का नाम<DocField bill={bill} onChange={updateBill} field="labour_father_name" className="signature-input" /><br />
                            ग्राम<DocField bill={bill} onChange={updateBill} field="labour_village" className="signature-input" />
                        </div>

                        <p className="document-paragraph large-gap">
                            प्रमाणित किया जाता है कि मेरे द्वारा श्री <strong>{bill.labour_name || "________"}</strong> पुत्र श्री <strong>{bill.labour_father_name || "________"}</strong> ग्राम <strong>{bill.labour_village || "________"}</strong> को <strong>{num(bill.area).toFixed(2)}</strong> है0 में गड्ढा खुदान, भरान, पौध रोपण (1×1×1 मी0) हेतु मु0 रु0 <strong>{formatMoney(calculation.pitTotal, digits)}</strong> ({amountToHindiWords(calculation.pitTotal)}) का नगद भुगतान किया गया है।
                        </p>

                        <div className="signature-block">
                            हस्ताक्षर कृषक<DocField bill={bill} onChange={updateBill} field="farmer_name" className="signature-input" /><br />
                            कृषक का नाम<DocField bill={bill} onChange={updateBill} field="farmer_name" className="signature-input" /><br />
                            पिता/पति का नाम<DocField bill={bill} onChange={updateBill} field="father_husband_name" className="signature-input" /><br />
                            ग्राम<DocField bill={bill} onChange={updateBill} field="village" className="signature-input" />
                        </div>

                        <div className="officer-sign">
                            प्रभारी<br />उद्यान सचल दल<br />केन्द्र <DocField bill={displayBill} onChange={updateBill} field="center" className="officer-input" disabled />
                        </div>
                    </div>
                )}

                {/* STANDARD PRINT PAGE */}
                {includeStandardPrint && (
                    <div className="a4-page">
                        <div className="document-center document-title">फसलवार मानक तालिका</div>
                        <div className="document-center document-title-small">वित्तीय वर्ष {financialYear}</div>
                        <table className="standard-table">
                            <thead>
                                <tr>
                                    <th>क्र0 सं0</th><th>फल पौध / फसल</th><th>दूरी</th><th>पौध संख्या</th><th>पौध दर</th><th>गड्ढा दर</th><th>खाद दर</th><th>महायोग</th><th>राजसहायता</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standards.map((standard, index) => (
                                    <tr key={standard.id}>
                                        <td className="center">{index + 1}</td>
                                        <td>{standard.crop_name}</td>
                                        <td className="center">{standard.spacing}</td>
                                        <td className="center">{standard.plants_per_hectare}</td>
                                        <td className="money">₹{standard.plant_rate}</td>
                                        <td className="money">₹{standard.pit_rate}</td>
                                        <td className="money">₹{standard.manure_rate}</td>
                                        <td className="money">₹{standard.standard_total}</td>
                                        <td className="money">₹{standard.standard_subsidy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };



    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <div className="udyan-app">
            <div className="control-panel">
                <div className="control-heading">
                    <div>
                        <div className="control-eyebrow">उद्यान विभाग</div>
                        <h1>उद्यान बिल एवं कृषक अंश वाउचर</h1>
                        <p>केवल दर्शन मोड — बिल देखा एवं प्रिंट किया जा सकता है (संपादन/हटाना/जोड़ना अनुमत नहीं)</p>
                    </div>
                    <div className="panel-year">
                        <span>वर्ष</span>
                        <strong>{financialYear}</strong>
                    </div>
                </div>

                <div className="control-tabs">
                    <button type="button" className={activeSection === "bill" ? "active" : ""} onClick={() => setActiveSection("bill")}>बिल प्रपत्र</button>
                    <button type="button" className={activeSection === "bills" ? "active" : ""} onClick={() => setActiveSection("bills")}>अपलोड किए गए बिल</button>
                </div>

                {activeSection === "bills" ? (
                    <div className="panel-content">
                        <UploadedBillsManager />
                    </div>
                ) : (
                    <>
                        {/* QUICK CONTROLS (TYPEABLE TO ADJUST PRINT PREVIEW) */}
                        <div className="quick-controls">
                            <label className="control-field crop-field">
                                <span>फल पौध</span>
                                <select value={selectedCropId} onChange={handleCropChange}>
                                    <option value="">— फल पौध चुनें —</option>
                                    {standards.map((standard) => (
                                        <option key={standard.id} value={standard.id}>{standard.crop_name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="control-field">
                                <span>क्षेत्रफल है0</span>
                                <input value={bill.area} inputMode="decimal" onChange={(event) => updateBill("area", event.target.value)} placeholder="जैसे 0.125" />
                            </label>
                            <label className="control-field">
                                <span>पौध संख्या</span>
                                <input type="number" value={bill.calculation_basis === "area" ? calculation.plants : bill.plants} disabled={bill.calculation_basis === "area"} onChange={(event) => updateBill("plants", event.target.value)} />
                            </label>
                            <label className="control-field">
                                <span>गणना का आधार</span>
                                <select value={bill.calculation_basis} onChange={(event) => updateBill("calculation_basis", event.target.value)} disabled>
                                    <option value="area">क्षेत्रफल के अनुपात में (मानक)</option>
                                    <option value="plant">वास्तविक पौध संख्या के अनुसार</option>
                                </select>
                            </label>
                            <label className="control-field">
                                <span>राशि</span>
                                <select value={bill.rounding}  onChange={(event) => updateBill("rounding", event.target.value)} disabled>
                                    <option value="2">पैसे सहित (2 दशमलव)</option>
                                    <option value="0">पूर्णांक रुपये में</option>
                                </select>
                            </label>
                           
                            <label className="control-field">
                                <span>वाउचर सं0-2</span>
                                <select value={showVoucher2 ? "yes" : "no"} onChange={(event) => setShowVoucher2(event.target.value === "yes")} disabled>
                                    <option value="no">न दें</option>
                                    <option value="yes">दें</option>
                                </select>
                            </label>
                        </div>

                        {/* ACTION ROW — ONLY PRINT (NO SAVE/DELETE) */}
                        <div className="action-row">
                            <button type="button" className="green-button" onClick={printBill}>प्रिंट / PDF</button>
                            <label className="print-check">
                                <input type="checkbox" checked={includeStandardPrint} onChange={(event) => setIncludeStandardPrint(event.target.checked)} />
                                प्रिंट में मानक तालिका का पृष्ठ जोड़ें
                            </label>
                        </div>

                        {selectedStandard && (
                            <div className="live-tally">
                                <div><span>महायोग</span><strong>₹{formatMoney(calculation.grandTotal, Number(bill.rounding))}</strong></div>
                                <div><span>कुल राजसहायता</span><strong>₹{formatMoney(calculation.grandSubsidy, Number(bill.rounding))}</strong></div>
                                <div><span>कृषक अंश</span><strong>₹{formatMoney(calculation.billFarmer, Number(bill.rounding))}</strong></div>
                                <div className="tally-status">लेखा मिलान सही ✓</div>
                            </div>
                        )}


                    </>
                )}
            </div>

            {message && (
                <div className="toast-message">
                    <span>{message}</span>
                    <button type="button" onClick={() => setMessage("")}>×</button>
                </div>
            )}

            {activeSection === "bill" && (
                <main className="preview-wrapper">
                    <div className="preview-heading">
                        <div>
                            <span>LIVE PREVIEW</span>
                            <h2>प्रपत्र पूर्वावलोकन</h2>
                        </div>
                        {selectedStandard && (
                            <div className="preview-meta">
                                <span>फसल</span><strong>{selectedStandard.crop_name}</strong>
                                <span>वर्ष</span><strong>{financialYear}</strong>
                            </div>
                        )}
                    </div>
                    {PrintPreview()}
                </main>
            )}
        </div>
    );
}