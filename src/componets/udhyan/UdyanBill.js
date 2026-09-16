import React, { useEffect, useMemo, useState } from "react";
import "./UdyanBill.css";

const API_BASE = "https://mahadevaaya.com/govbillingsystem/backend/api/udyan";

/* =========================================================
    API HELPERS
    ========================================================= */

const apiFetch = async (url, options = {}) => {
    const method = (
        options.method || "GET"
    ).toUpperCase();

    const headers = {
        ...(options.headers || {}),
    };

    return fetch(url, {
        ...options,
        method,
        headers,
        credentials: "omit",
    });
};

/*
 * IMPORTANT:
 * Never blindly call response.json().
 * Django/nginx/server may return an HTML page beginning
 * with <!DOCTYPE html>, which causes:
 *
 * Unexpected token '<'
 *
 * This helper gives a useful error instead.
 */
const readJsonResponse = async (response) => {
    const contentType =
        response.headers.get("content-type") || "";

    const text = await response.text();

    if (!text) {
        return {};
    }

    if (
        !contentType
            .toLowerCase()
            .includes("application/json")
    ) {
        const preview = text
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200);

        if (response.status === 401) {
            throw new Error(
                "सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।"
            );
        }

        if (response.status === 403) {
            throw new Error(
                "आपको इस कार्य की अनुमति नहीं है।"
            );
        }

        if (response.status === 404) {
            throw new Error(
                "API URL उपलब्ध नहीं है। कृपया backend API URL जाँचें।"
            );
        }

        throw new Error(
            `सर्वर ने JSON के बजाय HTML/अन्य response भेजा। HTTP ${response.status}${
                preview ? ` — ${preview}` : ""
            }`
        );
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error("Invalid JSON response:", text);

        throw new Error(
            "सर्वर का JSON response मान्य नहीं है।"
        );
    }
};

/* =========================================================
   NUMBER HELPERS
   ========================================================= */

const num = (value, fallback = 0) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    const parsed = parseFloat(
        String(value).replace(/[^0-9.-]/g, "")
    );

    return Number.isFinite(parsed)
        ? parsed
        : fallback;
};

const roundValue = (value, digits = 2) => {
    const factor = Math.pow(10, digits);

    return (
        Math.round(
            (Number(value) + Number.EPSILON) * factor
        ) / factor
    );
};

const formatMoney = (value, digits = 2) => {
    return Number(value || 0).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }
    );
};

/* =========================================================
   HINDI NUMBER WORDS
   ========================================================= */

const HINDI_NUMBERS = [
    "शून्य",
    "एक",
    "दो",
    "तीन",
    "चार",
    "पाँच",
    "छह",
    "सात",
    "आठ",
    "नौ",
    "दस",
    "ग्यारह",
    "बारह",
    "तेरह",
    "चौदह",
    "पन्द्रह",
    "सोलह",
    "सत्रह",
    "अठारह",
    "उन्नीस",
    "बीस",
    "इक्कीस",
    "बाईस",
    "तेईस",
    "चौबीस",
    "पच्चीस",
    "छब्बीस",
    "सत्ताईस",
    "अट्ठाईस",
    "उनतीस",
    "तीस",
    "इकतीस",
    "बत्तीस",
    "तैंतीस",
    "चौंतीस",
    "पैंतीस",
    "छत्तीस",
    "सैंतीस",
    "अड़तीस",
    "उनतालीस",
    "चालीस",
    "इकतालीस",
    "बयालीस",
    "तैंतालीस",
    "चवालीस",
    "पैंतालीस",
    "छियालीस",
    "सैंतालीस",
    "अड़तालीस",
    "उनचास",
    "पचास",
    "इक्यावन",
    "बावन",
    "तिरपन",
    "चौवन",
    "पचपन",
    "छप्पन",
    "सत्तावन",
    "अट्ठावन",
    "उनसठ",
    "साठ",
    "इकसठ",
    "बासठ",
    "तिरसठ",
    "चौंसठ",
    "पैंसठ",
    "छियासठ",
    "सड़सठ",
    "अड़सठ",
    "उनहत्तर",
    "सत्तर",
    "इकहत्तर",
    "बहत्तर",
    "तिहत्तर",
    "चौहत्तर",
    "पचहत्तर",
    "छिहत्तर",
    "सतहत्तर",
    "अठहत्तर",
    "उन्यासी",
    "अस्सी",
    "इक्यासी",
    "बयासी",
    "तिरासी",
    "चौरासी",
    "पचासी",
    "छियासी",
    "सत्तासी",
    "अट्ठासी",
    "नवासी",
    "नब्बे",
    "इक्यानवे",
    "बानवे",
    "तिरानवे",
    "चौरानवे",
    "पचानवे",
    "छियानवे",
    "सत्तानवे",
    "निन्यानवे",
];

const belowThousand = (number) => {
    let result = "";

    const hundred = Math.floor(number / 100);
    const remainder = number % 100;

    if (hundred) {
        result +=
            HINDI_NUMBERS[hundred] +
            " सौ ";
    }

    if (remainder) {
        result +=
            HINDI_NUMBERS[remainder] +
            " ";
    }

    return result.trim();
};

const numberToHindiWords = (value) => {
    let n = Math.round(Number(value) || 0);

    if (n === 0) {
        return "शून्य";
    }

    if (n < 0) {
        return "ऋण " + numberToHindiWords(Math.abs(n));
    }

    let result = "";

    const crore = Math.floor(
        n / 10000000
    );

    n %= 10000000;

    const lakh = Math.floor(
        n / 100000
    );

    n %= 100000;

    const thousand = Math.floor(
        n / 1000
    );

    n %= 1000;

    if (crore) {
        result +=
            belowThousand(crore) +
            " करोड़ ";
    }

    if (lakh) {
        result +=
            belowThousand(lakh) +
            " लाख ";
    }

    if (thousand) {
        result +=
            belowThousand(thousand) +
            " हजार ";
    }

    if (n) {
        result += belowThousand(n);
    }

    return result.trim();
};

const amountToHindiWords = (value) => {
    const amount = Number(value) || 0;

    const rupees = Math.floor(amount);

    const paise = Math.round(
        (amount - rupees) * 100
    );

    let text =
        numberToHindiWords(rupees) +
        " रुपये";

    if (paise > 0) {
        text +=
            " " +
            numberToHindiWords(paise) +
            " पैसे";
    }

    return text + " मात्र";
};

/* =========================================================
   EMPTY FORM
   ========================================================= */

const emptyBill = {
    financial_year: "2026-27",

    crop: "",

    area: "1.00",
    plants: "",

    calculation_basis: "area",
    rounding: "2",

    caste: "",
    scheme_name: "",

    farmer_name: "",
    father_husband_name: "",
    date_of_birth: "",

    village: "",
    center: "",

    bank_name_1: "",
    account_number_1: "",
    ifsc_code_1: "",

    bank_name_2: "",
    account_number_2: "",
    ifsc_code_2: "",

    aadhaar_number: "",
    mobile_number: "",
    pan_number: "",

    supplier_name: "",
    supplier_father_name: "",
    supplier_village: "",

    labour_name: "",
    labour_father_name: "",
    labour_village: "",

    voucher_2: false,
};

/* =========================================================
   BILL PAYLOAD NORMALIZER
   Map frontend form field names to the exact Bill API names.
   Optional fields stay optional: blank -> null, filled -> value.
   ========================================================= */

const optionalText = (value) => {
    const text = String(value ?? "").trim();
    return text === "" ? null : text;
};

const buildBillPayload = ({
    bill,
    financialYear,
    selectedCropId,
    calculation,
}) => ({
    financial_year: String(
        financialYear ?? bill.financial_year ?? ""
    ).trim(),
    crop: Number(selectedCropId),
    area: num(bill.area),
    plants: Number(calculation.plants) || 0,
    calculation_basis: bill.calculation_basis || "area",
    rounding: Number(bill.rounding) || 2,

    caste: optionalText(bill.caste),
    scheme: optionalText(bill.scheme_name),
    farmer_name: optionalText(bill.farmer_name),
    father_husband_name: optionalText(bill.father_husband_name),
    date_of_birth: optionalText(bill.date_of_birth),
    village: optionalText(bill.village),
    center: optionalText(bill.center),

    bank_name_1: optionalText(bill.bank_name_1),
    account_number_1: optionalText(bill.account_number_1),
    ifsc_1: optionalText(bill.ifsc_code_1),

    bank_name_2: optionalText(bill.bank_name_2),
    account_number_2: optionalText(bill.account_number_2),
    ifsc_2: optionalText(bill.ifsc_code_2),

    aadhaar: optionalText(bill.aadhaar_number),
    mobile: optionalText(bill.mobile_number),
    pan: optionalText(bill.pan_number),

    supplier_name: optionalText(bill.supplier_name),
    supplier_father_name: optionalText(bill.supplier_father_name),
    supplier_village: optionalText(bill.supplier_village),
    labour_name: optionalText(bill.labour_name),
    labour_father_name: optionalText(bill.labour_father_name),
    labour_village: optionalText(bill.labour_village),

    voucher_2: Boolean(bill.voucher_2),

    plant_total: num(calculation.plantTotal),
    pit_total: num(calculation.pitTotal),
    manure_quantity: num(calculation.manureQuantity),
    manure_total: num(calculation.manureTotal),
    plant_subsidy: num(calculation.plantSubsidy),
    pit_subsidy: num(calculation.pitSubsidy),
    manure_subsidy: num(calculation.manureSubsidy),
    farmer_contribution: num(calculation.billFarmer),
    grand_total: num(calculation.grandTotal),
    grand_subsidy: num(calculation.grandSubsidy),

    items: Array.isArray(bill.items) ? bill.items : [],
});

const emptyStandard = {
    financial_year: "2026-27",

    crop_name: "",
    spacing: "",

    plants_per_hectare: "",

    plant_rate: "",
    pit_rate: "",
    manure_rate: "",

    manure_quantity: "",

    standard_total: "",
    standard_subsidy: "",

    is_active: true,
};

/* =========================================================
   STABLE INPUT COMPONENTS
   =========================================================
   VERY IMPORTANT:
   These components MUST remain outside UdyanBill().
   
   Previously they were inside UdyanBill().
   Because UdyanBill re-renders after every keystroke,
   React received a NEW component function and remounted
   the input.

   Result:
   User types:
   "R"
   input remounts
   focus disappears
   next character cannot be entered.

   Keeping these at module scope fixes the issue.
   ========================================================= */

const DocField = ({
    bill,
    onChange,
    field,
    className = "",
}) => {
    return (
        <input
            className={`doc-input ${className}`}
            value={bill[field] ?? ""}
            placeholder="________________"
            onChange={(event) => {
                onChange(
                    field,
                    event.target.value
                );
            }}
        />
    );
};

const getColorClass = (id) => {
    const colors = [
        "blue",
        "green",
        "purple",
        "orange",
        "teal",
        "pink",
        "indigo",
        "cyan",
    ];

    if (id === undefined || id === null) {
        return colors[0];
    }

    const index = String(id)
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[index % colors.length];
};

const CenterSelect = ({
    bill,
    onChange,
    centers,
    loading,
    className = "",
}) => {
    const selectedCenter = centers.find(
        (center) =>
            String(center.name) ===
            String(bill.center ?? "")
    );

    return (
        <select
            className={`doc-input ${className}`}
            value={selectedCenter?.id ?? ""}
            onChange={(event) => {
                const selected = centers.find(
                    (center) =>
                        String(center.id) ===
                        String(event.target.value)
                );

                onChange(
                    "center",
                    selected?.name ?? ""
                );
            }}
            disabled={loading}
        >
            <option value="">
                — केन्द्र चुनें —
            </option>

            {centers.map((center) => (
                <option
                    key={center.id}
                    value={center.id}
                >
                    {center.name}
                </option>
            ))}
        </select>
    );
};

const CenterAutoFill = ({
    bill,
    className = "",
}) => {
    return (
        <input
            className={`doc-input ${className}`}
            value={bill.center ?? ""}
            readOnly
        />
    );
};

/* =========================================================
   COMPONENT
   ========================================================= */

export default function UdyanBill() {
    const [financialYear, setFinancialYear] =
        useState("2026-27");

    const [bill, setBill] =
        useState(emptyBill);

    const [standards, setStandards] =
        useState([]);

    const [uploadedBills, setUploadedBills] =
        useState([]);

    const [loadingBills, setLoadingBills] =
        useState(false);

    const [selectedCropId, setSelectedCropId] =
        useState("");

    const [loadingStandards, setLoadingStandards] =
        useState(false);

    const [centers, setCenters] =
        useState([]);

    const [loadingCenters, setLoadingCenters] =
        useState(false);

    const [activeSection, setActiveSection] =
        useState("bill");

    const [showStandardModal, setShowStandardModal] =
        useState(false);

    const [editingStandard, setEditingStandard] =
        useState(null);

    const [standardForm, setStandardForm] =
        useState(emptyStandard);

    const [savingStandard, setSavingStandard] =
        useState(false);

    const [savingBill, setSavingBill] =
        useState(false);

    const [deletingBillId, setDeletingBillId] =
        useState(null);

    // null = new bill, value = existing saved bill being edited
    const [editingBillId, setEditingBillId] =
        useState(null);

    const [includeStandardPrint, setIncludeStandardPrint] =
        useState(false);

    const [showVoucher2, setShowVoucher2] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [lastSavedBill, setLastSavedBill] =
        useState(null);

    /* =====================================================
       LOAD STANDARDS
       ===================================================== */

    const loadStandards = async () => {
        setLoadingStandards(true);

        try {
            const response = await apiFetch(
                `${API_BASE}/crop-standards/?financial_year=${encodeURIComponent(
                    financialYear
                )}`
            );

            const data =
                await readJsonResponse(response);

            if (!response.ok) {
                const error =
                    data?.detail ||
                    data?.error ||
                    Object.values(data || {})
                        .flat()
                        .join(" ");

                throw new Error(
                    error ||
                        "मानक सूची प्राप्त नहीं हो सकी।"
                );
            }

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.results)
                ? data.results
                : [];

            const activeList =
                list.filter(
                    (item) =>
                        item.is_active !== false
                );

            setStandards(activeList);

            // Select the first database standard automatically so the
            // calculation and A4 preview are visible immediately.
            if (!selectedCropId && activeList.length > 0) {
                const firstId = String(activeList[0].id);
                setSelectedCropId(firstId);
                setBill((previous) => ({
                    ...previous,
                    crop: firstId,
                }));
            }

            if (
                selectedCropId &&
                !activeList.some(
                    (item) =>
                        String(item.id) ===
                        String(selectedCropId)
                )
            ) {
                setSelectedCropId("");

                setBill((previous) => ({
                    ...previous,
                    crop: "",
                }));
            }
        } catch (error) {
            console.error(
                "loadStandards:",
                error
            );

            setMessage(
                error.message ||
                    "मानक सूची प्राप्त नहीं हो सकी।"
            );
        } finally {
            setLoadingStandards(false);
        }
    };

    const loadCenters = async () => {
        setLoadingCenters(true);

        try {
            const response = await apiFetch(
                "https://mahadevaaya.com/govbillingsystem/backend/api/centres/"
            );

            const data =
                await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(
                    data?.detail ||
                        data?.error ||
                        "केंद्र सूची प्राप्त नहीं हो सकी।"
                );
            }

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.results)
                ? data.results
                : [];

            const activeList =
                list.filter(
                    (center) =>
                        center.is_active !== false
                );

            setCenters(activeList);
        } catch (error) {
            console.error(
                "loadCenters:",
                error
            );

            setMessage(
                error.message ||
                    "केंद्र सूची प्राप्त नहीं हो सकी।"
            );
        } finally {
            setLoadingCenters(false);
        }
    };

    useEffect(() => {
        loadStandards();
        loadCenters();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [financialYear]);

    const loadUploadedBills = async () => {
        setLoadingBills(true);

        try {
            const response = await apiFetch(`${API_BASE}/bills/`);
            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(data?.detail || data?.error || "बिल सूची प्राप्त नहीं हो सकी।");
            }

            setUploadedBills(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.results)
                    ? data.results
                    : []
            );
        } catch (error) {
            console.error("loadUploadedBills:", error);
            setMessage(error.message || "बिल सूची प्राप्त नहीं हो सकी।");
        } finally {
            setLoadingBills(false);
        }
    };

    const deleteBill = async (billId) => {
        if (
            billId === null ||
            billId === undefined ||
            billId === ""
        ) {
            alert("इस बिल का ID उपलब्ध नहीं है।");
            return;
        }

        const confirmed = window.confirm(
            `क्या आप बिल #${billId} को स्थायी रूप से हटाना चाहते हैं?`
        );

        if (!confirmed) {
            return;
        }

        setDeletingBillId(billId);

        try {
            const response = await apiFetch(
                `${API_BASE}/bills/${encodeURIComponent(billId)}/`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                const data =
                    await readJsonResponse(response);

                const error =
                    data?.detail ||
                    data?.error ||
                    Object.values(data || {})
                        .flat()
                        .join(" ");

                throw new Error(
                    error ||
                        `बिल #${billId} हटाया नहीं जा सका।`
                );
            }

            // If the deleted bill was currently open in the form,
            // leave edit mode and clear the form.
            if (
                editingBillId !== null &&
                String(editingBillId) === String(billId)
            ) {
                setBill({
                    ...emptyBill,
                    financial_year:
                        financialYear,
                });

                setSelectedCropId("");
                setShowVoucher2(false);
                setLastSavedBill(null);
                setEditingBillId(null);
                setActiveSection("bills");
            }

            await loadUploadedBills();

            setMessage(
                `बिल #${billId} सफलतापूर्वक हटा दिया गया।`
            );
        } catch (error) {
            console.error(
                "deleteBill:",
                error
            );

            alert(
                error.message ||
                    `बिल #${billId} हटाया नहीं जा सका।`
            );
        } finally {
            setDeletingBillId(null);
        }
    };

    useEffect(() => {
        if (activeSection === "bills") {
            loadUploadedBills();
        }
    }, [activeSection]);

    /* =====================================================
       SELECTED STANDARD
       ===================================================== */

    const selectedStandard = useMemo(() => {
        return (
            standards.find(
                (item) =>
                    String(item.id) ===
                    String(selectedCropId)
            ) || null
        );
    }, [
        standards,
        selectedCropId,
    ]);

    /* =====================================================
       BILL UPDATE
       ===================================================== */

    const updateBill = (field, value) => {
        setBill((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    /* =====================================================
       CROP
       ===================================================== */

    const handleCropChange = (event) => {
        const id =
            event.target.value;

        setSelectedCropId(id);

        updateBill(
            "crop",
            id
        );
    };

    /* =====================================================
       CALCULATION
       ===================================================== */

    const calculation = useMemo(() => {
        if (!selectedStandard) {
            return {
                plants: 0,

                plantTotal: 0,
                plantSubsidy: 0,

                pitTotal: 0,
                pitSubsidy: 0,
                pitFarmer: 0,

                manureTotal: 0,
                manureSubsidy: 0,
                manureFarmer: 0,

                manureQuantity: 0,

                billTotal: 0,
                billSubsidy: 0,
                billFarmer: 0,

                grandTotal: 0,
                grandSubsidy: 0,
            };
        }

        const area = Math.max(
            0,
            num(bill.area)
        );

        const plantsPerHectare =
            num(
                selectedStandard.plants_per_hectare
            );

        let plants;

        if (
            bill.calculation_basis ===
            "plant"
        ) {
            plants = Math.max(
                0,
                Math.round(
                    num(bill.plants)
                )
            );
        } else {
            plants = Math.max(
                0,
                Math.round(
                    area *
                        plantsPerHectare
                )
            );
        }

        const plantRate =
            num(
                selectedStandard.plant_rate
            );

        const pitRate =
            num(
                selectedStandard.pit_rate
            );

        const manureRate =
            num(
                selectedStandard.manure_rate
            );

        const standardTotal =
            num(
                selectedStandard.standard_total
            );

        const standardSubsidy =
            num(
                selectedStandard.standard_subsidy
            );

        const plantTotal =
            plants * plantRate;

        const pitTotal =
            plants * pitRate;

        const pitSubsidy = 0;

        const pitFarmer =
            pitTotal - pitSubsidy;

        let manureTotal;

        if (
            bill.calculation_basis ===
            "plant"
        ) {
            // Same rule as the reference form:
            // standard total for selected area minus actual plant/pit cost.
            manureTotal =
                standardTotal * area -
                plantTotal -
                pitTotal;
        } else {
            manureTotal =
                (
                    standardTotal -
                    plantRate *
                        plantsPerHectare -
                    pitRate *
                        plantsPerHectare
                ) * area;
        }

        manureTotal = Math.max(
            0,
            manureTotal
        );

        const manureQuantity =
            manureRate > 0
                ? manureTotal /
                  manureRate
                : 0;

        const plantSubsidy =
            Math.min(
                plantTotal,
                standardSubsidy *
                    area
            );

        const manureSubsidy =
            Math.min(
                manureTotal,
                Math.max(
                    0,
                    standardSubsidy *
                        area -
                        plantSubsidy
                )
            );

        const manureFarmer =
            Math.max(
                0,
                manureTotal -
                    manureSubsidy
            );

        const billTotal =
            pitTotal +
            manureTotal;

        const billSubsidy =
            pitSubsidy +
            manureSubsidy;

        const billFarmer =
            pitFarmer +
            manureFarmer;

        const grandTotal =
            billTotal +
            plantTotal;

        const grandSubsidy =
            billSubsidy +
            plantSubsidy;

        const digits =
            Number(bill.rounding);

        return {
            plants,

            plantTotal:
                roundValue(
                    plantTotal,
                    digits
                ),

            plantSubsidy:
                roundValue(
                    plantSubsidy,
                    digits
                ),

            pitTotal:
                roundValue(
                    pitTotal,
                    digits
                ),

            pitSubsidy:
                roundValue(
                    pitSubsidy,
                    digits
                ),

            pitFarmer:
                roundValue(
                    pitFarmer,
                    digits
                ),

            manureTotal:
                roundValue(
                    manureTotal,
                    digits
                ),

            manureSubsidy:
                roundValue(
                    manureSubsidy,
                    digits
                ),

            manureFarmer:
                roundValue(
                    manureFarmer,
                    digits
                ),

            manureQuantity:
                roundValue(
                    manureQuantity,
                    2
                ),

            billTotal:
                roundValue(
                    billTotal,
                    digits
                ),

            billSubsidy:
                roundValue(
                    billSubsidy,
                    digits
                ),

            billFarmer:
                roundValue(
                    billFarmer,
                    digits
                ),

            grandTotal:
                roundValue(
                    grandTotal,
                    digits
                ),

            grandSubsidy:
                roundValue(
                    grandSubsidy,
                    digits
                ),
        };
    }, [
        bill.area,
        bill.plants,
        bill.calculation_basis,
        bill.rounding,
        selectedStandard,
    ]);

    /* =====================================================
       STANDARD FORM
       ===================================================== */

    const openAddStandard = () => {
        setEditingStandard(null);

        setStandardForm({
            ...emptyStandard,
            financial_year:
                financialYear,
        });

        setShowStandardModal(true);
    };

    const openEditStandard = (
        standard
    ) => {
        setEditingStandard(
            standard
        );

        setStandardForm({
            financial_year:
                standard.financial_year ||
                financialYear,

            crop_name:
                standard.crop_name ||
                "",

            spacing:
                standard.spacing ||
                "",

            plants_per_hectare:
                standard.plants_per_hectare ??
                "",

            plant_rate:
                standard.plant_rate ??
                "",

            pit_rate:
                standard.pit_rate ??
                "",

            manure_rate:
                standard.manure_rate ??
                "",

            manure_quantity:
                standard.manure_quantity ??
                "",

            standard_total:
                standard.standard_total ??
                "",

            standard_subsidy:
                standard.standard_subsidy ??
                "",

            is_active:
                standard.is_active !== false,
        });

        setShowStandardModal(true);
    };

    const closeStandardModal = () => {
        setShowStandardModal(false);

        setEditingStandard(null);

        setStandardForm({
            ...emptyStandard,
            financial_year:
                financialYear,
        });
    };

    const updateStandardForm = (
        field,
        value
    ) => {
        setStandardForm(
            (previous) => ({
                ...previous,
                [field]: value,
            })
        );
    };

    /* =====================================================
       SAVE STANDARD
       ===================================================== */

    const saveStandard = async () => {
        if (
            !String(
                standardForm.financial_year
            ).trim()
        ) {
            alert(
                "वित्तीय वर्ष दर्ज करें।"
            );
            return;
        }

        if (
            !String(
                standardForm.crop_name
            ).trim()
        ) {
            alert(
                "फसल का नाम दर्ज करें।"
            );
            return;
        }

        if (
            !String(
                standardForm.spacing
            ).trim()
        ) {
            alert(
                "दूरी दर्ज करें।"
            );
            return;
        }

        const total =
            num(
                standardForm.standard_total
            );

        const subsidy =
            num(
                standardForm.standard_subsidy
            );

        if (subsidy > total) {
            alert(
                "राजसहायता मानक महायोग से अधिक नहीं हो सकती।"
            );
            return;
        }

        setSavingStandard(true);

        const isEdit =
            Boolean(
                editingStandard
            );

        const url = isEdit
            ? `${API_BASE}/crop-standards/${editingStandard.id}/`
            : `${API_BASE}/crop-standards/`;

        const payload = {
            financial_year:
                String(
                    standardForm.financial_year
                ).trim(),

            crop_name:
                String(
                    standardForm.crop_name
                ).trim(),

            spacing:
                String(
                    standardForm.spacing
                ).trim(),

            plants_per_hectare:
                num(
                    standardForm.plants_per_hectare
                ),

            plant_rate:
                num(
                    standardForm.plant_rate
                ),

            pit_rate:
                num(
                    standardForm.pit_rate
                ),

            manure_rate:
                num(
                    standardForm.manure_rate
                ),

            manure_quantity:
                num(
                    standardForm.manure_quantity
                ),

            standard_total:
                total,

            standard_subsidy:
                subsidy,

            is_active:
                Boolean(
                    standardForm.is_active
                ),
        };

        try {
            const response =
                await apiFetch(
                    url,
                    {
                        method:
                            isEdit
                                ? "PUT"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                payload
                            ),
                    }
                );

            const data =
                await readJsonResponse(
                    response
                );

            if (!response.ok) {
                const error =
                    data?.detail ||
                    data?.error ||
                    Object.values(data || {})
                        .flat()
                        .join(" ");

                throw new Error(
                    error ||
                        "मानक सेव नहीं हो सका।"
                );
            }

            closeStandardModal();

            await loadStandards();

            setMessage(
                isEdit
                    ? "मानक सफलतापूर्वक अपडेट किया गया।"
                    : "नया मानक सफलतापूर्वक जोड़ा गया।"
            );
        } catch (error) {
            console.error(
                "saveStandard:",
                error
            );

            alert(
                error.message ||
                    "मानक सेव नहीं हो सका।"
            );
        } finally {
            setSavingStandard(false);
        }
    };

    /* =====================================================
       DELETE STANDARD
       ===================================================== */

    const deleteStandard = async (
        id
    ) => {
        if (
            !window.confirm(
                "क्या आप इस मानक को हटाना चाहते हैं?"
            )
        ) {
            return;
        }

        try {
            const response =
                await apiFetch(
                    `${API_BASE}/crop-standards/${id}/`,
                    {
                        method: "DELETE",
                    }
                );

            if (!response.ok) {
                const data =
                    await readJsonResponse(
                        response
                    );

                const error =
                    data?.detail ||
                    data?.error ||
                    Object.values(data || {})
                        .flat()
                        .join(" ");

                throw new Error(
                    error ||
                        "मानक हटाया नहीं जा सका।"
                );
            }

            if (
                String(
                    selectedCropId
                ) === String(id)
            ) {
                setSelectedCropId("");

                updateBill(
                    "crop",
                    ""
                );
            }

            await loadStandards();

            setMessage(
                "मानक सफलतापूर्वक हटाया गया।"
            );
        } catch (error) {
            console.error(
                "deleteStandard:",
                error
            );

            alert(
                error.message ||
                    "मानक हटाया नहीं जा सका।"
            );
        }
    };

    /* =====================================================
       SAVE / UPDATE BILL
       ===================================================== */

    const saveBill = async () => {
        if (!selectedStandard) {
            alert(
                "कृपया फल पौध का मानक चुनें।"
            );
            return;
        }

        if (!String(bill.farmer_name ?? "").trim()) {
            alert(
                "कृपया कृषक का नाम दर्ज करें।"
            );
            return;
        }

        setSavingBill(true);

        try {
            const payload = buildBillPayload({
                bill,
                financialYear,
                selectedCropId,
                calculation,
            });

            // Existing bill opened from "अपलोड किए गए बिल"
            // is updated with PUT /bills/{id}/
            const isEditing = editingBillId !== null && editingBillId !== undefined;
            const url = isEditing
                ? `${API_BASE}/bills/${encodeURIComponent(editingBillId)}/`
                : `${API_BASE}/bills/`;
            const method = isEditing ? "PUT" : "POST";

            const response = await apiFetch(
                url,
                {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await readJsonResponse(response);

            if (!response.ok) {
                const error =
                    data?.detail ||
                    data?.error ||
                    Object.values(data || {})
                        .flat()
                        .join(" ");

                throw new Error(
                    error ||
                        (isEditing
                            ? "बिल अपडेट नहीं हो सका।"
                            : "बिल सेव नहीं हो सका।")
                );
            }

            setLastSavedBill(data);

            // Keep the returned ID when updating an existing bill.
            // For a newly created bill we intentionally remain in
            // "new bill" mode until the user opens a saved bill.
            if (isEditing && data?.id !== undefined && data?.id !== null) {
                setEditingBillId(data.id);
            }

            // Refresh saved bills after both POST and PUT.
            await loadUploadedBills();

            setMessage(
                isEditing
                    ? `बिल #${editingBillId} सफलतापूर्वक अपडेट किया गया।`
                    : "बिल सफलतापूर्वक सेव किया गया।"
            );
        } catch (error) {
            console.error(
                "saveBill:",
                error
            );

            alert(
                error.message ||
                    (editingBillId !== null
                        ? "बिल अपडेट नहीं हो सका।"
                        : "बिल सेव नहीं हो सका।")
            );
        } finally {
            setSavingBill(false);
        }
    };

    /* =====================================================
       RESET
       ===================================================== */

    const resetBill = () => {
        if (
            !window.confirm(
                "भरी गई सभी सूचनाएँ मिटा दी जाएँगी। जारी रखें?"
            )
        ) {
            return;
        }

        setBill({
            ...emptyBill,
            financial_year:
                financialYear,
        });

        setSelectedCropId("");

        setShowVoucher2(false);

        setLastSavedBill(null);

        setEditingBillId(null);

        setMessage("");
    };

    const openUploadedBill = (savedBill) => {
        if (!savedBill?.id) {
            alert("इस बिल का ID उपलब्ध नहीं है, इसलिए इसे अपडेट नहीं किया जा सकता।");
            return;
        }

        const selectedId = String(savedBill.crop ?? "");
        const matchingStandard = standards.find(
            (standard) => String(standard.id) === selectedId
        );

        // Store the exact server-side bill ID. This controls
        // POST vs PUT and is used in /bills/{id}/.
        setEditingBillId(savedBill.id);

        setFinancialYear(
            savedBill.year ||
            savedBill.financial_year ||
            "2026-27"
        );

        setSelectedCropId(selectedId);

        setBill({
            ...emptyBill,
            ...savedBill,
            financial_year:
                savedBill.year ||
                savedBill.financial_year ||
                "2026-27",
            crop: selectedId,

            // API field -> frontend field
            scheme_name:
                savedBill.scheme ??
                savedBill.scheme_name ??
                "",

            ifsc_code_1:
                savedBill.ifsc_1 ??
                savedBill.ifsc_code_1 ??
                "",

            ifsc_code_2:
                savedBill.ifsc_2 ??
                savedBill.ifsc_code_2 ??
                "",

            aadhaar_number:
                savedBill.aadhaar ??
                savedBill.aadhaar_number ??
                "",

            mobile_number:
                savedBill.mobile ??
                savedBill.mobile_number ??
                "",

            pan_number:
                savedBill.pan ??
                savedBill.pan_number ??
                "",

            voucher_2:
                Boolean(
                    savedBill.voucher_2
                ),
        });

        setShowVoucher2(
            Boolean(savedBill.voucher_2)
        );

        setLastSavedBill(savedBill);

        // Go directly back to the bill form.
        setActiveSection("bill");

        setMessage(
            `बिल #${savedBill.id} खोला गया है। अब आप डेटा बदलकर "बिल अपडेट करें" दबा सकते हैं।`
        );

        if (!matchingStandard) {
            setMessage(
                `बिल #${savedBill.id} खोला गया है। संबंधित मानक उपलब्ध नहीं है, इसलिए गणना मानक पुनः चुनें।`
            );
        }
    };

    const UploadedBillsManager = () => (
        <div className="uploaded-bills-panel">
            <div className="uploaded-bills-heading">
                <div>
                    <span className="section-kicker">SAVED RECORDS</span>
                    <h2>अपलोड किए गए बिल</h2>
                    <p>सर्वर पर सुरक्षित बिलों की सूची और उनका प्रपत्र पूर्वावलोकन।</p>
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
                                            onClick={() => openUploadedBill(savedBill)}
                                            disabled={deletingBillId !== null}
                                        >
                                            देखें
                                        </button>

                                        <button
                                            type="button"
                                            className="warning-button table-delete-button"
                                            onClick={() => deleteBill(savedBill.id)}
                                            disabled={
                                                deletingBillId !== null &&
                                                String(deletingBillId) === String(savedBill.id)
                                            }
                                        >
                                            {
                                                deletingBillId !== null &&
                                                String(deletingBillId) === String(savedBill.id)
                                                    ? "हटाया जा रहा है..."
                                                    : "हटाएं"
                                            }
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

    const printBill = () => {
        const printDocument = document.getElementById("printDocument");

        if (!printDocument) {
            alert("प्रिंट प्रपत्र अभी तैयार नहीं है।");
            return;
        }

        /*
         * Use a hidden iframe instead of window.open().
         * This avoids Chrome opening an empty about:blank window and
         * gives the browser a real document to print.
         */
        const existingFrame = document.getElementById("udyan-print-frame");
        if (existingFrame) {
            existingFrame.remove();
        }

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

        /* Preserve current React-controlled field values. */
        const sourceFields = printDocument.querySelectorAll(
            "input, textarea, select"
        );
        const clonedFields = clonedDocument.querySelectorAll(
            "input, textarea, select"
        );

        sourceFields.forEach((sourceField, index) => {
            const clonedField = clonedFields[index];
            if (!clonedField) return;

            if (sourceField instanceof HTMLInputElement) {
                clonedField.value = sourceField.value;
                clonedField.setAttribute("value", sourceField.value);

                if (
                    sourceField.type === "checkbox" ||
                    sourceField.type === "radio"
                ) {
                    clonedField.checked = sourceField.checked;

                    if (sourceField.checked) {
                        clonedField.setAttribute("checked", "checked");
                    } else {
                        clonedField.removeAttribute("checked");
                    }
                }
            } else if (sourceField instanceof HTMLTextAreaElement) {
                clonedField.value = sourceField.value;
                clonedField.textContent = sourceField.value;
            } else if (sourceField instanceof HTMLSelectElement) {
                clonedField.value = sourceField.value;

                Array.from(clonedField.options).forEach(
                    (option, optionIndex) => {
                        const sourceOption = sourceField.options[optionIndex];
                        const selected = Boolean(sourceOption?.selected);

                        option.selected = selected;

                        if (selected) {
                            option.setAttribute("selected", "selected");
                        } else {
                            option.removeAttribute("selected");
                        }
                    }
                );
            }
        });

        /* Copy the application's loaded CSS/style tags into the iframe. */
        const styleMarkup = Array.from(
            document.querySelectorAll(
                'link[rel="stylesheet"], style'
            )
        )
            .map((node) => node.outerHTML)
            .join("\n");

        iframeDocument.open();
        iframeDocument.write(`<!doctype html>
<html lang="hi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>उद्यान बिल</title>
    ${styleMarkup}
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm;
        }

        html,
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
        }

        body {
            color: #111 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Kokila", "Segoe UI", sans-serif !important;
        }

        #printDocument {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
        }

        .a4-page {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
        }

        .a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }

        .document-table {
            width: 100% !important;
            border-collapse: collapse !important;
        }

        .document-table th,
        .document-table td {
            border: 1px solid #000 !important;
        }

        .doc-input {
            color: #000 !important;
            background: transparent !important;
        }
    </style>
</head>
<body>
    ${clonedDocument.outerHTML}
</body>
</html>`);
        iframeDocument.close();

        const waitForImages = async () => {
            const images = Array.from(iframeDocument.images || []);

            await Promise.all(
                images.map(
                    (image) =>
                        image.complete
                            ? Promise.resolve()
                            : new Promise((resolve) => {
                                  image.addEventListener("load", resolve, {
                                      once: true,
                                  });
                                  image.addEventListener("error", resolve, {
                                      once: true,
                                  });
                              })
                )
            );

            if (iframeDocument.fonts?.ready) {
                try {
                    await iframeDocument.fonts.ready;
                } catch {
                    // Continue printing even if a web font fails to load.
                }
            }
        };

        const cleanup = () => {
            setTimeout(() => {
                iframe.remove();
            }, 500);
        };

        let printStarted = false;

        const printFromFrame = async () => {
            if (printStarted) return;
            printStarted = true;

            try {
                await waitForImages();
            } catch {
                // Do not block printing because of optional assets.
            }

            iframeWindow.focus();

            iframeWindow.addEventListener("afterprint", cleanup, {
                once: true,
            });

            setTimeout(() => {
                iframeWindow.print();
            }, 100);
        };

        if (iframeDocument.readyState === "complete") {
            printFromFrame();
        } else {
            iframeWindow.addEventListener("load", printFromFrame, {
                once: true,
            });

            /* srcdoc/document.write can complete without a load event. */
            setTimeout(() => {
                printFromFrame();
            }, 300);
        }
    };

    /* =====================================================
       DOCUMENT PREVIEW
       ===================================================== */

    const PrintPreview = () => {
        if (!selectedStandard) {
            return (
                <div className="preview-empty">
                    <div className="preview-empty-icon">
                        ☷
                    </div>

                    <h3>
                        प्रपत्र पूर्वावलोकन
                    </h3>

                    <p>
                        ऊपर से फल पौध का
                        मानक चुनें। चयन करते
                        ही यहाँ A4 प्रपत्र
                        स्वतः तैयार होगा।
                    </p>
                </div>
            );
        }

        const digits =
            Number(bill.rounding);

        return (
            <div
                className="document-area"
                id="printDocument"
            >
                {/* =================================================
                    PAGE 1
                   ================================================= */}

                <div className="a4-page">
                    <div className="treasury-copy">
                        कोषागार प्रति
                    </div>

                    <div className="document-center document-title-small">
                        कार्यालय उद्यान विशेषज्ञ, कोटद्वार गढ़वाल
                    </div>

                    <div className="document-center document-title">
                        जिला योजनान्तर्गत उद्यान स्थापना — वर्ष{" "}
                        {financialYear} &nbsp;(बिल)
                    </div>

                    <div className="document-line">
                        जाति{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="caste"
                            className="w-160"
                        />

                       
                    </div>

                    <div className="document-line">
                        नाम कृषक{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="farmer_name"
                            className="w-220"
                        />

                        <span>
                            पिता/पति का नाम
                        </span>

                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="father_husband_name"
                            className="w-220"
                        />
                    </div>

                    <div className="document-line">
                        जन्म तिथि{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="date_of_birth"
                            className="w-110"
                        />

                        <span>ग्राम</span>

                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="village"
                            className="w-150"
                        />

                        <span>
                            उद्यान सचल दल केन्द्र
                        </span>

                        <CenterSelect
                            bill={bill}
                            onChange={updateBill}
                            centers={centers}
                            loading={loadingCenters}
                            className="w-150"
                        />
                    </div>

                    <div className="document-line">
                        रोपित पौधों की संख्या{" "}
                        <strong>
                            {calculation.plants}
                        </strong>

                        <span>
                            क्षेत्रफल है0{" "}
                        </span>

                        <strong>
                            {num(
                                bill.area
                            ).toFixed(2)}
                        </strong>

                        <span>
                            &nbsp; फल पौध का नाम{" "}
                        </span>

                        <strong>
                            {
                                selectedStandard.crop_name
                            }
                        </strong>

                        <span>
                            &nbsp;(दूरी{" "}
                            {
                                selectedStandard.spacing
                            }
                            )
                        </span>
                    </div>

                    <div className="document-line">
                        (1) बैंक का नाम व शाखा{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="bank_name_1"
                            className="w-200"
                        />

                        <span>
                            खाता संख्या
                        </span>

                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="account_number_1"
                            className="w-150"
                        />
                    </div>

                    <div className="document-line indent">
                        आई0एफ0एस0सी0 कोड{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="ifsc_code_1"
                            className="w-150"
                        />
                    </div>

                  

                    <div className="document-line">
                        आधार कार्ड सं0 (बारह अंकों का){" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="aadhaar_number"
                            className="w-220"
                        />
                    </div>

                    <div className="document-line">
                        मोबाइल नम्बर{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="mobile_number"
                            className="w-150"
                        />

                        <span>
                            पैन नम्बर
                        </span>

                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="pan_number"
                            className="w-150"
                        />
                    </div>

                    <table className="document-table bill-table">
                        <thead>
                            <tr>
                                <th rowSpan="2">
                                    क्र0
                                    <br />
                                    सं0
                                </th>

                                <th rowSpan="2">
                                    कार्य/मद का विवरण
                                </th>

                                <th rowSpan="2">
                                    मात्रा/सं0
                                </th>

                                <th colSpan="3">
                                    व्यय का विवरण
                                    <br />
                                    (क्षेत्रफल{" "}
                                    {num(
                                        bill.area
                                    ).toFixed(2)}{" "}
                                    है0 हेतु)
                                </th>
                            </tr>

                            <tr>
                                <th>
                                    कुल व्यय
                                </th>

                                <th>
                                    देय राजसहायता
                                </th>

                                <th>
                                    कृषक अंश
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td className="center">
                                    1
                                </td>

                                <td>
                                    गोबर खाद/जैविक एवं वर्मी
                                    कम्पोस्ट/अन्य पोषक
                                    तत्व/पौध सुरक्षा/रोपण
                                    सिंचाई आदि (कु0)
                                    @ रु0{" "}
                                    {
                                        selectedStandard.manure_rate
                                    }{" "}
                                    प्रति कु0
                                </td>

                                <td className="center">
                                    {
                                        calculation.manureQuantity
                                    }{" "}
                                    कु0
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.manureTotal,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.manureSubsidy,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.manureFarmer,
                                        digits
                                    )}
                                </td>
                            </tr>

                            <tr>
                                <td className="center">
                                    2
                                </td>

                                <td>
                                    गड्ढा खुदान, भरान,
                                    पौध रोपण
                                    (1×1×1 मी0)
                                    @ रु0{" "}
                                    {
                                        selectedStandard.pit_rate
                                    }{" "}
                                    प्रति गड्ढा
                                </td>

                                <td className="center">
                                    {
                                        calculation.plants
                                    }{" "}
                                    गड्ढा
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.pitTotal,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.pitSubsidy,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.pitFarmer,
                                        digits
                                    )}
                                </td>
                            </tr>

                            <tr className="total-row">
                                <td
                                    colSpan="3"
                                    className="right"
                                >
                                    योग :-
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.billTotal,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.billSubsidy,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.billFarmer,
                                        digits
                                    )}
                                </td>
                            </tr>

                            <tr>
                                <td className="center">
                                    —
                                </td>

                                <td className="small-text">
                                    फल पौध की लागत
                                    (
                                    {
                                        selectedStandard.spacing
                                    }
                                    )
                                    @ रु0{" "}
                                    {
                                        selectedStandard.plant_rate
                                    }{" "}
                                    प्रति पौध —
                                    विभाग द्वारा पौध
                                    के रूप में आपूर्ति
                                    (नगद देय नहीं)
                                </td>

                                <td className="center">
                                    {
                                        calculation.plants
                                    }
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.plantTotal,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.plantSubsidy,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹0
                                </td>
                            </tr>

                            <tr className="grand-row">
                                <td
                                    colSpan="3"
                                    className="right"
                                >
                                    महायोग
                                    (मानकानुसार) :-
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.grandTotal,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.grandSubsidy,
                                        digits
                                    )}
                                </td>

                                <td className="money">
                                    ₹
                                    {formatMoney(
                                        calculation.billFarmer,
                                        digits
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p className="document-paragraph">
                        प्रमाणित किया जाता है कि मेरे द्वारा{" "}
                        <strong>
                            {num(
                                bill.area
                            ).toFixed(2)}
                        </strong>{" "}
                        है0 क्षेत्रफल में{" "}
                        <strong>
                            {
                                selectedStandard.crop_name
                            }
                        </strong>{" "}
                        उद्यान लगाने हेतु मु0 रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.billTotal,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.billTotal
                            )
                        }
                        ) की धनराशि का कुल व्यय
                        किया गया है, अतः कार्य
                        योजना के अनुसार क्र0 सं0
                        1 व 2 की धनराशि मु0 रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.billSubsidy,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.billSubsidy
                            )
                        }
                        ) राजसहायता का भुगतान
                        मुझे करने की कृपा करेंगे।
                    </p>

                    <div className="signature-block">
                        हस्ताक्षर कृषक
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="farmer_name"
                            className="signature-input"
                        />

                        <br />

                        कृषक का नाम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="farmer_name"
                            className="signature-input"
                        />

                        <br />

                        पिता/पति का नाम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="father_husband_name"
                            className="signature-input"
                        />

                        <br />

                        ग्राम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="village"
                            className="signature-input"
                        />
                    </div>

                    <p className="document-paragraph">
                        प्रमाणित किया जाता है कि
                        कृषक द्वारा उक्तानुसार{" "}
                        <strong>
                            {num(
                                bill.area
                            ).toFixed(2)}
                        </strong>{" "}
                        है0 उद्यान लगाने हेतु{" "}
                        <strong>
                            {
                                calculation.plants
                            }
                        </strong>{" "}
                        पौधों का रोपण किया गया
                        है, जिसका मेरे द्वारा
                        स्थलीय सत्यापन कर दिया
                        गया है। अतः कृषक को योजना
                        अनुसार मु0 रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.billSubsidy,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.billSubsidy
                            )
                        }
                        ) का अनुदान भुगतान करने की
                        संस्तुति की जाती है।
                    </p>

                    <div className="officer-sign">
                        प्रभारी
                        <br />
                        उद्यान सचल दल
                        <br />
                        केन्द्र{" "}
                        <CenterAutoFill
                            bill={bill}
                            className="officer-input"
                        />
                    </div>
                </div>

                {/* =================================================
                    PAGE 2
                   ================================================= */}

                <div className="a4-page">
                    <div className="document-center document-title">
                        कृषक अंश वाउचर सं0 - 1
                    </div>

                    <div className="document-center document-title-small">
                        गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/
                        अन्य पोषक तत्व आदि
                    </div>

                    <div className="document-center document-line">
                        फल पौध :{" "}
                        <strong>
                            {
                                selectedStandard.crop_name
                            }
                        </strong>

                        &nbsp;&nbsp;

                        क्षेत्रफल :{" "}
                        <strong>
                            {num(
                                bill.area
                            ).toFixed(2)}
                        </strong>{" "}
                        है0

                        &nbsp;&nbsp;

                        वर्ष :{" "}
                        <strong>
                            {financialYear}
                        </strong>
                    </div>

                    <p className="document-paragraph large-gap">
                        मु0 रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.manureTotal,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.manureTotal
                            )
                        }
                        ) बावत गोबर खाद/जैविक एवं
                        वर्मी कम्पोस्ट/अन्य पोषक
                        तत्व आदि का भुगतान रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.manureTotal,
                                digits
                            )}
                        </strong>{" "}
                        श्री{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="farmer_name"
                            className="inline-document-input"
                        />{" "}
                        पुत्र श्री{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="father_husband_name"
                            className="inline-document-input"
                        />{" "}
                        ग्राम{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="village"
                            className="inline-document-input"
                        />{" "}
                        से नगद प्राप्त किया।
                    </p>

                    <div className="signature-block">
                        हस्ताक्षर आपूर्ति कर्ता
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_name"
                            className="signature-input"
                        />

                        <br />

                        आपूर्ति कर्ता का नाम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_name"
                            className="signature-input"
                        />

                        <br />

                        पिता/पति का नाम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_father_name"
                            className="signature-input"
                        />

                        <br />

                        ग्राम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_village"
                            className="signature-input"
                        />
                    </div>

                    <p className="document-paragraph large-gap">
                        प्रमाणित किया जाता है कि
                        मेरे द्वारा श्री{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_name"
                            className="inline-document-input"
                        />{" "}
                        पुत्र श्री{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_father_name"
                            className="inline-document-input"
                        />{" "}
                        ग्राम{" "}
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="supplier_village"
                            className="inline-document-input"
                        />{" "}
                        को{" "}
                        <strong>
                            {num(
                                bill.area
                            ).toFixed(2)}
                        </strong>{" "}
                        है0 में गोबर खाद/जैविक
                        एवं वर्मी कम्पोस्ट/अन्य
                        पोषक तत्व आदि हेतु मु0
                        रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.manureTotal,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.manureTotal
                            )
                        }
                        ) का नगद भुगतान किया गया
                        है। अतः राजसहायता का भुगतान
                        रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.manureSubsidy,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.manureSubsidy
                            )
                        }
                        ) मुझे करने की कृपा कीजियेगा।
                    </p>

                    <div className="signature-block">
                        हस्ताक्षर कृषक
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="farmer_name"
                            className="signature-input"
                        />

                        <br />

                        कृषक का नाम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="farmer_name"
                            className="signature-input"
                        />

                        <br />

                        पिता/पति का नाम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="father_husband_name"
                            className="signature-input"
                        />

                        <br />

                        ग्राम
                        <DocField
                            bill={bill}
                            onChange={updateBill}
                            field="village"
                            className="signature-input"
                        />
                    </div>

                    <p className="document-paragraph large-gap">
                        प्रमाणित किया जाता है कि
                        कृषक श्री{" "}
                        <strong>
                            {bill.farmer_name ||
                                "________"}
                        </strong>{" "}
                        पुत्र श्री{" "}
                        <strong>
                            {bill.father_husband_name ||
                                "________"}
                        </strong>{" "}
                        ग्राम{" "}
                        <strong>
                            {bill.village ||
                                "________"}
                        </strong>{" "}
                        द्वारा{" "}
                        <strong>
                            {
                                calculation.manureQuantity
                            }
                        </strong>{" "}
                        गोबर खाद/जैविक एवं
                        वर्मी कम्पोस्ट/अन्य पोषक
                        तत्व आदि का कार्य किया
                        गया है, जिसका स्थलीय
                        सत्यापन मेरे द्वारा कर
                        दिया गया है। अतः राजसहायता
                        रु0{" "}
                        <strong>
                            {formatMoney(
                                calculation.manureSubsidy,
                                digits
                            )}
                        </strong>{" "}
                        (
                        {
                            amountToHindiWords(
                                calculation.manureSubsidy
                            )
                        }
                        ) का भुगतान करने की
                        संस्तुति की जाती है।
                    </p>

                    <div className="officer-sign">
                        प्रभारी
                        <br />
                        उद्यान सचल दल
                        <br />
                        केन्द्र{" "}
                        <CenterAutoFill
                            bill={bill}
                            className="officer-input"
                        />
                    </div>
                </div>

                {/* =================================================
                    PAGE 3
                   ================================================= */}

                {showVoucher2 && (
                    <div className="a4-page">
                        <div className="document-center document-title">
                            कृषक अंश वाउचर सं0 - 2
                        </div>

                        <div className="document-center document-title-small">
                            गड्ढा खुदान, भरान, पौध रोपण
                            (1×1×1 मी0)
                        </div>

                        <div className="document-center document-line">
                            फल पौध :{" "}
                            <strong>
                                {
                                    selectedStandard.crop_name
                                }
                            </strong>

                            &nbsp;&nbsp;

                            क्षेत्रफल :{" "}
                            <strong>
                                {num(
                                    bill.area
                                ).toFixed(2)}
                            </strong>{" "}
                            है0

                            &nbsp;&nbsp;

                            वर्ष :{" "}
                            <strong>
                                {financialYear}
                            </strong>
                        </div>

                        <p className="document-paragraph large-gap">
                            मु0 रु0{" "}
                            <strong>
                                {formatMoney(
                                    calculation.pitTotal,
                                    digits
                                )}
                            </strong>{" "}
                            (
                            {
                                amountToHindiWords(
                                    calculation.pitTotal
                                )
                            }
                            ) बावत गड्ढा खुदान,
                            भरान, पौध रोपण
                            (1×1×1 मी0) का भुगतान
                            रु0{" "}
                            <strong>
                                {formatMoney(
                                    calculation.pitTotal,
                                    digits
                                )}
                            </strong>{" "}
                            श्री{" "}
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="farmer_name"
                                className="inline-document-input"
                            />{" "}
                            पुत्र श्री{" "}
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="father_husband_name"
                                className="inline-document-input"
                            />{" "}
                            ग्राम{" "}
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="village"
                                className="inline-document-input"
                            />{" "}
                            से नगद प्राप्त किया।
                        </p>

                        <div className="signature-block">
                            हस्ताक्षर श्रमिक
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="labour_name"
                                className="signature-input"
                            />

                            <br />

                            श्रमिक का नाम
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="labour_name"
                                className="signature-input"
                            />

                            <br />

                            पिता/पति का नाम
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="labour_father_name"
                                className="signature-input"
                            />

                            <br />

                            ग्राम
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="labour_village"
                                className="signature-input"
                            />
                        </div>

                        <p className="document-paragraph large-gap">
                            प्रमाणित किया जाता है
                            कि मेरे द्वारा श्री{" "}
                            <strong>
                                {bill.labour_name ||
                                    "________"}
                            </strong>{" "}
                            पुत्र श्री{" "}
                            <strong>
                                {bill.labour_father_name ||
                                    "________"}
                            </strong>{" "}
                            ग्राम{" "}
                            <strong>
                                {bill.labour_village ||
                                    "________"}
                            </strong>{" "}
                            को{" "}
                            <strong>
                                {num(
                                    bill.area
                                ).toFixed(2)}
                            </strong>{" "}
                            है0 में गड्ढा खुदान,
                            भरान, पौध रोपण
                            (1×1×1 मी0) हेतु
                            मु0 रु0{" "}
                            <strong>
                                {formatMoney(
                                    calculation.pitTotal,
                                    digits
                                )}
                            </strong>{" "}
                            (
                            {
                                amountToHindiWords(
                                    calculation.pitTotal
                                )
                            }
                            ) का नगद भुगतान किया
                            गया है।
                        </p>

                        <div className="signature-block">
                            हस्ताक्षर कृषक
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="farmer_name"
                                className="signature-input"
                            />

                            <br />

                            कृषक का नाम
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="farmer_name"
                                className="signature-input"
                            />

                            <br />

                            पिता/पति का नाम
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="father_husband_name"
                                className="signature-input"
                            />

                            <br />

                            ग्राम
                            <DocField
                                bill={bill}
                                onChange={updateBill}
                                field="village"
                                className="signature-input"
                            />
                        </div>

                    <div className="officer-sign">
                        प्रभारी
                        <br />
                        उद्यान सचल दल
                        <br />
                        केन्द्र{" "}
                        <CenterAutoFill
                            bill={bill}
                            className="officer-input"
                        />
                    </div>
                    </div>
                )}

                {/* =================================================
                    STANDARD PRINT PAGE
                   ================================================= */}

                {includeStandardPrint && (
                    <div className="a4-page">
                        <div className="document-center document-title">
                            फसलवार मानक तालिका
                        </div>

                        <div className="document-center document-title-small">
                            वित्तीय वर्ष {financialYear}
                        </div>

                        <table className="standard-table">
                            <thead>
                                <tr>
                                    <th>
                                        क्र0 सं0
                                    </th>
                                    <th>
                                        फल पौध / फसल
                                    </th>
                                    <th>
                                        दूरी
                                    </th>
                                    <th>
                                        पौध संख्या
                                    </th>
                                    <th>
                                        पौध दर
                                    </th>
                                    <th>
                                        गड्ढा दर
                                    </th>
                                    <th>
                                        खाद दर
                                    </th>
                                    <th>
                                        महायोग
                                    </th>
                                    <th>
                                        राजसहायता
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {standards.map(
                                    (
                                        standard,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                standard.id
                                            }
                                        >
                                            <td className="center">
                                                {index +
                                                    1}
                                            </td>

                                            <td>
                                                {
                                                    standard.crop_name
                                                }
                                            </td>

                                            <td className="center">
                                                {
                                                    standard.spacing
                                                }
                                            </td>

                                            <td className="center">
                                                {
                                                    standard.plants_per_hectare
                                                }
                                            </td>

                                            <td className="money">
                                                ₹
                                                {
                                                    standard.plant_rate
                                                }
                                            </td>

                                            <td className="money">
                                                ₹
                                                {
                                                    standard.pit_rate
                                                }
                                            </td>

                                            <td className="money">
                                                ₹
                                                {
                                                    standard.manure_rate
                                                }
                                            </td>

                                            <td className="money">
                                                ₹
                                                {
                                                    standard.standard_total
                                                }
                                            </td>

                                            <td className="money">
                                                ₹
                                                {
                                                    standard.standard_subsidy
                                                }
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    /* =====================================================
       STANDARDS MANAGER
       ===================================================== */

    const StandardsManager = () => {
        const saveInlineStandard = async (id, draft) => {
            const total = num(draft.standard_total);
            const subsidy = num(draft.standard_subsidy);

            if (!String(draft.crop_name || "").trim()) {
                throw new Error("फसल का नाम दर्ज करें।");
            }
            if (!String(draft.spacing || "").trim()) {
                throw new Error("दूरी दर्ज करें।");
            }
            if (subsidy > total) {
                throw new Error("राजसहायता मानक महायोग से अधिक नहीं हो सकती।");
            }

            const payload = {
                financial_year: String(draft.financial_year || financialYear).trim(),
                crop_name: String(draft.crop_name || "").trim(),
                spacing: String(draft.spacing || "").trim(),
                plants_per_hectare: num(draft.plants_per_hectare),
                plant_rate: num(draft.plant_rate),
                pit_rate: num(draft.pit_rate),
                manure_rate: num(draft.manure_rate),
                manure_quantity: num(draft.manure_quantity),
                standard_total: total,
                standard_subsidy: subsidy,
                is_active: draft.is_active !== false,
            };

            const response = await apiFetch(
                `${API_BASE}/crop-standards/${id}/`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await readJsonResponse(response);
            if (!response.ok) {
                const error =
                    data?.detail ||
                    data?.error ||
                    Object.values(data || {}).flat().join(" ");
                throw new Error(error || "मानक सेव नहीं हो सका।");
            }

            await loadStandards();
            setMessage("मानक सफलतापूर्वक अपडेट किया गया।");
        };

        const StandardEditorCard = ({ standard, index }) => {
            const [draft, setDraft] = useState({ ...standard });
            const [saving, setSaving] = useState(false);

            useEffect(() => {
                setDraft({ ...standard });
            }, [standard]);

            const update = (field, value) => {
                setDraft((previous) => ({ ...previous, [field]: value }));
            };

            const calculated = useMemo(() => {
                const plants = Math.max(0, Math.round(num(draft.plants_per_hectare)));
                const pRate = num(draft.plant_rate);
                const pitRate = num(draft.pit_rate);
                const manRate = num(draft.manure_rate);
                const stdTotal = num(draft.standard_total);
                const stdSub = num(draft.standard_subsidy);

                const plantTotal = plants * pRate;
                const pitTotal = plants * pitRate;
                let manureTotal;
                let manureQty;

                if (draft.manAuto !== false) {
                    manureTotal = Math.max(0, stdTotal - plantTotal - pitTotal);
                    manureQty = manRate > 0 ? manureTotal / manRate : 0;
                } else {
                    manureQty = Math.max(0, num(draft.manure_quantity));
                    manureTotal = manureQty * manRate;
                }

                const plantSubsidy = Math.min(plantTotal, stdSub);
                const manureSubsidy = Math.min(
                    manureTotal,
                    Math.max(0, stdSub - plantSubsidy)
                );
                const manureFarmer = Math.max(0, manureTotal - manureSubsidy);
                const pitFarmer = pitTotal;
                const total = plantTotal + pitTotal + manureTotal;
                const subsidy = plantSubsidy + manureSubsidy;
                const farmer = pitFarmer + manureFarmer;

                return {
                    plants,
                    plantTotal,
                    plantSubsidy,
                    pitTotal,
                    pitFarmer,
                    manureQty,
                    manureTotal,
                    manureSubsidy,
                    manureFarmer,
                    total,
                    subsidy,
                    farmer,
                };
            }, [draft]);

            const isMatched =
                Math.abs(calculated.total - num(draft.standard_total)) < 0.51 &&
                Math.abs(calculated.subsidy - num(draft.standard_subsidy)) < 0.51;

            const save = async () => {
                setSaving(true);
                try {
                    await saveInlineStandard(standard.id, draft);
                } catch (error) {
                    alert(error.message || "मानक सेव नहीं हो सका।");
                } finally {
                    setSaving(false);
                }
            };

            return (
                <div className="standard-card">
                    <div className="standard-card-header standard-card-header-editable">
                        <div className="standard-title standard-title-editable">
                            <span>{index + 1}.</span>
                            <input
                                className="standard-crop-name-input"
                                value={draft.crop_name ?? ""}
                                onChange={(e) => update("crop_name", e.target.value)}
                            />
                            <span className="standard-inline-label">दूरी</span>
                            <input
                                className="standard-top-input spacing-input"
                                value={draft.spacing ?? ""}
                                onChange={(e) => update("spacing", e.target.value)}
                            />
                            <span className="standard-inline-label">मानक महायोग</span>
                            <input
                                className="standard-top-input money-input"
                                inputMode="decimal"
                                value={draft.standard_total ?? ""}
                                onChange={(e) => update("standard_total", e.target.value)}
                            />
                            <span className="standard-inline-label">देय राजसहायता</span>
                            <input
                                className="standard-top-input money-input"
                                inputMode="decimal"
                                value={draft.standard_subsidy ?? ""}
                                onChange={(e) => update("standard_subsidy", e.target.value)}
                            />
                        </div>

                        <div className="standard-card-actions">
                            <span className={isMatched ? "match-badge" : "warning-badge"}>
                                {isMatched
                                    ? "मिलान सही ✓"
                                    : `अन्तर : योग ${formatMoney(calculated.total, 2)} / मानक ${formatMoney(num(draft.standard_total), 2)}`}
                            </span>
                            <button
                                type="button"
                                className="edit-button"
                                onClick={save}
                                disabled={saving}
                            >
                                {saving ? "सेव..." : "सेव करें"}
                            </button>
                            <button
                                type="button"
                                className="delete-button"
                                onClick={() => deleteStandard(standard.id)}
                            >
                                हटाएँ
                            </button>
                        </div>
                    </div>

                    <div className="standard-table-wrapper">
                        <table className="standard-calc-table">
                            <thead>
                                <tr>
                                    <th>क्र0</th>
                                    <th>कार्य/मद विवरण</th>
                                    <th>मात्रा</th>
                                    <th>दर प्रति</th>
                                    <th>कुल व्यय</th>
                                    <th>देय राजसहायता</th>
                                    <th>कृषक अंश</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="center">1</td>
                                    <td>फल पौध की लागत ({draft.spacing || "—"})</td>
                                    <td>
                                        <input
                                            className="standard-cell-input"
                                            type="number"
                                            min="0"
                                            value={draft.plants_per_hectare ?? ""}
                                            onChange={(e) => update("plants_per_hectare", e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            className="standard-cell-input"
                                            inputMode="decimal"
                                            value={draft.plant_rate ?? ""}
                                            onChange={(e) => update("plant_rate", e.target.value)}
                                        />
                                    </td>
                                    <td className="money">{formatMoney(calculated.plantTotal, 2)}</td>
                                    <td className="money">{formatMoney(calculated.plantSubsidy, 2)}</td>
                                    <td className="money">0.00</td>
                                </tr>

                                <tr>
                                    <td className="center">2</td>
                                    <td>गड्ढा खुदान, भरान, पौध रोपण (1×1×1 मी0)</td>
                                    <td className="center">{calculated.plants}</td>
                                    <td>
                                        <input
                                            className="standard-cell-input"
                                            inputMode="decimal"
                                            value={draft.pit_rate ?? ""}
                                            onChange={(e) => update("pit_rate", e.target.value)}
                                        />
                                    </td>
                                    <td className="money">{formatMoney(calculated.pitTotal, 2)}</td>
                                    <td className="money">0.00</td>
                                    <td className="money">{formatMoney(calculated.pitFarmer, 2)}</td>
                                </tr>

                                <tr>
                                    <td className="center">3</td>
                                    <td>
                                        गोबर खाद/जैविक एवं वर्मी कम्पोस्ट/पोषक तत्व/पौध सुरक्षा/रोपण सिंचाई
                                        <label className="auto-qty-label">
                                            <input
                                                type="checkbox"
                                                checked={draft.manAuto !== false}
                                                onChange={(e) => update("manAuto", e.target.checked)}
                                            />
                                            मात्रा स्वतः
                                        </label>
                                    </td>
                                    <td>
                                        <input
                                            className="standard-cell-input"
                                            inputMode="decimal"
                                            value={formatMoney(calculated.manureQty, 2)}
                                            disabled={draft.manAuto !== false}
                                            onChange={(e) => update("manure_quantity", e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            className="standard-cell-input"
                                            inputMode="decimal"
                                            value={draft.manure_rate ?? ""}
                                            onChange={(e) => update("manure_rate", e.target.value)}
                                        />
                                    </td>
                                    <td className="money">{formatMoney(calculated.manureTotal, 2)}</td>
                                    <td className="money">{formatMoney(calculated.manureSubsidy, 2)}</td>
                                    <td className="money">{formatMoney(calculated.manureFarmer, 2)}</td>
                                </tr>

                                <tr className="standard-sum-row">
                                    <td colSpan="4" className="right">योग :-</td>
                                    <td className="money">{formatMoney(calculated.total, 2)}</td>
                                    <td className="money">{formatMoney(calculated.subsidy, 2)}</td>
                                    <td className="money">{formatMoney(calculated.farmer, 2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        };

        return (
            <details className="standards-section">
                <summary>मानक तालिका — फसलवार, सम्पादन योग्य</summary>
                <div className="standards-manager">
                    <div className="standards-toolbar">
                    <div>
                        <h2>मानक तालिका</h2>
                        <p>
                            फसलवार मानक डेटाबेस से आते हैं। पीले खानों में मान बदलने पर नीचे की गणना तुरन्त बदलती है।
                        </p>
                    </div>
                    <button type="button" className="green-button" onClick={openAddStandard}>
                        + नई फसल जोड़ें
                    </button>
                    </div>

                    {loadingStandards ? (
                    <div className="loading-box">मानक लोड हो रहे हैं...</div>
                ) : standards.length === 0 ? (
                    <div className="no-standards">
                        <div className="no-standard-icon">+</div>
                        <h3>अभी कोई मानक दर्ज नहीं है</h3>
                        <p>पहले डेटाबेस में फसल का मानक जोड़ें।</p>
                        <button type="button" className="green-button" onClick={openAddStandard}>
                            पहला मानक जोड़ें
                        </button>
                    </div>
                ) : (
                    <div className="standards-scroll">
                        {standards.map((standard, index) => (
                            <StandardEditorCard
                                key={standard.id}
                                standard={standard}
                                index={index}
                            />
                        ))}
                    </div>
                    )}
                </div>
            </details>
        );
    };

    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <div className="udyan-app">
            {/* =================================================
                CONTROL PANEL
               ================================================= */}

            <div className="control-panel">
                <div className="control-heading">
                    <div>
                        <div className="control-eyebrow">
                            उद्यान विभाग
                        </div>

                        <h1>
                            उद्यान बिल एवं कृषक अंश वाउचर
                        </h1>

                        <p>
                            स्वतः गणना प्रपत्र —
                            उपयोगकर्ता द्वारा दर्ज
                            फसल मानक
                        </p>
                    </div>

                    <div className="panel-year">
                        <span>
                            वर्ष
                        </span>

                        <strong>
                            {financialYear}
                        </strong>
                    </div>
                </div>

                <div className="control-tabs">
                    <button
                        type="button"
                        className={
                            activeSection ===
                            "bill"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveSection(
                                "bill"
                            )
                        }
                    >
                        बिल प्रपत्र
                    </button>

                    <button
                        type="button"
                        className={
                            activeSection ===
                            "standards"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveSection(
                                "standards"
                            )
                        }
                    >
                        मानक तालिका
                    </button>

                    <button
                        type="button"
                        className={activeSection === "bills" ? "active" : ""}
                        onClick={() => setActiveSection("bills")}
                    >
                        अपलोड किए गए बिल
                    </button>
                </div>

                {activeSection === "bills" ? (
                    <div className="panel-content">
                        <UploadedBillsManager />
                    </div>
                ) : activeSection === "standards" ? (
                    <div className="panel-content">
                        <div className="year-selector-row">
                            <label>
                                <span>
                                    वर्ष
                                </span>

                                <input
                                    value={
                                        financialYear
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setFinancialYear(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <StandardsManager />
                    </div>
                ) : (
                    <>
                        {/* =================================================
                            QUICK CONTROLS
                           ================================================= */}

                        <div className="quick-controls">
                            <label className="control-field crop-field">
                                <span>
                                    फल पौध
                                </span>

                                <select
                                    value={
                                        selectedCropId
                                    }
                                    onChange={
                                        handleCropChange
                                    }
                                >
                                    <option value="">
                                        — फल पौध चुनें —
                                    </option>

                                    {standards.map(
                                        (
                                            standard
                                        ) => (
                                            <option
                                                key={
                                                    standard.id
                                                }
                                                value={
                                                    standard.id
                                                }
                                            >
                                                {
                                                    standard.crop_name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label className="control-field">
                                <span>
                                    क्षेत्रफल है0
                                    (सीधे अंकों में लिखें)
                                </span>

                                <input
                                    value={
                                        bill.area
                                    }
                                    inputMode="decimal"
                                    onChange={(
                                        event
                                    ) =>
                                        updateBill(
                                            "area",
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="जैसे 0.125"
                                />
                            </label>

                            <label className="control-field">
                                <span>
                                    पौध संख्या
                                    (स्वतः / बदल सकते हैं)
                                </span>

                                <input
                                    type="number"
                                    value={
                                        bill.calculation_basis ===
                                        "area"
                                            ? calculation.plants
                                            : bill.plants
                                    }
                                    disabled={
                                        bill.calculation_basis ===
                                        "area"
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateBill(
                                            "plants",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className="control-field">
                                <span>
                                    गणना का आधार
                                </span>

                                <select
                                    value={
                                        bill.calculation_basis
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateBill(
                                            "calculation_basis",
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="area">
                                        क्षेत्रफल के अनुपात में
                                        (मानक)
                                    </option>

                                    <option value="plant">
                                        वास्तविक पौध संख्या
                                        के अनुसार
                                    </option>
                                </select>
                            </label>

                            <label className="control-field">
                                <span>
                                    राशि
                                </span>

                                <select
                                    value={
                                        bill.rounding
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateBill(
                                            "rounding",
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="2">
                                        पैसे सहित
                                        (2 दशमलव)
                                    </option>

                                    <option value="0">
                                        पूर्णांक रुपये में
                                    </option>
                                </select>
                            </label>

                            <label className="control-field">
                                <span>
                                    वर्ष
                                </span>

                                <input
                                    value={
                                        financialYear
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setFinancialYear(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className="control-field">
                                <span>
                                    वाउचर सं0-2
                                </span>

                                <select
                                    value={
                                        showVoucher2
                                            ? "yes"
                                            : "no"
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setShowVoucher2(
                                            event.target
                                                .value ===
                                                "yes"
                                        )
                                    }
                                >
                                    <option value="no">
                                        न दें
                                    </option>

                                    <option value="yes">
                                        दें
                                    </option>
                                </select>
                            </label>
                        </div>

                        

                        {/* =================================================
                            ACTIONS
                           ================================================= */}

                        <div className="action-row">
                            {editingBillId !== null && (
                                <span
                                    style={{
                                        fontSize: "11px",
                                        color: "#7a4b00",
                                        fontWeight: 700,
                                        marginRight: "4px",
                                    }}
                                >
                                    बिल #{editingBillId} संपादन मोड
                                </span>
                            )}

                            <button
                                type="button"
                                className="green-button"
                                onClick={printBill}
                            >
                                प्रिंट / PDF
                            </button>

                            <button
                                type="button"
                                className="outline-button"
                                onClick={saveBill}
                                disabled={savingBill}
                            >
                                {savingBill
                                    ? (
                                        editingBillId !== null
                                            ? "अपडेट हो रहा है..."
                                            : "सेव हो रहा है..."
                                      )
                                    : (
                                        editingBillId !== null
                                            ? "बिल अपडेट करें"
                                            : "बिल सेव करें"
                                      )}
                            </button>

                            <label className="print-check">
                                <input
                                    type="checkbox"
                                    checked={
                                        includeStandardPrint
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setIncludeStandardPrint(
                                            event.target
                                                .checked
                                        )
                                    }
                                />

                                प्रिंट में मानक
                                तालिका का पृष्ठ
                                जोड़ें
                            </label>

                            <button
                                type="button"
                                className="warning-button"
                                onClick={
                                    resetBill
                                }
                            >
                                रीसेट
                            </button>
                        </div>

                        {/* =================================================
                            LIVE TALLY
                           ================================================= */}

                        {selectedStandard && (
                            <div className="live-tally">
                                <div>
                                    <span>
                                        महायोग
                                    </span>

                                    <strong>
                                        ₹
                                        {formatMoney(
                                            calculation.grandTotal,
                                            Number(
                                                bill.rounding
                                            )
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        कुल राजसहायता
                                    </span>

                                    <strong>
                                        ₹
                                        {formatMoney(
                                            calculation.grandSubsidy,
                                            Number(
                                                bill.rounding
                                            )
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        कृषक अंश
                                    </span>

                                    <strong>
                                        ₹
                                        {formatMoney(
                                            calculation.billFarmer,
                                            Number(
                                                bill.rounding
                                            )
                                        )}
                                    </strong>
                                </div>

                                <div className="tally-status">
                                    लेखा मिलान सही ✓
                                </div>
                            </div>
                        )}

                        {/* =================================================
                            QUICK STANDARD TABLE
                           ================================================= */}

                        <StandardsManager />
                    </>
                )}
            </div>

            {/* =========================================================
                MESSAGE
               ========================================================= */}

            {message && (
                <div className="toast-message">
                    <span>
                        {message}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setMessage("")
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            {/* =========================================================
                LIVE PREVIEW
               ========================================================= */}

            {activeSection === "bill" && (
                <main className="preview-wrapper">
                    <div className="preview-heading">
                        <div>
                            <span>
                                LIVE PREVIEW
                            </span>

                            <h2>
                                प्रपत्र पूर्वावलोकन
                            </h2>
                        </div>

                        {selectedStandard && (
                            <div className="preview-meta">
                                <span>
                                    फसल
                                </span>

                                <strong>
                                    {
                                        selectedStandard.crop_name
                                    }
                                </strong>

                                <span>
                                    वर्ष
                                </span>

                                <strong>
                                    {financialYear}
                                </strong>
                            </div>
                        )}
                    </div>

                    {PrintPreview()}
                </main>
            )}

            {/* =========================================================
                STANDARD MODAL
               ========================================================= */}

            {showStandardModal && (
                <div
                    className="modal-backdrop"
                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeStandardModal();
                        }
                    }}
                >
                    <div className="standard-modal">
                        <div className="modal-header">
                            <div>
                                <span>
                                    मानक प्रविष्टि
                                </span>

                                <h2>
                                    {editingStandard
                                        ? "मानक संपादित करें"
                                        : "नई फसल का मानक दर्ज करें"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={
                                    closeStandardModal
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-grid">
                                <label>
                                    <span>
                                        वर्ष *
                                    </span>

                                    <input
                                        value={
                                            standardForm.financial_year
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "financial_year",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        फल पौध / फसल का नाम *
                                    </span>

                                    <input
                                        value={
                                            standardForm.crop_name
                                        }
                                        placeholder="जैसे आम कलमी"
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "crop_name",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        दूरी / Spacing *
                                    </span>

                                    <input
                                        value={
                                            standardForm.spacing
                                        }
                                        placeholder="जैसे 8 × 8 मी0"
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "spacing",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        पौध संख्या प्रति है0 *
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.plants_per_hectare
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "plants_per_hectare",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        पौध दर *
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.plant_rate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "plant_rate",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        गड्ढा दर *
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.pit_rate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "pit_rate",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        खाद दर *
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.manure_rate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "manure_rate",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        खाद मात्रा
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.manure_quantity
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "manure_quantity",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        मानक महायोग *
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.standard_total
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "standard_total",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        देय राजसहायता *
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            standardForm.standard_subsidy
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "standard_subsidy",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label className="active-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={
                                            standardForm.is_active
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateStandardForm(
                                                "is_active",
                                                event.target
                                                    .checked
                                            )
                                        }
                                    />

                                    <span>
                                        यह मानक सक्रिय है
                                    </span>
                                </label>
                            </div>

                            <div className="modal-note">
                                <strong>
                                    ध्यान दें :-
                                </strong>

                                <span>
                                    यहाँ दर्ज किया गया मानक
                                    database में सेव होगा।
                                </span>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="outline-button"
                                onClick={
                                    closeStandardModal
                                }
                            >
                                रद्द करें
                            </button>

                            <button
                                type="button"
                                className="green-button"
                                onClick={
                                    saveStandard
                                }
                                disabled={
                                    savingStandard
                                }
                            >
                                {savingStandard
                                    ? "सेव हो रहा है..."
                                    : editingStandard
                                    ? "मानक अपडेट करें"
                                    : "मानक सेव करें"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}