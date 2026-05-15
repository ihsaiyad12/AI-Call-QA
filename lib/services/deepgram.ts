import { DeepgramClient } from '@deepgram/sdk';

const formatTranscript = (data: any): string => {
  const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words;

  if (!words || words.length === 0) {
    return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  }

  let transcript = '';
  let currentSpeaker = words[0]?.speaker ?? 0;
  let currentBuffer = `Speaker ${currentSpeaker}: `;

  words.forEach((word: any, index: number) => {
    if (word.speaker !== currentSpeaker) {
      transcript += currentBuffer.trim() + '\n\n';
      currentSpeaker = word.speaker ?? 0;
      currentBuffer = `Speaker ${currentSpeaker}: ${word.punctuated_word || word.word} `;
    } else {
      currentBuffer += `${word.punctuated_word || word.word} `;
    }

    if (index === words.length - 1) {
      transcript += currentBuffer.trim();
    }
  });

  return transcript;
};

export const transcribeAudio = async (
  buffer: Buffer,
  mimetype: string
): Promise<string> => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY missing');

  // SDK v5 uses the config object
  const deepgram = new DeepgramClient({ apiKey });

  try {
    const result = await deepgram.listen.v1.media.transcribeFile(
      { data: buffer, contentType: mimetype },
      {
        model: 'nova-3',
        smart_format: true,
        diarize: true,
        paragraphs: true,
        punctuate: true,
      }
    );

    const transcript = formatTranscript(result);
    if (!transcript) throw new Error('No transcript generated');

    return transcript;
  } catch (error: any) {
    console.error('Deepgram API Error:', error.message || error);
    throw new Error(error.message || 'Transcription failed');
  }
};
