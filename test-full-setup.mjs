import WebSocket from 'ws';

const API_KEY = 'AIzaSyA1kjxuM7BEoaG3vyZLkT9ESW8tnD9HIZg';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

console.log('Testing FULL production setup (with system_instruction)...');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('WebSocket connected!');

  // EXACT setup matching geminiLive.ts
  const setupMessage = {
    setup: {
      model: 'models/gemini-2.0-flash-exp',
      generation_config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: 'Aoede',
            },
          },
        },
      },
      system_instruction: {
        parts: [{ text: 'You are a calm meditation guide. Keep responses brief.' }],
      },
    },
  };

  console.log('Sending setup with system_instruction...');
  ws.send(JSON.stringify(setupMessage));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Response:', JSON.stringify(msg).substring(0, 500));

  if (msg.setupComplete) {
    console.log('SUCCESS! Setup complete with system_instruction.');
    ws.close();
    process.exit(0);
  }

  if (msg.error) {
    console.error('ERROR:', msg.error);
    ws.close();
    process.exit(1);
  }
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString().substring(0, 300));
  process.exit(code === 1000 ? 0 : 1);
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err.message);
  process.exit(1);
});

setTimeout(() => { console.error('Timeout after 15s'); process.exit(1); }, 15000);
