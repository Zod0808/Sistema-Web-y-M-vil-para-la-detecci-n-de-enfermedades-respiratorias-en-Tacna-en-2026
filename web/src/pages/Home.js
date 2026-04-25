import React, { useMemo, useState, useEffect } from 'react';
import ChatBotEnhanced from '../components/ChatBotEnhanced';
import { t, getCurrentLanguage } from '../services/i18nService';
import './Home.css';

const HERO_IMAGE_WEBP =
  'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBgAAAAQAAAADwAADwAAQUxQSDcAAAABFJAnQEqHAAQAAgAAgA0JYQAA/v/uAAA=';
const HERO_IMAGE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAOUlEQVR42mNgGAXUBwExwMjIAIYGCgYGBob/zzAxwMDAkA0YGBg6A0TLEC0YGhgIEjKIEeMcAxyAgAWlwQgmQ5hAEAAAAASUVORK5CYII=';

function Home() {
  const [language, setLanguage] = useState(getCurrentLanguage());
  const heroSources = useMemo(
    () => ({
      webp: HERO_IMAGE_WEBP,
      fallback: HERO_IMAGE_PNG
    }),
    []
  );

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="welcome-banner">
          <div className="welcome-info">
            <h1>🏥 {t('home.welcome')}</h1>
            <p>{t('home.subtitle')}</p>
          </div>
          <div className="hero-media">
            <picture>
              <source srcSet={heroSources.webp} type="image/webp" />
              <img
                src={heroSources.fallback}
                loading="lazy"
                width="240"
                height="240"
                alt={t('home.welcome')}
              />
            </picture>
          </div>
        </div>

        <div className="chatbot-container">
          <ChatBotEnhanced />
        </div>
      </div>
    </div>
  );
}

export default Home;

