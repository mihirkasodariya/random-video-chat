import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VideoChat from './components/VideoChat'
import Home from './components/Home'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/random-connect" element={
          <div className="w-full h-dvh bg-neutral-900 text-white overflow-hidden">
            <VideoChat />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
