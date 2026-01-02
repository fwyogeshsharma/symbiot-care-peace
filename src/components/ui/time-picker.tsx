import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerProps extends Omit<React.ComponentProps<"input">, "type" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <Input
        type="time"
        className={cn("w-full", className)}
        value={value}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  }
);

TimePicker.displayName = "TimePicker";

export { TimePicker };
