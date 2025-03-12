// 4. Use the component in your page at app/page.jsx:

import TextToSpeech from './components/TextToSpeech';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-8">ElevenLabs Text-to-Speech</h1>
      <TextToSpeech />
    </main>
  );
}