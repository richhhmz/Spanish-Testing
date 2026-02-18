import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';

import { SpanishTestList } from './pages/SpanishTestList';
import { TodaysSpanishTests } from './pages/TodaysSpanishTests';
import { EditSpanishTest } from './pages/EditSpanishTest';
import { ViewSpanishTest } from './pages/ViewSpanishTest';
import { EditProfile } from './pages/EditProfile';
import { MessageList } from './pages/MessageList';
import { QuickWordLookup } from './pages/QuickWordLookup';
import { TranslationSearch } from './pages/TranslationSearch';
import { ResetCache } from './pages/ResetCache';
import { Ping } from './utils/Ping';
import { BackLog } from './utils/BackLog';
import { Public } from './pages/Public';
import MagicLinkLanding from './pages/MagicLinkLanding.jsx';
import WaitingForEmail from './pages/WaitingForEmail.jsx';

const App = () => {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/ping" element={<Ping />} />
      <Route path="/backlog" element={<BackLog />} />
      <Route path="/public" element={<Public />} />
      <Route path="/waiting-for-email" element={<WaitingForEmail />} />
      <Route path="/magic" element={<MagicLinkLanding />} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/spanish/allSpanishTests" element={<SpanishTestList />} />
        <Route path="/spanish/todaysSpanishTests" element={<TodaysSpanishTests />} />
        <Route path="/messages" element={<MessageList />} />
        <Route path="/spanish/quickWordLookup" element={<QuickWordLookup />} />
        <Route path="/spanish/translationSearch" element={<TranslationSearch />} />
        <Route path="/spanish/viewTest/:word/:source" element={<ViewSpanishTest />} />
        <Route path="/spanish/editTest/:word/:source" element={<EditSpanishTest />} />
        <Route path="/spanish/editProfile" element={<EditProfile />} />
        <Route path="/resetCache" element={<ResetCache />} />
      </Route>
    </Routes>
  );
};

export default App;
