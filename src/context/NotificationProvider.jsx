import { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const notify = (message, type = 'success') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      default:
        toast(message);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <Toaster position="top-right" reverseOrder={false} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);