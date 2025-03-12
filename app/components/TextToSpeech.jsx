'use client'

import { useState, useRef } from 'react';

export default function TextToSpeech() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to convert text to speech');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Text to Speech</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            className="w-full p-2 border border-gray-300 rounded resize-none"
            rows="4"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to convert to speech..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Converting...' : 'Convert to Speech'}
        </button>
      </form>
      <audio ref={audioRef} className="mt-4 w-full" controls hidden={!audioRef.current?.src} />
    </div>
  );
}