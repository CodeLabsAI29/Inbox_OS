import React, { createContext, useContext, useState } from 'react';

export interface ComposeValues {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
}

interface ComposeContextType {
  isOpen: boolean;
  initialValues: ComposeValues | null;
  openCompose: (values?: ComposeValues) => void;
  closeCompose: () => void;
}

const ComposeContext = createContext<ComposeContextType | undefined>(undefined);

export const ComposeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<ComposeValues | null>(
    null
  );

  const openCompose = (values?: ComposeValues) => {
    if (values) {
      setInitialValues(values);
    } else {
      setInitialValues(null);
    }
    setIsOpen(true);
  };

  const closeCompose = () => {
    setIsOpen(false);
    setInitialValues(null);
  };

  return (
    <ComposeContext.Provider
      value={{ isOpen, initialValues, openCompose, closeCompose }}
    >
      {children}
    </ComposeContext.Provider>
  );
};

export const useCompose = () => {
  const context = useContext(ComposeContext);
  if (context === undefined) {
    throw new Error('useCompose must be used within a ComposeProvider');
  }
  return context;
};
