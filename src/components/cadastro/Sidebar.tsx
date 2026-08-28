import {
  Briefcase,
  CalendarDays,
  FileText,
  MapPinned,
  MessageSquare,
  Power,
  UserCog,
  Video,
} from "lucide-react";

const ITENS = [
  { label: "Editar Currículo", icon: UserCog, ativo: true },
  { label: "Vagas", icon: Briefcase },
  { label: "Agendamentos", icon: CalendarDays },
  { label: "Mensagens", icon: MessageSquare },
  { label: "Análises Comportamentais", icon: MapPinned },
  { label: "Provas Online", icon: FileText },
  { label: "Vídeo Entrevista", icon: Video },
  { label: "Sair", icon: Power },
];

export function Sidebar({ nome }: { nome: string }) {
  const inicial = (nome || "Perfil").trim().charAt(0).toUpperCase();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-card lg:flex">
      <div className="flex h-24 items-center justify-center">
        <span className="rounded-md bg-brand px-4 py-2 text-xl font-bold tracking-tight text-brand-foreground">
          Menvie
        </span>
      </div>

      <div className="flex items-center gap-3 bg-muted px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{nome || "Perfil teste"}</p>
          <p className="truncate text-xs text-muted-foreground">Editar Currículo</p>
        </div>
      </div>

      <nav className="mt-3 flex flex-col gap-1 px-3 pb-6">
        {ITENS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={
              item.ativo
                ? "flex cursor-pointer items-center gap-3 rounded-md bg-sidebar-primary px-3 py-2.5 text-left text-sm font-medium text-sidebar-primary-foreground"
                : "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:bg-muted"
            }
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
