import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { EntityRecord } from "@notewise/api-client";
import { api } from "../../lib/api";
import { PageMotion } from "../../components/PageMotion";
import { EntityListRail } from "../../components/people/EntityListRail";
import { EntityIntelligencePanel } from "../../components/people/EntityIntelligencePanel";
import { PeopleNetworkOverview } from "../../components/people/PeopleNetworkOverview";
import { CreateEntityModal } from "../../components/people/CreateEntityModal";
import { DeleteEntityModal } from "../../components/people/DeleteEntityModal";

export function PeoplePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EntityRecord | null>(null);

  const list = useQuery({
    queryKey: ["entities"],
    queryFn: () => api.listEntities(),
  });
  const entities = list.data ?? [];

  const create = useMutation({
    mutationFn: (body: {
      name: string;
      kind: EntityRecord["kind"];
      company?: string | null;
    }) => api.createEntity(body),
    onSuccess: (entity) => {
      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ["entities"] });
      navigate(`/people/${entity.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (entityId: string) => api.deleteEntity(entityId),
    onSuccess: (_data, entityId) => {
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["entities"] });
      if (id === entityId) {
        navigate("/people", { replace: true });
      }
    },
  });

  return (
    <PageMotion className="nw-page-surface flex h-full min-h-0 overflow-hidden gap-3 p-2 md:p-3">
      <EntityListRail
        entities={entities}
        selectedId={id}
        onAddClick={() => setCreateOpen(true)}
        onDeleteClick={setDeleteTarget}
      />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--nw-border)] nw-surface-gradient p-4 md:p-5">
        {id ? (
          <EntityIntelligencePanel entityId={id} />
        ) : (
          <PeopleNetworkOverview entities={entities} />
        )}
      </section>

      <CreateEntityModal
        open={createOpen}
        onClose={() => !create.isPending && setCreateOpen(false)}
        onSubmit={(body) => create.mutate(body)}
        pending={create.isPending}
        error={
          create.isError
            ? (create.error as Error)?.message || "Could not create contact"
            : null
        }
      />

      <DeleteEntityModal
        open={Boolean(deleteTarget)}
        name={deleteTarget?.name ?? ""}
        onClose={() => !remove.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        pending={remove.isPending}
        error={
          remove.isError
            ? (remove.error as Error)?.message || "Could not delete contact"
            : null
        }
      />
    </PageMotion>
  );
}
