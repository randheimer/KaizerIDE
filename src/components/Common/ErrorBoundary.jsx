import React from 'react';

/**
 * ErrorBoundary - Catches React rendering errors and shows a recovery UI.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Or wrap individual risky subtrees:
 *   <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *     <ChatPanel />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Report to parent if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default recovery UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#e0e0e0',
          background: '#1a1a2e',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '2.5rem',
            marginBottom: '0.75rem',
            opacity: 0.7,
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: '#f0f0f0',
          }}>
            {this.props.title || 'Something went wrong'}
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: '#999',
            maxWidth: '400px',
            lineHeight: 1.5,
            marginBottom: '1.25rem',
          }}>
            {this.props.message || 'An unexpected error occurred while rendering this component.'}
          </p>
          {this.state.error && (
            <details style={{
              fontSize: '0.75rem',
              color: '#888',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              maxWidth: '500px',
              width: '100%',
              marginBottom: '1.25rem',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', color: '#aaa' }}>
                Error details
              </summary>
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack}
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#4f46e5'}
              onMouseLeave={(e) => e.target.style.background = '#6366f1'}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: 'rgba(255,255,255,0.08)',
                color: '#ccc',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
            >
              Reload Window
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
