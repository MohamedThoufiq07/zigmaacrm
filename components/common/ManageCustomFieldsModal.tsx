"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Sliders,
  Check,
  AlertCircle,
  ChevronDown,
  Type,
  Hash,
  ListFilter,
  Calendar,
  CheckSquare
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface ManageCustomFieldsModalProps {
  entityType: "LEAD" | "CONTACT" | "DEAL";
  isOpen: boolean;
  onClose: () => void;
  onFieldsChanged?: () => void;
}

export interface CustomFieldDefinition {
  id: string;
  entity_type: "LEAD" | "CONTACT" | "DEAL";
  label: string;
  field_key: string;
  field_type: "TEXT" | "NUMBER" | "SELECT" | "DATE" | "BOOLEAN";
  options?: string[];
  is_required?: boolean;
}

const FIELD_TYPES = [
  { id: "TEXT", label: "Text (Single Line)", icon: <Type className="w-4 h-4 text-slate-500" /> },
  { id: "NUMBER", label: "Number / Metric", icon: <Hash className="w-4 h-4 text-blue-500" /> },
  { id: "SELECT", label: "Dropdown Selection", icon: <ListFilter className="w-4 h-4 text-purple-500" /> },
  { id: "DATE", label: "Calendar Date", icon: <Calendar className="w-4 h-4 text-amber-500" /> },
  { id: "BOOLEAN", label: "Checkbox / Yes-No", icon: <CheckSquare className="w-4 h-4 text-emerald-500" /> }
];

export default function ManageCustomFieldsModal({
  entityType,
  isOpen,
  onClose,
  onFieldsChanged
}: ManageCustomFieldsModalProps) {
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  // New field state
  const [label, setLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<"TEXT" | "NUMBER" | "SELECT" | "DATE" | "BOOLEAN">("TEXT");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [optionsStr, setOptionsStr] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadFields = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomFields(entityType);
      setFields(data || []);
    } catch {
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFields();
    }
  }, [isOpen, entityType]);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    // Auto-generate clean snake_case key in the background
    const clean = val.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    setFieldKey(clean);
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      toast.warning("Validation Error", "Please provide an attribute name/label.");
      return;
    }

    // Auto-derive key if empty
    let finalKey = fieldKey || cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!finalKey) {
      finalKey = `field_${Date.now()}`;
    }

    setSubmitting(true);
    try {
      const opts = fieldType === "SELECT" 
        ? optionsStr.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      await api.createCustomField({
        entity_type: entityType,
        label: cleanLabel,
        field_key: finalKey,
        field_type: fieldType,
        options: opts,
        is_required: isRequired
      });

      toast.success("Attribute Created", `"${cleanLabel}" attribute added to ${entityType.toLowerCase()}s.`);
      setLabel("");
      setFieldKey("");
      setOptionsStr("");
      setIsRequired(false);
      await loadFields();
      if (onFieldsChanged) onFieldsChanged();
    } catch (err: any) {
      console.error(err);
      toast.error("Save Failed", err.message || "Could not save custom field.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async (id: string, name: string) => {
    try {
      await api.deleteCustomField(id, entityType);
      toast.info("Field Removed", `Deleted custom attribute "${name}".`);
      await loadFields();
      if (onFieldsChanged) onFieldsChanged();
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to delete field.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Manage Custom Fields ({entityType})
              </h3>
              <p className="text-xs text-slate-500">
                Define dynamic business schema attributes for {entityType.toLowerCase()}s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Create Field Form */}
          <form onSubmit={handleCreateField} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-3.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Add New Attribute
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Field Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Property Type, GST Number, Budget"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full bg-white text-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Field Type
                </label>
                
                {/* Custom Trigger */}
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown((prev) => !prev)}
                  className={`w-full h-[38px] px-3.5 bg-white text-slate-900 text-xs rounded-xl border flex items-center justify-between font-semibold cursor-pointer shadow-2xs transition-all ${
                    showTypeDropdown
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {FIELD_TYPES.find((t) => t.id === fieldType)?.icon}
                    <span>{FIELD_TYPES.find((t) => t.id === fieldType)?.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      showTypeDropdown ? "rotate-180 text-red-600" : ""
                    }`}
                  />
                </button>

                {/* Custom Popover Dropdown Menu */}
                {showTypeDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowTypeDropdown(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                      {FIELD_TYPES.map((type) => {
                        const isSelected = fieldType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                              setFieldType(type.id as any);
                              setShowTypeDropdown(false);
                            }}
                            className={`w-[calc(100%-8px)] mx-1 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-between text-left ${
                              isSelected
                                ? "bg-red-50 text-red-600 font-bold"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {type.icon}
                              <span>{type.label}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                />
                <span>Mandatory / Required Field</span>
              </label>
            </div>

            {fieldType === "SELECT" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Options (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 BHK, 2 BHK, 3 BHK, Villa"
                  value={optionsStr}
                  onChange={(e) => setOptionsStr(e.target.value)}
                  className="w-full bg-white text-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? "Saving..." : "Add Attribute"}</span>
            </button>
          </form>

          {/* Configured Fields List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Configured Attributes ({fields.length})
              </span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading fields...</div>
            ) : fields.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                No custom fields defined for {entityType.toLowerCase()}s yet. Create your first one above!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {fields.map((f) => (
                  <div key={f.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{f.label}</span>
                        {f.is_required && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                        <span>Type: {f.field_type}</span>
                        {f.options && f.options.length > 0 && (
                          <span>• Options: {f.options.join(", ")}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteField(f.id, f.label)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
