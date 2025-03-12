'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SystemPromptContextType {
  systemPrompt: string;
  heading: string;
  description: string;
  pageTitle: string;
  setSystemPrompt: (prompt: string) => Promise<void>;
  setHeading: (heading: string) => Promise<void>;
  setDescription: (description: string) => Promise<void>;
  setPageTitle: (title: string) => Promise<void>;
  isLoading: boolean;
}

const SystemPromptContext = createContext<SystemPromptContextType | undefined>(undefined);

export function SystemPromptProvider({ children }: { children: React.ReactNode }) {
  const [systemPrompt, setSystemPromptState] = useState('');
  const [heading, setHeadingState] = useState('👋 Hi There!');
  const [description, setDescriptionState] = useState('');
  const [pageTitle, setPageTitleState] = useState('Teach Back : Testing agent');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial prompt from database
    const fetchData = async () => {
      try {
        const response = await fetch('/api/systemPrompt');
        const data = await response.json();
        setSystemPromptState(data.prompt);
        setHeadingState(data.heading);
        setDescriptionState(data.description);
        setPageTitleState(data.pageTitle);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const setSystemPrompt = async (prompt: string) => {
    try {
      setIsLoading(true);
      await fetch('/api/systemPrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      setSystemPromptState(prompt);
    } catch (error) {
      console.error('Error updating system prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setHeading = async (newHeading: string) => {
    try {
      setIsLoading(true);
      await fetch('/api/systemPrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heading: newHeading }),
      });
      setHeadingState(newHeading);
    } catch (error) {
      console.error('Error updating heading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setDescription = async (newDescription: string) => {
    try {
      setIsLoading(true);
      await fetch('/api/systemPrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription }),
      });
      setDescriptionState(newDescription);
    } catch (error) {
      console.error('Error updating description:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setPageTitle = async (newTitle: string) => {
    try {
      setIsLoading(true);
      await fetch('/api/systemPrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageTitle: newTitle }),
      });
      setPageTitleState(newTitle);
    } catch (error) {
      console.error('Error updating page title:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SystemPromptContext.Provider value={{ 
      systemPrompt, 
      heading,
      description,
      pageTitle,
      setSystemPrompt, 
      setHeading,
      setDescription,
      setPageTitle,
      isLoading 
    }}>
      {children}
    </SystemPromptContext.Provider>
  );
}

export function useSystemPrompt() {
  const context = useContext(SystemPromptContext);
  if (context === undefined) {
    throw new Error('useSystemPrompt must be used within a SystemPromptProvider');
  }
  return context;
} 