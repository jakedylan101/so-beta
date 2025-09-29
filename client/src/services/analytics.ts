// Google Analytics service for SoundOff
// This handles analytics for both web and mobile platforms

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
}

interface AnalyticsPageView {
  pageName: string;
  properties?: Record<string, any>;
}

interface AnalyticsUserProperties {
  [key: string]: any;
}

class Analytics {
  private gaId: string | null = null;
  private isInitialized = false;
  private debug = false;

  constructor() {
    // Check if GA ID is available in environment
    this.gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || null;
    
    // Only enable debug mode in development, never in production
    this.debug = import.meta.env.MODE === 'development';
  }

  /**
   * Initializes Google Analytics
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    if (!this.gaId) {
      return;
    }

    try {
      // Load Google Analytics script dynamically
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(...args: any[]) {
        window.dataLayer.push(arguments);
      };
      
      window.gtag('js', new Date());
      window.gtag('config', this.gaId, {
        send_page_view: false, // We'll track page views manually for more control
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure'
      });

      this.isInitialized = true;
    } catch (error) {
      // Silently fail in production
    }
  }

  /**
   * Track page views
   */
  public trackPageView({ pageName, properties = {} }: AnalyticsPageView): void {
    if (!this.isInitialized || !this.gaId) {
      return;
    }

    try {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        page_path: window.location.pathname,
        ...properties
      });
    } catch (error) {
      // Silently fail in production
    }
  }

  /**
   * Track custom events
   */
  public trackEvent({ eventName, properties = {} }: AnalyticsEvent): void {
    if (!this.isInitialized || !this.gaId) {
      return;
    }

    try {
      window.gtag('event', eventName, properties);
    } catch (error) {
      // Silently fail in production
    }
  }

  /**
   * Set user properties
   */
  public setUserProperties(properties: AnalyticsUserProperties): void {
    if (!this.isInitialized || !this.gaId) {
      return;
    }

    try {
      window.gtag('set', 'user_properties', properties);
    } catch (error) {
      // Silently fail in production
    }
  }

  /**
   * Track user sign in
   */
  public trackSignIn(method: string, userId?: string): void {
    this.trackEvent({
      eventName: 'login',
      properties: {
        method,
        user_id: userId
      }
    });
  }

  /**
   * Track user sign up
   */
  public trackSignUp(method: string, userId?: string): void {
    this.trackEvent({
      eventName: 'sign_up',
      properties: {
        method,
        user_id: userId
      }
    });
  }

  /**
   * Track set logged by user
   */
  public trackSetLogged(setId: string, artistName: string): void {
    this.trackEvent({
      eventName: 'log_set',
      properties: {
        set_id: setId,
        artist_name: artistName
      }
    });
  }

  /**
   * Track set comparison (ELO ranking)
   */
  public trackSetComparison(winningSetId: string, losingSetId: string): void {
    this.trackEvent({
      eventName: 'set_comparison',
      properties: {
        winning_set_id: winningSetId,
        losing_set_id: losingSetId
      }
    });
  }
}

// Define gtag for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Export singleton instance
const analytics = new Analytics();
export default analytics;