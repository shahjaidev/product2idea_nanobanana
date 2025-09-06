import React, { useState, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';
import { generateDescription, editImage, generateSketch } from '../services/geminiService';

import { UploadIcon } from './icons/UploadIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { UserIcon } from './icons/UserIcon';
import { BotIcon } from './icons/BotIcon';

const ProductStudio: React.FC = () => {
  const [mainImage, setMainImage] = useState<{ base64: string; mimeType: string; file: File } | null>(null);
  const [supplementalImages, setSupplementalImages] = useState<{ base64: string; file: File }[]>([]);
  const [description, setDescription] = useState<string>('');
  const [sketch, setSketch] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    description: false,
    sketch: false,
    chat: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'description' | 'sketch'>('chat');

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const supplementalImageInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, isMain: boolean) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await toBase64(file);
      if (isMain) {
        setMainImage({ base64, mimeType: file.type, file });
        setDescription('');
        setSketch(null);
        setChatMessages([]);
        setError(null);
      } else {
        setSupplementalImages(prev => [...prev, { base64, file }]);
      }
    } catch (err) {
      setError('Failed to read file.');
      console.error(err);
    }
  };

  const handleGenerateDescription = async () => {
    if (!mainImage) {
      setError('Please upload a main product image first.');
      return;
    }
    setIsLoading(prev => ({ ...prev, description: true }));
    setError(null);
    try {
      const desc = await generateDescription(mainImage.base64, mainImage.mimeType);
      setDescription(desc);
    } catch (err: any) {
      setError(err.message || 'Failed to generate description.');
    } finally {
      setIsLoading(prev => ({ ...prev, description: false }));
    }
  };

  const handleGenerateSketch = async () => {
    if (!mainImage) {
      setError('Please upload a main product image first.');
      return;
    }
    setIsLoading(prev => ({ ...prev, sketch: true }));
    setError(null);
    try {
      const sketchUrl = await generateSketch(mainImage.base64, mainImage.mimeType);
      setSketch(sketchUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to generate sketch.');
    } finally {
      setIsLoading(prev => ({ ...prev, sketch: false }));
    }
  };
  
  const handleSendMessage = async () => {
    if (!mainImage || (!prompt && supplementalImages.length === 0)) {
        return;
    }

    const userMessage: ChatMessage = {
        sender: 'user',
        text: prompt,
        images: supplementalImages.map(img => img.base64),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setSupplementalImages([]);
    setIsLoading(prev => ({ ...prev, chat: true }));
    setError(null);
    
    try {
        const { newImageBase64, textResponse } = await editImage(
            mainImage.base64,
            supplementalImages.map(img => img.base64),
            mainImage.mimeType,
            prompt
        );

        setMainImage(prev => prev ? { ...prev, base64: newImageBase64 } : null);

        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: textResponse,
            images: [newImageBase64],
        };
        setChatMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
        setError(err.message || 'Failed to get response from AI.');
        const aiErrorMessage: ChatMessage = {
            sender: 'ai',
            text: `Sorry, I encountered an error: ${err.message}`,
        };
        setChatMessages(prev => [...prev, aiErrorMessage]);
    } finally {
        setIsLoading(prev => ({ ...prev, chat: false }));
        scrollToBottom();
    }
  };

  const TabButton = ({ tabName, label }: { tabName: 'chat' | 'description' | 'sketch', label: string }) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tabName
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
        }`}
    >
        {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <input
        type="file"
        ref={mainImageInputRef}
        onChange={(e) => handleFileChange(e, true)}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={supplementalImageInputRef}
        onChange={(e) => handleFileChange(e, false)}
        accept="image/*"
        className="hidden"
      />

      {/* Left Panel: Image Viewer */}
      <div className="w-1/2 flex flex-col items-center justify-center p-8 bg-white border-r border-gray-200">
        {mainImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img src={mainImage.base64} alt="Main product" className="max-w-full max-h-[80%] object-contain rounded-lg shadow-lg" />
            <button
              onClick={() => mainImageInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Change Image
            </button>
          </div>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => mainImageInputRef.current?.click()}
          >
            <UploadIcon className="w-16 h-16 text-gray-400" />
            <p className="mt-4 text-lg font-semibold text-gray-600">Upload Product Image</p>
            <p className="text-sm text-gray-500">Click or drag and drop</p>
          </div>
        )}
      </div>

      {/* Right Panel: AI Tools */}
      <div className="w-1/2 flex flex-col">
        <header className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-900">Product Idea Lab</h1>
          <div className="mt-3 flex space-x-2">
              <TabButton tabName="chat" label="AI Chat Edit" />
              <TabButton tabName="description" label="Generate Description" />
              <TabButton tabName="sketch" label="Generate Sketch" />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 border border-red-200">
                    <p><strong>Error:</strong> {error}</p>
                </div>
            )}
            
            {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {chatMessages.length === 0 && !mainImage && <p className="text-gray-500 text-center mt-8">Upload an image and start chatting with the AI to edit it!</p>}
                        {chatMessages.length === 0 && mainImage && <p className="text-gray-500 text-center mt-8">Use the input below to tell the AI how to edit your image.</p>}
                        {chatMessages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && <BotIcon className="w-8 h-8 p-1.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0" />}
                                <div className={`p-3 rounded-xl max-w-md ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                    <p>{msg.text}</p>
                                    {msg.images && msg.images.map((img, i) => (
                                        <img key={i} src={img} alt="Generated content" className="mt-2 rounded-lg max-w-xs" />
                                    ))}
                                </div>
                                {msg.sender === 'user' && <UserIcon className="w-8 h-8 p-1.5 rounded-full bg-gray-200 text-gray-600 flex-shrink-0" />}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    {mainImage && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                {supplementalImages.map((img, index) => (
                                    <img key={index} src={img.base64} className="w-12 h-12 object-cover rounded" alt="supplemental" />
                                ))}
                            </div>
                            <div className="relative mt-2">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., 'change the background to a beach' or 'make it red'"
                                    className="w-full p-3 pr-24 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                    rows={2}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-2">
                                    <button onClick={() => supplementalImageInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600">
                                        <PaperclipIcon className="w-6 h-6" />
                                    </button>
                                    <button onClick={handleSendMessage} disabled={isLoading.chat} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
                                        {isLoading.chat ? <SpinnerIcon className="w-5 h-5" /> : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'description' && (
                <div>
                    <button onClick={handleGenerateDescription} disabled={isLoading.description || !mainImage} className="flex items-center justify-center gap-2 w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400">
                        {isLoading.description ? <SpinnerIcon className="w-6 h-6" /> : <MagicWandIcon className="w-6 h-6" />}
                        <span>Generate Description</span>
                    </button>
                    {description && (
                        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                            <h3 className="font-bold text-lg">AI Generated Description:</h3>
                            <p className="mt-2 text-gray-700 whitespace-pre-wrap">{description}</p>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'sketch' && (
                <div>
                    <button onClick={handleGenerateSketch} disabled={isLoading.sketch || !mainImage} className="flex items-center justify-center gap-2 w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400">
                        {isLoading.sketch ? <SpinnerIcon className="w-6 h-6" /> : <MagicWandIcon className="w-6 h-6" />}
                        <span>Generate Technical Sketch</span>
                    </button>
                    {sketch && (
                        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg text-center">
                            <h3 className="font-bold text-lg">AI Generated Sketch:</h3>
                            <img src={sketch} alt="Generated sketch" className="mt-2 rounded-lg max-w-full mx-auto" />
                        </div>
                    )}
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default ProductStudio;
