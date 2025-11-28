import { useState, useRef, useEffect, useCallback } from 'react';
import { getMockResponse } from '@/data/mockVoiceResponses';
import '@/types/speech.d.ts';

interface UseWebSpeechChatReturn {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  transcript: string;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => Promise<string>;
  playAudio: (text: string) => void;
  stopAudio: () => void;
  getAIResponse: (text: string) => Promise<string>;
}

export const useWebSpeechChat = (): UseWebSpeechChatReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        if (finalTranscript) {
          finalTranscriptRef.current = finalTranscript;
          setTranscript(finalTranscript);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }
    
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    finalTranscriptRef.current = '';
    setTranscript('');
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      if (!recognitionRef.current) {
        resolve('');
        return;
      }
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        resolve(finalTranscriptRef.current || transcript);
      };
      
      recognitionRef.current.stop();
    });
  }, [transcript]);

  const playAudio = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to get a Portuguese voice
    const voices = speechSynthesis.getVoices();
    const ptVoice = voices.find(voice => 
      voice.lang.startsWith('pt') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.startsWith('pt'));
    
    if (ptVoice) {
      utterance.voice = ptVoice;
    }
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    speechSynthesis.speak(utterance);
  }, []);

  const stopAudio = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const getAIResponse = useCallback(async (text: string): Promise<string> => {
    setIsProcessing(true);
    
    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    
    const response = getMockResponse(text);
    setIsProcessing(false);
    
    return response;
  }, []);

  return {
    isRecording,
    isProcessing,
    isPlaying,
    transcript,
    isSupported,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    getAIResponse,
  };
};
