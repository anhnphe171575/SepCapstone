"use client";

import { useServerInsertedHTML } from "next/navigation";
import React from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

function createEmotionCache() {
  // Prepend MUI styles to avoid specificity issues and keep insertion stable
  return createCache({ key: "mui", prepend: true });
}

export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createEmotionCache();
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args: any[]) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...(args as Parameters<typeof prevInsert>));
    };
    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        // Using dangerouslySetInnerHTML to inline critical CSS for SSR
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}


