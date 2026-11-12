import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { creerFirebaseStore } from './data/firebaseStore';
import { creerLocalStore } from './data/localStore';
import { firebaseConfig } from './firebaseConfig';
import './index.css';

// « ?demo » dans l'adresse force le mode démo (pratique pour montrer l'appli sans vraies données).
const demo = !firebaseConfig || new URLSearchParams(location.search).has('demo');
const store = demo ? creerLocalStore() : creerFirebaseStore(firebaseConfig!);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
