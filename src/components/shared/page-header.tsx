"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function PageHeader({
  title,
  description,
  action,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSearchChange !== undefined && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        )}
        {action}
      </div>
    </div>
  );
}
