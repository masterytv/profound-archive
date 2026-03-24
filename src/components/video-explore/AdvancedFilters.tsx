"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Category filter definitions
const EXPERIENCE_TYPES = [
  { value: "nde", label: "NDE" },
  { value: "obe", label: "OBE" },
  { value: "sde", label: "SDE (Shared)" },
  { value: "adc", label: "ADC (After-Death)" },
  { value: "ste", label: "STE (Spiritually Transformative)" },
];

const TONES = [
  { value: "very_positive", label: "Very Positive" },
  { value: "positive", label: "Positive" },
  { value: "mixed", label: "Mixed" },
  { value: "negative", label: "Negative" },
  { value: "very_negative", label: "Very Negative" },
];

const CORE_ELEMENTS = [
  { value: "out_of_body", label: "Out-of-Body" },
  { value: "tunnel", label: "Tunnel" },
  { value: "bright_light", label: "Bright Light" },
  { value: "deceased_relatives", label: "Deceased Relatives" },
  { value: "life_review", label: "Life Review" },
  { value: "being_of_light", label: "Being of Light" },
  { value: "border_boundary", label: "Border/Boundary" },
  { value: "feelings_of_peace", label: "Peace" },
  { value: "cosmic_unity", label: "Cosmic Unity" },
  { value: "time_distortion", label: "Time Distortion" },
  { value: "enhanced_senses", label: "Enhanced Senses" },
  { value: "telepathy", label: "Telepathy" },
  { value: "otherworldly_realm", label: "Other Realm" },
  { value: "knowledge_download", label: "Knowledge Download" },
  { value: "choice_to_return", label: "Choice to Return" },
];

interface AdvancedFiltersProps {
  className?: string;
}

export function AdvancedFilters({ className }: AdvancedFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);

  // Parse current filters from URL
  const activeTypes = (searchParams.get("type") || "").split(",").filter(Boolean);
  const activeTones = (searchParams.get("tone") || "").split(",").filter(Boolean);
  const activeElements = (searchParams.get("elements") || "").split(",").filter(Boolean);

  const minGreyson = parseInt(searchParams.get("minGreyson") || "0", 10);
  const minTransformation = parseInt(searchParams.get("minTransformation") || "0", 10);
  const minVeridical = parseInt(searchParams.get("minVeridical") || "0", 10);
  const minIntensity = parseInt(searchParams.get("minIntensity") || "0", 10);

  // Local slider state for smooth interaction
  const [localGreyson, setLocalGreyson] = useState(minGreyson);
  const [localTransformation, setLocalTransformation] = useState(minTransformation);
  const [localVeridical, setLocalVeridical] = useState(minVeridical);
  const [localIntensity, setLocalIntensity] = useState(minIntensity);

  // Sync local state when URL changes
  useEffect(() => {
    setLocalGreyson(minGreyson);
    setLocalTransformation(minTransformation);
    setLocalVeridical(minVeridical);
    setLocalIntensity(minIntensity);
  }, [minGreyson, minTransformation, minVeridical, minIntensity]);

  // Responsive: collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const toggleListFilter = (paramName: string, value: string, currentValues: string[]) => {
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    updateParams({ [paramName]: newValues.join(",") });
  };

  const commitSlider = (paramName: string, value: number) => {
    updateParams({ [paramName]: value > 0 ? String(value) : "" });
  };

  const hasActiveFilters =
    activeTypes.length > 0 ||
    activeTones.length > 0 ||
    activeElements.length > 0 ||
    minGreyson > 0 ||
    minTransformation > 0 ||
    minVeridical > 0 ||
    minIntensity > 0;

  const clearAll = () => {
    updateParams({
      type: "",
      tone: "",
      elements: "",
      minGreyson: "",
      minTransformation: "",
      minVeridical: "",
      minIntensity: "",
    });
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-5 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto",
        className
      )}
    >
      {/* Mobile toggle */}
      <CollapsibleTrigger
        asChild
        className="lg:hidden w-full cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
      >
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Advanced Filters
          </h2>
          <div className="h-8 w-8 flex items-center justify-center text-slate-400">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Advanced Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      <CollapsibleContent className="space-y-6 pt-2">
        {/* Experience Type */}
        <FilterSection title="Experience Type">
          {EXPERIENCE_TYPES.map((opt) => (
            <CheckboxItem
              key={opt.value}
              label={opt.label}
              checked={activeTypes.includes(opt.value)}
              onToggle={() => toggleListFilter("type", opt.value, activeTypes)}
            />
          ))}
        </FilterSection>

        {/* Tone */}
        <FilterSection title="Tone">
          {TONES.map((opt) => (
            <CheckboxItem
              key={opt.value}
              label={opt.label}
              checked={activeTones.includes(opt.value)}
              onToggle={() => toggleListFilter("tone", opt.value, activeTones)}
            />
          ))}
        </FilterSection>

        {/* Score sliders */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Minimum Scores
          </h3>
          <div className="space-y-5">
            <ScoreSlider
              label="Greyson Scale"
              value={localGreyson}
              min={0}
              max={32}
              onChange={setLocalGreyson}
              onCommit={(val) => commitSlider("minGreyson", val)}
            />
            <ScoreSlider
              label="Transformation"
              value={localTransformation}
              min={0}
              max={50}
              onChange={setLocalTransformation}
              onCommit={(val) => commitSlider("minTransformation", val)}
            />
            <ScoreSlider
              label="Evidence (cvNDE)"
              value={localVeridical}
              min={0}
              max={28}
              onChange={setLocalVeridical}
              onCommit={(val) => commitSlider("minVeridical", val)}
            />
            <ScoreSlider
              label="Intensity"
              value={localIntensity}
              min={0}
              max={10}
              onChange={setLocalIntensity}
              onCommit={(val) => commitSlider("minIntensity", val)}
            />
          </div>
        </div>

        {/* Core Elements */}
        <FilterSection title="Core Elements (must include)">
          <div className="grid grid-cols-2 gap-1">
            {CORE_ELEMENTS.map((el) => (
              <CheckboxItem
                key={el.value}
                label={el.label}
                checked={activeElements.includes(el.value)}
                onToggle={() => toggleListFilter("elements", el.value, activeElements)}
                compact
              />
            ))}
          </div>
        </FilterSection>
      </CollapsibleContent>
    </Collapsible>
  );
}

// --- Sub-components ---

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onToggle,
  compact = false,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 w-full text-left transition-colors cursor-pointer rounded-lg",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
        checked
          ? "text-slate-800 dark:text-slate-200"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
          checked
            ? "bg-blue-600 border-blue-600"
            : "border-slate-300 dark:border-slate-600"
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className={cn("text-sm leading-tight", compact && "text-xs")}>
        {label}
      </span>
    </button>
  );
}

function ScoreSlider({
  label,
  value,
  min,
  max,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  onCommit: (val: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {label}
        </span>
        <span className="text-primary font-bold">{value}+</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        onValueCommit={(val) => onCommit(val[0])}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
