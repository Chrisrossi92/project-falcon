import { Component } from 'react';
import { Card } from '@/components/ui/Card'; // Adjust path

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Optionally log to Supabase or external service
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-4 bg-red-100 text-red-800">
          <h2>Something went wrong.</h2>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;