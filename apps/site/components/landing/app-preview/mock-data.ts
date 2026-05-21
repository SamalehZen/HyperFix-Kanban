import type { ExternalLink } from "@/types/external-link";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

// Extended task type – same base Task but with embedded labels and
// optional external links (just like the real API returns them).
export type TaskWithExtras = Task & {
  labels?: Array<{ id: string; name: string; color: string }>;
  externalLinks?: Array<ExternalLink>;
};

// ------------------------------------------------------------------
// Mock workspace
// ------------------------------------------------------------------
export const MOCK_WORKSPACE = {
  id: "ws-preview",
  name: "Atelier HyperFix",
  slug: "dunder",
};

// ------------------------------------------------------------------
// Mock workspace labels
// ------------------------------------------------------------------
export const MOCK_WORKSPACE_LABELS = [
  { id: "lbl-1", name: "urgent", color: "#ef4444" },
  { id: "lbl-2", name: "ventes", color: "#6366f1" },
  { id: "lbl-3", name: "équipe", color: "#10b981" },
  { id: "lbl-4", name: "finance", color: "#f59e0b" },
  { id: "lbl-5", name: "produit", color: "#8b5cf6" },
];

// ------------------------------------------------------------------
// Mock users
// ------------------------------------------------------------------
export const MOCK_USERS = {
  members: [
    { userId: "u-1", user: { name: "Michael Scott", image: null } },
    { userId: "u-2", user: { name: "Dwight Schrute", image: null } },
    { userId: "u-3", user: { name: "Jim Halpert", image: null } },
    { userId: "u-4", user: { name: "Pam Beesly", image: null } },
  ],
};

// ------------------------------------------------------------------
// Helper timestamps / dates
// ------------------------------------------------------------------
const CREATED_AT = "2024-01-01T00:00:00.000Z";
const UPDATED_AT = "2024-07-01T00:00:00.000Z";

const d = (offset: number): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString();
};

// ------------------------------------------------------------------
// Project 1: Lancement web
// ------------------------------------------------------------------
const SCR_ID = "p-1";
const WS_ID = "ws-preview";

const scrTasks: TaskWithExtras[] = [
  {
    id: "t-101",
    number: 1,
    title: "Préparer la réunion de lancement",
    description:
      "Réserver la salle, préparer le support de présentation et valider l'ordre du jour avec l'équipe.",
    priority: "high",
    status: "in-progress",
    position: 1,
    dueDate: d(2),
    userId: "u-1",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Michael Scott",
    assigneeImage: null,
    labels: [{ id: "lbl-3", name: "équipe", color: "#10b981" }],
  },
  {
    id: "t-102",
    number: 2,
    title: "Finaliser le contrat fournisseur",
    description:
      "Comparer les offres, ajuster le budget et confirmer les conditions avant la fin de semaine.",
    priority: "medium",
    status: "in-progress",
    position: 2,
    dueDate: d(5),
    userId: "u-3",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jim Halpert",
    assigneeImage: null,
    labels: [{ id: "lbl-2", name: "ventes", color: "#6366f1" }],
  },
  {
    id: "t-103",
    number: 3,
    title: "Organiser la logistique de l'événement client",
    description:
      "Coordonner les prestataires, gérer les invitations et vérifier le planning d'accueil.",
    priority: "urgent",
    status: "to-do",
    position: 1,
    dueDate: d(-1),
    userId: "u-4",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Pam Beesly",
    assigneeImage: null,
    labels: [{ id: "lbl-1", name: "urgent", color: "#ef4444" }],
  },
  {
    id: "t-104",
    number: 4,
    title: "Mettre à jour la documentation interne",
    description:
      "Retirer les anciennes captures, ajouter les nouveaux flux et publier la version validée.",
    priority: "low",
    status: "to-do",
    position: 2,
    dueDate: d(14),
    userId: "u-2",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Dwight Schrute",
    assigneeImage: null,
    labels: [],
  },
  {
    id: "t-105",
    number: 5,
    title: "Revoir le rapport de dépenses trimestriel",
    description:
      "La finance attend une validation avant la clôture du trimestre.",
    priority: "high",
    status: "in-review",
    position: 1,
    dueDate: d(3),
    userId: "u-3",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jim Halpert",
    assigneeImage: null,
    labels: [{ id: "lbl-4", name: "finance", color: "#f59e0b" }],
  },
  {
    id: "t-106",
    number: 6,
    title: "Terminer la formation sécurité",
    description:
      "Session annuelle obligatoire pour toute l'équipe avant le prochain audit.",
    priority: "medium",
    status: "done",
    position: 1,
    dueDate: null,
    userId: "u-4",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Pam Beesly",
    assigneeImage: null,
    labels: [{ id: "lbl-3", name: "équipe", color: "#10b981" }],
  },
  {
    id: "t-107",
    number: 7,
    title: "Migrer la base de contacts",
    description:
      "Centraliser les contacts, nettoyer les doublons et préparer l'import final.",
    priority: "medium",
    status: "done",
    position: 2,
    dueDate: null,
    userId: "u-2",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Dwight Schrute",
    assigneeImage: null,
    labels: [{ id: "lbl-2", name: "ventes", color: "#6366f1" }],
  },
];

export const WEB_PROJECT: ProjectWithTasks = {
  id: SCR_ID,
  name: "Lancement web",
  slug: "SCR",
  description: "Suivi quotidien du lancement web.",
  icon: null,
  workspaceId: WS_ID,
  isPublic: false,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  columns: [
    {
      id: "to-do",
      name: "À faire",
      order: 0,
      isFinal: false,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "to-do"),
    },
    {
      id: "in-progress",
      name: "En cours",
      order: 1,
      isFinal: false,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "in-progress"),
    },
    {
      id: "in-review",
      name: "En revue",
      order: 2,
      isFinal: false,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "in-review"),
    },
    {
      id: "done",
      name: "Terminé",
      order: 3,
      isFinal: true,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "done"),
    },
  ],
};

// ------------------------------------------------------------------
// Project 2: Refonte mobile
// ------------------------------------------------------------------
const TLM_ID = "p-2";

const tlmTasks: TaskWithExtras[] = [
  {
    id: "t-201",
    number: 1,
    title: "Finaliser le prototype mobile",
    description:
      "Affiner les écrans clés et vérifier les interactions principales avant la revue produit.",
    priority: "high",
    status: "in-progress",
    position: 1,
    dueDate: d(7),
    userId: "u-1",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Michael Scott",
    assigneeImage: null,
    labels: [{ id: "lbl-5", name: "produit", color: "#8b5cf6" }],
  },
  {
    id: "t-202",
    number: 2,
    title: "Réécrire le parcours d'onboarding",
    description:
      "Simplifier les étapes, clarifier les libellés et réduire les champs obligatoires.",
    priority: "high",
    status: "to-do",
    position: 1,
    dueDate: d(10),
    userId: "u-4",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Pam Beesly",
    assigneeImage: null,
    labels: [{ id: "lbl-5", name: "produit", color: "#8b5cf6" }],
  },
  {
    id: "t-203",
    number: 3,
    title: "Relire les messages d'erreur",
    description:
      "Rendre les messages plus utiles et cohérents avec le ton de l'application.",
    priority: "urgent",
    status: "in-review",
    position: 1,
    dueDate: d(1),
    userId: "u-3",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jim Halpert",
    assigneeImage: null,
    labels: [
      { id: "lbl-4", name: "finance", color: "#f59e0b" },
      { id: "lbl-5", name: "produit", color: "#8b5cf6" },
    ],
  },
  {
    id: "t-204",
    number: 4,
    title: "Planifier les tests de recette",
    description:
      "Préparer les scénarios, affecter les testeurs et suivre les retours bloquants.",
    priority: "medium",
    status: "to-do",
    position: 2,
    dueDate: d(21),
    userId: null,
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    labels: [],
  },
  {
    id: "t-205",
    number: 5,
    title: "Valider la séquence de publication",
    description:
      "Confirmer la checklist de mise en production et le plan de retour arrière.",
    priority: "medium",
    status: "done",
    position: 1,
    dueDate: null,
    userId: "u-3",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jim Halpert",
    assigneeImage: null,
    labels: [{ id: "lbl-5", name: "produit", color: "#8b5cf6" }],
  },
];

export const MOB_PROJECT: ProjectWithTasks = {
  id: TLM_ID,
  name: "Refonte mobile",
  slug: "TLM",
  description: "Refonte de l'expérience mobile.",
  icon: null,
  workspaceId: WS_ID,
  isPublic: false,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  columns: [
    {
      id: "to-do",
      name: "À faire",
      order: 0,
      isFinal: false,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "to-do"),
    },
    {
      id: "in-progress",
      name: "En cours",
      order: 1,
      isFinal: false,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "in-progress"),
    },
    {
      id: "in-review",
      name: "En revue",
      order: 2,
      isFinal: false,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "in-review"),
    },
    {
      id: "done",
      name: "Terminé",
      order: 3,
      isFinal: true,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "done"),
    },
  ],
};

export const MOCK_PROJECTS: ProjectWithTasks[] = [WEB_PROJECT, MOB_PROJECT];
