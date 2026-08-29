import { useState, useEffect } from 'react';
import { checkJobStatus, getJobResults } from '../services/api';

export default function ResultsDisplay({ jobId, onReset }) {
  const [status, setStatus] = useState('pending');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let pollInterval;

    const pollStatus = async () => {
      try {
        const data = await checkJobStatus(jobId);
        setStatus(data.status);

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          fetchResults();
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setError('Analysis failed on the server.');
        }
      } catch (err) {
        setError(err.message);
        clearInterval(pollInterval);
      }
    };

    const fetchResults = async () => {
      try {
        const data = await getJobResults(jobId);
        setResults(data);
      } catch (err) {
        setError(err.message);
      }
    };

    pollInterval = setInterval(pollStatus, 2000);
    pollStatus(); // initial check

    return () => clearInterval(pollInterval);
  }, [jobId]);

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={onReset}>Try Again</button>
      </div>
    );
  }

  if (status !== 'completed' || !results) {
    return <div>Processing Image... Status: {status}</div>;
  }

  return (
    <div className="results-container">
      <h2>Analysis Results</h2>
      <div className={`risk-level ${results.risk_level.toLowerCase()}`}>
        Risk Level: <strong>{results.risk_level}</strong>
      </div>
      <p>Anomaly Score: {results.anomaly_score}</p>
      <div className="explanation">
        <h3>Explanation</h3>
        <p>{results.explanation}</p>
      </div>
      {results.bounding_boxes && results.bounding_boxes.length > 0 && (
        <div className="detections">
          <h3>Detected Objects:</h3>
          <ul>
            {results.bounding_boxes.map((box, i) => (
              <li key={i}>{box.class} (Confidence: {box.confidence})</li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={onReset}>Analyze Another Image</button>
    </div>
  );
}
