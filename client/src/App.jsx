import { HashRouter, Routes, Route } from 'react-router-dom';
import VideoChat from './components/VideoChat';
import Home from './components/Home';
import AgeVerification from './components/AgeVerification';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import CommunityGuidelines from './components/CommunityGuidelines';
import './index.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/age-verification" element={<AgeVerification />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/guidelines" element={<CommunityGuidelines />} />
        <Route path="/random-connect" element={
          <div className="w-full h-dvh bg-neutral-900 text-white overflow-hidden">
            <VideoChat />
          </div>
        } />
      </Routes>
    </HashRouter>
  )
}

export default App;
