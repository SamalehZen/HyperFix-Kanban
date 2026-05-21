import { Check, Circle, CircleDot, Search } from "lucide-react";

export const DEFAULT_COLUMNS = [
  { id: "to-do", name: "À faire", icon: Circle },
  { id: "in-progress", name: "En cours", icon: CircleDot },
  { id: "in-review", name: "En revue", icon: Search },
  { id: "done", name: "Terminé", icon: Check },
] as const;
