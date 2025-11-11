import { card as combinedCard } from "./combined-card";
import { card as kioskCard } from "./kiosk-card";
import { card as autoReloadCard } from './auto-reload-card';
import { card as backButtonCard } from './back-button-card';

// Note: this is what adds the card to the UI card selector
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push(combinedCard, kioskCard, autoReloadCard, backButtonCard);
