import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CaptureSessionProvider } from "./capture/CaptureSessionContext";
import { MeetingBrainProvider } from "./components/MeetingBrain";
import { MiniCaptureHost } from "./capture/MiniCaptureHost";
import { MiniCapturePage } from "./capture/MiniCapturePage";
import { ConsentModal } from "./components/ConsentModal";
import { EnrollmentPage } from "./features/enrollment/EnrollmentPage";
import { JoinPage } from "./features/join/JoinPage";
import { LibraryPage } from "./features/library/LibraryPage";
import { PeoplePage } from "./features/people/PeoplePage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { RecordPage } from "./features/record/RecordPage";
import { UpcomingPage } from "./features/upcoming/UpcomingPage";
import { MeetingPrepPage } from "./features/upcoming/MeetingPrepPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SimpleFrontPage } from "./features/simple/SimpleFrontPage";
import { SimpleNotePage } from "./features/simple/SimpleNotePage";
import { SimpleNoteResultPage } from "./features/simple/SimpleNoteResultPage";
import { LegacySimpleNoteRedirect } from "./features/simple/LegacySimpleNoteRedirect";
import { SIMPLE_NOTE_PATH } from "./features/simple/simpleCapture";
import { VoiceHotkey } from "./components/VoiceHotkey";
import { TrayBridge } from "./components/TrayBridge";
import { AuthProvider } from "./auth/AuthContext";
import { RedirectIfAuthed, RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./features/auth/LoginPage";
import { AuthCallbackPage } from "./features/auth/AuthCallbackPage";
import { CalendarFlowHost } from "./components/CalendarFlowHost";
import { DesktopShellGate } from "./components/DesktopShellGate";

export function App() {
  return (
    <AuthProvider>
      <MeetingBrainProvider>
        <CaptureSessionProvider>
          <DesktopShellGate>
            <ConsentModal />
            <VoiceHotkey />
            <TrayBridge />
            <CalendarFlowHost />
            <Routes>
              <Route
                path="/login"
                element={
                  <RedirectIfAuthed>
                    <LoginPage />
                  </RedirectIfAuthed>
                }
              />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/mini-capture" element={<MiniCapturePage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<SimpleFrontPage />} />
                  <Route path="simple" element={<Navigate to="/" replace />} />
                  <Route
                    path="simple/note/:meetingId"
                    element={<LegacySimpleNoteRedirect />}
                  />
                  <Route
                    path="simple/note"
                    element={<Navigate to={SIMPLE_NOTE_PATH} replace />}
                  />
                  <Route path="capture" element={<RecordPage />} />
                  <Route path="home/note" element={<SimpleNotePage />} />
                  <Route
                    path="home/note/:meetingId"
                    element={<SimpleNoteResultPage />}
                  />
                  <Route path="upcoming" element={<UpcomingPage />} />
                  <Route
                    path="upcoming/:eventId"
                    element={<MeetingPrepPage />}
                  />
                  <Route path="join" element={<JoinPage />} />
                  <Route path="library" element={<LibraryPage />} />
                  <Route path="library/:id" element={<LibraryPage />} />
                  <Route path="people" element={<PeoplePage />} />
                  <Route path="people/:id" element={<PeoplePage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route
                    path="trust"
                    element={<Navigate to="/settings#trust" replace />}
                  />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="/onboarding" element={<EnrollmentPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <MiniCaptureHost />
          </DesktopShellGate>
        </CaptureSessionProvider>
      </MeetingBrainProvider>
    </AuthProvider>
  );
}
