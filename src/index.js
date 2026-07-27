import React from 'react';
import { createRoot } from 'react-dom/client';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';

import './styles/normalize.css'
import './styles/index.css';

import CubeWorld from './components/CubeWorld';

createRoot(document.getElementById('root')).render(
  <DynamicContextProvider
    settings={{
      environmentId: process.env.REACT_APP_DYNAMIC_ENVIRONMENT_ID,
      walletConnectors: [SolanaWalletConnectors],
    }}
  >
    <CubeWorld bgColor='#141622' />
  </DynamicContextProvider>
)
