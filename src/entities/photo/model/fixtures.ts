import type { Photo } from "./types";

/**
 * FIXTURE DATA — photographs exported from the owner's design.
 *
 * The alt text in the design does not match its photographs, so every caption
 * here was written from the image itself. Replaced by the `gallery` table.
 */
export const photos: readonly Photo[] = [
  {
    id: "banya-1-pool",
    src: "/images/banya-1-pool.png",
    alt: "Дерев'яна альтанка зі світлими шторами та відкритий басейн поруч",
    title: "Альтанка та відкритий басейн",
    caption: "Баня #1",
  },
  {
    id: "chan",
    src: "/images/chan.png",
    alt: "Чавунний чан з річковим камінням та хвоєю на дерев'яній терасі",
    title: "Чавунний чан на терасі",
    caption: "Річкове каміння та свіжа хвоя",
  },
  {
    id: "chan-lounge",
    src: "/images/chan-lounge.png",
    alt: "Зона відпочинку біля чану з підвісним кріслом-коконом та декором",
    title: "Лаунж біля чану",
    caption: "Підвісне крісло-кокон",
  },
  {
    id: "live-fire",
    src: "/images/live-fire.png",
    alt: "Живе полум'я та розжарені дубові дрова в топці",
    title: "Живий вогонь на дубових дровах",
    caption: "Серце кожної парної",
  },
  {
    id: "steam-room",
    src: "/images/steam-room.png",
    alt: "Парна з дерев'яними полицями, лавами та теплими світильниками",
    title: "Парна на дровах",
    caption: "Липові полиці та м'яке світло",
  },
  {
    id: "banya-2-entrance",
    src: "/images/banya-2-entrance.png",
    alt: "Вхід до Бані #2 з вивіскою «Баня мать вторая», сухими травами та оберегами",
    title: "Вхід до Бані #2",
    caption: "Сухі трави та обереги",
  },
  {
    id: "banya-entrance",
    src: "/images/banya-entrance.png",
    alt: "Кам'яна стіна з вивіскою «Стара Дорога Баня» та оберегами при вході",
    title: "Вхід до комплексу",
    caption: "Автентичний декор",
  },
  {
    id: "shower-room",
    src: "/images/shower-room.png",
    alt: "Душова кімната з виходом до парної",
    title: "Душова при парній",
    caption: "Контраст одразу після пари",
  },
  {
    id: "lounge-kitchen",
    src: "/images/lounge-kitchen.png",
    alt: "Кухня кімнати відпочинку з чайною зоною та технікою",
    title: "Кімната відпочинку",
    caption: "Чайна зона та все для столу",
  },
] as const;
