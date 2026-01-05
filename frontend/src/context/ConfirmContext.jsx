import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [config, setConfig] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfig({
                ...options,
                onConfirm: () => {
                    resolve(true);
                    setConfig(null);
                },
                onCancel: () => {
                    resolve(false);
                    setConfig(null);
                }
            });
        });
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {config && <ConfirmModal {...config} />}
        </ConfirmContext.Provider>
    );
};

const ConfirmModal = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning', onConfirm, onCancel }) => {
    const styles = {
        warning: 'bg-yellow-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
                <div className={`${styles[type]} text-white px-6 py-4 rounded-t-xl`}>
                    <h3 className="text-lg font-bold">{title || 'Confirm Action'}</h3>
                </div>
                <div className="px-6 py-6">
                    <p className="text-gray-700 text-base leading-relaxed">{message}</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 ${styles[type]} hover:opacity-90 text-white font-semibold rounded-lg transition`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
