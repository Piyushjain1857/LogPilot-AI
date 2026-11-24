import { useState, useCallback } from "react";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const SUPPORTED_EXTENSIONS = [".log", ".txt", ".csv", ".json", ".jsonl", ".ndjson"];

const FORBIDDEN_EXTENSIONS = [
  ".exe", ".bin", ".sh", ".bat", ".cmd", ".msi", ".dll", ".so", ".dylib",
  ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".py", ".js", ".ts", ".c", ".cpp", ".java", ".go", ".rb", ".php"
];

export function useFileValidation() {
  const [validationErrors, setValidationErrors] = useState([]);

  const validateFile = useCallback((file) => {
    const name = file.name.toLowerCase();
    const extMatch = name.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0] : "";

    if (!ext) {
      return {
        isValid: false,
        error: `File "${file.name}" has no extension. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      };
    }

    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      return {
        isValid: false,
        error: `File format "${ext}" is forbidden for security. Executable, archive, and script files are strictly rejected.`,
      };
    }

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return {
        isValid: false,
        error: `Unsupported file extension "${ext}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      };
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: `File "${file.name}" is completely empty (0 bytes).`,
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return {
        isValid: false,
        error: `File "${file.name}" is ${sizeMb} MB, which exceeds the 25 MB limit.`,
      };
    }

    return { isValid: true, error: null };
  }, []);

  const validateFiles = useCallback((fileList) => {
    const valid = [];
    const errors = [];
    const seenNames = new Set();

    for (const file of fileList) {
      if (seenNames.has(file.name)) {
        errors.push(`Duplicate file selected: "${file.name}"`);
        continue;
      }
      seenNames.add(file.name);

      const result = validateFile(file);
      if (result.isValid) {
        valid.push(file);
      } else {
        errors.push(result.error);
      }
    }

    setValidationErrors(errors);
    return { validFiles: valid, errors };
  }, [validateFile]);

  const clearErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  return {
    validateFile,
    validateFiles,
    validationErrors,
    clearErrors,
    supportedExtensions: SUPPORTED_EXTENSIONS,
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  };
}

export default useFileValidation;
