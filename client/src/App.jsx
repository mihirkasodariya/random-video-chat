import VideoChat from './components/VideoChat'
import './index.css'

function App() {
  return (
    <div className="app w-full h-screen flex flex-col bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm"></div>

      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-primary-500/20">
            R
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
            RandomCam
          </h1>
        </div>
        <div className="text-xs font-medium px-3 py-1 rounded-full bg-white/5 text-white/50 border border-white/5">
          Beta v1.0
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <VideoChat />
      </main>
    </div>
  )
}

export default App
