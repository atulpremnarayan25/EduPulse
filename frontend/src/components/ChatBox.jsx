import React, { useState, useEffect, useRef } from 'react';

const ChatBox = ({ socket, classId, user, isOpen: externalIsOpen, onClose, className, messages }) => {
    // const [messages, setMessages] = useState([]); // Moved to parent
    const [newMessage, setNewMessage] = useState('');
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    // Use external state if provided, otherwise use internal state
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
    const setIsOpen = externalIsOpen !== undefined ? onClose : setInternalIsOpen;

    // Socket listener moved to parent component ensure persistence
    /*
    useEffect(() => {
        if (!socket) return;
        socket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });
        return () => {
            socket.off('receive_message');
        };
    }, [socket]);
    */

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            classId,
            sender: { name: user.name || 'User', id: user.id },
            message: newMessage,
            timestamp: new Date().toISOString(),
        };

        socket.emit('send_message', messageData);
        setNewMessage('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => externalIsOpen !== undefined ? onClose?.() : setInternalIsOpen(true)}
                className={`fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition z-50 ${className ? '' : ''}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>
        );
    }

    // Default styles if no className provided
    const defaultStyles = "fixed bottom-6 right-6 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden h-96";
    const appliedStyles = className || defaultStyles;

    return (
        <div className={appliedStyles}>
            {/* Header */}
            <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
                <h3 className="font-bold text-sm">In-Call Messages</h3>
                <button onClick={() => externalIsOpen !== undefined ? onClose?.() : setInternalIsOpen(false)} className="hover:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 && (
                    <p className="text-gray-400 text-xs text-center mt-4">No messages yet.</p>
                )}
                {messages.map((msg, idx) => {
                    const isMe = msg.sender.id === user.id;
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-lg p-2 text-sm ${isMe ? 'bg-blue-100 text-blue-900 rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                                {!isMe && <p className="text-[10px] font-bold text-gray-500 mb-0.5">{msg.sender.name}</p>}
                                <p>{msg.message}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 border rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
                    disabled={!newMessage.trim()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
