import { FrownOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { ErrorBoundary } from "react-error-boundary";

export const CustomErrorBoundary = ({ children }) => {
    const handleError = (error, info) => {
      // 可以在此记录错误，发送到后端等
      console.error('ErrorBoundary caught an error', error, info);
    };
  
    const FallbackComponent = ({ error, resetErrorBoundary }) => (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Result
          icon={<FrownOutlined style={{ fontSize: 50, color: '#FF4D4F' }} />}
          title="Something went wrong"
          subTitle={error.message}
          extra={
            <Button type="primary" onClick={resetErrorBoundary}>
              Try Again
            </Button>
          }
          className="w-full max-w-xl p-4"
        />
      </div>
    );
  
    return (
      <ErrorBoundary FallbackComponent={FallbackComponent} onError={handleError}>
        {children}
      </ErrorBoundary>
    );
  };