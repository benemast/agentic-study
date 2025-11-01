export const initAnalytics = ({ sessionId, participantId }) => {
  const isProduction = import.meta.env.PROD;
  const enableClarity = import.meta.env.VITE_ENABLE_CLARITY === 'true';
  const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  
  console.log('Analytics initialization:', {
    environment: isProduction ? 'production' : 'development',
    clarityEnabled: enableClarity && isProduction,
  });
  
  // Don't load in development
  if (!isProduction || !enableClarity) {
    console.log('🔕 Clarity disabled');
    return;
  }
  
  if (!clarityId) {
    console.warn('Clarity ID not configured');
    return;
  }
  
  // Load Clarity
  try {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      const t=l.createElement(r);
      t.async=1;
      t.src="https://www.clarity.ms/tag/"+i;
      const y=l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", clarityId);
    
    // Identify user when Clarity loads
    if (sessionId) {
      const identifyUser = setInterval(() => {
        if (window.clarity) {
          clearInterval(identifyUser);
          window.clarity('identify', sessionId, {
            participant_id: participantId,
          });
          console.log('Clarity tracking started');
        }
      }, 100);
      
      setTimeout(() => clearInterval(identifyUser), 5000);
    }
  } catch (error) {
    console.error('Failed to initialize Clarity:', error);
  }
};