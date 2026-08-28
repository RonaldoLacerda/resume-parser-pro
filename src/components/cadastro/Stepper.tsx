import {
  Briefcase,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  MapPin,
  Paperclip,
  Sparkles,
  User,
  BriefcaseBusiness,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ETAPAS = [
  { id: "curriculo", label: "Currículo IA", icon: Sparkles },
  { id: "gerais", label: "Dados Gerais", icon: User },
  { id: "endereco", label: "Endereço", icon: MapPin },
  { id: "experiencias", label: "Experiências", icon: Briefcase },
  { id: "formacao", label: "Formação", icon: GraduationCap },
  { id: "treinamento", label: "Treinamento", icon: CalendarCheck },
  { id: "profissionais", label: "Dados Profissionais", icon: BriefcaseBusiness },
  { id: "conhecimentos", label: "Conhecimentos", icon: ClipboardList },
  { id: "anexos", label: "Anexos", icon: Paperclip },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];

export function Stepper({
  atual,
  onSelecionar,
}: {
  atual: number;
  onSelecionar: (indice: number) => void;
}) {
  return (
    <nav aria-label="Etapas do cadastro" className="overflow-x-auto bg-card px-6 py-6">
      <ol className="mx-auto flex min-w-[860px] items-start justify-between gap-1">
        {ETAPAS.map((etapa, indice) => {
          const ativo = indice <= atual;
          const Icone = etapa.icon;
          return (
            <li key={etapa.id} className="relative flex flex-1 flex-col items-center">
              {indice > 0 ? (
                <span
                  className={cn(
                    "absolute top-6 right-1/2 left-[-50%] h-0.5",
                    indice <= atual ? "bg-primary" : "bg-step-muted/40",
                  )}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                onClick={() => onSelecionar(indice)}
                aria-current={indice === atual ? "step" : undefined}
                className={cn(
                  "relative z-10 flex size-12 cursor-pointer items-center justify-center rounded-full transition-colors",
                  ativo
                    ? "bg-primary text-primary-foreground"
                    : "bg-step-muted text-primary-foreground hover:bg-step-muted/80",
                  indice === atual && "ring-4 ring-primary/25",
                )}
              >
                <Icone className="size-5" />
              </button>
              <span
                className={cn(
                  "mt-2 text-center text-xs font-semibold",
                  indice === atual ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {etapa.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
