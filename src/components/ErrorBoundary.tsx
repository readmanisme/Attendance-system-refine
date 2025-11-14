import { FrownOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { ComponentType, ErrorInfo } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
export const CustomErrorBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const handleError = (error: Error, info: ErrorInfo) => {
    // 可以在此记录错误，发送到后端等
    // console.error("ErrorBoundary caught an error", error, info);
  };

  const FallbackComponent = ({
    error,
    resetErrorBoundary,
  }: {
    error: Error;
    resetErrorBoundary: () => void;
  }) => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Result
        icon={<FrownOutlined style={{ fontSize: 50, color: "#FF4D4F" }} />}
        title="系统发生了某些错误"
        subTitle={error.message}
        extra={
          <Button type="primary" onClick={resetErrorBoundary}>
            刷新网页
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
