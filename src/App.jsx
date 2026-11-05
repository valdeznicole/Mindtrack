import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useDB, setHandlers, startLiveSync } from './lib/store';
import { useRoute, navigate, matchPath } from './lib/router';
import { touchSession, isIdle, logout as apiLogout, ping, sayAway } from './lib/auth';
import { setThemeActive } from './lib/theme';
import { FeedbackProvider, useFeedback } from './components/ui';
import Layout from './components/Layout';

import Landing from './pages/auth/Landing';
import Welcome from './pages/auth/Welcome';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

import Home from './pages/student/Home';
import MoodPage from './pages/student/Mood';
import Progress from './pages/student/Progress';
import WellnessSpace from './pages/student/WellnessSpace';
import Breathing from './pages/student/Breathing';
import BubblePop from './pages/student/BubblePop';
import Challenges from './pages/student/Challenges';
import Survey from './pages/student/Survey';
import SurveyResult from './pages/student/SurveyResult';
import Journal from './pages/student/Journal';
import JournalEditor from './pages/student/JournalEditor';
import JournalView from './pages/student/JournalView';
import Appointments from './pages/student/Appointments';
import BookAppointment from './pages/student/BookAppointment';
import Notifications from './pages/shared/Notifications';
import Profile from './pages/student/Profile';

import Dashboard from './pages/counselor/Dashboard';
import Students from './pages/counselor/Students';
import StudentProfile from './pages/counselor/StudentProfile';
import MoodOverview from './pages/counselor/MoodOverview';
import WellnessOverview from './pages/counselor/WellnessOverview';
import NeedsReview from './pages/counselor/NeedsReview';
import CounselorAppointments from './pages/counselor/CounselorAppointments';
import SharedJournals from './pages/counselor/SharedJournals';
import Activities from './pages/counselor/Activities';
import Settings from './pages/counselor/Settings';
import Staff from './pages/counselor/Staff';
import SurveyManager from './pages/counselor/SurveyManager';

const STUDENT_ROUTES = [
  ['/s/home', Home],
  ['/s/mood', MoodPage],
  ['/s/progress', Progress],
  ['/s/wellness', WellnessSpace],
  ['/s/breathe', Breathing, true],
  ['/s/bubbles', BubblePop, true],
  ['/s/challenges', Challenges],
  ['/s/survey', Survey],
  ['/s/survey/result/:id', SurveyResult],
  ['/s/journal', Journal],
  ['/s/journal/new', JournalEditor],
  ['/s/journal/:id', JournalView],
  ['/s/journal/:id/edit', JournalEditor],
  ['/s/appointments', Appointments],
  ['/s/appointments/book', BookAppointment],
  ['/s/notifications', Notifications],
  ['/s/profile', Profile],
];

const COUNSELOR_ROUTES = [
  ['/c/dashboard', Dashboard],
  ['/c/students', Students],
  ['/c/students/:id', StudentProfile],
  ['/c/mood', MoodOverview],
  ['/c/wellness', WellnessOverview],
  ['/c/review', NeedsReview],
  ['/c/wellness-check', SurveyManager],
  ['/c/wellness-check/:id', SurveyManager],
  ['/c/appointments', CounselorAppointments],
  ['/c/journals', SharedJournals],
  ['/c/activities', Activities],
  ['/c/notifications', Notifications],
  ['/c/staff', Staff],
  ['/c/settings', Settings],
];

const PUBLIC = { '/': Welcome, '/about': Landing, '/login': Login, '/register': Register, '/forgot': ForgotPassword };

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function findRoute(routes, path) {
  for (const [pattern, Comp, bare] of routes) {
    const params = matchPath(pattern, path);
    if (params) return { Comp, params, bare };
  }
  return null;
}

function Shell() {
  const db = useDB();
  const { path, query } = useRoute();
  const { toast, confirm } = useFeedback();
  // The server session decides who is signed in; the snapshot names that user in `me`.
  const user = db.me ? db.users.find((u) => u.id === db.me) : null;

  // The server has already started the session by the time a page calls this.
  const signIn = useCallback(() => touchSession(), []);

  const logout = useCallback(
    async (reason) => {
      try {
        await apiLogout(reason);
      } catch (e) {
        toast(e.message, 'error');
        return;
      }
      navigate('/login', { replace: true });
      if (reason === 'idle') toast('You were signed out after a period of inactivity to keep your information safe.', 'info');
      else toast('You’ve been logged out. Take care!');
    },
    [toast],
  );

  useEffect(() => {
    setHandlers({
      onError: (e) => toast(e.message, 'error'),
      onSignedOut: (data) => {
        navigate('/login', { replace: true });
        // Archived, deleted or taken-over accounts get the server's explanation; otherwise the session timed out.
        toast(data?.reason ? data.error : 'Your session has ended. Please log in again.', data?.reason ? 'error' : 'info');
      },
    });
  }, [toast]);

  const requestLogout = useCallback(async () => {
    if (await confirm({ title: 'Log out?', message: 'You’ll need to sign in again to access MindTrack.', confirmLabel: 'Log out' })) logout();
  }, [confirm, logout]);

  // Idle-timeout: activity extends the session; an expired session signs the user out.
  const signedIn = !!user;

  // Light/dark theme applies inside the portals only (sign-in pages keep their light design).
  useEffect(() => {
    setThemeActive(signedIn);
  }, [signedIn]);

  // Live updates: reload data when anyone saves something (see startLiveSync in lib/store.js).
  useEffect(() => {
    if (signedIn) startLiveSync();
  }, [signedIn]);

  // One device per account: check in every minute while signed in, and release the account when the page closes.
  // If another device has taken the account over, the check-in answers 401 and the app signs out (onSignedOut).
  useEffect(() => {
    if (!signedIn) return;
    const beat = setInterval(() => ping().catch(() => {}), 60000);
    window.addEventListener('pagehide', sayAway);
    return () => {
      clearInterval(beat);
      window.removeEventListener('pagehide', sayAway);
    };
  }, [signedIn]);

  // Re-render every 30 seconds so relative times ("2m ago", "Today") stay current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    if (isIdle()) {
      logout('idle');
      return;
    }
    touchSession();
    let last = 0;
    const onActivity = () => {
      if (Date.now() - last > 15000) {
        last = Date.now();
        touchSession();
      }
    };
    const check = setInterval(() => {
      if (isIdle()) logout('idle');
    }, 20000);
    ['pointerdown', 'keydown', 'scroll'].forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      clearInterval(check);
      ['pointerdown', 'keydown', 'scroll'].forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [signedIn, logout]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  const home = user?.role === 'counselor' ? '/c/dashboard' : '/s/home';
  const needsProfile = user && user.role === 'student' && !user.profile_complete;

  let content = null;
  let redirect = null;

  if (PUBLIC[path]) {
    if (user && !needsProfile && path !== '/') redirect = home;
    else if (user && path === '/') redirect = needsProfile ? '/register' : home;
    else if (needsProfile && path !== '/register') redirect = '/register';
    else {
      const Comp = PUBLIC[path];
      content = <Comp query={query} />;
    }
  } else if (!user) {
    redirect = '/login';
  } else if (needsProfile) {
    redirect = '/register';
  } else {
    const routes = user.role === 'counselor' ? COUNSELOR_ROUTES : STUDENT_ROUTES;
    const r = findRoute(routes, path);
    if (!r) redirect = home;
    else {
      const page = <r.Comp user={user} params={r.params} query={query} />;
      content = r.bare ? page : <Layout path={path}>{page}</Layout>;
    }
  }

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect]);

  useEffect(() => {
    const titles = { '/about': 'About', '/login': 'Log in', '/register': 'Create account', '/forgot': 'Reset password' };
    document.title = titles[path] ? `${titles[path]} · MindTrack` : 'MindTrack';
  }, [path]);

  return <AuthCtx.Provider value={{ user, signIn, logout, requestLogout }}>{content}</AuthCtx.Provider>;
}

export default function App() {
  return (
    <FeedbackProvider>
      <Shell />
    </FeedbackProvider>
  );
}
