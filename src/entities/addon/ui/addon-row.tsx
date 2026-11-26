import { formatHryvnia } from "@/shared/lib";

import type { Addon } from "../model/types";

export function AddonRow({ addon }: { addon: Addon }) {
  return (
    <li className="border-bronze/15 flex flex-col gap-2 border-b py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div>
        <h3 className="text-[15px] font-medium">{addon.name}</h3>
        <p className="text-muted-foreground mt-1 text-[13px] leading-5">
          {addon.description}
        </p>
      </div>
      <p className="text-bronze shrink-0 text-[15px] font-medium">
        {formatHryvnia(addon.price)}
        {addon.unit ? <span className="text-muted-foreground"> {addon.unit}</span> : null}
      </p>
    </li>
  );
}
