import React, { useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import "./MonthReport.css";
const API_URL =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/month-reports/";

/*
  Excel file is intentionally NOT fetched from /media directly.
  React uses the Django file API:
    GET /api/month-reports/{id}/file/

  Example:
    /api/month-reports/8/file/
*/
const MEDIA_BASE_URL =
  "https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const financialYears = [
  "2029-2030",
  "2028-2029",
  "2027-2028",
  "2026-2027",
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-2024",
  "2023-24",
  "2022-23",
  "2021-22",
  "2020-21",
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getMonthName = (value) =>
  months.find((m) => m.value === String(value))?.label || "";

const formatSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const normalizeColor = (value) => {
  if (!value) return null;

  let color = value;

  if (typeof color === "object") {
    color = color.argb || color.rgb || color.indexed || color.theme || null;
  }

  if (typeof color !== "string") return null;

  color = color.replace("#", "").trim();

  if (/^[0-9a-fA-F]{8}$/.test(color)) {
    color = color.slice(2);
  }

  if (/^[0-9a-fA-F]{6}$/.test(color)) {
    return `#${color}`;
  }

  return null;
};

const getFillColor = (cell) => {
  const fill = cell.fill;

  if (!fill || fill.type === "none") return null;

  return normalizeColor(fill.fgColor) || normalizeColor(fill.bgColor) || null;
};

const getBorderStyle = (side) => {
  if (!side) return "none";

  const styles = {
    thin: "1px solid",
    medium: "2px solid",
    thick: "3px solid",
    double: "3px double",
    dotted: "1px dotted",
    dashed: "1px dashed",
    hair: "1px solid",
  };

  return styles[side.style] || "1px solid";
};

const getBorderColor = (side) => normalizeColor(side?.color) || "#b7b7b7";

const excelValueToText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("en-IN");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    // ExcelJS rich text:
    // { richText: [{ text: "Hello" }, { text: "World" }] }
    if (Array.isArray(value.richText)) {
      return value.richText
        .map((item) => excelValueToText(item?.text))
        .join("");
    }

    // ExcelJS hyperlink:
    // { text: "Google", hyperlink: "https://..." }
    if (value.text !== undefined) {
      return excelValueToText(value.text);
    }

    // ExcelJS formula result.
    if (value.result !== undefined && value.result !== null) {
      return excelValueToText(value.result);
    }

    // ExcelJS error value:
    // { error: "#VALUE!" }
    if (value.error !== undefined) {
      return String(value.error);
    }

    // Some workbook values can contain nested objects.
    // Never allow React to render the object itself.
    try {
      const json = JSON.stringify(value);

      if (json && json !== "{}") {
        return json;
      }
    } catch {
      // Ignore conversion failure.
    }
  }

  return "";
};

const getPrimitiveCellValue = (cell) => {
  if (!cell) return "";

  const value = cell.value;

  return excelValueToText(value);
};

/*
  A numeric value should be shown with exactly two decimals ONLY when the
  Excel cell actually contains a value or a formula has a meaningful input.
  Empty cells must remain visually empty. This is especially important for
  MPR sheets where Excel often contains formulas in unused cells which
  evaluate to 0. Showing those as 0.00 makes the editor look filled with
  data even though the source cells are empty.
*/
const formatEditorNumber = (value, cell) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");

  // Column A contains serial/index values in the MPR sheet. Keep these as
  // integers instead of turning row numbers such as 25 into 25.00.
  if (cell?.column?.number === 1 && Number.isInteger(number)) {
    return String(number);
  }

  return number.toLocaleString("en-IN", {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formulaHasMeaningfulInput = (
  workbook,
  worksheet,
  formula,
  visited = new Set(),
) => {
  if (!workbook || !worksheet || typeof formula !== "string") return false;

  const expression = formula.replace(/^=/, "");
  const references = [];

  // Capture normal/range references, including references to another sheet.
  const rangePattern =
    /(?:(?:'([^']+)'|([A-Za-z0-9\u0900-\u097F _📊-]+))!)?\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)/gi;
  let match;
  while ((match = rangePattern.exec(expression))) {
    references.push(match[0]);
  }

  const singlePattern =
    /(?:(?:'([^']+)'|([A-Za-z0-9\u0900-\u097F _📊-]+))!)?\$?([A-Z]{1,3})\$?(\d+)/gi;
  while ((match = singlePattern.exec(expression))) {
    // Do not add a single-cell match when it is already part of a range.
    const full = match[0];
    const alreadyInRange = references.some((range) => range.includes(full));
    if (!alreadyInRange) references.push(full);
  }

  if (!references.length) {
    return /[A-Z]+\s*\(/i.test(expression) ? false : /[0-9]/.test(expression);
  }

  for (const reference of references) {
    const range = parseFormulaRange(reference, worksheet);
    if (range) {
      const target = workbook.getWorksheet(range.worksheetName);
      if (!target) continue;

      const minRow = Math.min(range.startRow, range.endRow);
      const maxRow = Math.max(range.startRow, range.endRow);
      const minCol = Math.min(range.startCol, range.endCol);
      const maxCol = Math.max(range.startCol, range.endCol);

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const refCell = target.getCell(row, col);
          const raw = refCell.value;
          if (raw === null || raw === undefined || raw === "") continue;

          if (raw && typeof raw === "object" && raw.formula !== undefined) {
            const key = `${target.name}!${refCell.address}`;
            if (
              !visited.has(key) &&
              formulaHasMeaningfulInput(
                workbook,
                target,
                raw.formula,
                new Set([...visited, key]),
              )
            ) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
      continue;
    }

    const ref = parseSheetCellReference(reference, worksheet);
    if (!ref) continue;
    const target = workbook.getWorksheet(ref.worksheetName);
    if (!target) continue;
    const refCell = target.getCell(ref.address);
    const raw = refCell.value;

    if (raw === null || raw === undefined || raw === "") continue;

    if (raw && typeof raw === "object" && raw.formula !== undefined) {
      const key = `${target.name}!${refCell.address}`;
      if (
        !visited.has(key) &&
        formulaHasMeaningfulInput(
          workbook,
          target,
          raw.formula,
          new Set([...visited, key]),
        )
      ) {
        return true;
      }
    } else {
      return true;
    }
  }

  return false;
};

const getCellDisplayText = (cell, workbook = null, worksheet = null) => {
  if (!cell) return "";

  const raw = cell.value;

  // A genuinely empty cell must stay empty. Never turn null/undefined into 0.00.
  if (raw === null || raw === undefined || raw === "") return "";

  // Formula cells must be evaluated from the current workbook so edited input
  // values immediately update their displayed totals.
  if (
    workbook &&
    worksheet &&
    typeof raw === "object" &&
    raw.formula !== undefined
  ) {
    const value = evaluateCellValue(workbook, worksheet, cell);

    // Hide zero results when the formula has no meaningful source value.
    // This keeps unused formula cells visually blank while retaining 0.00 for
    // real calculations/totals where the referenced cells contain data.
    if (
      value === 0 &&
      !formulaHasMeaningfulInput(workbook, worksheet, raw.formula)
    ) {
      return "";
    }

    if (value !== undefined && value !== null && value !== "") {
      return typeof value === "number"
        ? formatEditorNumber(value, cell)
        : excelValueToText(value);
    }
  }

  // Actual numeric cells with a value are consistently displayed to 2 decimals.
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return formatEditorNumber(raw, cell);
  }

  try {
    if (typeof cell.text === "string" && cell.text.length > 0) {
      return cell.text;
    }
  } catch {
    // Fall back to value conversion.
  }

  return excelValueToText(raw);
};

const splitFormulaParts = (formula, operator) => {
  const parts = [];
  let current = "";
  let depth = 0;
  let quoted = false;

  for (let i = 0; i < formula.length; i += 1) {
    const ch = formula[i];

    if (ch === '"') {
      quoted = !quoted;
      current += ch;
      continue;
    }

    if (!quoted) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;

      if (ch === operator && depth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }
    }

    current += ch;
  }

  parts.push(current.trim());
  return parts;
};

const normalizeFormulaText = (value) =>
  String(value ?? "")
    .replace(/[\u00A0\u202F]/g, " ")
    .trim();

const parseSheetCellReference = (token, activeWorksheet) => {
  const trimmed = normalizeFormulaText(token).replace(/^=/, "");

  // Quoted sheet-qualified reference: '📝 DATA ENTRY'!F8
  const qualified = trimmed.match(/^'(.*?)'!\$?([A-Z]{1,3})\$?(\d+)$/i);
  if (qualified) {
    return {
      worksheetName: qualified[1],
      address: `${qualified[2].toUpperCase()}${qualified[3]}`,
    };
  }

  // Unquoted sheet-qualified reference: DATA ENTRY!F8
  const qualifiedPlain = trimmed.match(/^([^!]+)!\$?([A-Z]{1,3})\$?(\d+)$/i);
  if (qualifiedPlain) {
    return {
      worksheetName: qualifiedPlain[1],
      address: `${qualifiedPlain[2].toUpperCase()}${qualifiedPlain[3]}`,
    };
  }

  // Local worksheet reference: D43
  const local = trimmed.match(/^\$?([A-Z]{1,3})\$?(\d+)$/i);
  if (local) {
    return {
      worksheetName: activeWorksheet?.name,
      address: `${local[1].toUpperCase()}${local[2]}`,
    };
  }

  return null;
};

const parseFormulaRange = (token, activeWorksheet) => {
  const trimmed = normalizeFormulaText(token).replace(/^=/, "");
  const match = trimmed.match(
    /^(?:'(.*?)'|([^!]+))?!?\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)$/i,
  );

  if (!match) return null;

  const worksheetName = match[1] || match[2] || activeWorksheet?.name;
  const target = activeWorksheet?.workbook?.getWorksheet?.(worksheetName);

  return {
    worksheetName,
    startCol: columnNumber(match[3]),
    startRow: Number(match[4]),
    endCol: columnNumber(match[5]),
    endRow: Number(match[6]),
    target,
  };
};

const toFormulaNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const formulaValueIsBlank = (value) =>
  value === null || value === undefined || String(value).trim() === "";

const compareFormulaValues = (left, right, operator) => {
  const ln = Number(left);
  const rn = Number(right);
  const bothNumbers =
    left !== "" && right !== "" && Number.isFinite(ln) && Number.isFinite(rn);

  const a = bothNumbers ? ln : String(left ?? "").toLowerCase();
  const b = bothNumbers ? rn : String(right ?? "").toLowerCase();

  if (operator === "=") return a === b;
  if (operator === "<>") return a !== b;
  if (operator === ">") return a > b;
  if (operator === "<") return a < b;
  if (operator === ">=") return a >= b;
  if (operator === "<=") return a <= b;
  return false;
};

const splitComparison = (expression) => {
  let quoted = false;
  let depth = 0;

  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    if (ch === '"') quoted = !quoted;
    if (quoted) continue;
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (depth !== 0) continue;

    const two = expression.slice(i, i + 2);
    if ([">=", "<=", "<>"].includes(two)) {
      return [
        expression.slice(0, i).trim(),
        two,
        expression.slice(i + 2).trim(),
      ];
    }
    if (["=", ">", "<"].includes(ch)) {
      return [
        expression.slice(0, i).trim(),
        ch,
        expression.slice(i + 1).trim(),
      ];
    }
  }
  return null;
};

const getRangeValues = (
  workbook,
  activeWorksheet,
  token,
  visited = new Set(),
) => {
  const range = parseFormulaRange(token, activeWorksheet);
  if (!range) return null;

  const target = workbook.getWorksheet(range.worksheetName);
  if (!target) return null;

  const values = [];
  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);

  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      values.push(
        evaluateCellValue(workbook, target, target.getCell(r, c), visited),
      );
    }
  }

  return values;
};

const evaluateFunction = (workbook, activeWorksheet, name, args, visited) => {
  const fn = String(name).toUpperCase();

  if (fn === "IF") {
    const condition = evaluateFormulaValue(
      workbook,
      activeWorksheet,
      args[0] || "",
      visited,
    );
    const result = condition ? args[1] : args[2];
    return result === undefined
      ? ""
      : evaluateFormulaValue(workbook, activeWorksheet, result, visited);
  }

  if (["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA"].includes(fn)) {
    const values = [];

    for (const arg of args) {
      const rangeValues = getRangeValues(
        workbook,
        activeWorksheet,
        arg,
        visited,
      );
      if (rangeValues) {
        values.push(...rangeValues);
      } else {
        values.push(
          evaluateFormulaValue(workbook, activeWorksheet, arg, visited),
        );
      }
    }

    if (fn === "COUNTA")
      return values.filter((v) => !formulaValueIsBlank(v)).length;
    if (fn === "COUNT")
      return values.filter((v) => Number.isFinite(Number(v))).length;

    const numbers = values
      .map(toFormulaNumber)
      .filter((v) => Number.isFinite(v));

    if (fn === "SUM") return numbers.reduce((a, b) => a + b, 0);
    if (fn === "AVERAGE")
      return numbers.length
        ? numbers.reduce((a, b) => a + b, 0) / numbers.length
        : 0;
    if (fn === "MIN") return numbers.length ? Math.min(...numbers) : 0;
    if (fn === "MAX") return numbers.length ? Math.max(...numbers) : 0;
  }

  if (fn === "ROUND" || fn === "ROUNDUP" || fn === "ROUNDDOWN") {
    const number = toFormulaNumber(
      evaluateFormulaValue(workbook, activeWorksheet, args[0] || "0", visited),
    );
    const digits = Math.trunc(
      toFormulaNumber(
        evaluateFormulaValue(
          workbook,
          activeWorksheet,
          args[1] || "0",
          visited,
        ),
      ),
    );
    const factor = Math.pow(10, digits);

    if (fn === "ROUND") return Math.round(number * factor) / factor;
    if (fn === "ROUNDUP")
      return (
        (Math.sign(number) * Math.ceil(Math.abs(number) * factor)) / factor
      );
    return (Math.sign(number) * Math.floor(Math.abs(number) * factor)) / factor;
  }

  if (fn === "ABS") {
    return Math.abs(
      toFormulaNumber(
        evaluateFormulaValue(
          workbook,
          activeWorksheet,
          args[0] || "0",
          visited,
        ),
      ),
    );
  }

  if (fn === "AND") {
    return args.every((arg) =>
      Boolean(evaluateFormulaValue(workbook, activeWorksheet, arg, visited)),
    );
  }

  if (fn === "OR") {
    return args.some((arg) =>
      Boolean(evaluateFormulaValue(workbook, activeWorksheet, arg, visited)),
    );
  }

  if (fn === "NOT") {
    return !Boolean(
      evaluateFormulaValue(workbook, activeWorksheet, args[0] || "", visited),
    );
  }

  if (fn === "SUBTOTAL") {
    const functionNumber = Math.trunc(
      toFormulaNumber(
        evaluateFormulaValue(
          workbook,
          activeWorksheet,
          args[0] || "9",
          visited,
        ),
      ),
    );
    const values = [];

    for (const arg of args.slice(1)) {
      const rangeValues = getRangeValues(
        workbook,
        activeWorksheet,
        arg,
        visited,
      );
      values.push(
        ...(rangeValues || [
          evaluateFormulaValue(workbook, activeWorksheet, arg, visited),
        ]),
      );
    }

    // MPR workbooks commonly use SUBTOTAL(9, range) for total rows.
    if ([1, 101].includes(functionNumber)) {
      const numbers = values.map(toFormulaNumber);
      return numbers.length
        ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
        : 0;
    }
    if ([2, 102].includes(functionNumber)) {
      return values.filter((value) => Number.isFinite(Number(value))).length;
    }
    if ([3, 103].includes(functionNumber)) {
      return values.filter((value) => !formulaValueIsBlank(value)).length;
    }
    return values.reduce((sum, value) => sum + toFormulaNumber(value), 0);
  }

  if (fn === "SUMIF" || fn === "SUMIFS") {
    // Supports the common MPR pattern where a criteria/range is used to
    // select rows and a sum range contains the amount.
    if (fn === "SUMIF") {
      const criteriaValues =
        getRangeValues(workbook, activeWorksheet, args[0], visited) || [];
      const criteria = evaluateFormulaValue(
        workbook,
        activeWorksheet,
        args[1] || "",
        visited,
      );
      const sumValues =
        getRangeValues(
          workbook,
          activeWorksheet,
          args[2] || args[0],
          visited,
        ) || [];
      let total = 0;
      criteriaValues.forEach((value, index) => {
        if (compareFormulaValues(value, criteria, "="))
          total += toFormulaNumber(sumValues[index]);
      });
      return total;
    }

    const sumValues =
      getRangeValues(
        workbook,
        activeWorksheet,
        args[args.length - 1],
        visited,
      ) || [];
    let total = 0;
    const pairs = Math.floor((args.length - 1) / 2);
    const criteriaRanges = [];
    for (let i = 0; i < pairs; i += 1) {
      criteriaRanges.push({
        values:
          getRangeValues(workbook, activeWorksheet, args[i * 2], visited) || [],
        criteria: evaluateFormulaValue(
          workbook,
          activeWorksheet,
          args[i * 2 + 1],
          visited,
        ),
      });
    }
    for (let index = 0; index < sumValues.length; index += 1) {
      if (
        criteriaRanges.every((pair) =>
          compareFormulaValues(pair.values[index], pair.criteria, "="),
        )
      ) {
        total += toFormulaNumber(sumValues[index]);
      }
    }
    return total;
  }

  return undefined;
};

const evaluateFormulaValue = (
  workbook,
  activeWorksheet,
  formula,
  visited = new Set(),
) => {
  if (!workbook || !activeWorksheet || typeof formula !== "string")
    return undefined;

  let expression = normalizeFormulaText(formula);
  if (expression.startsWith("=")) expression = expression.slice(1).trim();
  if (!expression) return "";

  // Excel string literal.
  if (
    expression.length >= 2 &&
    expression.startsWith('"') &&
    expression.endsWith('"')
  ) {
    return expression.slice(1, -1).replace(/""/g, '"');
  }

  // Boolean constants.
  if (/^TRUE$/i.test(expression)) return true;
  if (/^FALSE$/i.test(expression)) return false;

  // Percent constants, e.g. 5%.
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(expression)) {
    return Number(expression.slice(0, -1)) / 100;
  }

  // Comparisons are evaluated before arithmetic/function output.
  const comparison = splitComparison(expression);
  if (comparison) {
    const left = evaluateFormulaValue(
      workbook,
      activeWorksheet,
      comparison[0],
      visited,
    );
    const right = evaluateFormulaValue(
      workbook,
      activeWorksheet,
      comparison[2],
      visited,
    );
    return compareFormulaValues(left, right, comparison[1]);
  }

  // Excel concatenation operator.
  const concatParts = splitFormulaParts(expression, "&");
  if (concatParts.length > 1) {
    return concatParts
      .map((part) =>
        evaluateFormulaValue(workbook, activeWorksheet, part, visited),
      )
      .map((value) => String(value ?? ""))
      .join("");
  }

  // Function call.
  const fnMatch = expression.match(/^([A-Z_][A-Z0-9_.]*)\((.*)\)$/i);
  if (fnMatch) {
    const args = splitFormulaParts(fnMatch[2], ",");
    return evaluateFunction(
      workbook,
      activeWorksheet,
      fnMatch[1],
      args,
      visited,
    );
  }

  // Parenthesized expression.
  if (expression.startsWith("(") && expression.endsWith(")")) {
    return evaluateFormulaValue(
      workbook,
      activeWorksheet,
      expression.slice(1, -1),
      visited,
    );
  }

  // Direct cell reference.
  const reference = parseSheetCellReference(expression, activeWorksheet);
  if (reference) {
    const target = workbook.getWorksheet(reference.worksheetName);
    if (!target) return undefined;
    return evaluateCellValue(
      workbook,
      target,
      target.getCell(reference.address),
      visited,
    );
  }

  // Basic arithmetic with normal Excel precedence: multiplication/division
  // before addition/subtraction. This covers formulas commonly used in MPR
  // report totals such as D43+G43+I43+K43+M43 and D8+F8+H8+J8+L8.
  const arithmeticTokens = [];
  let current = "";
  let depth = 0;
  let quoted = false;

  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    if (ch === '"') quoted = !quoted;
    if (!quoted) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (depth === 0 && ["+", "-", "*", "/"].includes(ch) && i > 0) {
        arithmeticTokens.push(current.trim(), ch);
        current = "";
        continue;
      }
    }
    current += ch;
  }
  arithmeticTokens.push(current.trim());

  if (arithmeticTokens.length > 1) {
    const values = [];
    for (const token of arithmeticTokens) {
      if (["+", "-", "*", "/"].includes(token)) {
        values.push(token);
        continue;
      }
      values.push(
        evaluateFormulaValue(workbook, activeWorksheet, token, visited),
      );
    }

    // Multiplication/division first.
    for (let i = 1; i < values.length - 1; i += 2) {
      if (values[i] === "*" || values[i] === "/") {
        const left = toFormulaNumber(values[i - 1]);
        const right = toFormulaNumber(values[i + 1]);
        values.splice(
          i - 1,
          3,
          values[i] === "*" ? left * right : right === 0 ? 0 : left / right,
        );
        i -= 2;
      }
    }

    let result = toFormulaNumber(values[0]);
    for (let i = 1; i < values.length; i += 2) {
      const right = toFormulaNumber(values[i + 1]);
      if (values[i] === "+") result += right;
      if (values[i] === "-") result -= right;
    }
    return result;
  }

  const numeric = Number(expression.replace(/,/g, ""));
  if (!Number.isNaN(numeric)) return numeric;

  return undefined;
};

const evaluateCellValue = (workbook, worksheet, cell, visited = new Set()) => {
  if (!cell) return "";

  const value = cell.value;
  if (value === null || value === undefined) return "";

  if (typeof value === "object" && value.formula !== undefined) {
    const key = `${worksheet.name}!${cell.address}`;
    if (visited.has(key)) return value.result ?? "";

    const nextVisited = new Set(visited);
    nextVisited.add(key);

    const calculated = evaluateFormulaValue(
      workbook,
      worksheet,
      `=${value.formula}`,
      nextVisited,
    );

    if (calculated !== undefined) return calculated;
    if (value.result !== undefined && value.result !== null)
      return value.result;
    return "";
  }

  return getPrimitiveCellValue(cell);
};

const setCalculatedCellValue = (cell, result) => {
  const current = cell?.value;

  if (current && typeof current === "object" && current.formula !== undefined) {
    cell.value = { formula: current.formula, result };
  } else {
    cell.value = result;
  }
};

const findMprWorksheet = (workbook) =>
  workbook?.getWorksheet("📊 MPR REPORT") ||
  workbook?.worksheets?.find((ws) =>
    String(ws.name || "")
      .toLowerCase()
      .includes("mpr report"),
  ) ||
  null;

const findRowContaining = (worksheet, matcher, startRow = 1) => {
  for (
    let rowNumber = startRow;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    for (
      let colNumber = 1;
      colNumber <= worksheet.columnCount;
      colNumber += 1
    ) {
      const value = normalizeFormulaText(
        excelValueToText(worksheet.getCell(rowNumber, colNumber).value),
      ).toLowerCase();

      if (matcher(value)) return rowNumber;
    }
  }

  return 0;
};

const refreshMprStructuredTotals = (workbook) => {
  const worksheet = findMprWorksheet(workbook);
  if (!worksheet) return;

  const headerRow = findRowContaining(
    worksheet,
    (value) =>
      value.includes("मद का नाम") ||
      value === "item" ||
      value.includes("item name"),
  );
  const totalRow = findRowContaining(
    worksheet,
    (value) => value.includes("ग्रैण्ड योग") || value.includes("grand total"),
  );

  if (!headerRow || !totalRow || totalRow <= headerRow + 1) return;

  const dataStartRow = headerRow + 2;
  const totalValues = [];

  for (let colNumber = 1; colNumber <= worksheet.columnCount; colNumber += 1) {
    if (colNumber <= 3) {
      totalValues[colNumber] = null;
      continue;
    }

    let total = 0;
    for (let rowNumber = dataStartRow; rowNumber < totalRow; rowNumber += 1) {
      total += toFormulaNumber(
        evaluateCellValue(
          workbook,
          worksheet,
          worksheet.getCell(rowNumber, colNumber),
        ),
      );
    }

    // Only write a grand total when at least one source cell in that column
    // actually contains data/formula output. Completely unused columns stay blank.
    let hasSourceValue = false;
    for (let rowNumber = dataStartRow; rowNumber < totalRow; rowNumber += 1) {
      const sourceCell = worksheet.getCell(rowNumber, colNumber);
      const sourceValue = sourceCell.value;
      if (
        sourceValue !== null &&
        sourceValue !== undefined &&
        sourceValue !== ""
      ) {
        hasSourceValue = true;
        break;
      }
    }

    totalValues[colNumber] = hasSourceValue ? total : null;
    if (hasSourceValue) {
      setCalculatedCellValue(worksheet.getCell(totalRow, colNumber), total);
    }
  }

  const summaryTitleRow = findRowContaining(
    worksheet,
    (value) =>
      value.includes("योजना-वार वित्तीय सारांश") ||
      value.includes("scheme-wise financial summary"),
    totalRow + 1,
  );
  if (!summaryTitleRow) return;

  const summaryHeaderRow = summaryTitleRow + 1;
  const summaryValueRow = summaryHeaderRow + 1;
  const groupHeaderRow = headerRow;
  const subHeaderRow = headerRow + 1;
  let currentGroup = "";
  const financialColumns = new Map();

  for (let colNumber = 4; colNumber <= worksheet.columnCount; colNumber += 1) {
    const groupText = normalizeFormulaText(
      excelValueToText(worksheet.getCell(groupHeaderRow, colNumber).value),
    ).toLowerCase();
    if (groupText) currentGroup = groupText;

    const subHeaderText = normalizeFormulaText(
      excelValueToText(worksheet.getCell(subHeaderRow, colNumber).value),
    ).toLowerCase();
    if (currentGroup && subHeaderText.includes("वित्तीय")) {
      financialColumns.set(currentGroup, colNumber);
    }
  }

  for (let colNumber = 1; colNumber <= worksheet.columnCount; colNumber += 1) {
    const summaryName = normalizeFormulaText(
      excelValueToText(worksheet.getCell(summaryHeaderRow, colNumber).value),
    ).toLowerCase();
    if (!summaryName) continue;

    const matchingGroup = [...financialColumns.keys()].find(
      (group) =>
        summaryName.includes(group) ||
        group.includes(summaryName.replace(/\(total\)/g, "").trim()),
    );
    const financialColumn = matchingGroup
      ? financialColumns.get(matchingGroup)
      : summaryName.includes("कुल") || summaryName.includes("total")
        ? worksheet.columnCount
        : null;

    if (financialColumn && totalValues[financialColumn] !== null) {
      setCalculatedCellValue(
        worksheet.getCell(summaryValueRow, colNumber),
        totalValues[financialColumn],
      );
    }
  }
};

const recalculateWorkbookFormulas = (workbook) => {
  if (!workbook) return;

  // Run multiple passes because a formula can depend on another formula
  // located later in the sheet. The evaluator itself follows dependencies,
  // so the passes mainly refresh ExcelJS cached `result` values for saving.
  for (let pass = 0; pass < 4; pass += 1) {
    workbook.worksheets.forEach((ws) => {
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          const value = cell.value;
          if (
            value &&
            typeof value === "object" &&
            value.formula !== undefined
          ) {
            const result = evaluateCellValue(workbook, ws, cell);
            if (result !== undefined) {
              cell.value = {
                formula: value.formula,
                result,
              };
            }
          }
        });
      });
    });
  }

  refreshMprStructuredTotals(workbook);
};

const cellToText = (cell, workbook = null, worksheet = null) => {
  if (!cell) return "";

  /*
    Prefer ExcelJS's formatted display text.
    This prevents [object Object] for rich text, hyperlinks,
    formula results and other ExcelJS value objects.
  */
  const displayText = getCellDisplayText(cell, workbook, worksheet);

  if (displayText !== null && displayText !== undefined) {
    return String(displayText);
  }

  if (workbook && worksheet) {
    const value = evaluateCellValue(workbook, worksheet, cell);

    return excelValueToText(value);
  }

  return excelValueToText(cell.value);
};

const cellToRawValue = (cell) => {
  if (!cell) return "";

  const value = cell.value;

  if (value && typeof value === "object" && value.formula !== undefined) {
    return `=${value.formula}`;
  }

  /*
    For rich text/hyperlinks/etc. use the visible text in the
    formula bar instead of rendering the JavaScript object.
  */
  return excelValueToText(value);
};

const getCellStyle = (cell, isSelected = false) => {
  const alignment = cell.alignment || {};
  const font = cell.font || {};

  return {
    backgroundColor: getFillColor(cell) || "#ffffff",
    color: normalizeColor(font.color) || "#000000",
    fontFamily: font.name || "Calibri, Arial, sans-serif",
    fontSize: `${font.size || 11}pt`,
    fontWeight: font.bold ? 700 : 400,
    fontStyle: font.italic ? "italic" : "normal",
    textDecoration:
      [font.underline ? "underline" : "", font.strike ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || "none",
    textAlign:
      alignment.horizontal === "center"
        ? "center"
        : alignment.horizontal === "right"
          ? "right"
          : "left",
    verticalAlign:
      alignment.vertical === "top"
        ? "top"
        : alignment.vertical === "bottom"
          ? "bottom"
          : "middle",
    whiteSpace: "pre-wrap",
    borderTop: `${getBorderStyle(cell.border?.top)} ${getBorderColor(
      cell.border?.top,
    )}`,
    borderRight: `${getBorderStyle(cell.border?.right)} ${getBorderColor(
      cell.border?.right,
    )}`,
    borderBottom: `${getBorderStyle(
      cell.border?.bottom,
    )} ${getBorderColor(cell.border?.bottom)}`,
    borderLeft: `${getBorderStyle(cell.border?.left)} ${getBorderColor(
      cell.border?.left,
    )}`,
    padding: "3px 5px",
    outline: isSelected ? "2px solid #217346" : "none",
    outlineOffset: "-2px",
  };
};

const columnNumber = (letters) => {
  let result = 0;

  for (const char of String(letters).toUpperCase()) {
    result = result * 26 + char.charCodeAt(0) - 64;
  }

  return result;
};

const columnLetter = (number) => {
  let result = "";
  let n = number;

  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }

  return result;
};

const parseMerge = (range) => {
  const [start, end] = String(range).split(":");

  const a = start?.match(/^([A-Z]+)(\d+)$/i);
  const b = end?.match(/^([A-Z]+)(\d+)$/i);

  if (!a || !b) return null;

  return {
    startRow: Number(a[2]),
    endRow: Number(b[2]),
    startCol: columnNumber(a[1]),
    endCol: columnNumber(b[1]),
  };
};

const createMergeMap = (worksheet) => {
  const map = new Map();
  const merges = worksheet.model?.merges || [];

  merges.forEach((range) => {
    const merge = parseMerge(range);
    if (!merge) return;

    for (let row = merge.startRow; row <= merge.endRow; row += 1) {
      for (let col = merge.startCol; col <= merge.endCol; col += 1) {
        map.set(`${row}:${col}`, {
          ...merge,
          isMaster: row === merge.startRow && col === merge.startCol,
          rowSpan: merge.endRow - merge.startRow + 1,
          colSpan: merge.endCol - merge.startCol + 1,
        });
      }
    }
  });

  return map;
};

const getCookie = (name) => {
  const cookies = document.cookie ? document.cookie.split(";") : [];

  for (const item of cookies) {
    const [key, ...valueParts] = item.trim().split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
};

const apiFetch = async (url, options = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  /*
    No credentials: "include"
    No withCredentials
    No Authorization header
    No automatic CSRF header
  */
  const response = await fetch(url, {
    ...options,
    method,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      message = data?.detail || data?.error || data?.message || message;
    } catch {
      // Keep the HTTP status message when the API does not return JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response;
};

const getMediaUrl = (path) => {
  if (!path) return "";

  // Already a complete URL
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Relative media path
  return `${MEDIA_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const normalizeApiReport = (item) => ({
  id: item.id,
  month: String(item.month ?? ""),
  financialYear: item.financial_year ?? "",
  monthReport: item.month_report ?? "",
  fileName:
    String(item.month_report || "")
      .split("/")
      .pop() || "MPR.xlsx",
  fileSize: Number(item.file_size || item.size || 0),
  createdAt: item.created_at || "",
  updatedAt: item.updated_at || item.created_at || "",
  file: null,
  apiData: item,
});

const getReportsFromResponse = (data) => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : data
        ? [data]
        : [];

  return list.map(normalizeApiReport);
};

const fetchReportFile = async (report) => {
  if (!report?.id) {
    throw new Error("Report ID is missing.");
  }

  /*
    IMPORTANT:
    Never fetch /media/month_reports/... directly from localhost.
    That causes the CORS error shown in the browser.

    Django must expose:
      GET /api/month-reports/{id}/file/

    Example:
      https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/month-reports/8/file/
  */
  const fileUrl = `${API_URL}${report.id}/`;

  console.log("Fetching Excel through Django:", fileUrl);

  const response = await fetch(fileUrl, {
    method: "GET",
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
    },
  });

  if (!response.ok) {
    let message = `Unable to load Excel file (${response.status})`;

    try {
      const data = await response.json();
      message = data?.error || data?.detail || data?.message || message;
    } catch {
      // Server did not return JSON.
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error(
      "The Django file API returned an empty Excel file (0 KB). Check the actual file on the server.",
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (
    contentType.includes("text/html") ||
    contentType.includes("application/json")
  ) {
    const text = await blob.text();

    throw new Error(
      text || "The Django file API did not return an Excel workbook.",
    );
  }

  return new File([blob], report.fileName || "MPR.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    lastModified: Date.now(),
  });
};

const uploadReport = async ({ month, financialYear, file }) => {
  const formData = new FormData();
  formData.append("month", String(month));
  formData.append("financial_year", String(financialYear));
  formData.append("month_report", file);

  return apiFetch(API_URL, {
    method: "POST",
    body: formData,
  });
};

const updateReportFile = async ({ id, month, financialYear, file }) => {
  if (!id) {
    throw new Error("Month report ID is missing.");
  }

  if (!file || !file.size) {
    throw new Error("The edited Excel file is empty.");
  }

  /*
    PUT endpoint:
    https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/month-reports/{id}/

    Example for report ID 8:
    https://mahadevaaya.com/tehrihorticulture/tehrihorticulture_backend/api/month-reports/8/

    Do not manually set Content-Type. The browser creates the
    multipart/form-data boundary automatically.
  */
  const formData = new FormData();

  formData.append("month", String(month ?? ""));
  formData.append("financial_year", String(financialYear ?? ""));
  formData.append("month_report", file, file.name || "MPR.xlsx");

  return apiFetch(`${API_URL}${id}/`, {
    method: "PUT",
    body: formData,
  });
};

const deleteReportFromApi = async (id) => {
  await apiFetch(`${API_URL}${id}/`, {
    method: "DELETE",
  });
};

const workbookFromFile = async (file) => {
  if (!file) {
    throw new Error("No Excel file was supplied.");
  }

  if (!file.size) {
    throw new Error(
      "The Excel file is empty (0 bytes). Check the file stored on the Django server.",
    );
  }

  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();

  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    console.error("ExcelJS workbook load error:", error);

    throw new Error(
      "The server returned a file, but it is not a valid .xlsx workbook.",
    );
  }

  if (!workbook.worksheets.length) {
    throw new Error("The Excel workbook contains no worksheets.");
  }

  return workbook;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const ExcelEditor = ({ report, onClose, onSaved }) => {
  const [workbook, setWorkbook] = useState(null);
  const [worksheet, setWorksheet] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formulaText, setFormulaText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [activeSheetName, setActiveSheetName] = useState("");
  const formulaRef = useRef(null);
  const editingOriginalRef = useRef("");

  const getInitialWorksheet = (book) => {
    if (!book) return null;

    /*
      The supplied workbook has a dependency chain:
        📝 DATA ENTRY -> 📊 MPR REPORT -> 📈 DASHBOARD

      Therefore DATA ENTRY is the first sheet shown in the editor. The
      user edits the yellow input cells there, exactly like in Excel.
    */
    return (
      book.getWorksheet("📝 DATA ENTRY") ||
      book.worksheets.find((ws) =>
        String(ws.name || "")
          .toLowerCase()
          .includes("data entry"),
      ) ||
      book.getWorksheet("📊 MPR REPORT") ||
      book.worksheets.find((ws) =>
        String(ws.name || "")
          .toLowerCase()
          .includes("mpr report"),
      ) ||
      book.worksheets[0] ||
      null
    );
  };

  const selectWorksheet = (sheetName) => {
    if (!workbook || !sheetName) return;

    const nextWorksheet = workbook.getWorksheet(sheetName);
    if (!nextWorksheet) return;

    /*
      Recalculate before changing sheets so the newly opened sheet always
      displays values produced from the latest DATA ENTRY edits.
    */
    recalculateWorkbookFormulas(workbook);

    setWorksheet(nextWorksheet);
    setActiveSheetName(nextWorksheet.name);
    setSelectedCell(null);
    setFormulaText("");
    setStatus(`Viewing ${nextWorksheet.name} — formulas are up to date`);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const book = await workbookFromFile(report.file);

        /*
          Initial calculation of the complete workbook.
        */
        recalculateWorkbookFormulas(book);

        /*
          Keep Excel's own calculation engine enabled when this file is later
          opened/downloaded in Microsoft Excel.
        */
        if (book.calculation) {
          book.calculation.fullCalcOnLoad = true;
          book.calculation.forceFullCalc = true;
          book.calculation.calcOnSave = true;
          book.calculation.calcMode = "auto";
        }

        const initialWorksheet = getInitialWorksheet(book);

        if (!initialWorksheet) {
          throw new Error(
            "The selected Excel file does not contain any worksheet.",
          );
        }

        if (!cancelled) {
          setWorkbook(book);
          setWorksheet(initialWorksheet);
          setActiveSheetName(initialWorksheet.name);
          setStatus(`Editing ${report.fileName} — ${initialWorksheet.name}`);
        }
      } catch (err) {
        console.error("Excel editor load error:", err);

        if (!cancelled) {
          setError(err?.message || "Excel file could not be opened.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [report.file, report.fileName]);

  const rowCount = Math.max(worksheet?.rowCount || 1, 1);
  const colCount = Math.max(worksheet?.columnCount || 1, 1);
  const mergeMap = useMemo(
    () => (worksheet ? createMergeMap(worksheet) : new Map()),
    [worksheet],
  );

  const selectCell = (row, col) => {
    if (!worksheet) return;
    const cell = worksheet.getCell(row, col);
    setSelectedCell({ row, col });
    const rawValue = String(cellToRawValue(cell) ?? "");
    editingOriginalRef.current = rawValue;
    setFormulaText(rawValue);
    setStatus(`${columnLetter(col)}${row} selected`);
  };

  const commitValue = (row, col, value) => {
    if (!workbook || !worksheet) return;

    const cell = worksheet.getCell(row, col);
    const nextValue = String(value ?? "");
    const isFormulaCell =
      cell.value &&
      typeof cell.value === "object" &&
      cell.value.formula !== undefined;

    /*
      A formula cell is an output. Never replace it with its displayed result.
      Formula editing is done through the formula bar.
    */
    if (isFormulaCell) {
      const typed = nextValue.trim();
      const currentFormula = `=${cell.value.formula}`.trim();

      if (typed === currentFormula) return;

      return;
    }

    const trimmed = nextValue.trim();

    /*
      Convert numeric input back to a JavaScript number. If we leave it as a
      string, SUM()/arithmetic formulas may not behave like Excel.
    */
    if (trimmed === "") {
      cell.value = null;
    } else if (trimmed.startsWith("=")) {
      cell.value = { formula: trimmed.slice(1) };
    } else if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed.replace(/,/g, ""))) {
      cell.value = Number(trimmed.replace(/,/g, ""));
    } else {
      cell.value = nextValue;
    }

    /*
      CRITICAL:
      DATA ENTRY edit
          ↓
      recalculate dependency chain
          ↓
      MPR REPORT formulas update
          ↓
      DASHBOARD formulas update
    */
    recalculateWorkbookFormulas(workbook);

    if (workbook.calculation) {
      workbook.calculation.fullCalcOnLoad = true;
      workbook.calculation.forceFullCalc = true;
      workbook.calculation.calcOnSave = true;
      workbook.calculation.calcMode = "auto";
    }

    setDirty(true);
    setStatus(
      `${columnLetter(col)}${row} updated — all dependent formulas recalculated`,
    );
  };

  const commitFormulaBar = () => {
    if (!selectedCell) return;
    commitValue(selectedCell.row, selectedCell.col, formulaText);
  };

  const saveChanges = async () => {
    if (!workbook || !report) return;

    try {
      setSaving(true);
      setError("");
      setStatus("Recalculating formulas before save...");

      recalculateWorkbookFormulas(workbook);

      if (workbook.calculation) {
        workbook.calculation.fullCalcOnLoad = true;
        workbook.calculation.forceFullCalc = true;
        workbook.calculation.calcOnSave = true;
        workbook.calculation.calcMode = "auto";
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const newFile = new File([buffer], report.fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        lastModified: Date.now(),
      });

      setStatus("Uploading edited Excel file...");

      const responseData = await updateReportFile({
        id: report.id,
        month: report.month,
        financialYear: report.financialYear,
        file: newFile,
      });

      const apiReport = responseData
        ? getReportsFromResponse(responseData)[0]
        : null;

      const updatedReport = {
        ...report,
        ...(apiReport || {}),
        id: report.id,
        month: report.month,
        financialYear: report.financialYear,
        file: newFile,
        fileName: apiReport?.fileName || report.fileName,
        fileSize: newFile.size,
        updatedAt: apiReport?.updatedAt || new Date().toISOString(),
        monthReport: apiReport?.monthReport || report.monthReport,
      };

      setDirty(false);
      setStatus("Changes saved successfully.");
      onSaved(updatedReport);
    } catch (err) {
      console.error("Save Excel error:", err);
      setError(err?.message || "Unable to save the edited Excel file.");
    } finally {
      setSaving(false);
    }
  };

  const downloadCurrent = async () => {
    if (!workbook) return;
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        report.fileName,
      );
    } catch (err) {
      setError("Unable to download the Excel file.");
    }
  };

  return (
    <div className="excel-editor-overlay">
      <div className="excel-editor-window">
        <div className="excel-top-header">
          <div className="excel-title-left">
            <div className="excel-logo">X</div>
            <div className="excel-document-name">
              <strong>{report.fileName}</strong>
              <span>
                {dirty
                  ? "Unsaved changes"
                  : `Excel workbook — ${activeSheetName || "Ready"}`}
              </span>
            </div>
          </div>

          <div className="excel-top-actions">
            <button
              type="button"
              className="excel-save-button"
              onClick={saveChanges}
              disabled={!dirty || saving}
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
            <button
              type="button"
              className="excel-download-button"
              onClick={downloadCurrent}
              disabled={!workbook}
            >
              ⬇ Download
            </button>
            <button
              type="button"
              className="excel-close-button"
              onClick={() => {
                if (
                  dirty &&
                  !window.confirm(
                    "You have unsaved changes. Close without saving?",
                  )
                )
                  return;
                onClose();
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="excel-ribbon">
          <div className="excel-ribbon-group">
            <button type="button" onClick={() => formulaRef.current?.focus()}>
              fx
            </button>
            <span className="excel-ribbon-label">Formula</span>
          </div>
          <div className="excel-ribbon-divider" />
          <div className="excel-ribbon-info">
            <span>
              {selectedCell
                ? `${columnLetter(selectedCell.col)}${selectedCell.row}`
                : "Select a cell"}
            </span>
            <span>📄 {activeSheetName || worksheet?.name || "Sheet"}</span>
          </div>
          <div className="excel-ribbon-status">{status || "Ready"}</div>
        </div>

        <div className="excel-formula-row">
          <div className="excel-name-box">
            {selectedCell
              ? `${columnLetter(selectedCell.col)}${selectedCell.row}`
              : ""}
          </div>
          <div className="excel-formula-label">fx</div>
          <input
            ref={formulaRef}
            className="excel-formula-input"
            value={formulaText}
            onChange={(e) => setFormulaText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitFormulaBar();
              }
            }}
            placeholder="Select a cell to edit its value or formula"
          />
        </div>

        {error && (
          <div className="excel-editor-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="excel-editor-loading">
            <div className="excel-spinner" />
            <h3>Opening Excel Workbook...</h3>
            <p>
              Loading DATA ENTRY, formulas, MPR REPORT and dashboard sheets.
            </p>
          </div>
        ) : (
          <div className="excel-workspace">
            <div className="excel-grid-scroll">
              <table className="excel-edit-grid">
                <colgroup>
                  <col className="excel-row-number-column" />
                  {Array.from({ length: colCount }, (_, i) => (
                    <col
                      key={i + 1}
                      style={{
                        width: `${Math.max(35, (worksheet.getColumn(i + 1).width || 10) * 7)}px`,
                      }}
                    />
                  ))}
                </colgroup>

                <thead>
                  <tr>
                    <th className="excel-corner-cell" />
                    {Array.from({ length: colCount }, (_, i) => {
                      const column = worksheet.getColumn(i + 1);
                      return (
                        <th
                          key={i + 1}
                          className="excel-column-header"
                          style={{
                            display: column.hidden ? "none" : "table-cell",
                          }}
                        >
                          {columnLetter(i + 1)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {Array.from({ length: rowCount }, (_, r) => {
                    const rowNumber = r + 1;
                    const row = worksheet.getRow(rowNumber);

                    return (
                      <tr
                        key={rowNumber}
                        style={{
                          height: `${Math.max(18, row.height || 18)}px`,
                          display: row.hidden ? "none" : "table-row",
                        }}
                      >
                        <th className="excel-row-header">{rowNumber}</th>

                        {Array.from({ length: colCount }, (_, c) => {
                          const colNumber = c + 1;
                          const cell = worksheet.getCell(rowNumber, colNumber);
                          const merge = mergeMap.get(
                            `${rowNumber}:${colNumber}`,
                          );

                          if (merge && !merge.isMaster) return null;

                          const selected =
                            selectedCell?.row === rowNumber &&
                            selectedCell?.col === colNumber;

                          return (
                            <td
                              key={`${rowNumber}-${colNumber}`}
                              rowSpan={merge?.rowSpan || 1}
                              colSpan={merge?.colSpan || 1}
                              style={getCellStyle(cell, selected)}
                              className={
                                selected
                                  ? "excel-edit-cell selected"
                                  : "excel-edit-cell"
                              }
                              onClick={() => selectCell(rowNumber, colNumber)}
                              contentEditable={
                                !(
                                  typeof cell.value === "object" &&
                                  cell.value?.formula !== undefined
                                )
                              }
                              suppressContentEditableWarning
                              spellCheck={false}
                              onFocus={() => selectCell(rowNumber, colNumber)}
                              onBlur={(event) => {
                                const isFormulaCell =
                                  cell.value &&
                                  typeof cell.value === "object" &&
                                  cell.value.formula !== undefined;

                                if (!isFormulaCell) {
                                  commitValue(
                                    rowNumber,
                                    colNumber,
                                    event.currentTarget.textContent || "",
                                  );
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                  setTimeout(
                                    () => selectCell(rowNumber + 1, colNumber),
                                    0,
                                  );
                                }
                                if (event.key === "Tab") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                  setTimeout(
                                    () => selectCell(rowNumber, colNumber + 1),
                                    0,
                                  );
                                }
                              }}
                            >
                              {cellToText(cell, workbook, worksheet)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="excel-bottom-bar">
              <div className="excel-sheet-controls" />

              <div className="excel-sheet-tabs">
                {workbook?.worksheets?.map((sheet) => {
                  const isActive = sheet.name === activeSheetName;

                  return (
                    <button
                      key={sheet.name}
                      type="button"
                      className={`excel-sheet-tab ${isActive ? "active" : ""}`}
                      onClick={() => selectWorksheet(sheet.name)}
                      title={`Open ${sheet.name}`}
                    >
                      {String(sheet.name).includes("DATA ENTRY")
                        ? "📝 DATA ENTRY"
                        : String(sheet.name).includes("MPR REPORT")
                          ? "📊 MPR REPORT"
                          : String(sheet.name).includes("DASHBOARD")
                            ? "📈 DASHBOARD"
                            : sheet.name}
                    </button>
                  );
                })}
              </div>

              <div className="excel-zoom">100%</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardTab = ({
  report,
  workbook,
  reports = [],
  aggregateAll = false,
}) => {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const findSheet = (book, names, containsText) => {
      if (!book) return null;
      for (const name of names) {
        const exact = book.getWorksheet(name);
        if (exact) return exact;
      }
      return (
        book.worksheets.find((ws) =>
          String(ws.name || "")
            .toLowerCase()
            .includes(containsText),
        ) || null
      );
    };

    const unwrapExcelValue = (value) => {
      if (value && typeof value === "object") {
        if (Object.prototype.hasOwnProperty.call(value, "result")) {
          return unwrapExcelValue(value.result);
        }
        if (Object.prototype.hasOwnProperty.call(value, "text")) {
          return value.text;
        }
        if (
          Object.prototype.hasOwnProperty.call(value, "richText") &&
          Array.isArray(value.richText)
        ) {
          return value.richText.map((item) => item?.text || "").join("");
        }
      }
      return value;
    };

    const text = (value) =>
      String(unwrapExcelValue(value) ?? "")
        .replace(/\s+/g, " ")
        .trim();

    const normalized = (value) => text(value).toLowerCase();

    const safeNumber = (value) => {
      const raw = unwrapExcelValue(value);
      if (raw === null || raw === undefined || raw === "") return 0;
      if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

      const cleaned = String(raw)
        .replace(/₹/g, "")
        .replace(/,/g, "")
        .replace(/%/g, "")
        .replace(/[()]/g, "")
        .trim();
      const number = Number(cleaned);
      return Number.isFinite(number) ? number : 0;
    };

    const isTotalName = (name) => {
      const value = normalized(name);
      return (
        !value ||
        value === "कुल" ||
        value.includes("कुल योग") ||
        value.includes("ग्रैण्ड योग") ||
        value.includes("grand total") ||
        value === "total" ||
        value.includes("total")
      );
    };

    const findHeaderInfo = (sheet) => {
      if (!sheet) return null;

      let groupRow = 0;
      let subHeaderRow = 0;
      let dataStartRow = 0;

      for (let row = 1; row <= Math.min(sheet.rowCount, 20); row += 1) {
        const rowText = [];
        for (let col = 1; col <= Math.min(sheet.columnCount, 30); col += 1) {
          rowText.push(normalized(sheet.getCell(row, col).value));
        }

        const hasItemHeader = rowText.some(
          (value) =>
            value.includes("मद का नाम") ||
            value === "item" ||
            value.includes("item name") ||
            value.includes("activity"),
        );

        if (hasItemHeader) {
          groupRow = row;
          subHeaderRow = row + 1;
          dataStartRow = row + 2;
          break;
        }
      }

      if (!groupRow) return null;

      const groups = [];
      let currentGroup = "";

      for (let col = 4; col <= sheet.columnCount; col += 1) {
        const groupCell = text(sheet.getCell(groupRow, col).value);
        if (groupCell) currentGroup = groupCell;

        const subHeader = text(sheet.getCell(subHeaderRow, col).value);
        const sub = normalized(subHeader);

        if (!currentGroup) continue;

        const isFinancial =
          sub.includes("वित्तीय") ||
          sub.includes("financial") ||
          sub.includes("finance");

        if (isFinancial) {
          groups.push({
            name: currentGroup,
            financialCol: col,
            total: isTotalName(currentGroup),
          });
        }
      }

      const uniqueGroups = [];
      const seen = new Set();

      for (const item of groups) {
        const key = normalized(item.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        uniqueGroups.push(item);
      }

      return {
        groupRow,
        subHeaderRow,
        dataStartRow,
        groups: uniqueGroups,
      };
    };

    const parseFinancialSummary = (sheet) => {
      const empty = {
        items: new Map(),
        allocatedTotal: 0,
        remainingTotal: 0,
        found: false,
      };

      if (!sheet) return empty;

      let headerRow = 0;
      let allocatedCol = 0;
      let expenditureCol = 0;
      let remainingCol = 0;

      for (let row = 1; row <= Math.min(sheet.rowCount, 100); row += 1) {
        let foundAllocated = 0;
        let foundExpenditure = 0;
        let foundRemaining = 0;

        for (let col = 1; col <= sheet.columnCount; col += 1) {
          const value = normalized(sheet.getCell(row, col).value);

          if (
            value.includes("आवंटित धनराशि") ||
            value.includes("allocated amount") ||
            value.includes("allocated")
          ) {
            foundAllocated = col;
          }

          if (
            value.includes("वित्तीय व्यय") ||
            value.includes("financial expenditure") ||
            value.includes("expenditure")
          ) {
            foundExpenditure = col;
          }

          if (
            value.includes("अवशेष धनराशि") ||
            value.includes("remaining amount") ||
            value.includes("remaining")
          ) {
            foundRemaining = col;
          }
        }

        if (foundAllocated && foundExpenditure && foundRemaining) {
          headerRow = row;
          allocatedCol = foundAllocated;
          expenditureCol = foundExpenditure;
          remainingCol = foundRemaining;
          break;
        }
      }

      if (!headerRow) return empty;

      const items = new Map();
      let allocatedTotal = 0;
      let remainingTotal = 0;

      for (let row = headerRow + 1; row <= sheet.rowCount; row += 1) {
        const name = text(sheet.getCell(row, 2).value);
        if (!name) continue;

        const allocated = safeNumber(sheet.getCell(row, allocatedCol).value);
        const expenditure = safeNumber(
          sheet.getCell(row, expenditureCol).value,
        );
        const remaining = safeNumber(sheet.getCell(row, remainingCol).value);

        if (isTotalName(name)) {
          allocatedTotal = allocated;
          remainingTotal = remaining;
          continue;
        }

        items.set(normalized(name), {
          name,
          allocated,
          expenditure,
          remaining,
        });
      }

      return {
        items,
        allocatedTotal,
        remainingTotal,
        found: true,
      };
    };

    const parseWorkbook = async (book, sourceReport) => {
      const mprSheet = findSheet(
        book,
        ["📊 MPR REPORT", "MPR REPORT"],
        "mpr report",
      );

      const dataSheet = findSheet(
        book,
        ["📝 DATA ENTRY", "DATA ENTRY"],
        "data entry",
      );

      const sheet = mprSheet || dataSheet;

      if (!sheet) {
        return {
          schemes: [],
          total: 0,
          beneficiaries: 0,
          hasBeneficiaries: false,
          allocatedTotal: 0,
          remainingTotal: 0,
          financialSummary: [],
          fileName: sourceReport?.fileName || "MPR.xlsx",
        };
      }

      const financialSummary = parseFinancialSummary(sheet);
      const header = findHeaderInfo(sheet);
      const schemes = [];
      let total = 0;
      let totalFound = false;
      let beneficiaries = 0;
      let hasBeneficiaries = false;
      let beneficiaryColumnUsed = null;

      if (header) {
        const itemColumn = 2;
        const serialColumn = 1;

        for (let row = 1; row <= Math.min(sheet.rowCount, 15); row += 1) {
          for (let col = 1; col <= sheet.columnCount; col += 1) {
            const cellText = normalized(sheet.getCell(row, col).value);
            if (
              cellText.includes("लाभार्थी") ||
              cellText.includes("beneficiar")
            ) {
              hasBeneficiaries = true;
              break;
            }
          }
          if (hasBeneficiaries) break;
        }

        const beneficiaryCol = hasBeneficiaries
          ? (() => {
              for (let col = 1; col <= sheet.columnCount; col += 1) {
                for (
                  let row = 1;
                  row <= Math.min(sheet.rowCount, 15);
                  row += 1
                ) {
                  const cellText = normalized(sheet.getCell(row, col).value);
                  if (
                    cellText.includes("लाभार्थी") ||
                    cellText.includes("beneficiar")
                  ) {
                    return col;
                  }
                }
              }
              return null;
            })()
          : null;

        beneficiaryColumnUsed = beneficiaryCol;

        const schemeGroups = header.groups.filter((group) => !group.total);
        const totalsGroup = header.groups.find((group) => group.total);

        const schemeMap = new Map();

        for (const group of schemeGroups) {
          schemeMap.set(normalized(group.name), {
            name: group.name,
            value: 0,
          });
        }

        for (let row = header.dataStartRow; row <= sheet.rowCount; row += 1) {
          const serialText = normalized(sheet.getCell(row, serialColumn).value);
          const itemText = normalized(sheet.getCell(row, itemColumn).value);

          if (
            serialText === "कुल" ||
            itemText === "कुल" ||
            itemText.includes("ग्रैण्ड योग") ||
            itemText.includes("grand total")
          ) {
            break;
          }

          const itemName = text(sheet.getCell(row, itemColumn).value);
          const hasRowData = Array.from(
            { length: sheet.columnCount },
            (_, index) => text(sheet.getCell(row, index + 1).value),
          ).some(Boolean);

          if (!hasRowData || !itemName) continue;

          for (const group of schemeGroups) {
            const key = normalized(group.name);
            const entry = schemeMap.get(key);

            if (entry) {
              entry.value += safeNumber(
                sheet.getCell(row, group.financialCol).value,
              );
            }
          }

          if (totalsGroup) {
            total += safeNumber(
              sheet.getCell(row, totalsGroup.financialCol).value,
            );
          }

          if (beneficiaryCol) {
            beneficiaries += safeNumber(
              sheet.getCell(row, beneficiaryCol).value,
            );
          }
        }

        totalFound = Boolean(totalsGroup);

        if (!totalFound) {
          total = [...schemeMap.values()].reduce(
            (sum, item) => sum + item.value,
            0,
          );
        }

        schemes.push(
          ...[...schemeMap.values()].map((item) => {
            const summaryItem = financialSummary.items.get(
              normalized(item.name),
            );

            return {
              ...item,
              allocated: summaryItem?.allocated ?? 0,
              remaining: summaryItem?.remaining ?? 0,
              sourceFile: sourceReport?.fileName || "",
            };
          }),
        );
      }

      return {
        schemes,
        total,
        beneficiaries,
        hasBeneficiaries: Boolean(beneficiaryColumnUsed || hasBeneficiaries),
        allocatedTotal: financialSummary.allocatedTotal,
        remainingTotal: financialSummary.remainingTotal,
        financialSummary: [...financialSummary.items.values()],
        fileName: sourceReport?.fileName || "MPR.xlsx",
      };
    };

    const buildDashboard = async () => {
      try {
        setError("");
        setDashboard(null);

        let parsedReports = [];

        if (aggregateAll) {
          if (!reports.length) {
            throw new Error(
              "No MPR Excel reports are available for the overall dashboard.",
            );
          }

          const results = await Promise.all(
            reports.map(async (item) => {
              const file = await fetchReportFile(item);
              const book = await workbookFromFile(file);
              return parseWorkbook(book, item);
            }),
          );

          parsedReports = results;
        } else if (workbook && report) {
          parsedReports = [await parseWorkbook(workbook, report)];
        } else {
          return;
        }

        if (cancelled) return;

        const schemeMap = new Map();
        let total = 0;
        let allocatedTotal = 0;
        let remainingTotal = 0;
        let beneficiaries = 0;
        let hasBeneficiaries = false;

        for (const parsed of parsedReports) {
          total += safeNumber(parsed.total);
          allocatedTotal += safeNumber(parsed.allocatedTotal);
          remainingTotal += safeNumber(parsed.remainingTotal);
          beneficiaries += safeNumber(parsed.beneficiaries);
          hasBeneficiaries = hasBeneficiaries || parsed.hasBeneficiaries;

          for (const scheme of parsed.schemes) {
            const key = normalized(scheme.name);
            if (!key) continue;

            const existing = schemeMap.get(key);

            if (existing) {
              existing.value += safeNumber(scheme.value);
              existing.allocated += safeNumber(scheme.allocated);
              existing.remaining += safeNumber(scheme.remaining);
            } else {
              schemeMap.set(key, {
                name: scheme.name,
                value: safeNumber(scheme.value),
                allocated: safeNumber(scheme.allocated),
                remaining: safeNumber(scheme.remaining),
              });
            }
          }
        }

        const schemes = [...schemeMap.values()]
          .filter((item) => Number(item.value) > 0)
          .sort((a, b) => b.value - a.value);

        setDashboard({
          source: aggregateAll ? "ALL_REPORTS" : "SELECTED_REPORT",
          values: {
            total,
            allocated: allocatedTotal,
            remaining: remainingTotal,
            beneficiaries,
          },
          schemes,
          reportCount: parsedReports.length,
          title: "MPR Dashboard",
          subtitle: aggregateAll
            ? `Overall Summary • ${parsedReports.length} MPR Reports`
            : `${getMonthName(report?.month)} • FY ${report?.financialYear || ""}`.trim(),
        });
      } catch (err) {
        console.error("Dashboard build error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to create dashboard from the selected Excel report(s).",
          );
          setDashboard(null);
        }
      }
    };

    buildDashboard();

    return () => {
      cancelled = true;
    };
  }, [aggregateAll, report, reports, workbook]);

  if (error) {
    return <div className="mpr-dashboard-error">{error}</div>;
  }

  if (!dashboard) {
    return (
      <div className="mpr-dashboard-loading">
        <div className="mpr-loading-small" />
        <p>
          {aggregateAll
            ? "Reading all MPR Excel reports and creating overall dashboard..."
            : "Reading selected Excel report and creating dashboard..."}
        </p>
      </div>
    );
  }

  const formatValue = (value) => {
    // Keep genuinely missing dashboard values blank. Only actual numeric
    // values/calculated totals are formatted to exactly 2 decimal places.
    if (value === null || value === undefined || String(value).trim() === "") {
      return "";
    }

    const number = Number(value);
    if (!Number.isFinite(number)) return "";

    return number.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCompact = (value) => {
    const number = Number(value || 0);

    if (Math.abs(number) >= 10000000) {
      return `${(number / 10000000).toFixed(1)}Cr`;
    }

    if (Math.abs(number) >= 100000) {
      return `${(number / 100000).toFixed(1)}L`;
    }

    if (Math.abs(number) >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    }

    return number.toFixed(0);
  };

  const cards = [
    ["कुल वित्तीय उपलब्धि", dashboard.values.total, "₹", true],
    ...dashboard.schemes.map((scheme) => [
      scheme.name,
      scheme.value,
      "₹",
      false,
    ]),
  ];

  if (dashboard.values && dashboard.values.beneficiaries > 0) {
    cards.push([
      "कुल लाभार्थी",
      dashboard.values.beneficiaries,
      "लाभार्थी संख्या",
      false,
    ]);
  }

  const chartSchemes = dashboard.schemes.filter((item) => item.value > 0);
  const maxSchemeValue = Math.max(
    ...chartSchemes.map((item) => Number(item.value || 0)),
    1,
  );

  // SVG pie chart geometry. No chart package is required, so existing dependencies
  // and the rest of the application remain untouched.
  const pieTotal = chartSchemes.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  const pieColors = [
    "#2563eb",
    "#0f766e",
    "#7c3aed",
    "#ea580c",
    "#0891b2",
    "#4f46e5",
    "#16a34a",
    "#c026d3",
    "#ca8a04",
    "#475569",
  ];

  const polarToCartesian = (cx, cy, radius, angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(radians),
      y: cy + radius * Math.sin(radians),
    };
  };

  const describeArc = (cx, cy, radius, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      `M ${cx} ${cy}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  };

  let pieAngle = 0;

  const pieSlices = chartSchemes.map((scheme, index) => {
    const share = pieTotal ? Number(scheme.value || 0) / pieTotal : 0;
    const startAngle = pieAngle;
    const endAngle = pieAngle + share * 360;
    pieAngle = endAngle;

    return {
      ...scheme,
      share,
      startAngle,
      endAngle,
      color: pieColors[index % pieColors.length],
    };
  });

  return (
    <div className="mpr-dashboard-page">
      <div className="mpr-dashboard-title">
        <div>
          <span className="mpr-dashboard-title-icon">▦</span>
          {dashboard.title}
        </div>
        <span>{dashboard.subtitle}</span>
      </div>

      <div className="mpr-dashboard-source">
        <div>
          <span className="mpr-dashboard-source-label">Data source</span>
          <strong>
            {dashboard.source === "ALL_REPORTS"
              ? `All matching MPR Excel Reports (${dashboard.reportCount})`
              : report?.fileName || "Selected MPR Report"}
          </strong>
        </div>
        <span className="mpr-dashboard-source-type">
          {dashboard.source === "ALL_REPORTS" ? "OVERALL" : "SELECTED REPORT"}
        </span>
      </div>

      {dashboard.schemes.length === 0 ? (
        <div className="mpr-dashboard-error">
          No scheme/yojna financial columns were found in this Excel report.
        </div>
      ) : (
        <>
          <div
            className="mpr-dashboard-summary-grid"
            style={{
              "--mpr-card-columns": Math.min(Math.max(cards.length, 1), 7),
            }}
          >
            {cards.map(([label, value, unit, isTotal], index) => (
              <div
                key={`${label}-${index}`}
                className={`mpr-dashboard-summary-card ${
                  isTotal ? "main-total" : ""
                }`}
              >
                <div className="mpr-dashboard-card-top">
                  <span className="mpr-dashboard-card-dot" />
                  <span className="mpr-dashboard-card-label">{label}</span>
                </div>
                <div className="mpr-dashboard-card-value">
                  {formatValue(value)}
                </div>
                <div className="mpr-dashboard-card-unit">{unit}</div>
              </div>
            ))}
          </div>

          {/* Professional chart row: exactly 6/6 on desktop. */}

          <div className="mpr-dashboard-table-card">
            <div className="mpr-dashboard-table-title">
              <div>
                <span className="mpr-dashboard-section-icon">▤</span>
                योजना-वार वित्तीय उपलब्धि
              </div>
              <span>{chartSchemes.length} योजनाएँ</span>
            </div>

            <div className="mpr-dashboard-table-wrap">
              <table className="mpr-dashboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>योजना</th>
                    <th>आवंटित धनराशि (₹ )</th>
                    <th>वित्तीय व्यय (₹ )</th>
                    <th>अवशेष धनराशि (₹ )</th>
                    <th>कुल %</th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.schemes.map((scheme, index) => {
                    const share = dashboard.values.total
                      ? (Number(scheme.value || 0) /
                          Number(dashboard.values.total)) *
                        100
                      : 0;

                    return (
                      <tr key={`${scheme.name}-${index}`}>
                        <td>
                          <span className="mpr-dashboard-rank">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </td>
                        <td>{scheme.name}</td>
                        <td>₹ {formatValue(scheme.allocated)}</td>
                        <td>₹ {formatValue(scheme.value)}</td>
                        <td>₹ {formatValue(scheme.remaining)}</td>
                        <td>
                          <div className="mpr-dashboard-share-cell">
                            <span>{share.toFixed(1)}%</span>
                            <div className="mpr-dashboard-share-track">
                              <div
                                className="mpr-dashboard-share-fill"
                                style={{ width: `${Math.min(share, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="mpr-dashboard-total-row">
                    <td />
                    <td>कुल</td>
                    <td>₹ {formatValue(dashboard.values.allocated)}</td>
                    <td>₹ {formatValue(dashboard.values.total)}</td>
                    <td>₹ {formatValue(dashboard.values.remaining)}</td>
                    <td>100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mpr-dashboard-chart-grid">
            <section className="mpr-dashboard-chart-card">
              <div className="mpr-dashboard-chart-header">
                <div>
                  <h3>योजना-वार वित्तीय वितरण</h3>
                  <p>Scheme-wise share of total financial achievement</p>
                </div>
                <span className="mpr-dashboard-chart-badge">
                  {chartSchemes.length} योजनाएँ
                </span>
              </div>

              <div className="mpr-dashboard-pie-layout">
                <div className="mpr-dashboard-pie-wrap">
                  <svg
                    className="mpr-dashboard-pie"
                    viewBox="0 0 220 220"
                    role="img"
                    aria-label="Scheme-wise financial distribution pie chart"
                  >
                    <circle cx="110" cy="110" r="84" fill="#f8fafc" />

                    {pieSlices.map((slice, index) => (
                      <path
                        key={`${slice.name}-${index}`}
                        d={describeArc(
                          110,
                          110,
                          84,
                          slice.startAngle,
                          slice.endAngle,
                        )}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth="3"
                      />
                    ))}

                    <circle cx="110" cy="110" r="53" fill="#ffffff" />

                    <text
                      x="110"
                      y="104"
                      textAnchor="middle"
                      className="mpr-dashboard-pie-total"
                    >
                      {formatCompact(pieTotal)}
                    </text>

                    <text
                      x="110"
                      y="122"
                      textAnchor="middle"
                      className="mpr-dashboard-pie-label"
                    >
                      ₹
                    </text>
                  </svg>
                </div>

                <div className="mpr-dashboard-legend">
                  {pieSlices.map((slice, index) => (
                    <div
                      className="mpr-dashboard-legend-item"
                      key={`${slice.name}-legend-${index}`}
                    >
                      <span
                        className="mpr-dashboard-legend-dot"
                        style={{ background: slice.color }}
                      />
                      <span className="mpr-dashboard-legend-name">
                        {slice.name}
                      </span>
                      <strong>{(slice.share * 100).toFixed(1)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mpr-dashboard-chart-card">
              <div className="mpr-dashboard-chart-header">
                <div>
                  <h3>योजना-वार वित्तीय उपलब्धि</h3>
                  <p>Direct comparison of financial achievement</p>
                </div>
                <span className="mpr-dashboard-chart-badge">₹ </span>
              </div>

              <div className="mpr-dashboard-bar-chart">
                {chartSchemes.map((scheme, index) => {
                  const value = Number(scheme.value || 0);
                  const width = Math.max(
                    value > 0 ? (value / maxSchemeValue) * 100 : 0,
                    value > 0 ? 3 : 0,
                  );

                  return (
                    <div
                      className="mpr-dashboard-bar-row"
                      key={`${scheme.name}-bar-${index}`}
                    >
                      <div
                        className="mpr-dashboard-bar-label"
                        title={scheme.name}
                      >
                        {scheme.name}
                      </div>

                      <div className="mpr-dashboard-bar-track">
                        <div
                          className="mpr-dashboard-bar-fill"
                          style={{
                            width: `${width}%`,
                            "--bar-delay": `${index * 45}ms`,
                          }}
                        />
                      </div>

                      <div className="mpr-dashboard-bar-value">
                        {formatValue(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

const MonthReport = () => {
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedWorkbook, setSelectedWorkbook] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const [month, setMonth] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Default Dashboard/MPR view to the current calendar month.
  // Blank year means no financial-year restriction until the user selects one.
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const fileInputRef = useRef(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(API_URL);
      const apiReports = getReportsFromResponse(data);
      setReports(apiReports);

      // IMPORTANT: Keep the reports EXACTLY in the sequence returned by the API.
      // The MPR Report tab displays this same sequence. Filters only create a
      // derived view and never reorder the original API response.
      setSelectedReport(null);
    } catch (err) {
      console.error("Load MPR reports error:", err);
      setError(err?.message || "Unable to load MPR reports from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedDashboardWorkbook = async () => {
      // Dashboard is based on the currently selected report.
      if (!selectedReport) {
        setSelectedWorkbook(null);
        setDashboardLoading(false);
        return;
      }

      try {
        setDashboardLoading(true);
        setError("");
        const file = await fetchReportFile(selectedReport);
        const workbook = await workbookFromFile(file);
        if (!cancelled) setSelectedWorkbook(workbook);
      } catch (err) {
        console.error("Dashboard workbook load error:", err);
        if (!cancelled) {
          setSelectedWorkbook(null);
          setError(
            err?.message ||
              "Unable to read the selected Excel file for Dashboard.",
          );
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };

    loadSelectedDashboardWorkbook();
    return () => {
      cancelled = true;
    };
  }, [selectedReport?.id]);

  const filteredReports = useMemo(
    () =>
      reports.filter(
        (item) =>
          (!monthFilter || String(item.month) === String(monthFilter)) &&
          (!yearFilter || String(item.financialYear) === String(yearFilter)),
      ),
    [reports, monthFilter, yearFilter],
  );

  const uniqueYears = useMemo(
    () => [
      ...new Set(reports.map((item) => item.financialYear).filter(Boolean)),
    ],
    [reports],
  );

  // The MPR Report tab must show ALL uploaded reports in exactly the same
  // sequence in which the API returns them. Filtering is applied only to the
  // derived `filteredReports` array and never changes `reports` ordering.

  // Dashboard default: when the user has not selected filters, use the
  // current calendar month for the dashboard only. The MPR Report tab still
  // shows every uploaded report. Once a filter is selected, that filter is
  // used normally for both the dashboard selection and report dropdown.
  const dashboardReports = useMemo(() => {
    if (monthFilter || yearFilter) return filteredReports;

    const currentMonth = String(new Date().getMonth() + 1);
    return reports.filter((item) => String(item.month) === currentMonth);
  }, [reports, filteredReports, monthFilter, yearFilter]);

  useEffect(() => {
    // Only perform the initial/default dashboard selection while the
    // Dashboard tab is active. IMPORTANT: once the user manually selects
    // an MPR file, do not replace that selection just because the file
    // belongs to a month different from the default/current month.
    if (activeTab !== "dashboard") return;

    // A manual selection always has priority over the automatic
    // current-month selection.
    if (selectedReport) return;

    if (!dashboardReports.length) {
      setSelectedReport(null);
      return;
    }

    // Preserve API order for the automatic default selection only.
    setSelectedReport(dashboardReports[0]);
  }, [activeTab, dashboardReports, selectedReport?.id]);

  const selectReport = (event) => {
    const id = event.target.value;

    if (!id) {
      setSelectedReport(null);
      return;
    }

    const report = reports.find((item) => String(item.id) === String(id));
    if (!report) return;

    // Keep the current tab. Selecting an MPR file must not unexpectedly
    // navigate the user to the Dashboard tab.
    setSelectedReport(report);
  };

  const resetForm = () => {
    setMonth("");
    setFinancialYear("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAdd = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setError("");
  };

  const validateFile = (file) => {
    if (!file) {
      setError("Please select an Excel file.");
      return false;
    }
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "xlsx") {
      setError("Only .xlsx Excel files are supported.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Maximum Excel file size is 25 MB.");
      return false;
    }
    return true;
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setError("");
    setSuccess("");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (validateFile(file)) setSelectedFile(file);
    else {
      event.target.value = "";
      setSelectedFile(null);
    }
  };

  const saveNewReport = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!month) return setError("Please select Month.");
    if (!financialYear) return setError("Please select Financial Year.");
    if (!validateFile(selectedFile)) return;

    try {
      await workbookFromFile(selectedFile);
      setLoading(true);
      const responseData = await uploadReport({
        month,
        financialYear,
        file: selectedFile,
      });
      // Reload the complete API response after upload instead of prepending
      // the uploaded item. This guarantees that the MPR Report tab always
      // follows the exact server response sequence.
      await loadReports();
      setSuccess("MPR Excel report uploaded successfully to the server.");
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Upload MPR error:", err);
      setError(
        err?.message || "The selected Excel file could not be uploaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (report) => {
    try {
      setError("");
      setSuccess("");
      const file = await fetchReportFile(report);
      setEditingReport({ ...report, file, fileSize: file.size });
      setShowEditor(true);
    } catch (err) {
      console.error("Open MPR error:", err);
      setError(err?.message || "Unable to open the Excel report.");
    }
  };

  const handleEditorSaved = async (updatedReport) => {
    setReports((previous) =>
      previous.map((item) =>
        item.id === updatedReport.id ? updatedReport : item,
      ),
    );
    setSelectedReport(updatedReport);
    setSuccess(
      `${updatedReport.fileName} was replaced with the edited Excel file.`,
    );

    try {
      const file = updatedReport.file || (await fetchReportFile(updatedReport));
      const workbook = await workbookFromFile(file);
      setSelectedWorkbook(workbook);
    } catch (err) {
      console.error("Refresh dashboard after save error:", err);
    }
  };

  const deleteReport = async (id) => {
    if (
      !window.confirm("क्या आप इस MPR Excel report को delete करना चाहते हैं?")
    )
      return;

    try {
      setError("");
      await deleteReportFromApi(id);
      setReports((previous) => previous.filter((item) => item.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setSelectedWorkbook(null);
      }
      setSuccess("MPR Excel report deleted successfully from the server.");
    } catch (err) {
      console.error("Delete MPR error:", err);
      setError(err?.message || "Unable to delete the report from the server.");
    }
  };

  return (
    <div className="month-report-page">
      <style>{`
        .mpr-module-card {
          background: #fff;
          border: 1px solid #dfe5ea;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,.05);
        }
        .mpr-module-toolbar {
          display:flex; justify-content:space-between; align-items:center; gap:16px;
          flex-wrap:wrap; padding:10px 14px; background:#f7f9fb; border-bottom:1px solid #dfe5ea;
        }
        .mpr-main-tabs { display:flex; gap:0; }
        .mpr-main-tab {
          border:1px solid #cfd8df; border-bottom:3px solid transparent; background:#edf1f4;
          color:#23415f; padding:10px 20px; cursor:pointer; font-weight:700; font-size:14px;
        }
        .mpr-main-tab:first-child { border-radius:5px 0 0 5px; }
        .mpr-main-tab:last-child { border-radius:0 5px 5px 0; }
        .mpr-main-tab.active { background:#1a5276; color:#fff; border-color:#1a5276; }
        .mpr-file-filters { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .mpr-file-filters select {
          min-width:145px; height:36px; padding:0 9px; border:1px solid #c9d3dc; border-radius:5px;
          background:#fff; color:#243b53; font-size:13px; outline:none;
        }
        .mpr-file-filters select:last-child { min-width:330px; }
        .mpr-file-filters select:focus { border-color:#1a5276; box-shadow:0 0 0 2px rgba(26,82,118,.1); }
        .mpr-selected-file-bar {
          display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
          padding:8px 14px; background:#ebf5fb; border-bottom:1px solid #d5e6f0; color:#1b2631; font-size:13px;
        }
        .mpr-selected-file-bar span { color:#1a5276; font-weight:700; }
        .mpr-dashboard-wrapper { background:#fff; }
        .mpr-dashboard-page { width:100%; padding:0; background:#fff; color:#1b2631; font-family:Arial,sans-serif; }
        .mpr-dashboard-title { background:#1a5276; color:#fff; text-align:center; padding:11px 14px 8px; border-bottom:1px solid #154360; font-weight:700; font-size:18px; }
        .mpr-dashboard-source {
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          margin:0 0 14px 0;
          padding:9px 12px;
          background:#f7f9fb;
          border:1px solid #dfe5ea;
          border-radius:6px;
          color:#60758a;
          font-size:12px;
        }
        .mpr-dashboard-source strong {
          color:#173b63;
          font-weight:700;
          word-break:break-word;
        }
        .mpr-dashboard-source-type {
          margin-left:auto;
          padding:3px 8px;
          border-radius:12px;
          background:#e8f2fb;
          color:#1a5276;
          font-weight:700;
        }

        .mpr-dashboard-title span { display:block; margin-top:4px; font-size:12px; font-weight:600; color:#eaf5fb; }
        .mpr-dashboard-summary-grid { display:grid; grid-template-columns:repeat(var(--mpr-card-columns, 7),minmax(0,1fr)); gap:0; border-bottom:1px solid #cbd5dc; }
        .mpr-dashboard-summary-card { min-width:0; }
        .mpr-dashboard-summary-card { min-height:102px; padding:13px 8px 10px; text-align:center; background:#f8f9fa; border-right:1px solid #cbd5dc; }
        .mpr-dashboard-summary-card:last-child { border-right:0; }
        .mpr-dashboard-summary-card.main-total { background:#d5f5e3; }
        .mpr-dashboard-card-label { color:#1a5276; font-size:12px; font-weight:700; min-height:32px; display:flex; align-items:center; justify-content:center; }
        .mpr-dashboard-card-value { margin-top:6px; font-size:20px; font-weight:800; color:#1b2631; }
        .mpr-dashboard-summary-card.main-total .mpr-dashboard-card-value { color:#1e8449; }
        .mpr-dashboard-card-unit { margin-top:4px; font-size:10px; color:#596a79; }
        .mpr-dashboard-table-card { margin:16px; border:1px solid #d7dee4; }
        .mpr-dashboard-table-title { background:#1a5276; color:#fff; padding:8px 12px; font-size:13px; font-weight:700; }
        .mpr-dashboard-table-scroll { overflow-x:auto; }
        .mpr-dashboard-table { width:100%; border-collapse:collapse; font-size:13px; }
        .mpr-dashboard-table th { background:#154360; color:#fff; padding:8px 10px; text-align:left; border:1px solid #fff; }
        .mpr-dashboard-table td { padding:8px 10px; border:1px solid #d7dee4; }
        .mpr-dashboard-table td:nth-child(3),
        .mpr-dashboard-table td:nth-child(4),
        .mpr-dashboard-table td:nth-child(5),
        .mpr-dashboard-table td:nth-child(3),
        .mpr-dashboard-table td:nth-child(4),
        .mpr-dashboard-table td:nth-child(5),
        .mpr-dashboard-table td:last-child { text-align:right; font-weight:700; }
        .mpr-dashboard-table th:nth-child(3),
        .mpr-dashboard-table th:nth-child(4),
        .mpr-dashboard-table th:nth-child(5) { text-align:right; }
        .mpr-dashboard-table tbody tr:nth-child(even) { background:#f8f9fa; }
        .mpr-dashboard-loading { padding:70px 20px; text-align:center; color:#5d7083; }
        .mpr-dashboard-error { padding:45px 20px; text-align:center; color:#b42318; background:#fff5f5; }
        @media (max-width:1100px) { .mpr-dashboard-summary-grid { --mpr-card-columns:4; } .mpr-dashboard-summary-card { border-bottom:1px solid #cbd5dc; } .mpr-file-filters select:last-child { min-width:260px; } }
        @media (max-width:700px) { .mpr-dashboard-summary-grid { --mpr-card-columns:2; } .mpr-main-tabs { width:100%; } .mpr-main-tab { flex:1; padding:9px 10px; } .mpr-file-filters { width:100%; } .mpr-file-filters select, .mpr-file-filters select:last-child { min-width:100%; width:100%; } .mpr-dashboard-card-value { font-size:17px; } .mpr-dashboard-table-card { margin:10px; } }
      `}</style>
      <div className="month-report-container">
        <div className="month-report-header">
          <div>
            <h2>Monthly Progress Report</h2>
            <p>Upload, view and edit your Excel MPR directly in the browser.</p>
          </div>
          <button type="button" className="mpr-add-btn" onClick={openAdd}>
            + Add MPR Report
          </button>
        </div>

        {success && (
          <div className="mpr-alert mpr-success">
            {success}
            <button type="button" onClick={() => setSuccess("")}>
              ×
            </button>
          </div>
        )}

        {error && !showModal && !showEditor && (
          <div className="mpr-alert mpr-error">
            {error}
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        <div className="mpr-module-card">
          <div className="mpr-module-toolbar">
            <div className="mpr-main-tabs">
              <button
                type="button"
                className={
                  activeTab === "dashboard"
                    ? "mpr-main-tab active"
                    : "mpr-main-tab"
                }
                onClick={() => setActiveTab("dashboard")}
              >
                📈 Dashboard
              </button>
              <button
                type="button"
                className={
                  activeTab === "mpr" ? "mpr-main-tab active" : "mpr-main-tab"
                }
                onClick={() => setActiveTab("mpr")}
              >
                📊 MPR Report
              </button>
            </div>

            <div className="mpr-file-filters">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="">Select Month</option>
                {months.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">Select Financial Year</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={selectedReport?.id || ""}
                onChange={selectReport}
                disabled={!filteredReports.length}
              >
                <option value="">Select MPR Excel File</option>
                {filteredReports.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getMonthName(item.month)} — {item.financialYear} —{" "}
                    {item.fileName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeTab === "dashboard" ? (
            <div className="mpr-dashboard-wrapper">
              <div className="mpr-selected-file-bar">
                <div>
                  <strong>Dashboard for:</strong>{" "}
                  {selectedReport?.fileName || "No MPR Report Selected"}
                </div>
                <span>
                  {selectedReport
                    ? `${getMonthName(selectedReport.month)} · ${selectedReport.financialYear}`
                    : "No report available for the selected month / year"}
                </span>
              </div>

              {dashboardLoading ? (
                <div className="mpr-dashboard-loading">
                  <div className="mpr-loading-small" />
                  <p>Reading Excel data and creating dashboard...</p>
                </div>
              ) : !selectedReport ? (
                <div className="mpr-empty">
                  <div className="mpr-empty-icon">📈</div>
                  <h4>No MPR Report Found</h4>
                  <p>
                    No Excel report matches the selected Month / Financial Year.
                  </p>
                </div>
              ) : (
                <DashboardTab
                  report={selectedReport}
                  workbook={selectedWorkbook}
                  reports={dashboardReports}
                  aggregateAll={false}
                />
              )}
            </div>
          ) : (
            <div className="mpr-table-wrapper">
              {loading ? (
                <div className="mpr-empty">
                  <div className="mpr-loading-small" />
                  <p>Loading MPR reports from server...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="mpr-empty">
                  <div className="mpr-empty-icon">📊</div>
                  <h4>No MPR Reports Uploaded</h4>
                  <p>Upload an .xlsx workbook to create the MPR report.</p>
                  <button
                    type="button"
                    className="mpr-empty-btn"
                    onClick={openAdd}
                  >
                    + Upload Excel Report
                  </button>
                </div>
              ) : (
                <table className="mpr-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Month</th>
                      <th>Financial Year</th>
                      <th>MPR Excel File</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          <span className="mpr-month-badge">
                            {getMonthName(item.month)}
                          </span>
                        </td>
                        <td>{item.financialYear}</td>
                        <td>
                          <div className="mpr-file-cell">
                            <div className="mpr-file-icon">X</div>
                            <div>
                              <strong>{item.fileName}</strong>
                              <small>{formatSize(item.fileSize)}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {new Date(
                            item.updatedAt || item.createdAt,
                          ).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <div className="mpr-actions">
                            <button
                              type="button"
                              className="mpr-view-btn"
                              onClick={() => openReport(item)}
                            >
                              👁 View / Edit
                            </button>
                            <button
                              type="button"
                              className="mpr-delete-btn"
                              onClick={() => deleteReport(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="mpr-modal-overlay">
          <div className="mpr-modal">
            <div className="mpr-modal-header">
              <div>
                <h3>Add MPR Report</h3>
                <p>Select the month, financial year and Excel file.</p>
              </div>
              <button
                type="button"
                className="mpr-close-btn"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveNewReport}>
              <div className="mpr-modal-body">
                <div className="mpr-form-group">
                  <label>
                    Month <span>*</span>
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="">Select Month</option>
                    {months.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mpr-form-group">
                  <label>
                    Financial Year <span>*</span>
                  </label>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                  >
                    <option value="">Select Financial Year</option>
                    {financialYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mpr-form-group">
                  <label>
                    Excel File <span>*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <small>
                      {selectedFile.name} · {formatSize(selectedFile.size)}
                    </small>
                  )}
                </div>

                {error && <div className="mpr-modal-error">{error}</div>}
              </div>

              <div className="mpr-modal-footer">
                <button
                  type="button"
                  className="mpr-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="mpr-submit-btn">
                  Upload & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditor && editingReport && (
        <ExcelEditor
          report={editingReport}
          onClose={() => {
            setShowEditor(false);
            setEditingReport(null);
          }}
          onSaved={async (updated) => {
            await handleEditorSaved(updated);
            setShowEditor(false);
            setEditingReport(null);
          }}
        />
      )}
    </div>
  );
};

export default MonthReport;
