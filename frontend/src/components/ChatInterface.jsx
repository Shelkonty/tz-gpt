import React, { useState, useEffect } from 'react';
import MessageDisplay from './MessageDisplay';
import axios from 'axios';
import MessageInputWithAudioRecorder from "./MessageInput";

const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const MAX_RETRIES = 3;

    const ERROR_TYPES = {
        NETWORK: 'network',
        SERVER: 'server',
        TIMEOUT: 'timeout',
        UNKNOWN: 'unknown'
    };

    const getErrorMessage = (error) => {
        if (error?.message?.includes('Network Error') || !navigator.onLine) {
            return {
                type: ERROR_TYPES.NETWORK,
                message: 'Проблема с подключением к интернету. Проверьте ваше соединение.'
            };
        } else if (error?.response?.status >= 500) {
            return {
                type: ERROR_TYPES.SERVER,
                message: 'Проблема на сервере. Попробуйте позже.'
            };
        } else if (error?.code === 'ECONNABORTED') {
            return {
                type: ERROR_TYPES.TIMEOUT,
                message: 'Превышено время ожидания ответа. Проверьте скорость соединения.'
            };
        } else {
            return {
                type: ERROR_TYPES.UNKNOWN,
                message: `Не удалось получить ответ: ${error?.response?.data?.message || error?.message || 'Неизвестная ошибка'}`
            };
        }
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        try {
            const userMessage = { role: 'user', content: text };
            setMessages(prevMessages => [...prevMessages, userMessage]);

            setLoading(true);
            setError(null);

            const response = await axios.post('http://localhost:5000/api/chat', {
                message: text
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const assistantMessage = { role: 'assistant', content: response.data.response };
            setMessages(prevMessages => [...prevMessages, assistantMessage]);
            setRetryCount(0);
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
            const errorInfo = getErrorMessage(error);
            setError(errorInfo.message);

            if (errorInfo.type === ERROR_TYPES.NETWORK && retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    setError(`Повторная попытка (${retryCount + 1}/${MAX_RETRIES})...`);
                    sendMessage(text);
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
        if (lastUserMessage) {
            setMessages(messages.slice(0, -1));
            sendMessage(lastUserMessage.content);
        }
    };

    useEffect(() => {
        const handleOnlineStatus = () => {
            if (navigator.onLine) {
                setError(prev => prev ? 'Подключение восстановлено. Продолжайте общение.' : null);
                setTimeout(() => setError(null), 3000);
            } else {
                setError('Отсутствует подключение к интернету. Сообщения не будут отправлены.');
            }
        };

        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);

        return () => {
            window.removeEventListener('online', handleOnlineStatus);
            window.removeEventListener('offline', handleOnlineStatus);
        };
    }, []);

    useEffect(() => {
        if ('speechSynthesis' in window) {
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                const russianVoices = voices.filter(voice =>
                    voice.lang.includes('ru') || voice.lang.includes('RU')
                );

                if (russianVoices.length > 0) {
                    setSelectedVoice(russianVoices[0]);
                } else if (voices.length > 0) {
                    setSelectedVoice(voices[0]);
                }
            };

            loadVoices();

            window.speechSynthesis.onvoiceschanged = loadVoices;

            const savedSpeechSetting = localStorage.getItem('speechSynthesisEnabled');
            if (savedSpeechSetting === 'true') {
                setSpeechSynthesisEnabled(true);
            }

            return () => {
                window.speechSynthesis.onvoiceschanged = null;
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                }
            };
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('speechSynthesisEnabled', speechSynthesisEnabled);
    }, [speechSynthesisEnabled]);

    const toggleSpeechSynthesis = () => {
        if ('speechSynthesis' in window) {
            if (speechSynthesisEnabled) {
                window.speechSynthesis.cancel();
            }
            setSpeechSynthesisEnabled(!speechSynthesisEnabled);
        } else {
            setError('Ваш браузер не поддерживает синтез речи.');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleVoiceChange = (voice) => {
        setSelectedVoice(voice);
    };

    return (
        <div className="container mx-auto max-w-3xl p-4 rounded-lg shadow-lg bg-white">
            <h1 className="text-2xl font-bold text-center mb-6 text-indigo-600">ChatGPT Интерфейс</h1>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Сообщения</h2>
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={toggleSpeechSynthesis}
                        className={`p-2 rounded text-sm ${speechSynthesisEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'} text-white`}
                        title={speechSynthesisEnabled ? "Выключить озвучивание" : "Включить озвучивание"}
                    >
                        {speechSynthesisEnabled ? 'Озвучивание вкл.' : 'Озвучивание выкл.'}
                    </button>
                </div>
            </div>

            <MessageDisplay
                messages={messages}
                loading={loading}
                speechSynthesisEnabled={speechSynthesisEnabled}
                selectedVoice={selectedVoice}
            />

            <MessageInputWithAudioRecorder
                onSendMessage={sendMessage}
                loading={loading}
                speechSynthesisEnabled={speechSynthesisEnabled}
                selectedVoice={selectedVoice}
                onToggleSpeech={toggleSpeechSynthesis}
                onVoiceChange={handleVoiceChange}
            />

            {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 flex justify-between items-center">
                    <span>{error}</span>
                    {error.includes('Не удалось получить ответ') && (
                        <button
                            onClick={handleRetry}
                            className="ml-4 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                        >
                            Повторить
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatInterface;