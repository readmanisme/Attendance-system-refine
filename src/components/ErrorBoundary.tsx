import { FrownOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { semantic } from "@/theme/tokens";

const FallbackComponent = ({ error, resetErrorBoundary }: FallbackProps) => {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg-layout)" }}>
      <Result
        icon={<FrownOutlined style={{ fontSize: 50, color: semantic.error }} />}
        title="系统发生了某些错误"
        subTitle={message}
        extra={
          <Button type="primary" onClick={resetErrorBoundary}>
            刷新网页
          </Button>
        }
        className="w-full max-w-xl p-4"
      />
    </div>
  );
};

export const CustomErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const handleError = () => {
    // 可以在此记录错误，发送到后端等
  };

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
