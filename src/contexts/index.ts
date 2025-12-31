// Domain-specific contexts for reduced re-renders
export { AuthProvider, useAuth } from './AuthContext';
export { ScriptProvider, useScript } from './ScriptContext';
export { LibraryProvider, useLibrary } from './LibraryContext';
export { AudioTagsProvider, useAudioTags } from './AudioTagsContext';
export { ChatHistoryProvider, useChatHistory } from './ChatHistoryContext';

// Existing contexts
export { AudioProvider, useAudio } from './AudioContext';
export { ModalProvider, useModal } from './ModalContext';
export { AppProvider, useApp } from './AppContext';
