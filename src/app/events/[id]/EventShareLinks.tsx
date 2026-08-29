"use client";

import { useEffect, useState } from "react";
import { eventLinkLabels, getXShareUrl } from "../../../utils/eventLinks";
import styles from "../../page.module.css";

type EventShareLinksProps = {
  eventUrl: string;
  shareText: string;
};

export function EventShareLinks({ eventUrl, shareText }: EventShareLinksProps) {
  const [copyLabel, setCopyLabel] = useState("リンクをコピー");

  useEffect(() => {
    if (copyLabel === "リンクをコピー") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyLabel("リンクをコピー");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copyLabel]);

  async function copyEventUrl() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopyLabel("コピーしました");
    } catch {
      setCopyLabel("コピーできませんでした");
    }
  }

  return (
    <div className={styles.eventUtilityLinks} aria-label="共有">
      <a
        className={styles.shareTextLink}
        href={getXShareUrl(shareText, eventUrl)}
        target="_blank"
        rel="noreferrer"
      >
        {eventLinkLabels.share}
      </a>
      <button
        className={styles.copyLinkButton}
        type="button"
        onClick={copyEventUrl}
      >
        {copyLabel}
      </button>
    </div>
  );
}
