import { PageMotion } from "../../components/PageMotion";
import { UpcomingCallsSection } from "../../components/UpcomingCallsSection";

export function UpcomingPage() {
  return (
    <PageMotion className="nw-page-surface h-full min-h-0 overflow-auto p-3 md:p-5">
      <div className="mx-auto w-full max-w-3xl">
        <UpcomingCallsSection />
      </div>
    </PageMotion>
  );
}
