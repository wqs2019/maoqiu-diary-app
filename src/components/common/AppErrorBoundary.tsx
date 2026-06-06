import React from 'react';

import { reportClientError } from '@/services/monitorService';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportClientError(error, {
      source: 'react_boundary',
      isFatal: false,
      extraData: {
        componentStack: info.componentStack || '',
      },
    });
  }

  render() {
    return this.props.children;
  }
}

export default AppErrorBoundary;
