import React from 'react';
import { createRoot } from 'react-dom/client';
import { QuoteSer } from './domain/QuoteSer';

const root = createRoot(document.body);
root.render(QuoteSer.testChart());
