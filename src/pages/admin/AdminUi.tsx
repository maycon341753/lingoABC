import { useState } from "react";
import { Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const CrudTable = <T,>({
  columns,
  data,
  renderRow,
}: {
  columns: string[];
  data: T[];
  renderRow: (item: T, i: number) => React.ReactNode;
}) => (
  <div className="bg-card rounded-2xl shadow-card overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((c) => (
              <th key={c} className="text-left p-3 sm:p-4 font-bold text-muted-foreground whitespace-nowrap">
                {c}
              </th>
            ))}
            <th className="text-right p-3 sm:p-4 font-bold text-muted-foreground whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody>{data.map((item, i) => renderRow(item, i))}</tbody>
      </table>
    </div>
  </div>
);

export const ActionButtons = ({
  onView,
  onEdit,
  onDelete,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <td className="p-3 sm:p-4 text-right whitespace-nowrap">
      <div className="flex justify-end gap-2">
        {onView && (
          <button type="button" className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-primary" onClick={onView}>
            <Eye className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button type="button" className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-accent" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button type="button" className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-destructive" onClick={() => setOpen(true)}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {onDelete && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir item</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <DialogFooter className="sm:justify-end">
              <Button variant="outline" className="rounded-xl" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-gradient-hero rounded-xl font-bold"
                type="button"
                onClick={() => {
                  onDelete?.();
                  setOpen(false);
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </td>
  );
};

export const StatusBadge = ({
  active,
  activeLabel = "Ativo",
  inactiveLabel = "Inativo",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) => (
  <span className={`px-2 py-1 rounded-full text-xs font-bold ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
    {active ? activeLabel : inactiveLabel}
  </span>
);
