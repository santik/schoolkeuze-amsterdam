"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function BackToSchools() {
  const t = useTranslations("Schools");
  const [qs, setQs] = React.useState("");
  React.useEffect(() => {
    try {
      setQs(window.sessionStorage.getItem("schools:last-query") ?? "");
    } catch {
      // storage unavailable
    }
  }, []);
  return (
    <Link
      data-testid="back-to-schools"
      href={qs ? `/schools?${qs}` : "/schools"}
      className="w-fit text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-200"
    >
      {t("backToSchools")}
    </Link>
  );
}
