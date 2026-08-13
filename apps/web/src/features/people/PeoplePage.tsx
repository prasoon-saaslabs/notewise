import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { PageMotion } from "../../components/PageMotion";
import { EntityListRail } from "../../components/people/EntityListRail";
import { EntityIntelligencePanel } from "../../components/people/EntityIntelligencePanel";
import { PeopleNetworkOverview } from "../../components/people/PeopleNetworkOverview";

export function PeoplePage() {
  const { id } = useParams();
  const list = useQuery({ queryKey: ["entities"], queryFn: () => api.listEntities() });
  const entities = list.data ?? [];

  return (
    <PageMotion className="nw-page-surface flex h-full min-h-0 gap-3 p-2 md:p-3">
      <EntityListRail entities={entities} selectedId={id} />
      <section className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-[linear-gradient(180deg,#fff_0%,#f8fafc_100%)] p-4 md:p-5">
        {id ? <EntityIntelligencePanel entityId={id} /> : <PeopleNetworkOverview entities={entities} />}
      </section>
    </PageMotion>
  );
}
