import { Navigate, useLocation, useParams } from "react-router-dom";
import { SIMPLE_NOTE_PATH } from "./simpleCapture";

export function LegacySimpleNoteRedirect() {
  const { meetingId } = useParams();
  const { search } = useLocation();

  if (meetingId) {
    return <Navigate to={`${SIMPLE_NOTE_PATH}/${meetingId}${search}`} replace />;
  }

  return <Navigate to={SIMPLE_NOTE_PATH} replace />;
}
