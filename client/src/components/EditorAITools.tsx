import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export type AIToolType =
  | "refine"
  | "rewrite"
  | "summarize"
  | "expand"
  | "title"
  | "tone";

interface EditorAIToolsProps {
  onSelect: (type: AIToolType) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const TOOL_ITEMS: { type: AIToolType; label: string }[] = [
  { type: "refine", label: "Improve Writing" },
  { type: "rewrite", label: "Rewrite Professional" },
  { type: "summarize", label: "Summarize" },
  { type: "expand", label: "Expand" },
  { type: "title", label: "Generate Title" },
  { type: "tone", label: "Detect Tone" },
];

export const EditorAITools = ({
  onSelect,
  disabled,
  loading,
  className,
}: EditorAIToolsProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        disabled={disabled || loading}
        className={cn(
          "size-9 flex items-center justify-center rounded-lg transition-colors",
          "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
          "disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        title="AI Tools"
        aria-label="AI writing tools"
      >
        {loading ? (
          <span className="material-symbols-outlined text-[20px] animate-spin">
            progress_activity
          </span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">smart_toy</span>
        )}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        className="min-w-[200px] rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark shadow-xl p-1 z-50"
        sideOffset={6}
        align="end"
      >
        {TOOL_ITEMS.map(({ type, label }) => (
          <DropdownMenuItem
            key={type}
            onSelect={(e) => {
              e.preventDefault();
              onSelect(type);
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10"
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenu>
);
