'use client'
import { Store } from "@/types/store";
import { Database as LucideDatabase, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StoreIndicatorProps {
  storeName: string | null;
  stores: Store[];
  onStoreSelect: (storeName: string | null) => void;
}

export const StoreIndicator = ({
  storeName,
  stores,
  onStoreSelect,
}: StoreIndicatorProps) => {
  if (!storeName) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <div className="flex items-center justify-center gap-2 rounded-l-full h-full text-sm p-1 cursor-pointer hover:bg-accent">
          <LucideDatabase className="text-primary" />
          <span className="text-primary font-medium">
            {storeName || "Select Store"}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 bg-popover border rounded-xl"
      >
        <DropdownMenuItem
          onClick={() => onStoreSelect(null)}
          className="focus:bg-accent hover:bg-accent rounded-lg m-1 text-popover-foreground"
        >
          {!storeName && <Check className="mr-2 h-4 w-4" />}
          No store
        </DropdownMenuItem>
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => onStoreSelect(store.store_name)}
            className="focus:bg-accent hover:bg-accent rounded-lg m-1 text-popover-foreground"
          >
            {store.store_name === storeName && (
              <Check className="mr-2 h-4 w-4" />
            )}
            {store.store_name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};