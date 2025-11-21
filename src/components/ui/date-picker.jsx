import { Calendar } from "lucide-react"
import { cn } from "../../lib/utils"

export function DatePicker({ value, onChange, className, placeholder = "选择日期" }) {
    return (
        <div className={cn("relative w-full", className)}>
            {/* Visual Layer */}
            <div
                className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background",
                    "focus-within:ring-1 focus-within:ring-ring",
                    !value && "text-muted-foreground"
                )}
            >
                <span className="truncate">{value || placeholder}</span>
                <Calendar className="h-4 w-4 opacity-50" />
            </div>

            {/* Functional Layer (Invisible Native Input) */}
            <input
                type="date"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                value={value || ""}
                onChange={onChange}
                onClick={(e) => {
                    try {
                        e.target.showPicker()
                    } catch (err) { }
                }}
            />
        </div>
    )
}
