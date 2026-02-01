import { Package, Snowflake, AlertTriangle, Heart, Beef, Wrench, Box, Container } from "lucide-react";
import type { CargoType } from "@shared/schema";

const cargoIcons: Record<CargoType, typeof Package> = {
  general: Package,
  perishable: Snowflake,
  hazardous: AlertTriangle,
  fragile: Heart,
  livestock: Beef,
  machinery: Wrench,
  bulk: Box,
  containerized: Container,
};

const cargoLabels: Record<CargoType, string> = {
  general: "General Cargo",
  perishable: "Perishable Goods",
  hazardous: "Hazardous Materials",
  fragile: "Fragile Items",
  livestock: "Livestock",
  machinery: "Machinery",
  bulk: "Bulk Cargo",
  containerized: "Containerized",
};

export function CargoIcon({ type, className }: { type: CargoType; className?: string }) {
  const Icon = cargoIcons[type];
  return <Icon className={className} />;
}

export function getCargoLabel(type: CargoType): string {
  return cargoLabels[type];
}
