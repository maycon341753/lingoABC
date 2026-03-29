import { useEffect, useState } from "react";
import { ActionButtons, CrudTable, StatusBadge } from "./AdminUi";
import { supabase } from "@/lib/supabase";

type ModuleRow = {
  id: string;
  title: string;
  subject: string;
  phase: string;
  active: boolean;
};

const ModulesPage = () => {
  const [data, setData] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("modules").select("id,title,subject,phase,active").order("title");
      if (!mounted) return;
      setData(data ?? []);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-display font-extrabold mb-6">Módulos ⚙️</h1>
      {loading ? (
        <p className="text-muted-foreground font-bold">Carregando…</p>
      ) : (
        <CrudTable
          columns={["Título", "Matéria", "Fase", "Status"]}
          data={data}
          renderRow={(m) => (
            <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="p-3 sm:p-4 font-bold">{m.title}</td>
              <td className="p-3 sm:p-4">{m.subject}</td>
              <td className="p-3 sm:p-4">{m.phase}</td>
              <td className="p-3 sm:p-4">
                <StatusBadge active={m.active} />
              </td>
              <ActionButtons />
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default ModulesPage;
