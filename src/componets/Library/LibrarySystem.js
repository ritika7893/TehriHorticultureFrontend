import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaClipboardList,
  FaFolder,
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaFileExcel,
  FaFileAlt,
  FaPlus,
  FaUpload,
  FaEye,
  FaDownload,
  FaTrash,
  FaArrowLeft,
  FaSearch,
  FaTimes,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaShareAlt,
  FaWhatsapp,
  FaTelegramPlane,
  FaEnvelope,
  FaCopy,
} from "react-icons/fa";

import "./LibrarySystem.css";

const API_BASE_URL = "https://mahadevaaya.com/govbillingsystem/backend/api/library";
const MEDIA_BASE_URL = "https://mahadevaaya.com/govbillingsystem/backend";

// Kendra / center-links APIs
const CENTER_LINKS_API_URL = "https://mahadevaaya.com/govbillingsystem/backend/api/center-links";
const CENTERS_API_URL = "https://mahadevaaya.com/govbillingsystem/backend/api/centres";
const CENTER_LIBRARY_SHARE_URL = "https://dhokotdwar.in/LibrarySystem";

const LibrarySystem = () => {
  // =====================================================
  // STATES
  // =====================================================
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Main library tabs.
  // "categories" keeps the existing admin-uploaded category/document screen.
  // "requirements" is intentionally a blank workspace for future admin
  // requirements assigned to selected centers.
  const [activeTab, setActiveTab] = useState("categories");

  // Kendra requirement request workflow
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [showRequirementView, setShowRequirementView] = useState(false);
  const [requirementLoading, setRequirementLoading] = useState(false);
  const [centersLoading, setCentersLoading] = useState(false);
  const [requirementSubmitting, setRequirementSubmitting] = useState(false);
  const [showKendraDropdown, setShowKendraDropdown] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [centers, setCenters] = useState([]);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [requirementDeletingId, setRequirementDeletingId] = useState(null);
  const [shareRequirement, setShareRequirement] = useState(null);

  const [requirementForm, setRequirementForm] = useState({
    center_names: [],
    link: CENTER_LIBRARY_SHARE_URL,
    description: "",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    file: null,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    file: null,
  });

  // =====================================================
  // TOKEN & AXIOS CONFIG
  // =====================================================
  const getToken = () => {
    return localStorage.getItem("access_token") || localStorage.getItem("token");
  };

  const getHeaders = () => {
    const token = getToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // =====================================================
  // API RESPONSE HELPERS
  // =====================================================
  const isApiSuccess = (response) => {
    return (
      response?.data?.status === true ||
      response?.data?.success === true ||
      response?.data?.status === "success"
    );
  };

  const getResponseArray = (response) => {
    const body = response?.data;

    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.results)) return body.results;
    if (Array.isArray(body?.data?.results)) return body.data.results;

    return [];
  };

  const toBoolean = (value) => {
    if (value === true || value === 1 || value === "1") return true;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
  };

  const getCategoryId = (category) => {
    if (category == null) return null;
    if (typeof category === "object") {
      return category.id ?? category.category_id ?? category.pk ?? null;
    }
    return category;
  };

  const getDocumentCategoryId = (document) => {
    return (
      getCategoryId(document?.category) ??
      document?.category_id ??
      document?.categoryId ??
      null
    );
  };

  const getFileUrl = (file) => {
    if (!file) return null;

    // Backend may already return an absolute URL.
    if (/^https?:\/\//i.test(file)) return file;

    const cleanBase = MEDIA_BASE_URL.replace(/\/+$/, "");
    const cleanFile = String(file).replace(/^\/+/, "");

    return `${cleanBase}/${cleanFile}`;
  };

  // =====================================================
  // FETCH CATEGORIES
  // =====================================================
  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);

      const response = await axios.get(`${API_BASE_URL}/categories/`, {
        headers: getHeaders(),
      });

      const categoryList = getResponseArray(response);

      if (isApiSuccess(response) || categoryList.length > 0) {
        // Keep active categories for the normal category screen.
        // Do not mutate the API objects so their IDs remain available.
        const activeCategories = categoryList.filter((category) =>
          toBoolean(category?.is_active)
        );

        setCategories(activeCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("Category fetch error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to load library categories."
      );
      setCategories([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  // =====================================================
  // FETCH DOCUMENTS / BILLS FOR A CATEGORY
  // =====================================================
  const fetchDocuments = async (categoryId) => {
    const id = getCategoryId(categoryId);

    if (id === null || id === undefined || id === "") {
      console.error("Invalid category ID:", categoryId);
      setDocuments([]);
      return;
    }

    try {
      setLoading(true);

      /*
       * The library API can return documents in different response shapes.
       * We also request active and inactive records separately and merge them.
       * This is important because many Django/DRF list APIs return only active
       * records by default.
       *
       * If the backend ignores is_active, the same documents can come back
       * from both requests; the Map below removes duplicates.
       */
      const requests = [
        axios.get(`${API_BASE_URL}/documents/?category=${encodeURIComponent(id)}`, {
          headers: getHeaders(),
        }),
        axios.get(
          `${API_BASE_URL}/documents/?category=${encodeURIComponent(
            id
          )}&is_active=true`,
          { headers: getHeaders() }
        ),
        axios.get(
          `${API_BASE_URL}/documents/?category=${encodeURIComponent(
            id
          )}&is_active=false`,
          { headers: getHeaders() }
        ),
      ];

      const results = await Promise.allSettled(requests);

      const documentMap = new Map();

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;

        const response = result.value;
        const list = getResponseArray(response);

        list.forEach((doc) => {
          if (!doc || doc.id === undefined || doc.id === null) return;

          const normalizedDocument = {
            ...doc,
            is_active: toBoolean(doc.is_active),
            category_id: getDocumentCategoryId(doc) ?? id,
            file_url: getFileUrl(doc.file_url || doc.file),
          };

          documentMap.set(String(doc.id), normalizedDocument);
        });
      });

      const allDocs = Array.from(documentMap.values());

      /*
       * Keep only documents belonging to the selected category.
       * This also handles APIs which return a broader list despite the query.
       */
      const categoryDocuments = allDocs.filter((doc) => {
        const docCategoryId = getDocumentCategoryId(doc);
        return (
          docCategoryId === null ||
          String(docCategoryId) === String(id)
        );
      });

      setDocuments(categoryDocuments);
    } catch (error) {
      console.error("Document fetch error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to load documents/bills."
      );
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // TOGGLE DOCUMENT STATUS (ACTIVE / INACTIVE)
  // =====================================================
  const handleToggleStatus = async (document) => {
    if (!document?.id || statusUpdatingId === document.id) return;

    const newStatus = !toBoolean(document.is_active);
    const categoryId =
      getDocumentCategoryId(document) ??
      getCategoryId(selectedCategory);

    try {
      setStatusUpdatingId(document.id);

      const formData = new FormData();

      if (categoryId !== null && categoryId !== undefined) {
        formData.append("category", String(categoryId));
      }

      formData.append("title", document.title || "");
      formData.append("description", document.description || "");
      formData.append("is_active", newStatus ? "true" : "false");

      const response = await axios.put(
        `${API_BASE_URL}/documents/${document.id}/`,
        formData,
        {
          headers: {
            ...getHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (isApiSuccess(response) || response?.data?.data) {
        const returnedDocument =
          response?.data?.data &&
          !Array.isArray(response.data.data) &&
          typeof response.data.data === "object"
            ? response.data.data
            : null;

        // Update the visible card immediately.
        setDocuments((current) =>
          current.map((item) =>
            item.id === document.id
              ? {
                  ...item,
                  ...(returnedDocument || {}),
                  is_active: toBoolean(
                    returnedDocument?.is_active ?? newStatus
                  ),
                }
              : item
          )
        );

        alert(
          `Document status updated to ${
            newStatus ? "Active" : "Inactive"
          }.`
        );

        // Re-fetch so the UI always matches the server.
        if (selectedCategory) {
          await fetchDocuments(getCategoryId(selectedCategory));
        }
        await fetchCategories();
      } else {
        throw new Error(
          response?.data?.message || "Status update was not successful."
        );
      }
    } catch (error) {
      console.error("Status toggle error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to update document status."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // =====================================================
  // =====================================================
  // KENDRA REQUIREMENT REQUEST HELPERS
  // =====================================================

  const normalizeCenter = (center, index) => ({
    id:
      center?.id ??
      center?.center_id ??
      center?.kendra_id ??
      center?.pk ??
      center?.value ??
      index,
    name:
      center?.name ??
      center?.center_name ??
      center?.kendra_name ??
      center?.title ??
      center?.label ??
      String(center?.id ?? center?.center_id ?? center?.kendra_id ?? `केंद्र ${index + 1}`),
  });

  const getRequirementCenters = (requirement) => {
    const value =
      requirement?.kendra ||
      requirement?.kendras ||
      requirement?.centers ||
      requirement?.center_responses ||
      requirement?.assigned_centers ||
      requirement?.selected_centers ||
      requirement?.center_requests ||
      [];

    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
    return [];
  };

  const getRequirementCenterNames = (requirement) => {
    const value =
      requirement?.kendra_names ||
      requirement?.center_names ||
      requirement?.selected_kendra_names;

    if (Array.isArray(value)) return value.join(", ");
    if (value) return String(value);

    return getRequirementCenters(requirement)
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.name || item?.center_name || item?.kendra_name || ""
      )
      .filter(Boolean)
      .join(", ");
  };

  const getRequirementFiles = (centerResponse) => {
    const value =
      centerResponse?.files ||
      centerResponse?.uploaded_files ||
      centerResponse?.documents ||
      centerResponse?.uploads ||
      [];

    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
    return [];
  };

  const getRequirementFileUrl = (file) => {
    if (!file) return null;
    if (typeof file === "string") return getFileUrl(file);

    return getFileUrl(
      file.file_url ||
        file.url ||
        file.file ||
        file.document_url ||
        file.path ||
        file.file_path
    );
  };

  const getRequirementFileName = (file) => {
    if (!file) return "Uploaded File";
    if (typeof file === "string") {
      return String(file).split("/").pop() || "Uploaded File";
    }

    return (
      file.file_name ||
      file.name ||
      file.title ||
      file.filename ||
      String(file.file_url || file.url || file.file || "").split("/").pop() ||
      "Uploaded File"
    );
  };

  const fetchCenters = async () => {
    try {
      setCentersLoading(true);

      const response = await axios.get(`${CENTERS_API_URL}/`, {
        headers: getHeaders(),
      });

      // /api/centres/ returns a direct array like:
      // [{ id: 49, name: "कोटद्वार", is_active: true }, ...]
      const centerList = Array.isArray(response.data)
        ? response.data
            .filter((center) => center?.is_active === true)
            .map((center) => ({
              id: center.id,
              name: center.name,
            }))
            .filter((center) => center.id !== null && center.id !== undefined)
        : [];

      setCenters(centerList);
    } catch (error) {
      console.error("Center fetch error:", error);
      setCenters([]);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to load Kendra list."
      );
    } finally {
      setCentersLoading(false);
    }
  };

  const fetchRequirements = async () => {
    try {
      setRequirementLoading(true);

      const response = await axios.get(`${CENTER_LINKS_API_URL}/`, {
        headers: getHeaders(),
      });

      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];

      setRequirements(list);
    } catch (error) {
      console.error("Center links fetch error:", error);
      setRequirements([]);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to load center links."
      );
    } finally {
      setRequirementLoading(false);
    }
  };

  const openRequirementModal = async () => {
    setEditingRequirement(null);
    setRequirementForm({
      center_names: [],
      link: CENTER_LIBRARY_SHARE_URL,
      description: "",
    });
    setShowKendraDropdown(false);
    setShowRequirementModal(true);

    if (!centers.length) {
      await fetchCenters();
    }
  };

  const openEditRequirementModal = async (requirement) => {
    try {
      setEditingRequirement(requirement);

      const response = await axios.get(
        `${CENTER_LINKS_API_URL}/${requirement.id}/`,
        {
          headers: getHeaders(),
        }
      );

      const data = response?.data?.data || response?.data || requirement;

      const names = Array.isArray(data?.center_names)
        ? data.center_names
        : [];

      setRequirementForm({
        center_names: names,
        link: CENTER_LIBRARY_SHARE_URL,
        description: data?.description || "",
      });

      setShowKendraDropdown(false);
      setShowRequirementModal(true);

      if (!centers.length) {
        await fetchCenters();
      }
    } catch (error) {
      console.error("Center link detail fetch error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to load request details."
      );
    }
  };

  const closeRequirementModal = () => {
    if (requirementSubmitting) return;

    setShowRequirementModal(false);
    setShowKendraDropdown(false);
    setEditingRequirement(null);
    setRequirementForm({
      center_names: [],
      link: CENTER_LIBRARY_SHARE_URL,
      description: "",
    });
  };

  const handleRequirementChange = (e) => {
    const { name, value } = e.target;

    setRequirementForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleKendraSelection = (centerName) => {
    const name = String(centerName);

    setRequirementForm((prev) => {
      const alreadySelected = prev.center_names.includes(name);

      return {
        ...prev,
        center_names: alreadySelected
          ? prev.center_names.filter((item) => item !== name)
          : [...prev.center_names, name],
      };
    });
  };

  const selectAllKendras = () => {
    setRequirementForm((prev) => ({
      ...prev,
      center_names: centers.map((center) => center.name),
    }));
  };

  const clearAllKendras = () => {
    setRequirementForm((prev) => ({
      ...prev,
      center_names: [],
    }));
  };

  const getSelectedKendraNames = () => requirementForm.center_names || [];

  const handleCreateRequirement = async (e) => {
    e.preventDefault();

    if (!requirementForm.center_names.length) {
      alert("Please select at least one Kendra.");
      return;
    }

    if (!requirementForm.link.trim()) {
      alert("Link is required.");
      return;
    }

    if (!requirementForm.description.trim()) {
      alert("Description is required.");
      return;
    }

    try {
      setRequirementSubmitting(true);

      const payload = {
        center_names: requirementForm.center_names,
        link: requirementForm.link.trim(),
        description: requirementForm.description.trim(),
      };

      const response = editingRequirement
        ? await axios.put(
            `${CENTER_LINKS_API_URL}/${editingRequirement.id}/`,
            payload,
            {
              headers: {
                ...getHeaders(),
                "Content-Type": "application/json",
              },
            }
          )
        : await axios.post(`${CENTER_LINKS_API_URL}/`, payload, {
            headers: {
              ...getHeaders(),
              "Content-Type": "application/json",
            },
          });

      if (
        isApiSuccess(response) ||
        response?.data?.data ||
        response?.data?.id ||
        response?.status >= 200 && response?.status < 300
      ) {
        alert(
          editingRequirement
            ? "Center link updated successfully."
            : "Center link created successfully."
        );
        closeRequirementModal();
        await fetchRequirements();
      } else {
        throw new Error(
          response?.data?.message || "Request was not successful."
        );
      }
    } catch (error) {
      console.error("Center link save error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          `Unable to ${editingRequirement ? "update" : "create"} center link.`
      );
    } finally {
      setRequirementSubmitting(false);
    }
  };

  const handleDeleteRequirement = async (id) => {
    if (!id || requirementDeletingId === id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this center link?"
    );

    if (!confirmed) return;

    try {
      setRequirementDeletingId(id);

      const response = await axios.delete(`${CENTER_LINKS_API_URL}/${id}/`, {
        headers: getHeaders(),
      });

      if (
        isApiSuccess(response) ||
        response?.status >= 200 && response?.status < 300
      ) {
        alert("Center link deleted successfully.");
        if (selectedRequirement?.id === id) {
          closeRequirementView();
        }
        await fetchRequirements();
      } else {
        throw new Error(
          response?.data?.message || "Delete request was not successful."
        );
      }
    } catch (error) {
      console.error("Center link delete error:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to delete center link."
      );
    } finally {
      setRequirementDeletingId(null);
    }
  };

  const openRequirementView = async (requirement) => {
    try {
      if (!requirement?.id) {
        setSelectedRequirement(requirement);
        setShowRequirementView(true);
        return;
      }

      const response = await axios.get(
        `${CENTER_LINKS_API_URL}/${requirement.id}/`,
        {
          headers: getHeaders(),
        }
      );

      const data = response?.data?.data || response?.data || requirement;
      setSelectedRequirement(data);
      setShowRequirementView(true);
    } catch (error) {
      console.error("Center link detail fetch error:", error);
      // If detail GET fails, still allow the user to view the data already
      // available in the list response.
      setSelectedRequirement(requirement);
      setShowRequirementView(true);
    }
  };

  const closeRequirementView = () => {
    setSelectedRequirement(null);
    setShowRequirementView(false);
  };

  // =====================================================
  // SHARE ADMIN REQUEST
  // =====================================================

  const buildShareMessage = (requirement) => {
    const selectedCenters = Array.isArray(requirement?.center_names)
      ? requirement.center_names
      : [];

    const centerText = selectedCenters.length
      ? selectedCenters.join(", ")
      : "Selected Center";

    const description =
      String(requirement?.description || "").trim() ||
      "Please complete the required information.";

    return [
      "Library Request",
      "",
      `Kendra: ${centerText}`,
      "",
      `Description: ${description}`,
      "",
      `Please open this link and submit the required information: ${CENTER_LIBRARY_SHARE_URL}`,
    ].join("\n");
  };

  const getShareUrl = () => {
    // Every center must open the same LibrarySystem page.
    return CENTER_LIBRARY_SHARE_URL;
  };

  const openShareRequirement = (requirement) => {
    setShareRequirement(requirement);
  };

  const closeShareRequirement = () => {
    setShareRequirement(null);
  };

  const shareOnWhatsApp = (requirement) => {
    const message = buildShareMessage(requirement);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareOnTelegram = (requirement) => {
    const message = buildShareMessage(requirement);
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      getShareUrl(requirement)
    )}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareByEmail = (requirement) => {
    const message = buildShareMessage(requirement);
    const subject = `Library Request - ${
      Array.isArray(requirement?.center_names)
        ? requirement.center_names.join(", ")
        : "Center"
    }`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;
  };

  const copyShareMessage = async (requirement) => {
    const message = buildShareMessage(requirement);

    try {
      await navigator.clipboard.writeText(message);
      alert("Share message copied successfully.");
    } catch (error) {
      console.error("Copy share message error:", error);

      const textarea = document.createElement("textarea");
      textarea.value = message;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      alert("Share message copied successfully.");
    }
  };

  const shareUsingDevice = async (requirement) => {
    const message = buildShareMessage(requirement);
    const url = getShareUrl(requirement);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Library Request",
          text: message,
          url,
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("Device share error:", error);
        }
      }
    } else {
      await copyShareMessage(requirement);
    }
  };

  const handleRequirementTabOpen = async () => {
    setActiveTab("requirements");
    setSelectedCategory(null);
    setSearchTerm("");
    await Promise.allSettled([fetchRequirements(), fetchCenters()]);
  };

  // INITIAL LOAD
  // =====================================================
  useEffect(() => {
    fetchCategories();
  }, []);

  // =====================================================
  // OPEN CATEGORY
  // =====================================================
  const handleOpenCategory = (category) => {
    const categoryId = getCategoryId(category);

    if (categoryId === null || categoryId === undefined) {
      alert("Invalid category selected.");
      return;
    }

    setSelectedCategory(category);
    setDocuments([]);
    setSearchTerm("");
    fetchDocuments(categoryId);
  };

  // =====================================================
  // BACK TO CATEGORIES
  // =====================================================
  const handleBack = () => {
    setSelectedCategory(null);
    setDocuments([]);
    setSearchTerm("");
  };

  // =====================================================
  // CATEGORY FORM
  // =====================================================
  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm({ ...categoryForm, [name]: value });
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert("Category name is required.");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/categories/`, categoryForm, {
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
      });

      if (response.data.status) {
        alert("Category created successfully.");
        setShowCategoryModal(false);
        setCategoryForm({ name: "", description: "" });
        fetchCategories();
      }
    } catch (error) {
      console.error("Category create error:", error);
      alert(error.response?.data?.message || "Unable to create category.");
    }
  };

  // =====================================================
  // DOCUMENT FORM
  // =====================================================
  const handleDocumentChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setDocumentForm({ ...documentForm, file: files[0] });
    } else {
      setDocumentForm({ ...documentForm, [name]: value });
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!documentForm.title.trim()) {
      alert("Document title is required.");
      return;
    }
    if (!documentForm.file) {
      alert("Please select a document.");
      return;
    }
    if (!selectedCategory) {
      alert("Please select a category.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("category", selectedCategory.id);
      formData.append("title", documentForm.title);
      formData.append("description", documentForm.description);
      formData.append("file", documentForm.file);
      formData.append("is_active", "true");

      const response = await axios.post(`${API_BASE_URL}/documents/`, formData, {
        headers: {
          ...getHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status) {
        alert("Document uploaded successfully.");
        setShowUploadModal(false);
        setDocumentForm({ title: "", description: "", file: null });
        fetchDocuments(selectedCategory.id);
        fetchCategories();
      }
    } catch (error) {
      console.error("Document upload error:", error);
      alert(error.response?.data?.message || "Unable to upload document.");
    }
  };

  // =====================================================
  // DELETE DOCUMENT
  // =====================================================
  const handleDeleteDocument = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this document?"
    );
    if (!confirmDelete) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/documents/${id}/`, {
        headers: getHeaders(),
      });

      if (response.data.status) {
        alert("Document deleted successfully.");
        fetchDocuments(selectedCategory.id);
        fetchCategories();
      }
    } catch (error) {
      console.error("Delete document error:", error);
      alert("Unable to delete document.");
    }
  };

  // =====================================================
  // EDIT DOCUMENT
  // =====================================================
  const handleOpenEditModal = (document) => {
    setEditingDocument(document);
    setEditForm({
      title: document.title,
      description: document.description || "",
      file: null,
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDocument(null);
    setEditForm({ title: "", description: "", file: null });
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setEditForm({ ...editForm, file: files[0] });
    } else {
      setEditForm({ ...editForm, [name]: value });
    }
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      alert("Document title is required.");
      return;
    }
    if (!editingDocument) return;

    try {
      const formData = new FormData();
      formData.append("title", editForm.title);
      formData.append("description", editForm.description);

      if (editForm.file) {
        formData.append("file", editForm.file);
      }

      formData.append(
        "is_active",
        toBoolean(editingDocument.is_active) ? "true" : "false"
      );

      const response = await axios.put(
        `${API_BASE_URL}/documents/${editingDocument.id}/`,
        formData,
        {
          headers: {
            ...getHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.status) {
        alert("Document updated successfully.");
        handleCloseEditModal();
        if (selectedCategory) {
          fetchDocuments(selectedCategory.id);
        }
        fetchCategories();
      }
    } catch (error) {
      console.error("Document update error:", error);
      alert(error.response?.data?.message || "Unable to update document.");
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================
  const getFileIcon = (fileUrl) => {
    if (!fileUrl) return <FaFileAlt />;
    const extension = fileUrl.split(".").pop().toLowerCase();

    if (extension === "pdf") return <FaFilePdf />;
    if (["jpg", "jpeg", "png", "webp"].includes(extension)) return <FaFileImage />;
    if (["doc", "docx"].includes(extension)) return <FaFileWord />;
    if (["xls", "xlsx", "csv"].includes(extension)) return <FaFileExcel />;

    return <FaFileAlt />;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filteredCategories = categories.filter((category) =>
    String(category?.name || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredDocuments = documents.filter((document) =>
    String(document?.title || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="library-container">
      {/* HEADER */}
      <div className="library-header">
        <div className="library-header-left">
          {selectedCategory && (
            <button className="library-back-btn" onClick={handleBack}>
              <FaArrowLeft />
            </button>
          )}
          <div>
            <h1>{selectedCategory ? selectedCategory.name : "Document Library"}</h1>
            <p>
              {selectedCategory
                ? "Manage documents in this category"
                : "Centralized document management system"}
            </p>
          </div>
        </div>

        {activeTab === "categories" && !selectedCategory && (
          <button className="library-primary-btn" onClick={() => setShowCategoryModal(true)}>
            <FaPlus /> Add Category
          </button>
        )}

        {activeTab === "categories" && selectedCategory && (
          <button className="library-primary-btn" onClick={() => setShowUploadModal(true)}>
            <FaUpload /> Upload Document
          </button>
        )}

        {activeTab === "requirements" && (
          <button className="library-primary-btn" onClick={openRequirementModal}>
            <FaPlus /> Add Request
          </button>
        )}
      </div>

      {/* MAIN TABS */}
      <div className="library-main-tabs" role="tablist" aria-label="Library sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "categories"}
          className={`library-main-tab ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          <FaFolder />
          <span>Admin द्वारा अपलोड की गई श्रेणियाँ</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "requirements"}
          className={`library-main-tab ${activeTab === "requirements" ? "active" : ""}`}
          onClick={handleRequirementTabOpen}
        >
          <FaClipboardList />
          <span>केंद्रों के लिए आवश्यकताएँ</span>
        </button>
      </div>

      {/* TAB 1 — ADMIN UPLOADED CATEGORIES */}
      {activeTab === "categories" && (
        <>
          {/* SEARCH */}
          <div className="library-search-wrapper">
            <FaSearch />
            <input
              type="text"
              placeholder={selectedCategory ? "Search documents..." : "Search categories..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* CATEGORY VIEW */}
          {!selectedCategory && (
            <div>
              {categoryLoading ? (
                <div className="library-loading">Loading categories...</div>
              ) : filteredCategories.length === 0 ? (
                <div className="library-empty">
                  <FaFolder />
                  <h3>No Categories Found</h3>
                  <p>Create your first library category.</p>
                </div>
              ) : (
                <div className="library-category-grid">
                  {filteredCategories.map((category) => (
                    <div
                      className="library-category-card"
                      key={category.id}
                      onClick={() => handleOpenCategory(category)}
                    >
                      <div className="library-folder-icon">
                        <FaFolder />
                      </div>
                      <div className="library-category-content">
                        <h3>{category.name}</h3>
                        <p>{category.description || "No description available"}</p>
                      </div>
                      <div className="library-category-footer">
                        <span>
                          {category.document_count || 0}{" "}
                          {category.document_count === 1 ? "Document" : "Documents"}
                        </span>
                        <span>{formatDate(category.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENT VIEW */}
          {selectedCategory && (
            <div>
              {loading ? (
                <div className="library-loading">Loading documents...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="library-empty">
                  <FaFileAlt />
                  <h3>No Documents Found</h3>
                  <p>Upload a document to this category.</p>
                  <button className="library-primary-btn" onClick={() => setShowUploadModal(true)}>
                    <FaUpload /> Upload Document
                  </button>
                </div>
              ) : (
                <div className="library-document-list">
                  {filteredDocuments.map((document) => (
                    <div
                      className={`library-document-card ${!document.is_active ? "inactive-card" : ""}`}
                      key={document.id}
                    >
                      <div className="library-document-icon">
                        {getFileIcon(document.file_url)}
                      </div>

                      <div className="library-document-info">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3>{document.title}</h3>
                          <span className={`status-badge ${document.is_active ? "active" : "inactive"}`}>
                            {document.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p>{document.description || "No description available"}</p>

                        <div className="library-document-meta">
                          <span>Uploaded by: {document.uploaded_by_name || "Admin"}</span>
                          <span>{formatDate(document.created_at)}</span>
                        </div>
                      </div>

                      <div className="library-document-actions">
                        <button
                          className={`library-icon-btn status ${document.is_active ? "active" : "inactive"}`}
                          title={document.is_active ? "Set Inactive" : "Set Active"}
                          onClick={() => handleToggleStatus(document)}
                          disabled={statusUpdatingId === document.id}
                          aria-busy={statusUpdatingId === document.id}
                        >
                          {document.is_active ? <FaToggleOn /> : <FaToggleOff />}
                        </button>

                        <button
                          className="library-icon-btn view"
                          title="View"
                          onClick={() => setPreviewDocument(document)}
                        >
                          <FaEye />
                        </button>

                        <button
                          className="library-icon-btn edit"
                          title="Edit"
                          onClick={() => handleOpenEditModal(document)}
                        >
                          <FaEdit />
                        </button>

                        <a
                          className="library-icon-btn download"
                          title="Download"
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaDownload />
                        </a>

                        <button
                          className="library-icon-btn delete"
                          title="Delete"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2 — KENDRA REQUIREMENT REQUESTS */}
      {activeTab === "requirements" && (
        <div className="library-requirements-workspace">
          <div className="library-requirements-header">
            <div className="library-requirements-icon">
              <FaClipboardList />
            </div>
            <div>
              <h2>केंद्रों के लिए आवश्यकताएँ</h2>
              <p>
                Admin द्वारा चयनित केंद्रों को भेजी गई file requirements यहाँ दिखाई जाएँगी।
              </p>
            </div>
          </div>

          {requirementLoading ? (
            <div className="library-loading">Loading requests...</div>
          ) : requirements.length === 0 ? (
            <div className="library-requirements-empty">
              <FaClipboardList />
              <h3>अभी कोई Request उपलब्ध नहीं है</h3>
              <p>
                <strong>Add Request</strong> पर क्लिक करके चयनित केंद्रों से file
                upload करने की requirement भेजें।
              </p>
              <button className="library-primary-btn" onClick={openRequirementModal}>
                <FaPlus /> Add Request
              </button>
            </div>
          ) : (
            <div className="library-requirements-table-wrapper">
              <table className="library-requirements-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Kendra Name</th>
                    <th>Link</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((requirement, index) => (
                    <tr key={requirement.id ?? `requirement-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="library-kendra-names">
                          {getRequirementCenterNames(requirement) || "—"}
                        </div>
                      </td>
                      <td>
                        {requirement.link ? (
                          <a
                            href={requirement.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="library-requirement-link"
                          >
                            Open Link
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="library-requirement-description">
                          {requirement.description || "—"}
                        </div>
                      </td>
                      <td>
                        <div className="library-document-actions">
                          <button
                            type="button"
                            className="library-icon-btn view"
                            title="View"
                            onClick={() => openRequirementView(requirement)}
                          >
                            <FaEye />
                          </button>
                          <button
                            type="button"
                            className="library-icon-btn edit"
                            title="Edit"
                            onClick={() => openEditRequirementModal(requirement)}
                          >
                            <FaEdit />
                          </button>
                          <button

                            type="button"

                            className="library-icon-btn share"

                            title="Share Request"

                            onClick={() => openShareRequirement(requirement)}

                          >

                            <FaShareAlt />

                          </button>


                          <button
                            type="button"
                            className="library-icon-btn delete"
                            title="Delete"
                            onClick={() => handleDeleteRequirement(requirement.id)}
                            disabled={requirementDeletingId === requirement.id}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* KENDRA REQUIREMENT REQUEST MODAL */}
      {showRequirementModal && activeTab === "requirements" && (
        <div className="library-modal-overlay">
          <div className="library-modal library-requirement-modal">
            <div className="library-modal-header">
              <div>
                <h2>{editingRequirement ? "Edit Request" : "Add Request"}</h2>
                <p>
                  {editingRequirement
                    ? "Update center link information."
                    : "Add link information for one or more Kendras."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRequirementModal}
                disabled={requirementSubmitting}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateRequirement}>
              <div className="library-form-group">
                <label>
                  Kendra Name<span>*</span>
                </label>

                <div style={{ position: "relative", width: "100%" }}>
                  <button
                    type="button"
                    className="library-kendra-dropdown-trigger"
                    onClick={() => setShowKendraDropdown((prev) => !prev)}
                    disabled={requirementSubmitting || centersLoading}
                    style={{
                      width: "100%",
                      minHeight: "46px",
                      padding: "10px 14px",
                      border: "1px solid #d8dee9",
                      borderRadius: "8px",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      cursor:
                        requirementSubmitting || centersLoading
                          ? "not-allowed"
                          : "pointer",
                      color: requirementForm.center_names.length
                        ? "#1f2937"
                        : "#6b7280",
                    }}
                  >
                    <span>
                      {centersLoading
                        ? "Loading Kendras..."
                        : requirementForm.center_names.length === 0
                        ? "Select Kendra Name"
                        : `${requirementForm.center_names.length} Kendra${
                            requirementForm.center_names.length > 1 ? "s" : ""
                          } selected`}
                    </span>
                    <span style={{ fontSize: "12px" }}>▼</span>
                  </button>

                  {showKendraDropdown && !centersLoading && (
                    <div
                      className="library-kendra-dropdown-menu"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 1005,
                        background: "#fff",
                        border: "1px solid #d8dee9",
                        borderRadius: "8px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        maxHeight: "280px",
                        overflowY: "auto",
                      }}
                    >
                      <div
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "#fff",
                          padding: "10px",
                          borderBottom: "1px solid #edf0f5",
                          display: "flex",
                          gap: "8px",
                          zIndex: 1,
                        }}
                      >
                        <button
                          type="button"
                          onClick={selectAllKendras}
                          style={{
                            flex: 1,
                            padding: "7px 10px",
                            border: "1px solid #d8dee9",
                            borderRadius: "6px",
                            background: "#f8fafc",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={clearAllKendras}
                          style={{
                            flex: 1,
                            padding: "7px 10px",
                            border: "1px solid #d8dee9",
                            borderRadius: "6px",
                            background: "#f8fafc",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Clear All
                        </button>
                      </div>

                      {centers.length === 0 ? (
                        <div
                          style={{
                            padding: "14px",
                            color: "#6b7280",
                            fontSize: "13px",
                          }}
                        >
                          Kendra list उपलब्ध नहीं है।
                        </div>
                      ) : (
                        centers.map((center) => {
                          const isSelected = requirementForm.center_names.includes(
                            center.name
                          );

                          return (
                            <label
                              key={center.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "10px 14px",
                                cursor: "pointer",
                                background: isSelected ? "#f0f7ff" : "#fff",
                                borderBottom: "1px solid #f1f3f6",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleKendraSelection(center.name)}
                                disabled={requirementSubmitting}
                              />
                              <span>{center.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {requirementForm.center_names.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "8px",
                    }}
                  >
                    {getSelectedKendraNames().map((name, index) => (
                      <span
                        key={`${name}-${index}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "5px 9px",
                          borderRadius: "14px",
                          background: "#eef6ff",
                          color: "#1d4ed8",
                          fontSize: "12px",
                          border: "1px solid #cfe3ff",
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                <small className="library-form-help">
                  Dropdown खोलकर एक या एक से अधिक Kendra select करें।
                </small>
              </div>

              <div className="library-form-group">
                <label>
                  Link<span>*</span>
                </label>
                <input
                  type="url"
                  name="link"
                  value={CENTER_LIBRARY_SHARE_URL}
                  disabled
                  readOnly
                />
                <small className="library-form-help">
                  यह link automatically filled है और change नहीं किया जा सकता।
                </small>
              </div>

              <div className="library-form-group">
                <label>
                  Description<span>*</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Enter center related information"
                  rows="4"
                  value={requirementForm.description}
                  onChange={handleRequirementChange}
                  disabled={requirementSubmitting}
                />
              </div>

              <div className="library-modal-footer">
                <button
                  type="button"
                  className="library-cancel-btn"
                  onClick={closeRequirementModal}
                  disabled={requirementSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="library-primary-btn"
                  disabled={requirementSubmitting}
                >
                  {requirementSubmitting
                    ? editingRequirement
                      ? "Updating..."
                      : "Saving..."
                    : editingRequirement
                    ? "Update Request"
                    : "Add Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE REQUEST MODAL */}
      {shareRequirement && activeTab === "requirements" && (
        <div className="library-modal-overlay">
          <div className="library-modal library-share-modal">
            <div className="library-modal-header">
              <div>
                <h2>Share Request</h2>
                <p>Share this request with the selected Kendras.</p>
              </div>
              <button type="button" onClick={closeShareRequirement}>
                <FaTimes />
              </button>
            </div>

            <div className="library-share-content">
              <div className="library-share-preview">
                <div className="library-share-preview-row">
                  <span>Selected Kendra(s)</span>
                  <strong>{getRequirementCenterNames(shareRequirement) || "—"}</strong>
                </div>

                <div className="library-share-preview-row">
                  <span>Description</span>
                  <strong>{shareRequirement.description || "—"}</strong>
                </div>

                <div className="library-share-preview-row">
                  <span>Link</span>
                  <a
                    href={getShareUrl(shareRequirement)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getShareUrl(shareRequirement)}
                  </a>
                </div>
              </div>

              <div className="library-share-message-box">
                <label>Message to be shared</label>
                <textarea
                  value={buildShareMessage(shareRequirement)}
                  readOnly
                  rows="8"
                />
              </div>

              <div className="library-share-options">
                <button
                  type="button"
                  className="library-share-option whatsapp"
                  onClick={() => shareOnWhatsApp(shareRequirement)}
                >
                  <FaWhatsapp />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  className="library-share-option telegram"
                  onClick={() => shareOnTelegram(shareRequirement)}
                >
                  <FaTelegramPlane />
                  <span>Telegram</span>
                </button>

                <button
                  type="button"
                  className="library-share-option email"
                  onClick={() => shareByEmail(shareRequirement)}
                >
                  <FaEnvelope />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  className="library-share-option native"
                  onClick={() => shareUsingDevice(shareRequirement)}
                >
                  <FaShareAlt />
                  <span>Other Apps</span>
                </button>

                <button
                  type="button"
                  className="library-share-option copy"
                  onClick={() => copyShareMessage(shareRequirement)}
                >
                  <FaCopy />
                  <span>Copy Message</span>
                </button>
              </div>
            </div>

            <div className="library-modal-footer">
              <button
                type="button"
                className="library-cancel-btn"
                onClick={closeShareRequirement}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KENDRA REQUIREMENT VIEW */}
      {showRequirementView && selectedRequirement && activeTab === "requirements" && (
        <div className="library-modal-overlay">
          <div className="library-preview-modal library-requirement-view-modal">
            <div className="library-modal-header">
              <div>
                <h2>Center Link Details</h2>
                <p>
                  Kendra: {getRequirementCenterNames(selectedRequirement) || "—"}
                </p>
              </div>
              <button type="button" onClick={closeRequirementView}>
                <FaTimes />
              </button>
            </div>

            <div className="library-requirement-view-content">
              <div className="library-requirement-detail-card">
                <span>Kendra Name</span>
                <strong>
                  {getRequirementCenterNames(selectedRequirement) || "—"}
                </strong>
              </div>

              <div className="library-requirement-detail-card">
                <span>Link</span>
                {selectedRequirement.link ? (
                  <a
                    href={selectedRequirement.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="library-requirement-link"
                  >
                    {selectedRequirement.link}
                  </a>
                ) : (
                  <strong>—</strong>
                )}
              </div>

              <div className="library-requirement-detail-card">
                <span>Description</span>
                <strong>{selectedRequirement.description || "—"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="library-modal-overlay">
          <div className="library-modal">
            <div className="library-modal-header">
              <h2>Add New Category</h2>
              <button onClick={() => setShowCategoryModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="library-form-group">
                <label>Category Name<span>*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter category name"
                  value={categoryForm.name}
                  onChange={handleCategoryChange}
                />
              </div>
              <div className="library-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Enter category description"
                  rows="4"
                  value={categoryForm.description}
                  onChange={handleCategoryChange}
                />
              </div>
              <div className="library-modal-footer">
                <button type="button" className="library-cancel-btn" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="library-primary-btn">
                  <FaPlus /> Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="library-modal-overlay">
          <div className="library-modal">
            <div className="library-modal-header">
              <div>
                <h2>Upload Document</h2>
                <p>Category: <strong>{selectedCategory?.name}</strong></p>
              </div>
              <button onClick={() => setShowUploadModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleUploadDocument}>
              <div className="library-form-group">
                <label>Document Title<span>*</span></label>
                <input
                  type="text"
                  name="title"
                  placeholder="Enter document title"
                  value={documentForm.title}
                  onChange={handleDocumentChange}
                />
              </div>
              <div className="library-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Enter document description"
                  rows="3"
                  value={documentForm.description}
                  onChange={handleDocumentChange}
                />
              </div>
              <div className="library-form-group">
                <label>Select Document<span>*</span></label>
                <div className="library-file-upload">
                  <FaUpload />
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.png,.jpeg,.jpg,.doc,.docx"
                    onChange={handleDocumentChange}
                  />
                  {documentForm.file && (
                    <p>Selected: <strong>{documentForm.file.name}</strong></p>
                  )}
                </div>
              </div>
              <div className="library-modal-footer">
                <button type="button" className="library-cancel-btn" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="library-primary-btn">
                  <FaUpload /> Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingDocument && (
        <div className="library-modal-overlay">
          <div className="library-modal">
            <div className="library-modal-header">
              <div>
                <h2>Edit Document</h2>
                <p>Category: <strong>{selectedCategory?.name}</strong></p>
              </div>
              <button onClick={handleCloseEditModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleUpdateDocument}>
              <div className="library-form-group">
                <label>Document Title<span>*</span></label>
                <input
                  type="text"
                  name="title"
                  placeholder="Enter document title"
                  value={editForm.title}
                  onChange={handleEditChange}
                />
              </div>
              <div className="library-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Enter document description"
                  rows="3"
                  value={editForm.description}
                  onChange={handleEditChange}
                />
              </div>
              <div className="library-form-group">
                <label>Replace Document</label>
                <div className="library-file-upload">
                  <FaUpload />
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.png,.jpeg,.jpg,.doc,.docx"
                    onChange={handleEditChange}
                  />
                  {editForm.file && (
                    <p>Selected: <strong>{editForm.file.name}</strong></p>
                  )}
                </div>
              </div>
              <div className="library-modal-footer">
                <button type="button" className="library-cancel-btn" onClick={handleCloseEditModal}>
                  Cancel
                </button>
                <button type="submit" className="library-primary-btn">
                  <FaEdit /> Update Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW */}
      {previewDocument && (
        <div className="library-modal-overlay">
          <div className="library-preview-modal">
            <div className="library-modal-header">
              <div>
                <h2>{previewDocument.title}</h2>
                <p>{previewDocument.description}</p>
              </div>
              <button onClick={() => setPreviewDocument(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="library-preview-content">
              {previewDocument.file_url?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDocument.file_url}
                  title={previewDocument.title}
                  className="library-pdf-viewer"
                />
              ) : [".jpg", ".jpeg", ".png", ".webp"].some((ext) =>
                  previewDocument.file_url?.toLowerCase().endsWith(ext)
                ) ? (
                <img
                  src={previewDocument.file_url}
                  alt={previewDocument.title}
                  className="library-image-preview"
                />
              ) : (
                <div className="library-preview-other">
                  <div className="library-preview-icon">
                    {getFileIcon(previewDocument.file_url)}
                  </div>
                  <h3>Preview not available</h3>
                  <p>This file type cannot be previewed directly.</p>
                  <a
                    href={previewDocument.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="library-primary-btn"
                  >
                    <FaDownload /> Open / Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarySystem;
