import { createRoot } from "react-dom/client";
import "@ant-design/v5-patch-for-react-19";
import "@mantine/core/styles.css";
import "./style/index.css";
import "./i18nProvider";


import { RootComponent } from "./components/RootComponent";

const container = document.getElementById("root")!;
const root = createRoot(container);





root.render(<RootComponent />);
