import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

export type MultiSelectItem = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  items: MultiSelectItem[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelect = ({ items, selected, onChange, placeholder = "เลือก" }: MultiSelectProps) => {
  const selectedLabels = useMemo(() => {
    const map = new Map(items.map((i) => [i.value, i.label]));
    return selected.map((v) => map.get(v)).filter(Boolean) as string[];
  }, [items, selected]);

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const buttonLabel = selected.length
    ? `${placeholder} • ${selected.length}`
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">{buttonLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command>
          <CommandInput placeholder={`ค้นหา${placeholder}`} />
          <CommandList>
            <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.value} value={item.label} onSelect={() => toggleValue(item.value)}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selected.includes(item.value)} onCheckedChange={() => toggleValue(item.value)} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelect;
