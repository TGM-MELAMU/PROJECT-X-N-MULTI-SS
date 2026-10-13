import {
  Armchair,
  Beaker,
  FlaskConical,
  Microscope,
  Package,
  Pipette,
  ShieldCheck,
  Stethoscope,
  Tag,
  type LucideProps,
} from "lucide-react";
import type { CategoryIconName } from "@/config/site";

const icons: Record<CategoryIconName, React.ComponentType<LucideProps>> = {
  microscope: Microscope,
  stethoscope: Stethoscope,
  flask: FlaskConical,
  pipette: Pipette,
  shield: ShieldCheck,
  beaker: Beaker,
  armchair: Armchair,
  tag: Tag,
};

export function CategoryIcon({
  name,
  ...props
}: { name?: CategoryIconName } & LucideProps) {
  const Icon = (name && icons[name]) || Package;
  return <Icon strokeWidth={1.6} aria-hidden {...props} />;
}
