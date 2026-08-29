import { useState } from 'react'
import UploadSonar from './components/UploadSonar'
import ResultsDisplay from './components/ResultsDisplay'
import './App.css'

function App() {
  const [jobId, setJobId] = useState(null)

  return (
    <div className="App">
      <header>
        <h1>SONAR-AI Analysis</h1>
      </header>
      <main>
        {!jobId ? (
          <UploadSonar onUploadSuccess={(id) => setJobId(id)} />
        ) : (
          <ResultsDisplay jobId={jobId} onReset={() => setJobId(null)} />
        )}
      </main>
    </div>
  )
}

export default App
