import {
  Bot, Building2, PartyPopper, GraduationCap, Stethoscope,
  UtensilsCrossed, Scissors, Car,
  Mic, Users, Boxes, Network, GitBranch, Search, Globe, Cpu,
} from "lucide-react";

// Per-agent industry icon
const AGENT_ICONS = {
  truecode: Cpu,
  realestate: Building2,
  events: PartyPopper,
  education: GraduationCap,
  healthcare: Stethoscope,
  restaurant: UtensilsCrossed,
  salon: Scissors,
  automotive: Car,
};

export function AgentIcon({ agentKey, size = 24, ...props }) {
  const Ico = AGENT_ICONS[agentKey] || Bot;
  return <Ico size={size} strokeWidth={1.75} {...props} />;
}

// Services shown in the intro montage
export const SERVICES = [
  { label: "Voice Agents", Icon: Mic },
  { label: "CRM", Icon: Users },
  { label: "SaaS", Icon: Boxes },
  { label: "AI Agents", Icon: Bot },
  { label: "Multi-Agent Systems", Icon: Network },
  { label: "DevOps", Icon: GitBranch },
  { label: "SEO", Icon: Search },
  { label: "Websites", Icon: Globe },
];
