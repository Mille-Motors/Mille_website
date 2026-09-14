"use client";

import { useSyncExternalStore, type ComponentProps, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import {
  INVENTORY_ANCHOR_ID,
  scrollToInventory,
} from "@/components/vehicle/inventory-anchor";

type Props = Omit<ComponentProps<typeof ButtonLink>, "href">;

function subscribe() {
  return () => {};
}
function getQuerySnapshot() {
  return window.location.search;
}
function getServerQuerySnapshot() {
  return "";
}

/**
 * "Ver inventario" means "show me what's available now," never "make me
 * choose Carros/Motos again." From /vehiculos it keeps every active filter
 * and just scrolls to the results; from anywhere else it navigates there and
 * lands on the same anchor, tipo defaulting to the whole inventory exactly
 * like a bare /vehiculos visit already does.
 *
 * The query string comes from `useSyncExternalStore` reading
 * `window.location` rather than `useSearchParams` — that hook forces every
 * page rendering this button (i.e. the whole site, through Navbar) out of
 * static generation unless individually wrapped in Suspense, and
 * `usePathname` alone doesn't carry the query string.
 */
export function InventoryCTALink({ onClick, ...props }: Props) {
  const pathname = usePathname();
  const onInventory = pathname === "/vehiculos";
  const query = useSyncExternalStore(
    subscribe,
    getQuerySnapshot,
    getServerQuerySnapshot,
  );

  const href = onInventory
    ? `/vehiculos${query}#inventario`
    : "/vehiculos#inventario";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!onInventory) return;
    event.preventDefault();
    scrollToInventory();
    if (window.location.hash !== `#${INVENTORY_ANCHOR_ID}`) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${INVENTORY_ANCHOR_ID}`,
      );
    }
  };

  return <ButtonLink href={href} onClick={handleClick} {...props} />;
}
