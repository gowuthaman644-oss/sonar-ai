const API_BASE_URL = 'http://localhost:8000/api';

export const uploadSonarImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/sonar/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    return response.json();
};

export const checkJobStatus = async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/sonar/status/${jobId}`);
    if (!response.ok) {
        throw new Error('Status check failed');
    }
    return response.json();
};

export const getJobResults = async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/sonar/results/${jobId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch results');
    }
    return response.json();
};
