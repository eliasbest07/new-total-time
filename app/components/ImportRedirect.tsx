"use client";

import { useSearchParams } from "next/navigation";
import MainScreen from "./MainScreen";

export default function ImportRedirect() {
  const searchParams = useSearchParams();
  const importParam = searchParams.get("import");

  // Pass the import parameter to MainScreen
  return <MainScreen importParam={importParam} />;
}
